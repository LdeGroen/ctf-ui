// Universele "Appwrite compatibility shim" voor de kleine CTF-frontends
// (ctfveiligheid, ctfStamgastenformulier, ctfvrijwilligersformulier,
//  ctfpublieksonderzoek, ctfarchief, ctfimpact, ctfmakersformulier).
//
// Vervang in elke app de regel
//     import { Client, Databases, ID, Query } from 'appwrite';
// door
//     import { Client, Databases, ID, Query } from './appwriteShim';
//
// Zonder andere wijzigingen blijven alle hardgecodeerde Appwrite collection-ID's
// werken: de shim mapt ze automatisch naar onze publieke Laravel API.
//
// Backend URL kan via env: REACT_APP_API_URL of VITE_API_URL (Vite-apps).

const FALLBACK_API_URL = 'https://backend.cafetheaterfestival.nl';
// Een leeg VITE_API_URL is een bewuste keuze: dan lopen de aanroepen relatief,
// en dat heeft de dev-proxy van ctfwebapp nodig (.env.local). Alleen een
// ontbrekende variabele valt terug op de backend.
const VITE_URL = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : undefined;
const API_URL = VITE_URL !== undefined && VITE_URL !== null ? VITE_URL : typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL || FALLBACK_API_URL;

// Mapping: oude Appwrite collection-ID's en namen → onze publieke resource-paden.
const COLLECTION_TO_RESOURCE = {
  '68873b53001cd7a02043': 'contacts',
  '68873b5f0032519e7321': 'companies',
  '68873b6500074288e73d': 'performances',
  '68878ee7000cb07ef9e7': 'locations',
  '68878f2d0020be3a7efd': 'executions',
  '688798900022cbda4ec0': 'events',
  '6888811300080673fa2c': 'settings',
  '68945b4f000e7c3880cb': 'info',
  '68948a4b002d7cda6919': 'nieuws',
  '68948b97003e5aa5068c': 'sponsors',
  '6894d367002bf2645148': 'toegankelijkheid',
  '6899f3390009b108e10f': 'veiligheid',
  '689ded8900383f2d618b': 'marketing',
  '68a174c900178a2511e7': 'stamgast',
  '68aa2809001c0741dd61': 'merch',
  '68aa28eb002bc01dcde3': 'orders_merch',
  handleidingen: 'handleidingen',
  contract_templates: 'contract-templates',
  route: 'routes',
  notificaties: 'notificaties',
  publieksonderzoek: 'publieksonderzoek',
  reserveringen: 'reserveringen',
  jaarplanning: 'jaarplanning',
  begroting: 'begrotingen',
  begrotingsregels: 'begrotingsregels',
  functiehuis: 'functiehuis',
  taakbelasting: 'taakbelasting',
  taakbelastingregel: 'taakbelasting-regels',
  app_users: 'app-users',
  waarkomenmakersterecht: 'waar-komen-makers-terecht'
};
function resolveResource(idOrName) {
  return COLLECTION_TO_RESOURCE[idOrName] || idOrName;
}
function wrapDoc(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const id = doc.id !== undefined ? String(doc.id) : doc.$id;
  return {
    ...doc,
    $id: id,
    $createdAt: doc.created_at || doc.$createdAt,
    $updatedAt: doc.updated_at || doc.$updatedAt,
    $collectionId: '',
    $databaseId: '',
    $permissions: []
  };
}

