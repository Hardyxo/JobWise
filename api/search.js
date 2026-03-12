export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Clé API manquante' }); return; }

  const keywords = req.body?.keywords || [];
  const location = req.body?.location || 'Suisse';

  const prompt = `Génère 5 offres d'emploi en Suisse pour : ${keywords.join(', ')}. Zone : ${location}.
Respecte ce format pour chaque offre :
---OFFRE---
Entreprise: [entreprise suisse]
Poste: [titre]
Lieu: [ville, canton]
Contrat: CDI
Salaire: [salaire en CHF/an]
Lien: https://www.jobs.ch
Description: [3 phrases sur le rôle et les compétences]
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await r.json();
    
    if (!r.ok) {
      res.status(200).json({ text: '', debug: JSON.stringify(data) });
      return;
    }

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    res.status(200).json({ text });

  } catch (err) {
    res.status(200).json({ text: '', debug: err.message });
  }
}
