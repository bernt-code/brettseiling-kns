// ============================================================
// KNS Brettseiling — Apps Script webhook
// ============================================================
// Tar imot skjemainnsendinger fra Netlify Forms (outgoing
// webhook) og skriver en rad til riktig fane i Sheetet.
//
// Koble opp:
//   1) Lim inn denne koden i Apps Script bundet til Sheetet
//   2) Implementer → Ny implementering → Webapp
//      - Kjør som: Meg
//      - Tilgang: Alle (må være det for at Netlify skal nå det)
//   3) Kopier Web App URL
//   4) Legg URL-en inn i Netlify som outgoing webhook på hvert
//      skjema (eller automatisk via setup-notifications.mjs)
// ============================================================

const SPREADSHEET_ID = '1IB2q9SgNJ63yc6aCT9bo1EPltvKEGhLhH0H2naSVbQk';

// Kolonner per fane (rekkefølgen bestemmer rad-rekkefølgen)
const KOLONNER = {
  'nybegynner':        ['Tidspunkt', 'Kurshelg', 'Fornavn', 'Etternavn', 'E-post', 'Telefon', 'Alder', 'Foreldrenavn', 'Melding'],
  'nybegynner-sesong': ['Tidspunkt', 'Sesong',   'Fornavn', 'Etternavn', 'E-post', 'Telefon', 'Alder', 'Foreldrenavn', 'Egetutstyr', 'Melding'],
  'learn2fly':         ['Tidspunkt', 'Fornavn',  'Etternavn', 'E-post', 'Telefon', 'Erfaring', 'Melding'],
  'flight-academy':    ['Tidspunkt', 'Fornavn',  'Etternavn', 'E-post', 'Telefon', 'Erfaring', 'Foilerfaring', 'Melding'],
  'iqfoil-race':       ['Tidspunkt', 'Fornavn',  'Etternavn', 'E-post', 'Telefon', 'Alder', 'Bakgrunn'],
};

// Kolonnenavn → feltnavn i Netlify-payloaden
const FELT_MAPPING = {
  'Kurshelg':     'kurshelg',
  'Sesong':       'sesong',
  'Fornavn':      'fornavn',
  'Etternavn':    'etternavn',
  'E-post':       'epost',
  'Telefon':      'telefon',
  'Alder':        'alder',
  'Foreldrenavn': 'foreldrenavn',
  'Melding':      'melding',
  'Erfaring':     'erfaring',
  'Foilerfaring': 'foilerfaring',
  'Bakgrunn':     'bakgrunn',
  'Egetutstyr':   'egetutstyr',
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const formName = payload.form_name;
    const data = payload.data || {};

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(formName);

    if (!sheet) {
      return svarJson({ error: 'Ingen fane for skjema: ' + formName }, 400);
    }

    const kolonner = KOLONNER[formName];
    if (!kolonner) {
      return svarJson({ error: 'Ingen kolonne-mapping for: ' + formName }, 400);
    }

    // Sett headers i rad 1 hvis fanen er tom
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, kolonner.length).setValues([kolonner]);
      sheet.getRange(1, 1, 1, kolonner.length).setFontWeight('bold');
    }

    // Bygg rad
    const rad = kolonner.map(header => {
      if (header === 'Tidspunkt') return new Date();
      const feltnavn = FELT_MAPPING[header];
      return feltnavn ? (data[feltnavn] || '') : '';
    });

    sheet.appendRow(rad);

    return svarJson({ success: true, form: formName, rader: sheet.getLastRow() });

  } catch (err) {
    return svarJson({ error: err.message, stack: err.stack }, 500);
  }
}

// GET kan brukes til å sjekke at endepunktet lever
function doGet() {
  return svarJson({ status: 'KNS Brettseiling webhook lever', tid: new Date() });
}

function svarJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// Test-funksjon — kjør manuelt fra Apps Script editor
// (Velg 'testInnsending' i funksjons-dropdown, trykk Kjør)
// ============================================================
function testInnsending() {
  const testPayload = {
    form_name: 'nybegynner',
    data: {
      kurshelg:     'Test — 1.-2. juni',
      fornavn:      'Kari',
      etternavn:    'Testsen',
      epost:        'kari@test.no',
      telefon:      '99887766',
      alder:        '14',
      foreldrenavn: 'Ola Testsen',
      melding:      'Dette er en testinnsending fra Apps Script',
    },
  };

  const res = doPost({ postData: { contents: JSON.stringify(testPayload) } });
  Logger.log(res.getContent());
}
