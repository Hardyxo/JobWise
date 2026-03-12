export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured on server' }), { status: 500 });
  }

  try {
    const body = await req.json();
    const { keywords, location } = body;

    if (!keywords || !keywords.length) {
      return new Response(JSON.stringify({ error: 'Keywords required' }), { status: 400 });
    }

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
      return new Response(JSON.stringify({ error: `Anthropic error: ${anthropicRes.status}` }), { status: 502 });
    }

    // Stream the response directly to the client
    return new Response(anthropicRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
