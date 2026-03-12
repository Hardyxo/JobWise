export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Clé API manquante sur le serveur' }); return; }

  const { keywords, location } = req.body || {};
  if (!keywords?.length) { res.status(400).json({ error: 'Mots-clés requis' }); return; }

  const prompt = `Tu es un expert du marché de l'emploi en Suisse. Génère 5 offres d'emploi réalistes et détaillées pour : ${keywords.join(', ')}. Zone : ${location || 'Suisse'}.

Pour chaque offre, utilise ce format exact :
---OFFRE---
Entreprise: [nom d'une vraie entreprise suisse]
Poste: [titre du poste]
Lieu: [ville, canton]
Contrat: [CDI ou CDD ou Stage ou Freelance]
Salaire: [salaire annuel réaliste en CHF]
Lien: https://www.jobs.ch
Description: [3-4 phrases décrivant le rôle, les missions principales et les compétences requises]
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
        model: 'claude-haiku-4-5-20251001',
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
