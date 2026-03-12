export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Clé API manquante' }); return; }

  // Lire le body manuellement
  let keywords = [], location = 'Suisse';
  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const raw = Buffer.concat(buffers).toString();
    const parsed = JSON.parse(raw);
    keywords = parsed.keywords || [];
    location = parsed.location || 'Suisse';
  } catch(e) {
    res.status(400).json({ error: 'Body invalide' }); return;
  }

  if (!keywords.length) { res.status(400).json({ error: 'Mots-clés requis' }); return; }

  const prompt = `Tu es un expert du marché de l'emploi en Suisse. Génère 5 offres d'emploi réalistes pour : ${keywords.join(', ')}. Zone : ${location}.

Format exact à respecter pour chaque offre :
---OFFRE---
Entreprise: [nom d'une vraie entreprise suisse]
Poste: [titre du poste]
Lieu: [ville, canton]
Contrat: [CDI ou CDD ou Stage ou Freelance]
Salaire: [salaire annuel en CHF]
Lien: https://www.jobs.ch
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
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      res.status(502).json({ error: `Erreur Anthropic ${anthropicRes.status}`, detail: JSON.stringify(data) });
      return;
    }

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    res.status(200).json({ text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
