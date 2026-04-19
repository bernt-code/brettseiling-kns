// ============================================================
// KNS Brettseiling — Setup form notifications
// ============================================================
// Engangsfunksjon: besøk /.netlify/functions/setup-notifications
// etter deploy. Den oppretter e-postnotifikasjoner på alle
// skjemaer i henhold til mappingen nedenfor.
//
// - Idempotent: sjekker eksisterende hooks før ny opprettes
// - Krever env-variabel NETLIFY_API_TOKEN (satt i Netlify)
// - Returnerer en kort JSON-rapport for hva som ble gjort
// ============================================================

const SITE_ID = '0bac5dc6-0ecb-4383-ab67-f9cb9e0015c9';

// Hvem skal motta mail for hvilket skjema
const MAIL_MOTTAKERE = {
  'nybegynner':          'berntblankholm@gmail.com',
  'nybegynner-sesong':   'berntblankholm@gmail.com',
  'learn2fly':           'sunniva.stenmark@gmail.com',
  'flight-academy':      'hjosnes@gmail.com',
  'iqfoil-race':         'berntblankholm@gmail.com',
};

const API_BASE = 'https://api.netlify.com/api/v1';

export default async (req) => {
  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) {
    return json({ error: 'NETLIFY_API_TOKEN mangler i miljøet' }, 500);
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1) Hent alle skjemaer på siden
    const formsRes = await fetch(`${API_BASE}/sites/${SITE_ID}/forms`, { headers });
    if (!formsRes.ok) {
      return json({ error: 'Kunne ikke hente skjemaer', status: formsRes.status }, 500);
    }
    const forms = await formsRes.json();

    // 2) Hent eksisterende hooks på siden (for idempotens)
    const hooksRes = await fetch(`${API_BASE}/sites/${SITE_ID}/hooks`, { headers });
    const eksisterende = hooksRes.ok ? await hooksRes.json() : [];

    const rapport = { opprettet: [], hoppet_over: [], slettet: [], ukjente: [], feil: [] };

    // 3) Loop gjennom alle skjemaer vi har mapping for
    for (const form of forms) {
      const mottaker = MAIL_MOTTAKERE[form.name];

      if (!mottaker) {
        // Ukjent skjemanavn (kan være -page duplikater eller nytt skjema vi ikke har mapping for)
        rapport.ukjente.push({ skjema: form.name, form_id: form.id });
        continue;
      }

      // Finn alle email-hooks for dette skjemaet
      const emailHooks = eksisterende.filter(h =>
        h.type === 'email' &&
        h.form_id === form.id &&
        h.event === 'submission_created'
      );

      // Slett alle hooks som IKKE matcher ny mottaker (f.eks. gammel mottaker)
      for (const h of emailHooks) {
        if (h.data && h.data.email !== mottaker) {
          const delRes = await fetch(`${API_BASE}/hooks/${h.id}`, { method: 'DELETE', headers });
          if (delRes.ok) {
            rapport.slettet.push({ skjema: form.name, gammel_mottaker: h.data.email, hook_id: h.id });
          } else {
            const tekst = await delRes.text();
            rapport.feil.push({ skjema: form.name, handling: 'slette', hook_id: h.id, status: delRes.status, detaljer: tekst });
          }
        }
      }

      // Sjekk om det finnes en hook med korrekt mottaker
      const finnes = emailHooks.some(h => h.data && h.data.email === mottaker);

      if (finnes) {
        rapport.hoppet_over.push({ skjema: form.name, mottaker, grunn: 'Notifikasjon finnes allerede' });
        continue;
      }

      // Opprett ny email-hook
      const body = {
        site_id: SITE_ID,
        form_id: form.id,
        event: 'submission_created',
        type: 'email',
        data: { email: mottaker },
      };

      const postRes = await fetch(`${API_BASE}/hooks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (postRes.ok) {
        const ny = await postRes.json();
        rapport.opprettet.push({ skjema: form.name, mottaker, hook_id: ny.id });
      } else {
        const tekst = await postRes.text();
        rapport.feil.push({ skjema: form.name, mottaker, status: postRes.status, detaljer: tekst });
      }
    }

    return json({
      status: 'ferdig',
      site_id: SITE_ID,
      total_skjemaer: forms.length,
      ...rapport,
    });

  } catch (err) {
    return json({ error: err.message, stack: err.stack }, 500);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
