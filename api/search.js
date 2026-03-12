export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { keywords = [], location = 'vaud' } = req.body || {};
  if (!keywords.length) { res.status(400).json({ error: 'Mots-clés requis' }); return; }

  const term = keywords.slice(0, 3).join(' ');
  const feeds = [
    `https://ch.indeed.com/rss?q=${encodeURIComponent(term)}&l=${encodeURIComponent(location)}&lang=fr`,
    `https://ch.indeed.com/rss?q=${encodeURIComponent(term)}&l=vaud&lang=fr`,
    `https://www.jobup.ch/fr/emplois/rss/?term=${encodeURIComponent(term)}&region=vaud`,
    `https://www.jobup.ch/fr/emplois/rss/?term=${encodeURIComponent(term)}`,
  ];

  const offers = [];

  for (const url of feeds) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!r.ok) continue;
      const xml = await r.text();
      if (!xml.includes('<item>')) continue;

      for (const item of xml.split('<item>').slice(1)) {
        const get = tag => {
          const m = item.match(new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + tag + '>|<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
          return m ? (m[1] || m[2] || '').trim() : '';
        };
        const title    = get('title');
        const link     = get('link') || get('guid');
        const desc     = get('description');
        const pubDate  = get('pubDate');
        const company  = get('source') || get('author') || get('dc:creator') || '';
        const loc      = get('location') || '';

        if (!title) continue;
        const hay = (title + ' ' + desc).toLowerCase();
        if (!keywords.some(k => hay.includes(k.toLowerCase()))) continue;
        if (offers.find(o => o.link === link)) continue;

        offers.push({
          title,
          link,
          desc: desc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').slice(0, 400),
          company,
          location: loc,
          pubDate,
        });
        if (offers.length >= 30) break;
      }
    } catch(e) { continue; }
    if (offers.length >= 30) break;
  }

  res.status(200).json({ offers });
}
