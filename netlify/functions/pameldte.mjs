// Netlify Function: Henter påmeldte per kurshelg fra Netlify Forms API
// Krever environment variable NETLIFY_API_TOKEN (settes i Netlify dashboard)

export default async (req) => {
  const token = process.env.NETLIFY_API_TOKEN;
  const siteId = '0bac5dc6-0ecb-4383-ab67-f9cb9e0015c9';

  if (!token) {
    return new Response(JSON.stringify({ error: 'API token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Hent alle forms for å finne nybegynner-skjemaet
    const formsRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/forms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!formsRes.ok) {
      return new Response(JSON.stringify({ error: 'Could not fetch forms' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const forms = await formsRes.json();
    const nybForm = forms.find(f => f.name === 'nybegynner');

    if (!nybForm) {
      return new Response(JSON.stringify({ helger: {} }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hent innsendinger (opptil 100)
    const subsRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${nybForm.id}/submissions?per_page=100`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!subsRes.ok) {
      return new Response(JSON.stringify({ error: 'Could not fetch submissions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const submissions = await subsRes.json();

    // Grupper fornavn per kurshelg (kun introkurs)
    const helger = {};
    for (const sub of submissions) {
      const data = sub.data || sub;
      if (data.kurstype !== 'introkurs') continue;
      const helg = data.kurshelg;
      const fornavn = data.fornavn;
      if (!helg || !fornavn) continue;

      if (!helger[helg]) helger[helg] = [];
      helger[helg].push(fornavn);
    }

    return new Response(JSON.stringify({ helger }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'  // Cache i 60 sek
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
