export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Clé API manquante sur le serveur' }); return; }

  const { keywords, location } = req.body;
  if (!keywords?.length) { res.status(400).json({ error: 'Mots-clés requis' }); return; }

  const prompt = `Recherche d'emploi en Suisse. Mots-clés: ${keywords.join(', ')}. Zone: ${location || 'Suisse'}. Domaine: Tech/Dev.
Trouve 5 offres récentes sur jobs.ch, jobup.ch, indeed.ch, linkedin.com.
Format strict pour chaque offre:
---OFFRE---
Entreprise: [nom]
Poste: [titre]
Lieu: [ville, canton]
Contrat: [CDI/CDD/Stage/Freelance]
Salaire: [montant annuel ou "Non précisé"]
Lien: [URL complète]
Description: [3-4 phrases sur le rôle, les missions et compétences requises]
---FIN---`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        stream: true,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      res.status(502).json({ error: `Erreur Anthropic: ${anthropicRes.status} — ${err}` });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
