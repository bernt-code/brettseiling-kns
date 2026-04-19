// ============================================================
// KNS Brettseiling — Google Apps Script
// Mottar påmeldinger fra Netlify og skriver til Google Sheets
// ============================================================
//
// OPPSETT (gjøres én gang — følg steg i rekkefølge):
//
// 1. Gå til: https://sheets.new
//    Lag et nytt, tomt Google Regneark.
//    Kopier ID-en fra URL-en (den lange strengen mellom /d/ og /edit).
//    Lim den inn nedenfor ved SPREADSHEET_ID.
//
// 2. Gå til: https://script.google.com
//    Klikk "+ Nytt prosjekt"
//    Slett all eksisterende kode og lim inn HELE denne filen.
//
// 3. Velg funksjonen "setup" i nedtrekksmenyen og klikk ▶ (kjør).
//    Dette oppretter alle fire fanene og deler arket med alle trenerne.
//    (Du vil bli bedt om å godkjenne tilganger — det er normalt.)
//
// 4. Klikk "Distribuer" → "Ny distribusjon"
//    Velg type: Web-app
//    Kjør som: Meg (din Google-konto)
//    Hvem har tilgang: Alle
//    Klikk "Distribuer" og kopier Web App URL-en.
//
// 5. Gå til Netlify → ditt nettsted → Forms
//    Klikk på et skjema → "Settings" → "Form notifications"
//    Legg til Outgoing webhook → lim inn Web App URL-en
//    Gjør dette for ALLE skjemaene:
//      - nybegynner (helg)
//      - nybegynner-sesong
//      - learn2fly
//      - flight-academy
//      - iqfoil-race
//    (Alle bruker den SAMME Web App URL-en.)
//
// ============================================================

const SPREADSHEET_ID = '1IB2q9SgNJ63yc6aCT9bo1EPltvKEGhLhH0H2naSVbQk';

// Alle med e-post i systemet får redigeringstilgang til regnearket
const REDAKTORER = [
  'geirmjo@gmail.com',          // Geir Mjøen — Nybegynner
  'sunniva.stenmark@gmail.com', // Sunniva Stenmark — Learn2fly
  'hjosnes@gmail.com',          // Hans-Jørgen Osnes — Flight Academy
  'berntblankholm@gmail.com',   // Bernt Blankholm — IQ Foil Race
  'geir@kns.no',                // Geir Dahl Andersen — Hovedtrener
];

// Kolonneoverskrifter per gruppe (fane)
const KOLONNER = {
  'nybegynner':           ['Tidspunkt', 'Kurshelg', 'Fornavn', 'Etternavn', 'E-post', 'Telefon', 'Alder', 'Foreldrenavn', 'Melding'],
  'nybegynner-sesong':    ['Tidspunkt', 'Sesong', 'Fornavn', 'Etternavn', 'E-post', 'Telefon', 'Alder', 'Foreldrenavn', 'Eget utstyr', 'Melding'],
  'learn2fly':            ['Tidspunkt', 'Fornavn', 'Etternavn', 'E-post', 'Telefon', 'Erfaring', 'Melding'],
  'flight-academy':       ['Tidspunkt', 'Fornavn', 'Etternavn', 'E-post', 'Telefon', 'Erfaring', 'Foilerfaring', 'Melding'],
  'iqfoil-race':          ['Tidspunkt', 'Fornavn', 'Etternavn', 'E-post', 'Telefon', 'Alder', 'Seilbakgrunn'],
};

// Farger per gruppe (topptekst-bakgrunn)
const FARGER = {
  'nybegynner':           '#1a6b3a', // grønn
  'nybegynner-sesong':    '#0f4f28', // mørkere grønn
  'learn2fly':            '#15233c', // navy
  'flight-academy':       '#7c3aed', // lilla
  'iqfoil-race':          '#c9a227', // gull
};

// ============================================================
// SETUP — kjør denne manuelt én gang etter opprettelse
// Oppretter alle fire fanene og deler arket med alle trenerne
// ============================================================
function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // --- Opprett én fane per gruppe ---
  const grupperekkefølge = ['nybegynner', 'nybegynner-sesong', 'learn2fly', 'flight-academy', 'iqfoil-race'];

  for (const gruppe of grupperekkefølge) {
    let ark = ss.getSheetByName(gruppe);
    if (!ark) {
      ark = ss.insertSheet(gruppe);
    }

    const overskrifter = KOLONNER[gruppe];
    const farge = FARGER[gruppe] || '#15233c';

    // Skriv overskrifter med farge
    const overskriftRad = ark.getRange(1, 1, 1, overskrifter.length);
    overskriftRad.setValues([overskrifter]);
    overskriftRad.setFontWeight('bold');
    overskriftRad.setFontColor('#ffffff');
    overskriftRad.setBackground(farge);
    overskriftRad.setFontSize(11);

    // Frys overskriftsraden og juster kolonnebredder
    ark.setFrozenRows(1);
    ark.setColumnWidth(1, 170); // Tidspunkt
    ark.setColumnWidth(3, 120); // Etternavn
    ark.setColumnWidth(4, 200); // E-post
    ark.autoResizeColumn(2);    // Fornavn
  }

  // Flytt/slett standardarket "Ark1" hvis det finnes
  const standardark = ss.getSheetByName('Ark1') || ss.getSheetByName('Sheet1');
  if (standardark && ss.getSheets().length > 1) {
    ss.deleteSheet(standardark);
  }

  // --- Del arket med alle trenerne ---
  for (const epost of REDAKTORER) {
    try {
      ss.addEditor(epost);
      Logger.log('Delt med: ' + epost);
    } catch (feil) {
      Logger.log('Kunne ikke dele med ' + epost + ': ' + feil.message);
    }
  }

  Logger.log('✅ Oppsett fullført! Fire faner opprettet og arket er delt med ' + REDAKTORER.length + ' redaktører.');
  Logger.log('📋 Redaktører: ' + REDAKTORER.join(', '));
}

