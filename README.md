# FrameFind AI — identify objects in video frames, then find retailer listings

**Try the free product finder:** https://yl124915300-dot.github.io/video-find/

FrameFind is an experimental, privacy-minded **video-to-shopping utility**. A shopper brings a publicly shareable video URL or a local clip, freezes a frame, draws a rectangle around the item, and searches for possible matching products. The buyer chooses which merchant listings to open. It is **not** a store, marketplace, ad network, or an authorized representative of video platforms.

![Original illustrative frame showing a bag, shoe, and bottle](video-find/demo-frame.svg)

## Use it without a new platform account

1. Open [FrameFind](https://yl124915300-dot.github.io/video-find/). Paste a video URL; for platforms that restrict frames, choose your own screenshot or explicitly share the video tab.
2. Draw a rectangle around an item. Run the locally hosted EfficientDet-Lite0 object detector for broad object hints.
3. If the item has a label, optionally click **Read label/model (OCR)** to run Tesseract.js in the browser. Review all letters and numbers before accepting them into the search phrase.
4. Open real retailer keyword-search pages (Google Shopping, Amazon, eBay, Walmart or John Lewis). Verify actual photos, model numbers, condition, shipping, returns, and payment terms on each retailer.

### Faster mobile and desktop access

FrameFind can be installed as a Progressive Web App (PWA) on supported Android browsers and then selected through the device's Share menu. For an installed app, its service worker handles the shared URL directly and removes the temporary link from the address bar. Desktop viewers can use the user-initiated bookmarklet shown in the FrameFind interface. No social network login, video bot account, or platform API access is claimed.

**Availability:** Native installed share-target support depends on the browser and OS. Browser automation validates the service-worker share handler but is **not** a real Android device acceptance test.

## Current product and commerce limitations

- AI object detection provides broad classes, not proof of an exact brand, model, authenticity, or final merchant match. If the object is a jacket or shoe not covered by the detector, manual item selection and text clues remain necessary.
- Optional OCR downloads a pinned open-source runtime/language pack into the browser after user action. The cropped frame is not sent to our server for OCR. Text recognition can be wrong.
- Arbitrary social-platform video URLs cannot lawfully or technically be assumed to yield extractable video frames. Users may upload screenshots or share a tab with browser permission.
- Retailer links are **ordinary keyword searches**, not verified live product-feed/API offers or affiliate links. No sale, payout, commission agreement, active ad campaign or subscription payment facility is asserted.
- GitHub Pages is static hosting. It does not by itself persist verified visitor, click or conversion analytics. Synthetic QA interactions are never counted as customers or purchases.
- Video content, uploaded images, and selected crops are processed in the browser for the current task. No server-side video storage or automatic redistribution is implemented.

## Quality evidence

Browser checks are in [video-find/smoke.cjs](video-find/smoke.cjs) and [video-find/stage2-smoke.cjs](video-find/stage2-smoke.cjs), run automatically by [FrameFind QA](.github/workflows/framefind-qa.yml). Tests use an openly hosted sample picture and synthetic user actions, including an actual on-device EfficientDet object detection and actual Tesseract OCR run. No independent buyers, external merchant prices, Android native share menu, or income are proved by these tests.

First-party organic discovery is limited to helpful source guides, [sitemap.xml](sitemap.xml) and an IndexNow workflow. URL submission is not evidence of search indexing, web traffic or customers. No automated mass-commenting, scraped video reposts, or paid acquisition.

## Further independent information

- [YouTube product finding](https://yl124915300-dot.github.io/video-find/find-youtube-product/)
- [TikTok frame shopping](https://yl124915300-dot.github.io/video-find/find-tiktok-product/)
- [Find products from screenshots](https://yl124915300-dot.github.io/video-find/find-product-from-screenshot/)

This repository contains other historical experiments. FrameFind is the consumer-facing homepage, not a claim that the other projects are operating profitable businesses.
