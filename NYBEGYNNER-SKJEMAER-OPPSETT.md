# Nybegynner-skjemaer — oppsett etter endringer

## Hva endret seg

Nybegynner-siden har nå **to skjemaer** som byttes via toggle-knappene:

| Kursvalg  | Skjemanavn (Netlify)   | Google Sheets-fane     | Mailmottaker       |
|-----------|------------------------|------------------------|--------------------|
| Helg      | `nybegynner`           | `nybegynner`           | geirmjo@gmail.com  |
| Sesong    | `nybegynner-sesong`    | `nybegynner-sesong`    | geirmjo@gmail.com  |

Sesongskjemaet har nå en **obligatorisk dropdown** for å velge mellom
*Sommer (9. mai – 20. juni)* og *Høst (15. juli – 30. september)*. Verdien
sendes i feltet `sesong` og kommer med i mailen og i Sheets.

Begge skjemaene har **valgfritt** felt `foreldrenavn` ("hvis deltaker er
under 18"). Helg-skjemaet sender også med `kurshelg`.

> Ukedager-skjemaet er fjernet.

## Kjøreplan — 4 steg

### Steg 1 — Deploy
Push endringene til GitHub / Netlify. Netlify auto-deployer siden ved push til `main`.

### Steg 2 — Oppdater e-postvarsler (automatisk)
Etter deploy: besøk denne URL-en én gang i nettleseren:

```
https://brettseiling-kns.netlify.app/.netlify/functions/setup-notifications
```

Funksjonen er idempotent — den oppretter ikke duplikater. Mappingen er
oppdatert slik at `nybegynner-ukedager` ikke lenger er en forventet
mottaker.

### Steg 3 — Slett Ukedager-skjemaet i Netlify (manuelt)
Gå til https://app.netlify.com/projects/brettseiling-kns/forms, finn
`nybegynner-ukedager` (har 0 innsendinger) og slett det. Tilhørende
e-postvarsel forsvinner automatisk.

### Steg 4 — Oppdater Google Apps Script (manuelt)
Apps Script mangler API for kode-oppdatering, så dette må gjøres i
script.google.com:

1. Gå til https://script.google.com
2. Åpne KNS-prosjektet
3. Slett gammel kode, lim inn hele den nye `pameldte-til-sheets.js`
4. Kjør `setup()`-funksjonen — oppdaterer `nybegynner-sesong`-fanen med
   den nye `Sesong`-kolonnen
5. Distribuer på nytt (**Deploy → Manage deployments → ✏️ Edit →
   New version → Deploy**)

> ⚠️ **NB om eksisterende nybegynner-sesong-fane:** Den får nå en ny
> kolonne `Sesong` mellom `Tidspunkt` og `Fornavn`. Gamle rader får tomt
> felt der. Dataene forsvinner ikke, men kolonnene forskyves. Vurder
> backup før du kjører `setup()` på nytt.

> Hvis `nybegynner-sesong` mangler webhook til Apps Script, legg til:
> Netlify → Forms → nybegynner-sesong → Settings → Form notifications →
> Add notification → Outgoing webhook → URL = Apps Script Web App URL.

## Rydding (valgfritt)
Det ligger 4 gamle duplikatskjemaer i Netlify med `-page`-suffiks
(`nybegynner-page`, `learn2fly-page`, `iqfoil-race-page`,
`flight-academy-page`), alle med 0 innsendinger. De kan slettes fra
Netlify-dashboardet når det passer.
