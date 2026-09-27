// Cloudflare Pages Function: GET /api/news
// Fetches Google News RSS server-side (avoids browser CORS), filters, caches 30 min.

const QUERY = '"Florida Keys" OR "Key West" OR "Key Largo" OR Marathon Florida';
const MAX_ITEMS = 12;
// Headlines containing any of these are hidden. Edit to taste.
const BLOCK = /\b(kill|killed|killing|murder|dead|death|dies|died|shoot|shooting|shot|stab|arrest|arrested|charged|crash|drown|body|bodies|fatal|overdose|drug|drugs|sex|sexual|abuse|assault|rape|gun|weapon|jail|prison|suicide|trafficking)\w*\b/i;

const decode = s => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1]) : ""; };

export async function onRequest() {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { cf: { cacheTtl: 1800, cacheEverything: true } });
    const xml = await res.text();
    const items = xml.split("<item>").slice(1).map(chunk => {
      const source = tag(chunk, "source");
      let title = tag(chunk, "title");
      if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
      return { title, link: tag(chunk, "link"), date: tag(chunk, "pubDate"), source };
    })
    .filter(i => i.title && i.link && !BLOCK.test(i.title))
    .slice(0, MAX_ITEMS);

    return Response.json(items, { headers: { "Cache-Control": "public, max-age=1800" } });
  } catch (e) {
    return Response.json([], { status: 502 });
  }
}