// ============================================================
// Hjelpefunksjon — brukes av doPost() for å sikre fanen finnes
// ============================================================
function hentEllerOpprettArk(ss, skjemanavn) {
  let ark = ss.getSheetByName(skjemanavn);
  if (!ark) {
    ark = ss.insertSheet(skjemanavn);
    const overskrifter = KOLONNER[skjemanavn] || ['Tidspunkt', 'Data'];
    const farge = FARGER[skjemanavn] || '#15233c';
    const overskriftRad = ark.getRange(1, 1, 1, overskrifter.length);
    overskriftRad.setValues([overskrifter]);
    overskriftRad.setFontWeight('bold');
    overskriftRad.setFontColor('#ffffff');
    overskriftRad.setBackground(farge);
    ark.setFrozenRows(1);
    ark.setColumnWidth(1, 170);
  }
  return ark;
}

// ============================================================
// Hovedfunksjon — kalles av Netlify webhook
// ============================================================
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // Netlify sender skjemanavnet i payload.form_name
    // (payload.name er personens navn, IKKE skjemanavnet)
    const skjemanavn = payload.form_name || payload.data?.['form-name'] || payload.name || 'ukjent';
    const data = payload.data || {};
    const tidspunkt = new Date().toLocaleString('no-NO', { timeZone: 'Europe/Oslo' });

    // Åpne regnearket og finn riktig fane
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const ark = hentEllerOpprettArk(ss, skjemanavn);

    // Bygg rad basert på skjematype
    let rad;
    if (skjemanavn === 'nybegynner') {
      rad = [
        tidspunkt,
        data.kurshelg     || '',
        data.fornavn      || '',
        data.etternavn    || '',
        data.epost        || '',
        data.telefon      || '',
        data.alder        || '',
        data.foreldrenavn || '',
        data.melding      || '',
      ];
    } else if (skjemanavn === 'nybegynner-sesong') {
      rad = [
        tidspunkt,
        data.sesong       || '',
        data.fornavn      || '',
        data.etternavn    || '',
        data.epost        || '',
        data.telefon      || '',
        data.alder        || '',
        data.foreldrenavn || '',
        data.egetutstyr   || '',
        data.melding      || '',
      ];
    } else if (skjemanavn === 'learn2fly') {
      rad = [
        tidspunkt,
        data.fornavn    || '',
        data.etternavn  || '',
        data.epost      || '',
        data.telefon    || '',
        data.erfaring   || '',
        data.melding    || '',
      ];
    } else if (skjemanavn === 'flight-academy') {
      rad = [
        tidspunkt,
        data.fornavn       || '',
        data.etternavn     || '',
        data.epost         || '',
        data.telefon       || '',
        data.erfaring      || '',
        data.foilerfaring  || '',
        data.melding       || '',
      ];
    } else if (skjemanavn === 'iqfoil-race') {
      rad = [
        tidspunkt,
        data.fornavn    || '',
        data.etternavn  || '',
        data.epost      || '',
        data.telefon    || '',
        data.alder      || '',
        data.bakgrunn   || '',
      ];
    } else {
      // Ukjent skjema — lagre rå data
      rad = [tidspunkt, JSON.stringify(data)];
    }

    ark.appendRow(rad);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', skjema: skjemanavn }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (feil) {
    console.error('Feil ved mottak av påmelding:', feil.message);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'feil', melding: feil.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// Testfunksjon — kjør denne manuelt i Apps Script-editoren
// for å bekrefte at skriving til regnearket fungerer
// ============================================================
function testSkriv() {
  const testPayload = {
    name: 'nybegynner',
    data: {
      fornavn:   'Test',
      etternavn: 'Person',
      epost:     'test@kns.no',
      telefon:   '400 00 000',
      alder:     '28',
      melding:   'Dette er en test fra Apps Script',
    }
  };

  const e = { postData: { contents: JSON.stringify(testPayload) } };
  const resultat = doPost(e);
  Logger.log('Resultat: ' + resultat.getContent());
}
