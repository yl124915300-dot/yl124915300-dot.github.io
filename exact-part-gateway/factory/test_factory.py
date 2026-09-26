"""Synthetic fixtures; no fixture is a verified commercial claim or public artifact."""
import copy
import datetime as dt
import json
import re
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET
from pathlib import Path

import factory as f

NOW = f.timestamp('2026-09-27T00:00:00Z')
BASE = 'https://example.test/exact-part-gateway/'


def candidate(mpn='EXAMPLE-24V-A', brand='Example', path=None):
    ref = 'https://manufacturer.example/' + mpn
    c = {'mpn': mpn, 'brand': brand, 'category': 'Synthetic test drive', 'vertical': 'Industrial Automation/MRO', 'identity_summary': 'Synthetic test-only identity; never publish this fixture.', 'series': 'Test Series',
         'references': [{'source_url': ref, 'verified_at': f.iso(NOW), 'source_identity': 'Test manufacturer', 'exact_mpn': mpn, 'identity_note': 'Synthetic fixture with a 24 V DC terminal and revision A.'}],
         'model_checks': [{'text': 'For this synthetic 24 V revision-A model, verify the terminal label and revision against the existing drive.', 'source_urls': [ref]}],
         'review': {'approved': True, 'reviewer': 'UNIT TEST FIXTURE', 'reviewed_at': f.iso(NOW), 'incremental_value': 'Synthetic revision and terminal comparison.'}}
    c['listings'] = [{'listing_id': str(123456789012+i), 'source_url': 'https://www.ebay.com/itm/' + str(123456789012+i), 'marketplace': 'ebay', 'verified_at': f.iso(NOW), 'exact_mpn': mpn, 'identity_verified': True, 'price': 101+i, 'currency': 'USD', 'condition': 'Used', 'seller': 'Synthetic seller ' + str(i), 'availability': 'BUY_NOW', 'shipping_note': 'Shipping destination unknown', 'returns_note': 'Seller accepts returns for 30 days', 'verification_method': 'browser_rendered', 'evidence_note': 'Synthetic fixture only.'} for i in range(2)]
    if path: c['page_path'] = path
    return c


class FactoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.db = f.connect(self.root / 'ledger.sqlite')
        (self.root / 'site/exact-part-gateway/assets').mkdir(parents=True)
        (self.root / 'site/exact-part-gateway/assets/intelligence.css').write_text('body{}')

    def tearDown(self):
        self.db.close(); self.temp.cleanup()

    def ingest(self, c):
        f.ingest(self.db, {'candidates': [c]}, NOW)
        return f.qualify(self.db, NOW)[0]

    def generate(self, now=NOW):
        return f.generate(self.db, self.root / 'site', BASE, now, self.root / 'reports')

    def test_complete_gate_and_publication_structure(self):
        self.assertEqual(self.ingest(candidate())['status'], 'QUALIFIED')
        result = self.generate()
        self.assertEqual(result['qualified_pages_generated'], 1)
        self.assertEqual(result['metrics']['QUALIFIED_PAGES_BUILT'], 1)
        self.assertEqual(result['metrics']['EPN_TRACKED_PAGES'], 0)
        self.assertIsNone(result['metrics']['EPN_CLICKS'])
        self.assertTrue(f.audit(self.root / 'site', BASE)['passed'])

    def test_live_metric_requires_matching_public_response(self):
        self.ingest(candidate()); self.generate()
        class Response:
            status = 200
            def __init__(self, content): self.content = content
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self): return self.content
        def retrieve(request, **kwargs):
            relative = request.full_url.removeprefix(BASE)
            return Response((self.root / 'site/exact-part-gateway' / relative / 'index.html').read_bytes())
        with patch('factory.urllib.request.urlopen', side_effect=retrieve):
            report = f.verify_deployed(self.db, NOW)
        self.assertEqual(report['metrics']['QUALIFIED_PAGES_LIVE'], 1)
        self.assertEqual(report['metrics']['EPN_TRACKED_PAGES'], 1)
        with patch('factory.urllib.request.urlopen', return_value=Response(b'old deployment')):
            report = f.verify_deployed(self.db, NOW)
        self.assertEqual(report['metrics']['QUALIFIED_PAGES_LIVE'], 0)

    def test_evidence_is_append_only_and_crawl_time_can_invalidate(self):
        c = candidate(); self.ingest(c)
        original = self.db.execute('SELECT COUNT(*) FROM page_evidence').fetchone()[0]
        c['listings'][0]['price'] = 234
        self.ingest(c)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM page_evidence').fetchone()[0], original + 1)
        c['listings'][0]['source_crawled_at'] = f.iso(NOW - dt.timedelta(days=3))
        self.assertEqual(self.ingest(c)['status'], 'STALE')

    def test_preserved_search_mapping_and_unique_search_attribution(self):
        c = candidate(); c['tracked_search_url'] = f.tracked_link('https://www.ebay.com/sch/i.html?_nkw=EXAMPLE-24V-A', 'cprexistingsearch')
        self.ingest(c); self.generate(NOW + dt.timedelta(hours=25))
        # Stale candidates never generated; first publish then re-evaluate.
        self.generate(NOW)
        self.generate(NOW + dt.timedelta(hours=25))
        content = (self.root / 'site/exact-part-gateway/example/example-24v-a/index.html').read_text()
        self.assertIn('customid=cprexistingsearch', content)
        other = candidate('OTHER')
        other['tracked_search_url'] = c['tracked_search_url']
        with self.assertRaises(ValueError): self.ingest(other)

    def test_mpn_mismatch_cannot_qualify(self):
        c = candidate(); c['listings'][1]['exact_mpn'] += '-OTHER'
        result = self.ingest(c)
        self.assertEqual(result['status'], 'WATCHLIST')
        self.assertIn('EXACT_MPN_NOT_VERIFIED', result['listing_checks'][1]['reasons'])
        self.assertEqual(self.generate()['qualified_pages_generated'], 0)
        self.assertFalse((self.root / 'site/exact-part-gateway/example/example-24v-a/index.html').exists())

    def test_duplicate_listing_urls_do_not_satisfy_two_offers(self):
        c = candidate(); c['listings'][1] = dict(c['listings'][0])
        c['listings'][1]['source_url'] += '?foo=bar'
        result = self.ingest(c)
        self.assertEqual(result['live_listing_count'], 1)
        self.assertIn('DUPLICATE_LISTING', result['listing_checks'][1]['reasons'])

    def test_each_commercial_field_is_required(self):
        for field, reason in [('price', 'PUBLIC_PRICE_MISSING'), ('condition', 'CONDITION_MISSING'), ('seller', 'SELLER_MISSING'), ('shipping_note', 'SHIPPING_SCOPE_OR_UNKNOWN_MISSING'), ('returns_note', 'RETURNS_OR_WARRANTY_MISSING'), ('evidence_note', 'VERIFICATION_EVIDENCE_MISSING')]:
            c = candidate(); del c['listings'][1][field]
            result = self.ingest(c)
            self.assertFalse(result['qualified'], field)
            self.assertIn(reason, result['listing_checks'][1]['reasons'])

    def test_unknown_return_and_warranty_are_not_verified_terms(self):
        c = candidate(); c['listings'][1]['returns_note'] = 'Unknown'
        c['listings'][1]['warranty_note'] = 'Not independently verified'
        self.assertFalse(self.ingest(c)['qualified'])

    def test_incremental_content_and_non_ebay_reference_gate(self):
        c = candidate(); c['review']['approved'] = False
        self.assertIn('INCREMENTAL_VALUE_REVIEW_REQUIRED', self.ingest(c)['reasons'])
        c = candidate(); c['references'] = []
        self.assertIn('NON_EBAY_CROSS_REFERENCE_MISSING_OR_STALE', self.ingest(c)['reasons'])
        c = candidate(); c['model_checks'][0]['source_urls'] = ['https://unsupported.example/test']
        self.assertIn('MODEL_SPECIFIC_CHECKS_NOT_SUPPORTED', self.ingest(c)['reasons'])

    def test_stale_evidence_downgrades_preserved_page(self):
        self.ingest(candidate()); self.generate()
        result = self.generate(NOW + dt.timedelta(hours=25))
        self.assertEqual(result['qualified_pages_generated'], 0)
        self.assertEqual(result['retained_pages'], 1)
        content = (self.root / 'site/exact-part-gateway/example/example-24v-a/index.html').read_text()
        self.assertIn('STALE', content)
        self.assertIn('Search current eBay offers', content)
        self.assertIn('sch/i.html?', content)
        self.assertNotIn('Buy on eBay — verify offer', content)

    def test_client_expiry_uses_earliest_evidence_and_preserved_fallback(self):
        c = candidate()
        c['references'][0]['source_crawled_at'] = f.iso(NOW - dt.timedelta(hours=2))
        c['tracked_search_url'] = f.tracked_link('https://www.ebay.com/sch/i.html?_nkw=EXAMPLE-24V-A', 'cprexistingsearch')
        self.ingest(c); self.generate()
        content = (self.root / 'site/exact-part-gateway/example/example-24v-a/index.html').read_text()
        data = json.loads(re.search(r'<script id="factory-freshness-data" type="application/json">(.*?)</script>', content, re.S)[1])
        self.assertEqual(data['expiresAt'], int((NOW + dt.timedelta(hours=22)).timestamp() * 1000))
        self.assertEqual(data['fallback'], c['tracked_search_url'])
        for attribute in ('data-factory-status', 'data-factory-current-count', 'data-factory-offer-label', 'data-factory-freshness-warning'):
            self.assertIn(attribute, content)
        self.assertIn('Original evidence timestamps are unchanged', content)

    @unittest.skipUnless(shutil.which('node'), 'Node optional; browser guard runtime test')
    def test_client_guard_expires_open_page_and_preserves_evidence_links(self):
        c = candidate(); fallback = f.tracked_link('https://www.ebay.com/sch/i.html?_nkw=EXAMPLE-24V-A', 'cprsearch')
        guard = f.freshness_guard(c, fallback, 'QUALIFIED')
        data = json.loads(re.search(r'<script id="factory-freshness-data" type="application/json">(.*?)</script>', guard, re.S)[1])
        script = re.search(r'<script id="factory-freshness-guard">(.*?)</script>', guard, re.S)[1]
        setup = '''const config = CONFIG;
const status = {textContent:'QUALIFIED'}, count = {textContent:'2'}, label = {textContent:'Verified current offer'}, warning = {hidden:true};
const tracked = {href: 'https://www.ebay.com/itm/123456789012?campid=5339214603',textContent:'Buy on eBay',setAttribute(k,v){this[k]=v;}};
const source = {href:'https://www.ebay.com/itm/123456789012',textContent:'Source'};
let observer, scheduled;
global.document = {documentElement:{dataset:{}},getElementById:()=>({textContent:JSON.stringify(config)}),addEventListener:(event,fn)=>{observer=fn;},querySelectorAll:(selector)=>({'[data-factory-status]':[status],'[data-factory-current-count]':[count],'[data-factory-offer-label]':[label],'[data-factory-freshness-warning]':[warning],'a[href]':[tracked,source]}[selector]||[])};
global.setTimeout = (fn,delay)=>{scheduled=delay;return 1;};global.clearTimeout = ()=>{};
Date.now = ()=>config.expiresAt-1000;
'''.replace('CONFIG', json.dumps(data))
        finish = '''const before={status:status.textContent,href:tracked.href,scheduled};Date.now=()=>config.expiresAt+1;observer();console.log(JSON.stringify({before,status:status.textContent,count:count.textContent,label:label.textContent,warning:warning.hidden,tracked:tracked.href,rel:tracked.rel,source:source.href,freshness:document.documentElement.dataset.factoryFreshness}));'''
        result = subprocess.run([shutil.which('node'), '-e', setup + script + finish], capture_output=True, text=True, check=True)
        output = json.loads(result.stdout)
        self.assertEqual(output['before']['status'], 'QUALIFIED')
        self.assertEqual(output['before']['scheduled'], 1001)
        self.assertEqual(output['status'], 'STALE')
        self.assertEqual(output['count'], '0')
        self.assertEqual(output['tracked'], fallback)
        self.assertEqual(output['rel'], 'sponsored nofollow')
        self.assertFalse(output['warning'])
        self.assertEqual(output['source'], 'https://www.ebay.com/itm/123456789012')

    def test_fresh_http_probe_does_not_refresh_commercial_evidence(self):
        self.ingest(candidate()); cid = 'EXAMPLE:EXAMPLE24VA'
        for e in candidate()['listings']:
            self.db.execute('INSERT INTO page_evidence_probes(candidate_id,source_url,checked_at,http_status,outcome,final_url) VALUES (?,?,?,?,?,?)', (cid, e['source_url'], f.iso(NOW + dt.timedelta(hours=25)), 200, 'REACHABLE_NOT_REVERIFIED', e['source_url']))
        self.assertEqual(f.qualify(self.db, NOW + dt.timedelta(hours=25))[0]['status'], 'STALE')

    def test_two_distinct_no_supply_observations_and_idempotent_runs(self):
        c = candidate(); self.ingest(c); self.generate()
        for e in c['listings']: e['availability'] = 'ENDED'
        first = self.ingest(c)
        self.assertEqual(first['no_live_supply_streak'], 1)
        self.assertEqual(f.qualify(self.db, NOW)[0]['no_live_supply_streak'], 1)
        for e in c['listings']: e['verified_at'] = f.iso(NOW + dt.timedelta(minutes=1))
        f.ingest(self.db, {'candidates': [c]}, NOW + dt.timedelta(minutes=1))
        result = f.qualify(self.db, NOW + dt.timedelta(minutes=1))[0]
        self.assertEqual(result['status'], 'NO_LIVE_SUPPLY')
        self.assertEqual(result['no_live_supply_streak'], 2)
        self.assertEqual(self.generate(NOW + dt.timedelta(minutes=1))['retained_pages'], 1)

    def test_inconclusive_probe_cannot_manufacture_no_supply_observation(self):
        c = candidate()
        for e in c['listings']: e['availability'] = 'ENDED'
        self.assertEqual(self.ingest(c)['no_live_supply_streak'], 1)
        for e in c['listings']:
            self.db.execute('INSERT INTO page_evidence_probes(candidate_id,source_url,checked_at,http_status,outcome,final_url) VALUES (?,?,?,?,?,?)', ('EXAMPLE:EXAMPLE24VA', e['source_url'], f.iso(NOW + dt.timedelta(minutes=1)), 403, 'BLOCKED_OR_ERROR', e['source_url']))
        self.assertEqual(f.qualify(self.db, NOW + dt.timedelta(minutes=1))[0]['no_live_supply_streak'], 1)

    def test_invalid_probe_disables_listing_and_reverification_recovers(self):
        c = candidate(); self.ingest(c)
        self.db.execute('INSERT INTO page_evidence_probes(candidate_id,source_url,checked_at,http_status,outcome,final_url) VALUES (?,?,?,?,?,?)', ('EXAMPLE:EXAMPLE24VA', c['listings'][0]['source_url'], f.iso(NOW), 410, 'INVALID', c['listings'][0]['source_url']))
        self.assertFalse(f.qualify(self.db, NOW)[0]['qualified'])
        c['listings'][0]['verified_at'] = f.iso(NOW + dt.timedelta(minutes=1))
        f.ingest(self.db, {'candidates': [c]}, NOW + dt.timedelta(minutes=1))
        self.assertTrue(f.qualify(self.db, NOW + dt.timedelta(minutes=1))[0]['qualified'])

    def test_sitemaps_keep_all_original_urls_and_repeat_is_delta_empty(self):
        originals = ['https://example.test/', 'https://example.test/payrescue/']
        f.merge_sitemap(self.root / 'site/sitemap.xml', originals, NOW)
        self.ingest(candidate()); first = self.generate()
        self.assertGreater(len(first['changed_urls']), 0)
        second = self.generate(NOW + dt.timedelta(minutes=2))
        self.assertEqual(second['changed_urls'], [])
        urls = [x.text for x in ET.parse(self.root / 'site/sitemap.xml').getroot().iter() if x.tag.endswith('loc')]
        self.assertTrue(set(originals).issubset(urls))
        self.assertTrue(list((self.root / 'reports/indexnow-history').glob('*.json')))

    def test_frozen_refresh_does_not_add_newly_qualified_pages(self):
        self.ingest(candidate()); self.generate()
        self.ingest(candidate('LATER-CANDIDATE'))
        result = f.generate(self.db, self.root / 'site', BASE, NOW, self.root / 'reports', allow_new=False)
        self.assertEqual(result['qualified_pages_generated'], 1)
        self.assertFalse((self.root / 'site/exact-part-gateway/example/later-candidate/index.html').exists())

    def test_preserve_existing_mapping_and_reject_collision(self):
        c = candidate()
        for e in c['listings']: e['tracked_url'] = f.tracked_link(e['source_url'], 'cpr_existing')
        self.ingest(c)
        self.assertEqual(self.db.execute('SELECT customid FROM page_candidates').fetchone()[0], 'cpr_existing')
        other = candidate('OTHER-MPN')
        for e in other['listings']: e['tracked_url'] = f.tracked_link(e['source_url'], 'cpr_existing')
        with self.assertRaises(ValueError): self.ingest(other)

    def test_new_id_collision_uses_hash_and_wrong_target_is_rejected(self):
        self.ingest(candidate())
        c = candidate(brand='Another')
        self.ingest(c)
        ids = [r[0] for r in self.db.execute('SELECT customid FROM page_candidates')]
        self.assertEqual(len(set(ids)), 2)
        c = candidate('WRONG')
        c['listings'][0]['tracked_url'] = f.tracked_link('https://www.ebay.com/itm/999999999999', 'cpr_wrong')
        with self.assertRaises(ValueError): self.ingest(c)

    def test_existing_url_cannot_move_or_escape_subtree(self):
        c = candidate(); self.ingest(c); c['page_path'] = 'example/another/'
        with self.assertRaises(ValueError): self.ingest(c)
        for path in ['../other/', '/absolute/', 'assets/part/', 'factory/part/']:
            with self.assertRaises(ValueError): self.ingest(candidate('EVIL', path=path))

    def test_small_series_has_no_hub_but_three_qualified_members_do(self):
        self.ingest(candidate()); self.generate()
        self.assertFalse((self.root / 'site/exact-part-gateway/series').exists())
        self.ingest(candidate('EXAMPLE-B')); self.ingest(candidate('EXAMPLE-C'))
        self.generate()
        self.assertTrue((self.root / 'site/exact-part-gateway/series/example-test-series/index.html').exists())

    def test_existing_business_tables_are_not_modified(self):
        self.db.execute('CREATE TABLE evidence(secret TEXT)')
        self.db.execute("INSERT INTO evidence VALUES ('preserve-existing-ledger')")
        self.ingest(candidate()); self.generate()
        self.assertEqual(self.db.execute('SELECT secret FROM evidence').fetchone()[0], 'preserve-existing-ledger')

    def test_discovery_adds_only_qualified_entries_and_preserves_old_data(self):
        subtree = self.root / 'site/exact-part-gateway'
        old = {'brand': 'Original', 'mpn': 'OLD', 'category': 'Original category', 'page_path': 'original/old/', 'aliases': ['UNCHANGED']}
        (subtree / 'catalog.json').write_text(json.dumps([old]))
        market = {'catalog': [old], 'generated_at': '2020-01-01T00:00:00Z', 'listings': [{'price': 123, 'verified_at': '2020-01-01T00:00:00Z'}], 'queries': ['preserved'], 'measurement': {'clicks': None}}
        (subtree / 'marketplace-data.json').write_text(json.dumps(market))
        (self.root / 'site/index.html').write_text('KEEP ROOT PROJECTS EXACTLY')
        (subtree / 'index.html').write_text('<main><a>Browse 1 part pages</a><section id="catalog"><h2>1 exact-part transaction pages</h2><div class="grid"><article>Original card</article></div></section></main>')
        self.ingest(candidate()); result = self.generate()
        self.assertIn(BASE, result['changed_urls'])
        updated = json.loads((subtree / 'marketplace-data.json').read_text())
        for key in ('generated_at', 'listings', 'queries', 'measurement'):
            self.assertEqual(updated[key], market[key])
        self.assertEqual(updated['catalog'][0], old)
        self.assertEqual(len(updated['catalog']), 2)
        home = (subtree / 'index.html').read_text()
        self.assertIn('Browse 2 part pages', home)
        self.assertIn('2 exact-part pages', home)
        self.assertIn('Original card', home)
        self.assertIn('verified page index and dashboard', home)
        self.assertEqual((self.root / 'site/index.html').read_text(), 'KEEP ROOT PROJECTS EXACTLY')
        self.assertEqual(self.generate()['changed_urls'], [])


if __name__ == '__main__':
    unittest.main()
