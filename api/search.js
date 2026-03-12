export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { keywords = [], location = 'vaud' } = req.body || {};

  const term = encodeURIComponent(keywords.slice(0,3).join(' '));
  const loc  = encodeURIComponent(location);

  const url = `https://www.jobs.ch/fr/offres-emploi/rss/?term=${term}&location=${loc}`;

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const xml = await r.text();
    res.status(200).json({
      offers: [],
      debug: {
        status: r.status,
        url: url,
        preview: xml.slice(0, 500)
      }
    });
  } catch(e) {
    res.status(200).json({ offers: [], debug: { error: e.message } });
  }
}
