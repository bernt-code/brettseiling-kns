// ============================================================
// KNS Brettseiling — Cleanup URL hooks
// ============================================================
// Besøk /.netlify/functions/cleanup-url-hooks for å slette
// ALLE url-type hooks på siden. Bruk dette hvis du må stoppe
// webhook-flow-en mot Apps Script.
// ============================================================

const SITE_ID = '0bac5dc6-0ecb-4383-ab67-f9cb9e0015c9';
const API_BASE = 'https://api.netlify.com/api/v1';

export default async (req) => {
  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) {
    return json({ error: 'NETLIFY_API_TOKEN mangler' }, 500);
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    // Riktig endepunkt: /hooks?site_id=X (IKKE /sites/X/hooks)
    const hooksRes = await fetch(`${API_BASE}/hooks?site_id=${SITE_ID}`, { headers });
    if (!hooksRes.ok) {
      const detaljer = await hooksRes.text();
      return json({
        error: 'Kunne ikke hente hooks',
        status: hooksRes.status,
        detaljer,
      }, 500);
    }
    const hooks = await hooksRes.json();

    const urlHooks = hooks.filter(h => h.type === 'url');
    const slettet = [];
    const feil = [];

    for (const h of urlHooks) {
      const res = await fetch(`${API_BASE}/hooks/${h.id}`, { method: 'DELETE', headers });
      if (res.ok) {
        slettet.push({ hook_id: h.id, form_id: h.form_id, url: h.data && h.data.url });
      } else {
        const tekst = await res.text();
        feil.push({ hook_id: h.id, status: res.status, detaljer: tekst });
      }
    }

    return json({
      status: 'ferdig',
      total_hooks_funnet: hooks.length,
      url_hooks_funnet: urlHooks.length,
      slettet_count: slettet.length,
      slettet,
      feil,
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
