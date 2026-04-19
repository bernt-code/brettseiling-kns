# Nybegynner-skjemaer — oppsett etter endringer

## Hva endret seg

Nybegynner-siden har nå **tre separate skjemaer** som byttes via toggle-knappene:

| Kursvalg | Skjemanavn (Netlify)   | Google Sheets-fane       | Mailmottaker            |
|----------|------------------------|--------------------------|-------------------------|
| Helg     | `nybegynner`           | `nybegynner`             | geirmjo@gmail.com       |
| Ukedager | `nybegynner-ukedager`  | `nybegynner-ukedager`    | geirmjo@gmail.com       |
| Sesong   | `nybegynner-sesong`    | `nybegynner-sesong`      | geirmjo@gmail.com       |

Alle tre har nytt **valgfritt** felt `foreldrenavn` ("hvis deltaker er
under 18"). Helg-skjemaet sender også med `kurshelg`.

## Kjøreplan — 3 steg

### Steg 1 — Deploy
Push endringene til GitHub / Netlify. Netlify oppdager de to nye
skjemaene automatisk ved første deploy.

### Steg 2 — Sett opp e-postnotifikasjoner (automatisk)
Etter deploy: besøk denne URL-en én gang i nettleseren:

```
https://brettseiling-kns.netlify.app/.netlify/functions/setup-notifications
```

Funksjonen leser alle skjemaer, sjekker hva som allerede er satt opp,
og oppretter e-postnotifikasjoner for alle skjemaene i henhold til
mappingen i tabellen over. Den er idempotent — trygg å kjøre flere
ganger, ingenting dupliseres.

Du får tilbake en JSON-rapport som viser hva som ble `opprettet`,
`hoppet_over` (fordi det allerede finnes) eller hvilke skjemaer som
var `ukjente` (typisk gamle `-page`-duplikater — kan ignoreres).

### Steg 3 — Oppdater Google Apps Script (manuelt, siste gang)
Denne biten må fortsatt gjøres i script.google.com fordi Apps Script
ikke har et API for å oppdatere kode:

1. Gå til https://script.google.com
2. Åpne KNS-prosjektet
3. Slett gammel kode, lim inn hele den nye `pameldte-til-sheets.js`
4. Kjør `setup()`-funksjonen — oppretter de to nye fanene og
   oppdaterer overskriftene
5. Distribuer på nytt (**Deploy → Manage deployments → ✏️ Edit →
   New version → Deploy**)

> ⚠️ **NB om eksisterende nybegynner-fane:** Kolonnestrukturen har
> endret seg (lagt til `Kurshelg` og `Foreldrenavn`). Gamle rader
> får tomme felt der. Dataene forsvinner ikke, men kan se litt
> forskjøvet ut. Vurder backup før du kjører `setup()` på nytt.

### Steg 4 — Webhook til Apps Script (for de to nye skjemaene)
De to nye skjemaene trenger også webhook til Apps Script slik at
påmeldingene kommer inn i Google Sheets. Dette kan også automatiseres
— si fra hvis du vil ha det utvidet i `setup-notifications.mjs`,
men da trenger jeg Apps Script Web App URL-en din.

## Rydding (valgfritt)
Det ligger 4 gamle duplikatskjemaer i Netlify med `-page`-suffiks
(`nybegynner-page`, `learn2fly-page`, `iqfoil-race-page`,
`flight-academy-page`), alle med 0 innsendinger. De kan slettes fra
Netlify-dashboardet når det passer.