// `timeoutMs` breekt een vastgelopen verzoek af; een `signal` van de aanroeper
// (in options) blijft daarnaast werken.
async function apiFetch(path, options = {}, timeoutMs = 0) {
  let signal = options.signal;
  let timer;
  if (timeoutMs > 0) {
    const ctrl = new AbortController();
    timer = setTimeout(() => ctrl.abort(), timeoutMs);
    if (signal) {
      if (signal.aborted) ctrl.abort();else signal.addEventListener('abort', () => ctrl.abort(), {
        once: true
      });
    }
    signal = ctrl.signal;
  }
  try {
    return await apiFetchKaal(path, {
      ...options,
      signal
    });
  } finally {
    clearTimeout(timer);
  }
}
async function apiFetchKaal(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? {
        'Content-Type': 'application/json'
      } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`HTTP ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}
export class Client {
  setEndpoint() {
    return this;
  }
  setProject() {
    return this;
  }
}

// Op een festivaldag is het mobiele netwerk in een volle kroeg traag of even
// weg. Met `herhaal` proberen we een mislukt verzoek nog twee keer, na een en
// na drie seconden. Een 4xx is geen netwerkprobleem (behalve 408 en 429) en
// herhalen heeft dan geen zin. Komt uit ctftimetable (audit PUB-13).
const PAUZES_MS = [1000, 3000];
async function metHerhaling(verzoek) {
  let laatste;
  for (let poging = 0; poging <= PAUZES_MS.length; poging++) {
    try {
      return await verzoek();
    } catch (err) {
      laatste = err;
      const status = err && err.status;
      if (status && status < 500 && status !== 408 && status !== 429) throw err;
      if (poging < PAUZES_MS.length) {
        await new Promise(klaar => setTimeout(klaar, PAUZES_MS[poging]));
      }
    }
  }
  throw laatste;
}
export class Databases {
  /**
   * opties (alle optioneel, standaard uit):
   *   herhaal   — een lijst ophalen bij een netwerkfout of 5xx nog twee keer proberen
   *   timeoutMs — een lijstverzoek na zoveel ms afbreken
   */
  constructor(_client, opties = {}) {
    this.opties = opties || {};
  }

  // `opties.signal` gaat door naar fetch, zodat een time-out van de aanroeper
  // het verzoek ook echt afbreekt.
  async listDocuments(_db, collectionIdOrName, queries = [], opties = {}) {
    const resource = resolveResource(collectionIdOrName);
    const {
      herhaal = false,
      timeoutMs = 0
    } = this.opties;
    const lijstFetch = pad => {
      const een = () => apiFetch(pad, {
        signal: opties && opties.signal
      }, timeoutMs);
      return herhaal ? metHerhaling(een) : een();
    };

    // Parse Query-objecten
    let limit = 5000;
    let offset = 0;
    const equalFilters = {};
    const advancedFilters = []; // {op, field, value(s)}
    let orderBy = null;
    let orderDir = null;
    let equalIds = null; // speciale case: Query.equal('$id', [ids])

    (queries || []).forEach(q => {
      if (!q) return;
      switch (q._q) {
        case 'limit':
          limit = q.value;
          break;
        case 'offset':
          offset = q.value;
          break;
        case 'equal':
          if (q.field === '$id' || q.field === 'id') {
            equalIds = Array.isArray(q.value) ? q.value : [q.value];
          } else {
            equalFilters[q.field] = q.value;
          }
          break;
        case 'between':
        case 'greaterThan':
        case 'lessThan':
          advancedFilters.push(q);
          break;
        case 'orderDesc':
          orderBy = q.field;
          orderDir = 'desc';
          break;
        case 'orderAsc':
          orderBy = q.field;
          orderDir = 'asc';
          break;
        default:
          break;
      }
    });

    // Als gefilterd op IDs: haal elk individueel op (eenvoudiger dan multi-id filter op backend).
    if (equalIds && equalIds.length > 0) {
      const results = await Promise.all(equalIds.map(id => apiFetch(`/api/public/${resource}/${id}`).catch(() => null)));
      const documents = results.filter(Boolean).map(wrapDoc);
      return {
        documents,
        total: documents.length
      };
    }
    const page = Math.floor(offset / limit) + 1;
    const params = new URLSearchParams({
      per_page: String(limit),
      page: String(page)
    });
    // Advanced filters: zonder backend-ondersteuning haal je alles op en
    // filtert de shim client-side. Backend wel als hij het kent.
    advancedFilters.forEach((f, idx) => {
      if (f._q === 'greaterThan') params.set(`${f.field}_gt`, String(f.value));
      if (f._q === 'lessThan') params.set(`${f.field}_lt`, String(f.value));
      if (f._q === 'between') {
        params.set(`${f.field}_gte`, String(f.value[0]));
        params.set(`${f.field}_lte`, String(f.value[1]));
      }
    });
    if (orderBy) {
      params.set('order_by', orderBy);
      params.set('order_dir', orderDir);
    }
    // Apps die historische executions nodig hebben (archief, impact) sturen
    // automatisch include_past=1 mee. Andere apps krijgen het future-only filter.
    if (resource === 'executions' && typeof window !== 'undefined') {
      const host = window.location?.hostname || '';
      if (host.includes('archief') || host.includes('impact')) {
        params.set('include_past', '1');
      }
    }
    const json = await lijstFetch(`/api/public/${resource}?${params.toString()}`);
    let documents = (json.data || []).map(wrapDoc);

    // De publieke lijst kent geen vrije filters: ?veld=waarde negeert de
    // backend. Tot 21-11-2026 viel Query.equal daardoor stil weg, en toonde
    // het makersformulier de speelsteden van de eerste 25 voorstellingen
    // van de hele tabel in plaats van die van het gezelschap (audit FRM-07).
    // Nu filtert de shim zelf, maar alleen over wat er binnenkwam: één
    // pagina. Een filter dat ertoe doet hoort in een eigen eindpunt.
    const velden = Object.keys(equalFilters);
    if (velden.length) {
      console.warn(`ctf-ui: Query.equal op ${velden.join(', ')} wordt niet door de backend gefilterd; de shim filtert alleen deze pagina (${resource}).`);
      documents = documents.filter(d => velden.every(k => {
        const waarden = Array.isArray(equalFilters[k]) ? equalFilters[k] : [equalFilters[k]];
        return waarden.some(w => String(d[k]) === String(w));
      }));
    }

    // Client-side filtering voor advanced filters (backend ondersteunt ze nog niet)
    advancedFilters.forEach(f => {
      if (f._q === 'greaterThan') documents = documents.filter(d => d[f.field] > f.value);
      if (f._q === 'lessThan') documents = documents.filter(d => d[f.field] < f.value);
      if (f._q === 'between') {
        documents = documents.filter(d => d[f.field] >= f.value[0] && d[f.field] <= f.value[1]);
      }
    });
    if (orderBy) {
      documents.sort((a, b) => {
        const av = a[orderBy],
          bv = b[orderBy];
        if (av < bv) return orderDir === 'desc' ? 1 : -1;
        if (av > bv) return orderDir === 'desc' ? -1 : 1;
        return 0;
      });
    }
    return {
      documents,
      total: velden.length ? documents.length : json.total ?? documents.length
    };
  }
  async getDocument(_db, collectionIdOrName, id) {
    const resource = resolveResource(collectionIdOrName);
    const json = await apiFetch(`/api/public/${resource}/${id}`);
    return wrapDoc(json.data || json);
  }
  async createDocument(_db, collectionIdOrName, _newId, data) {
    const resource = resolveResource(collectionIdOrName);
    const json = await apiFetch(`/api/public/${resource}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return wrapDoc(json.data || json);
  }
  async updateDocument(_db, collectionIdOrName, id, data) {
    const resource = resolveResource(collectionIdOrName);
    const json = await apiFetch(`/api/public/${resource}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return wrapDoc(json.data || json);
  }
}

/**
 * Alle documenten van een collectie, pagina voor pagina. Pagina's van 5000,
 * de MAX_PER_PAGE van de backend, dus vrijwel altijd één verzoek. Stopt bij
 * een lege pagina of als `total` bereikt is, en na twintig pagina's: anders
 * vraagt hij eindeloos door als `total` meer belooft dan er komt. Een fout
 * gaat door naar de aanroeper; een lege lijst bij een storing overschreef in
 * de publiekssites de goede cache (PUB-04). Gedeeld sinds 21-11-2026 (PUB-13).
 */
export async function haalAlleDocumenten(databases, collectie, {
  signal,
  perPagina = 5000,
  maxPaginas = 20
} = {}) {
  const documents = [];
  let offset = 0;
  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    const response = await databases.listDocuments('', collectie, [Query.limit(perPagina), Query.offset(offset)], {
      signal
    });
    documents.push(...response.documents);
    offset += perPagina;
    if (response.documents.length === 0 || documents.length >= response.total) break;
  }
  return documents;
}
export const Query = {
  limit: n => ({
    _q: 'limit',
    value: n
  }),
  offset: n => ({
    _q: 'offset',
    value: n
  }),
  equal: (field, value) => ({
    _q: 'equal',
    field,
    value
  }),
  between: (field, from, to) => ({
    _q: 'between',
    field,
    value: [from, to]
  }),
  greaterThan: (field, value) => ({
    _q: 'greaterThan',
    field,
    value
  }),
  lessThan: (field, value) => ({
    _q: 'lessThan',
    field,
    value
  }),
  orderDesc: field => ({
    _q: 'orderDesc',
    field
  }),
  orderAsc: field => ({
    _q: 'orderAsc',
    field
  })
};
export const ID = {
  unique: () => null
};

// Functions/ExecutionMethod stubs — niet meer in gebruik (ctfmerch checkout
// loopt nu via /api/public/checkout/merch). Houden we als no-op zodat oude
// `new Functions(client)` regels niet crashen.
export class Functions {
  async createExecution() {
    throw new Error('Appwrite Functions zijn vervangen door directe Laravel endpoints.');
  }
}
export const ExecutionMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
};

// ---------------------------------------------------------------------------
// Directe fetch-helper voor de display-apps (wieiswie/makers/cafes): GET naar
// de publieke API met een 15s-timeout; geeft json.data terug.
export { API_URL };
export async function fetchPublic(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Inloggen: de eenmalige code inwisselen voor een token.
//
// Na het inloggen bij Google stuurt de backend `?code=` terug en niet het token
// zelf: een token in een URL belandt in serverlogs en in de geschiedenis van de
// browser. Die code werkt één keer en vervalt na een minuut.
//
// Dit staat hier en niet in elke app apart, omdat het al een keer is misgegaan:
// ctfdeclaraties las alleen nog `?token=` en negeerde de code. Er was dan niets
// om op te slaan, dus kwam je na het inloggen terug op hetzelfde inlogscherm --
// wat aanvoelt als een eindeloze lus, zonder enige foutmelding. Dat bleef
// maanden onopgemerkt omdat er niemand inlogde.

/** Wisselt een inlogcode in voor een token. Geeft het token, of null. */
export async function wisselInlogcodeIn(code) {
  try {
    const res = await fetch(`${API_URL}/api/auth/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        code
      })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json && json.token || null;
  } catch {
    return null;
  }
}

