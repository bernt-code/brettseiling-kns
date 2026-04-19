// ============================================================
// KNS Brettseiling — Setup form notifications
// ============================================================
// Engangsfunksjon: besøk /.netlify/functions/setup-notifications
// etter deploy. Den oppretter to typer hooks på alle skjemaer:
//
//   1) E-post-hooks (type: "email")
//      — sender ferdig formatert mail til mottakerne i MAIL_MOTTAKERE
//
//   2) URL-hook (type: "url")
//      — sender rå JSON til Apps Script Web App som skriver rad
//        til Google Sheets
//
// - Idempotent: sjekker eksisterende hooks før ny opprettes
// - Krever env-variabler:
//     NETLIFY_API_TOKEN  (personlig Netlify token)
//     APPS_SCRIPT_URL    (Web App URL, uten denne hoppes url-hooks over)
// - Returnerer en JSON-rapport for hva som ble gjort
// ============================================================

const SITE_ID = '0bac5dc6-0ecb-4383-ab67-f9cb9e0015c9';

// Hvem skal motta mail for hvilket skjema
// Alle skjemaer sender også kopi til geir@kns.no (hovedtrener)
const HOVEDTRENER = 'geir@kns.no';
const MAIL_MOTTAKERE = {
  'nybegynner':          ['berntblankholm@gmail.com', HOVEDTRENER],
  'nybegynner-sesong':   ['berntblankholm@gmail.com', HOVEDTRENER],
  'learn2fly':           ['sunniva.stenmark@gmail.com', HOVEDTRENER],
  'flight-academy':      ['hjosnes@gmail.com', HOVEDTRENER],
  'iqfoil-race':         ['berntblankholm@gmail.com', HOVEDTRENER],
};

// Hvilke skjemaer skal sende rå JSON til Apps Script (for Google Sheets)
const SHEETS_SKJEMAER = new Set([
  'nybegynner',
  'nybegynner-sesong',
  'learn2fly',
  'flight-academy',
  'iqfoil-race',
]);

const API_BASE = 'https://api.netlify.com/api/v1';

export default async (req) => {
  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) {
    return json({ error: 'NETLIFY_API_TOKEN mangler i miljøet' }, 500);
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  // appsScriptUrl er valgfri — mangler den hopper vi over url-hooks
  // og rapporterer det tydelig

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
    // Riktig endepunkt: /hooks?site_id=X (IKKE /sites/X/hooks, som returnerer 404)
    const hooksRes = await fetch(`${API_BASE}/hooks?site_id=${SITE_ID}`, { headers });
    if (!hooksRes.ok) {
      const detaljer = await hooksRes.text();
      return json({ error: 'Kunne ikke hente hooks', status: hooksRes.status, detaljer }, 500);
    }
    const eksisterende = await hooksRes.json();

    const rapport = {
      epost_opprettet: [],
      epost_hoppet_over: [],
      epost_slettet: [],
      url_opprettet: [],
      url_hoppet_over: [],
      ukjente: [],
      feil: [],
      apps_script_url_satt: Boolean(appsScriptUrl),
    };

    // 3) Loop gjennom alle skjemaer
    for (const form of forms) {
      const mottakere = MAIL_MOTTAKERE[form.name];

      if (!mottakere) {
        rapport.ukjente.push({ skjema: form.name, form_id: form.id });
        continue;
      }

      // --- EMAIL HOOKS ---
      const emailHooks = eksisterende.filter(h =>
        h.type === 'email' &&
        h.form_id === form.id &&
        h.event === 'submission_created'
      );

      // Slett email-hooks til mottakere som ikke lenger skal ha
      for (const h of emailHooks) {
        if (h.data && !mottakere.includes(h.data.email)) {
          const delRes = await fetch(`${API_BASE}/hooks/${h.id}`, { method: 'DELETE', headers });
          if (delRes.ok) {
            rapport.epost_slettet.push({ skjema: form.name, gammel_mottaker: h.data.email, hook_id: h.id });
          } else {
            const tekst = await delRes.text();
            rapport.feil.push({ skjema: form.name, handling: 'slette email', hook_id: h.id, status: delRes.status, detaljer: tekst });
          }
        }
      }

      // Opprett email-hook for hver mottaker som mangler
      for (const mottaker of mottakere) {
        const finnes = emailHooks.some(h => h.data && h.data.email === mottaker);

        if (finnes) {
          rapport.epost_hoppet_over.push({ skjema: form.name, mottaker, grunn: 'Notifikasjon finnes allerede' });
          continue;
        }

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
          rapport.epost_opprettet.push({ skjema: form.name, mottaker, hook_id: ny.id });
        } else {
          const tekst = await postRes.text();
          rapport.feil.push({ skjema: form.name, mottaker, handling: 'opprette email', status: postRes.status, detaljer: tekst });
        }
      }

      // --- URL HOOK (Apps Script) ---
      if (!appsScriptUrl || !SHEETS_SKJEMAER.has(form.name)) {
        continue;
      }

      const urlHooks = eksisterende.filter(h =>
        h.type === 'url' &&
        h.form_id === form.id &&
        h.event === 'submission_created'
      );

      const urlFinnes = urlHooks.some(h => h.data && h.data.url === appsScriptUrl);

      if (urlFinnes) {
        rapport.url_hoppet_over.push({ skjema: form.name, grunn: 'URL-hook finnes allerede' });
        continue;
      }

      const urlBody = {
        site_id: SITE_ID,
        form_id: form.id,
        event: 'submission_created',
        type: 'url',
        data: { url: appsScriptUrl },
      };

      const urlPostRes = await fetch(`${API_BASE}/hooks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(urlBody),
      });

      if (urlPostRes.ok) {
        const ny = await urlPostRes.json();
        rapport.url_opprettet.push({ skjema: form.name, hook_id: ny.id });
      } else {
        const tekst = await urlPostRes.text();
        rapport.feil.push({ skjema: form.name, handling: 'opprette url', status: urlPostRes.status, detaljer: tekst });
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
