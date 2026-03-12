export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Clé API manquante' }); return; }

  const keywords = req.body?.keywords || [];
  const location = req.body?.location || 'Suisse';
  const premium = req.body?.premium || false;
  const nbOffres = premium ? 20 : 5;

  const prompt = `Recherche ${nbOffres} offres d'emploi actuellement disponibles en Suisse sur jobs.ch, jobup.ch, indeed.ch et linkedin.com.
Mots-clés : ${keywords.join(', ')}. Zone : ${location}.
Utilise la recherche web pour trouver de vraies annonces récentes.

Format exact pour chaque offre trouvée :
---OFFRE---
Entreprise: [nom réel de l'entreprise]
Poste: [titre exact de l'annonce]
Lieu: [ville, canton]
Contrat: [CDI ou CDD ou Stage ou Freelance]
Salaire: [salaire indiqué ou "Non précisé"]
Lien: [URL exacte de l'annonce]
Description: [3-4 phrases décrivant le poste, les missions et compétences requises]
---FIN---`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: premium ? 6000 : 3000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: `Erreur Anthropic ${r.status}`, detail: JSON.stringify(data) });
      return;
    }

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    res.status(200).json({ text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