// De meldingen die de backend (AuthController::authError) meegeeft. Alleen
// die tonen we letterlijk: de parameter staat in de URL en is dus door
// iedereen in te vullen.
const BEKENDE_INLOGFOUTEN = ['Geen toegang. Jouw account staat niet in het systeem.', 'Jouw toegang is verlopen.'];
function inlogFoutTekst(fout) {
  return BEKENDE_INLOGFOUTEN.includes(fout) ? fout : 'Inloggen is niet gelukt.';
}

/**
 * Handelt de terugkeer van de inlogpagina af.
 *
 * Roep dit één keer aan bij het opstarten van de app. Hij kijkt naar de
 * queryparameters, wisselt een code in, ruimt de URL op en geeft terug wat er
 * gebeurde:
 *
 *   { status: 'geen' }                    — niets in de URL, gewoon doorgaan
 *   { status: 'ok', token }               — ingelogd, token opslaan
 *   { status: 'mislukt', melding }        — code verlopen of geweigerd
 *
 * Laat 'mislukt' zien aan de gebruiker. Stil terugvallen op het inlogscherm
 * laat iemand eindeloos op dezelfde knop drukken zonder te weten waarom.
 */
export async function verwerkInlogTerugkeer(zoekstring) {
  const params = new URLSearchParams(typeof zoekstring === 'string' ? zoekstring : window.location.search);
  const code = params.get('code');
  const fout = params.get('auth_error');
  const opruimen = () => {
    try {
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      /* niet fataal */
    }
  };
  if (code) {
    opruimen();
    const t = await wisselInlogcodeIn(code);
    return t ? {
      status: 'ok',
      token: t
    } : {
      status: 'mislukt',
      melding: 'Inloggen is niet gelukt. De inlogcode was verlopen of al gebruikt; probeer het opnieuw.'
    };
  }

  // Een ?token= nemen we bewust niet aan. De backend stuurt sinds H-02b
  // alleen nog ?code=, en met een meegegeven token kon iemand je stil in
  // zíjn account laten werken (je IBAN en adres komen dan bij hem terecht).
  // Wel uit het adres vegen.
  if (params.has('token')) opruimen();
  if (fout) {
    opruimen();
    return {
      status: 'mislukt',
      melding: inlogFoutTekst(fout)
    };
  }
  return {
    status: 'geen'
  };
}