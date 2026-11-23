// Gedeeld gereedschap voor de formulier-apps (open call, marketing,
// sollicitaties): het verzoek naar de backend, tussentijds opslaan en het
// vangnet bij een crash. Stond tot 23-11-2026 drie keer, op kleine verschillen
// na gelijk (audit FRM-13).
//
//   import { maakRequest, useAutosave, ErrorBoundary } from 'ctf-ui/formulier';
//   const request = maakRequest(API_URL, { kop: authHeaders });
//
// Een verbetering hier geldt voor alle drie na een tagbump; zet er in een app
// dus geen eigen kopie meer naast.

import React, { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Verzoek

/**
 * Maakt een `request(pad, opties)` voor de publieke formulier-API.
 *
 * - JSON heen en terug; FormData gaat ongewijzigd mee (uploads).
 * - 204 geeft null; een fout gooit een Error met `status` en `body`, en de
 *   `message` van de backend als tekst.
 * - `kop` geeft de inlogheader(s) van het portaal; met `anoniem: true` in de
 *   opties van één verzoek gaan die niet mee (het inloggen zelf).
 *
 * @param {string} apiUrl
 * @param {{ kop?: () => object }} [instellingen]
 */
export function maakRequest(apiUrl, { kop = () => ({}) } = {}) {
    return async function request(path, options = {}) {
        const { anoniem, ...fetchOpties } = options;
        const headers = {
            Accept: 'application/json',
            ...(anoniem ? {} : kop()),
            ...(fetchOpties.headers || {}),
        };
        if (fetchOpties.body && !(fetchOpties.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(`${apiUrl}${path}`, { ...fetchOpties, headers });
        if (res.status === 204) return null;
        const ct = res.headers.get('content-type') || '';
        const body = ct.includes('application/json') ? await res.json() : await res.text();
        if (!res.ok) {
            const err = new Error((body && body.message) || `HTTP ${res.status}`);
            err.status = res.status;
            err.body = body;
            throw err;
        }
        return body;
    };
}

// ---------------------------------------------------------------------------
// Tussentijds opslaan

/**
 * Debounced autosave.
 *
 * @param {object} data        de huidige formulier-state
 * @param {function} saveFn    async functie die data opslaat
 * @param {number} delayMs     debounce-tijd
 *
 * Geeft { status: 'idle'|'saving'|'saved'|'error', lastError, flush }.
 *
 * `flush()` wacht tot alles echt is opgeslagen, ook een opslag die al onderweg
 * was, en gooit een fout als de laatste opslag mislukte. Tot 21-11-2026 kwam
 * hij meteen terug als er al een opslag liep en slikte hij een fout in:
 * indienen ging dan door zonder de laatste wijziging (audit FRM-09). Wie alleen
 * wil bewaren zonder te stoppen bij een fout (een stap verder), vangt de fout
 * zelf af.
 */
export function useAutosave(data, saveFn, delayMs = 800) {
    const [status, setStatus] = useState('idle');
    const [lastError, setLastError] = useState(null);
    const timerRef = useRef(null);
    const lastSavedRef = useRef(null);
    const isFirstRun = useRef(true);
    // De opslagen lopen na elkaar; elke stap slaat de nieuwste stand op die er
    // op dat moment is, zodat tussenstanden worden overgeslagen.
    const ketenRef = useRef(Promise.resolve());
    const nieuwsteRef = useRef(null);
    const dataRef = useRef(data);
    dataRef.current = data;
    const saveRef = useRef(saveFn);
    saveRef.current = saveFn;

    useEffect(() => {
        // Eerste run is het laden uit de backend: niets op te slaan.
        if (isFirstRun.current) {
            isFirstRun.current = false;
            lastSavedRef.current = JSON.stringify(data);
            return undefined;
        }
        const serialized = JSON.stringify(data);
        if (serialized === lastSavedRef.current) return undefined;

        if (timerRef.current) clearTimeout(timerRef.current);
        setStatus('saving');
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            // De fout staat al in status/lastError.
            runSave(serialized).catch(() => {});
        }, delayMs);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    function runSave(serialized) {
        nieuwsteRef.current = serialized;
        const stap = ketenRef.current.catch(() => {}).then(async () => {
            const s = nieuwsteRef.current;
            if (s === lastSavedRef.current) return;
            await saveRef.current(JSON.parse(s));
            lastSavedRef.current = s;
        });
        ketenRef.current = stap;
        stap.then(
            () => {
                if (ketenRef.current === stap) {
                    setStatus('saved');
                    setLastError(null);
                }
            },
            (e) => {
                if (ketenRef.current === stap) {
                    setStatus('error');
                    setLastError((e && e.message) || String(e));
                }
            },
        );
        return stap;
    }

    const flush = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        // Ook als er niets nieuws is: wachten op een opslag die nog loopt.
        return runSave(JSON.stringify(dataRef.current));
    };

    return { status, lastError, flush };
}

// ---------------------------------------------------------------------------
// Vangnet bij een crash

// Dezelfde bewoordingen als src/utils/chunkFout.js in ctfcrm. Wissel je van
// bundelaar, kijk dan daar én hier: een build merkt hier niets van.
const CHUNK_BEWOORDINGEN = [
    /Loading chunk [\w-]+ failed/i,
    /Loading CSS chunk [\w-]+ failed/i,
    /ChunkLoadError/i,
    /Failed to fetch dynamically imported module/i,
    /error loading dynamically imported module/i,
    /Importing a module script failed/i,
];

export function isChunkFout(error) {
    if (!error) return false;
    if (error.name === 'ChunkLoadError') return true;
    const tekst = error.message || String(error);
    return CHUNK_BEWOORDINGEN.some((r) => r.test(tekst));
}

// Een verouderd tabblad: één keer herladen, niet opnieuw binnen dertig seconden.
function herlaadNaUitrol() {
    try {
        const vorige = parseInt(sessionStorage.getItem('ctf_chunk_reload_at') || '0', 10);
        const nu = Date.now();
        if (vorige && (nu - vorige) <= 30000) return false;
        sessionStorage.setItem('ctf_chunk_reload_at', String(nu));
    } catch {
        // Geen sessionStorage (privémodus): dan maar zonder bewaking.
    }
    window.location.reload();
    return true;
}

// Bij elke fout één keer per sessie herladen (alleen met `bewaard`).
function herstelEenmalig() {
    try {
        if (sessionStorage.getItem('ctf_form_hersteld')) return false;
        sessionStorage.setItem('ctf_form_hersteld', '1');
    } catch {
        return false;
    }
    window.location.reload();
    return true;
}

/**
 * Vangt een crash in de React-boom op, zodat er geen wit scherm overblijft.
 *
 * - Een verouderd tabblad na een uitrol (chunk niet gevonden) herlaadt één keer.
 * - `bewaard`: de app slaat tussentijds op (useAutosave). Dan herlaadt hij bij
 *   élke fout één keer per sessie vanzelf, en zegt de tekst dat het ingevulde
 *   bewaard is. Aanleiding: twee makers kregen in de open call een crash van
 *   een browserextensie en kwamen nooit terug (6 t/m 9-9-2026). Zonder
 *   tussentijds opslaan kan herladen werk kosten; dan beslist de bezoeker.
 * - Hij meldt de fout zelf: via `window.ctfMeldFout` als het inline-script dat
 *   heeft, anders als ErrorEvent op window, waar de foutmelder al naar
 *   luistert. Een regel bijzetten in dat inline-script verandert zijn sha256
 *   in de CSP (maak-headers.mjs in ctfbackend); doe dat dus niet hiervoor.
 * - `kleur`: de knop, in de huisstijl van de app.
 *
 * Inline stijlen, geen Tailwind: dan hoeft geen app ctf-ui in zijn
 * content-paden te zetten.
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { gecrasht: false };
    }

    static getDerivedStateFromError() {
        return { gecrasht: true };
    }

    componentDidCatch(error) {
        if (isChunkFout(error) && herlaadNaUitrol()) return;
        if (this.props.bewaard && herstelEenmalig()) return;

        try {
            if (typeof window.ctfMeldFout === 'function') {
                window.ctfMeldFout(String(error && error.message), error && error.stack);
            } else {
                window.dispatchEvent(new ErrorEvent('error', { message: String(error && error.message), error }));
            }
        } catch {
            // Melden mag nooit een tweede crash geven.
        }
    }

    render() {
        if (!this.state.gecrasht) return this.props.children;
        const { kleur = '#20747F', bewaard = false } = this.props;

        const nl = bewaard
            ? 'Wat je al had ingevuld is bewaard. Herlaad de pagina om verder te gaan; kom je er niet uit, mail dan naar info@cafetheaterfestival.nl.'
            : 'Herlaad de pagina om het opnieuw te proberen. Lukt het niet, mail dan naar info@cafetheaterfestival.nl.';
        const en = bewaard
            ? 'Everything you filled in has been saved. Reload the page to continue; if that does not help, email info@cafetheaterfestival.nl.'
            : 'Reload the page to try again. If that does not help, email info@cafetheaterfestival.nl.';

        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'system-ui, sans-serif', background: '#f7f6fa' }}>
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,.12)', padding: 24, maxWidth: 440, textAlign: 'center', color: '#1f2937' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Er ging iets mis op deze pagina</h2>
                    <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 16px' }}>{nl}</p>
                    <h2 lang="en" style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>Something went wrong on this page</h2>
                    <p lang="en" style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{en}</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        style={{ marginTop: 20, border: 0, borderRadius: 8, background: kleur, color: '#fff', padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Pagina herladen · Reload
                    </button>
                </div>
            </div>
        );
    }
}
