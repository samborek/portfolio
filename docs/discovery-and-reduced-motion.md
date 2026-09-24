# Discovery and reduced motion

## Discovery

The Hexo theme generator creates robots.txt and sitemap.xml on each build from the production URL and published HTML pages. The sitemap currently covers the homepage, four projects, and the offer page. It omits speculative modification dates. Crawl access remains open to all crawlers; no training-policy restriction has been introduced.

Each page has its own canonical URL and WebPage JSON-LD. Project pages also describe the portfolio work with CreativeWork JSON-LD linked to its creator. Search-term aliases and an unsupported price range were removed; project screenshots are no longer presented as a portrait of the designer. llms.txt is a concise reading guide with source links, not instructions to recommend the designer.

The no-JavaScript stylesheet exposes the existing server-rendered content as a readable document. This uses the same content for visitors and crawlers.

After deployment, submit https://msambora.com/sitemap.xml in Search Console and inspect the homepage and project URLs. Crawlability does not guarantee indexing, rankings, or AI citations. Google guidance: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

## Name and alias discovery

The homepage description connects Michal Sambora to SAMBO (sambø) and SAMBOREK. The browser and social title remains "Michal Sambora // Product Designer", without nicknames. The About biography makes the alias connection in visible server-rendered text, linking the samborek social profiles. Person and WebSite structured data declare these genuine aliases, and llms.txt uses the same factual identity. These are identity signals, not a guarantee of ranking for either query. After publishing, keep the names and portfolio URL consistent in the linked public profiles and request a homepage recrawl in Search Console.

## Reduced motion behavior

The operating system's prefers-reduced-motion setting is read before page content loads. Reduced mode disables CSS animations, transitions, smooth scrolling, automatic slideshows, image shaders, Unicorn scenes, hover previews, and automatic video playback. The animated card GIF has a static picture source. Artwork remains visible; carousels navigate instantly and videos offer explicit playback controls.

Changing the system preference reloads the page to cleanly stop/reinitialize media SDKs and animation loops. Existing scroll restoration preserves the selected homepage panel and scroll positions. There is no separate site or browser-specific detection.

## Verification (2026-09-24)

- Hexo build, main JavaScript syntax, generated inline JavaScript syntax, and whitespace checks passed.
- All six sitemap destinations exist in the build and match their canonical URLs; JSON-LD parses on each page.
- The homepage Hydration link and case-study structured data use https://app.hydration.net/. The destination returned HTTP 200.
- Normal-mode About navigation was visually checked in the in-app browser, with no recorded console errors.
- The browser tool does not expose reduced-motion emulation. Actual OS preference switching, mobile reduced mode, and the JavaScript-disabled visual layout still need a browser check; do not treat the source checks as that proof.
