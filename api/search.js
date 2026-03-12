export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { keywords = [], location = 'vaud' } = req.body || {};
  if (!keywords.length) { res.status(400).json({ error: 'Mots-clés requis' }); return; }

  const term = encodeURIComponent(keywords.slice(0,3).join(' '));
  const loc  = encodeURIComponent(location);

  const feeds = [
    `https://www.jobs.ch/fr/offres-emploi/rss/?term=${term}&location=${loc}`,
    `https://www.jobs.ch/fr/offres-emploi/rss/?term=${term}`,
    `https://www.jobup.ch/fr/emplois/rss/?term=${term}`,
  ];

  const offers = [];

  for (const url of feeds) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) continue;
      const xml = await r.text();
      for (const item of xml.split('<item>').slice(1)) {
        const get = tag => {
          const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'));
          return m ? (m[1]||m[2]||'').trim() : '';
        };
        const title = get('title'), link = get('link')||get('guid'), desc = get('description'), pubDate = get('pubDate');
        const company = get('author')||get('dc:creator')||'', location_r = get('location')||'';
        if (!title) continue;
        const hay = (title+' '+desc).toLowerCase();
        if (!keywords.some(k => hay.includes(k.toLowerCase()))) continue;
        if (offers.find(o => o.link === link)) continue;
        offers.push({ title, link, desc: desc.replace(/<[^>]+>/g,'').slice(0,400), company, location: location_r, pubDate });
        if (offers.length >= 30) break;
      }
    } catch(e) { continue; }
    if (offers.length >= 30) break;
  }

  res.status(200).json({ offers });
}
