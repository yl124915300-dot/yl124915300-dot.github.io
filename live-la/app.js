/* Video-informed intent commerce: no price invention, no conversion claims.
 * Detection = object hints only; the shopper must confirm what they actually need.
 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const offersByGoal={
    walk:['klook-hollywood-sign-express'],
    sightseeing:['klook-big-bus-la','klook-hollywood-sign-express'],
    family:['klook-aquarium-pacific','klook-big-bus-la'],
    beach:[],
    unknown:[]
  };
  const state={deals:[],labels:[],status:'loading'};
  const safeOffers=new Set(['klook-hollywood-sign-express','klook-aquarium-pacific','klook-big-bus-la']);
  function text(el,t){el.textContent=t;}
  function node(tag,props={},body=''){
    const el=document.createElement(tag);
    for(const [k,v] of Object.entries(props)){
      if(k==='class')el.className=v;
      else if(k==='href')el.href=v;
      else if(k==='target')el.target=v;
      else if(k==='rel')el.rel=v;
    }
    if(body)el.textContent=body;
    return el;
  }
  function normalize(s){return String(s||'').toLowerCase().normalize('NFKC').slice(0,500);}
  function identify(userText,preference){
    const t=normalize(userText);
    const matches=[
      {kind:'family',re:/(aquarium|fish|sea life|kid|children|family|child|toddler|水族馆|亲子|孩子)/},
      {kind:'walk',re:/(hollywood|sign|hike|walking tour|guided walk|徒步|好莱坞|步行导览)/},
      {kind:'sightseeing',re:/(bus|hop.on|city tour|sightsee|big bus|观光|巴士|游览)/},
      {kind:'beach',re:/(beach|pier|surf|ocean|sunset|sunbathing|沙滩|海滩|码头|海边|日落)/}
    ];
    if(!t)return preference||'unknown';
    const k=matches.find(x=>x.re.test(t));
    return k?.kind||'unknown';
  }
  function currentGoal(){
    return identify($('buyer-text').value,$('goal').value);
  }
  function advice(goal){
    const raw=$('buyer-text').value.trim();
    if(raw&&goal==='unknown')return "We couldn't match your request to a verified offer. Describe the activity or use one of the goal buttons. We will not recommend unrelated paid products.";
    if(goal==='beach')return "You are looking at a beach/pier visit. Public pier and beach access generally do not require an activity ticket; optional rides, parking and food are separate.";
    if(goal==='family')return "You mentioned a family activity. The Aquarium of the Pacific is a paid indoor outing in LONG BEACH, not near the Santa Monica Pier.";
    if(goal==='walk')return "You mentioned a guided walking tour. The Hollywood Sign walking tour takes place in HOLLYWOOD, not at Santa Monica Pier.";
    if(goal==='sightseeing')return "You mentioned sightseeing or a bus tour. Check the Big Bus LA stop map and itinerary before buying; it is not the live camera operator.";
    return "Watching a live scene isn't a purchase. Tell us what you want to buy or do; we show no affiliate products before there is a relevant request.";
  }
  function makeCard({free=false,title,description,price,href,disclosure}){
    const card=node('article',{class:'offer'});
    card.append(node('div',{class:'kind'},free?'FREE · no commission':'PAID · affiliate checkout'));
    card.append(node('h3',{},title));
    card.append(node('p',{},description));
    if(price)card.append(node('p',{class:'price'},price));
    const action=node('div',{class:'action'});
    const a=node('a',{href,target:'_blank',rel:free?'noopener noreferrer':'sponsored nofollow noopener noreferrer'},free?'Open official visitor information':'Check current price and dates at Klook');
    action.append(a);card.append(action);
    card.append(node('p',{class:'muted'},disclosure));
    return card;
  }
  function render(){
    const goal=currentGoal();
    const budget=Number($('budget').value),party=Number($('party').value),when=$('when').value;
    const out=$('cards');out.replaceChildren();
    text($('recommendation-reason'),advice(goal));
    text($('match-status'),(state.status==='ok'?'Existing offer catalog loaded':'Paid offer data not available')+
      ' · '+(goal==='unknown'?'No validated match':goal+' intent')+' · '+party+' traveler(s) · max $'+budget+'/person · '+when);
    if(goal==='beach'){
      out.append(makeCard({free:true,title:'Santa Monica Pier & public beach',
        description:'The official Santa Monica site contains live camera links and local visitor guidance. No paid activity required for ordinary beach/pier access.',
        price:'Free general access',href:'https://www.santamonica.com/santa-monica-live/',
        disclosure:'Free public destination information. Parking, food, rides and access rules vary.'}));
    }
    if(goal!=='unknown'&&goal!=='beach'){
      const order=offersByGoal[goal]||[];
      let shown=0;
      for(const id of order){
        const p=state.deals.find(p=>p.id===id);if(!p||p.price_usd>budget)continue;
        const merchantOk=new URL(p.tracking_url).hostname==='klook.tpo.lv';
        if(!merchantOk)continue;
        out.append(makeCard({title:p.title,
          description:p.location+' · historical snapshot '+p.snapshot_date+
            ' · '+party+' person estimate $'+(p.price_usd*party).toFixed(2)+' before taxes or changes.',
          price:'Historical $'+p.price_usd.toFixed(2)+'/person',
          href:p.tracking_url,
          disclosure:'Existing tracked Klook link. Qualifying affiliate eligibility, booking and payout have not been proven by a click. Merchant handles payment.'}));
        shown++;
      }
      if(!shown){out.append(node('p',{},'No verified paid offer within this budget. No affiliate recommendation will be forced.'));}
    }
    if(goal==='unknown'){out.append(node('p',{},'Tell us what you want before we show paid offers. AI-detected objects are not proof of shopping intent.'));}
  }
  function focusNeed(kind,phrase){
    $('goal').value=kind;$('buyer-text').value=phrase;
    render();
  }
  document.querySelectorAll('[data-goal]').forEach(el=>el.addEventListener('click',()=>{
    focusNeed(el.dataset.goal,el.dataset.prompt||'');
    $('buyer-text').focus();
  }));
  $('planner').addEventListener('submit',event=>{event.preventDefault();render();$('cards').scrollIntoView({behavior:'smooth',block:'nearest'});});
  $('buyer-text').addEventListener('input',()=>{text($('text-status'),$('buyer-text').value.trim()?'Intent expressed — press Match to compare available offers.':'No purchase intent submitted yet.');});
  document.addEventListener('livevision:objects',event=>{
    const list=Array.isArray(event.detail?.labels)?event.detail.labels:[];
    state.labels=list;
    const names=new Set(list.map(x=>x.label));
    const hint=$('vision-suggestion');hint.replaceChildren();
    if(names.has('bus')||names.has('train')){
      const btn=node('button',{class:'small-btn'},'Was that a sightseeing bus? Compare tours');
      btn.type='button';btn.addEventListener('click',()=>focusNeed('sightseeing','I want a bus sightseeing tour in Los Angeles'));
      hint.append(btn);
    }else if(names.has('surfboard')||names.has('boat')){
      const btn=node('button',{class:'small-btn'},'Are you planning a beach outing?');
      btn.type='button';btn.addEventListener('click',()=>focusNeed('beach','I want to go to the Santa Monica beach'));
      hint.append(btn);
    }else if(names.has('person')||names.has('car')||names.has('bicycle')){
      hint.append(node('p',{},'People/vehicles visible, but that does not tell us what you want to buy. Describe your need below.'));
    }else{
      hint.append(node('p',{},'No commerce-relevant suggestion from these objects. Write your actual purchase request.'));
    }
  });
  $('try-inline').addEventListener('click',()=>{
    const frame=$('external-player'),wrapper=$('embed-wrap');
    if(!frame.src)frame.src='https://www.youtube-nocookie.com/embed/qmE7U1YZPQA?rel=0&enablejsapi=1';
    wrapper.hidden=false;
    $('try-inline').disabled=true;
    text($('video-status'),'The embedded player is optional. If you see error 153 or a blank player, use the original Explore.org live link. We cannot bypass provider restrictions.');
  });
  $('player-failed').addEventListener('click',()=>{
    $('embed-wrap').hidden=true;
    $('external-player').src='about:blank';
    text($('video-status'),'Embedded playback reported unavailable. Use the direct official livestream link while you use our on-page AI.');
    $('try-inline').disabled=false;
  });
  $('share-plan').addEventListener('click',async()=>{
    const url=new URL(location.href);
    url.searchParams.set('goal',$('goal').value);
    url.searchParams.set('budget',$('budget').value);
    url.searchParams.set('party',$('party').value);
    url.searchParams.set('from','shared-plan');
    const link=url.toString();
    try{if(navigator.share)await navigator.share({title:'Santa Monica live viewing + purchase guide',url:link});
      else await navigator.clipboard.writeText(link);
      text($('share-state'),'Share link prepared.');
    }catch(err){if(err.name!=='AbortError')text($('share-state'),'Copy this address: '+link);}
  });
  const params=new URLSearchParams(location.search);
  ['budget','party','goal'].forEach(id=>{
    const s=$(id),v=params.get(id);
    if(v&&Array.from(s.options).some(opt=>opt.value===v))s.value=v;
  });
  fetch('/deals.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{
    state.deals=(Array.isArray(data)?data:[]).filter(p=>safeOffers.has(p.id)&&/^https:\/\/klook\.tpo\.lv\//.test(p.tracking_url||'')&&Number.isFinite(Number(p.price_usd)));
    state.status='ok';render();
  }).catch(()=>{state.status='offline';render();});
  render();
})();