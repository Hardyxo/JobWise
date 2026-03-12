export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Clé API manquante' }); return; }

  const { keywords, location } = req.body || {};
  if (!keywords?.length) { res.status(400).json({ error: 'Mots-clés requis' }); return; }

  const prompt = `Recherche d'emploi en Suisse. Mots-clés: ${keywords.join(', ')}. Zone: ${location || 'Suisse'}.
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      res.status(502).json({ error: `Erreur Anthropic ${anthropicRes.status}`, detail: data });
      return;
    }

    // Extraire le texte de la réponse
    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    res.status(200).json({ text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
