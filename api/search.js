export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { keywords = [], location = 'vaud' } = req.body || {};
  if (!keywords.length) { res.status(400).json({ error: 'Mots-clés requis' }); return; }

  const term = encodeURIComponent(keywords.join(' '));
  const loc  = encodeURIComponent(location);

  const feeds = [
    `https://www.jobs.ch/fr/offres-emploi/rss/?term=${term}&location=${loc}`,
    `https://www.jobs.ch/fr/offres-emploi/rss/?term=${term}`,
    `https://www.jobup.ch/fr/emplois/rss/?term=${term}&region=${loc}`,
    `https://www.jobup.ch/fr/emplois/rss/?term=${term}`,
  ];

  const offers = [];

  for (const url of feeds) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobWise/1.0)' }
      });
      if (!r.ok) continue;
      const xml = await r.text();

      const items = xml.split('<item>').slice(1);
      for (const item of items) {
        const get = tag => {
          const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
          return m ? (m[1] || m[2] || '').trim() : '';
        };
        const title       = get('title');
        const link        = get('link') || get('guid');
        const desc        = get('description');
        const pubDate     = get('pubDate');
        const company     = get('author') || get('dc:creator') || get('company') || '';
        const location_r  = get('location') || get('georss:featurename') || '';

        if (!title) continue;

        // Filtre : au moins un mot-clé dans le titre ou la description
        const haystack = (title + ' ' + desc).toLowerCase();
        const matches  = keywords.some(k => haystack.includes(k.toLowerCase()));
        if (!matches) continue;

        // Éviter les doublons
        if (offers.find(o => o.link === link)) continue;

        offers.push({ title, link, desc: desc.replace(/<[^>]+>/g, '').slice(0, 300), company, location: location_r, pubDate });
        if (offers.length >= 30) break;
      }
    } catch (e) { continue; }
    if (offers.length >= 30) break;
  }

  res.status(200).json({ offers });
}
