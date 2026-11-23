# ctf-ui

Gedeelde UI-componenten en utilities voor de web-apps van het Café Theater Festival.
Vervangt de kopieer-plak-duplicatie tussen de ~20 kleine React-apps (CRA + Tailwind).

## Installeren (in een app)

```bash
npm install github:LdeGroen/ctf-ui#v0.7.0
```

Pin altijd op een tag (`#v0.7.0`), nooit op `main` — dan kan een wijziging hier
nooit onverwacht een app breken. Nieuwe versie gebruiken = tag ophogen in de app.

## Modules

### `ctf-ui/api` — backend-toegang
- `Client`, `Databases`, `Query`, `ID` — de Appwrite-compatibele shim (voorheen
  het 6× gekopieerde `src/appwriteShim.js`). Zelfde gedrag, zelfde mapping.
- `fetchPublic(path)` — GET naar de publieke API met 15s-timeout, geeft `json.data`.
- `API_URL` — de backend-URL (`VITE_API_URL`, of `REACT_APP_API_URL`). Een leeg
  `VITE_API_URL` betekent relatief (dev-proxy), alleen een ontbrekende valt terug.
- `haalAlleDocumenten(databases, collectie, { signal })` (v0.5.0) — alle pagina's,
  met een bovengrens; een fout gaat door naar de aanroeper.
- `new Databases(client, { herhaal, timeoutMs })` (v0.5.0) — `herhaal` probeert
  een lijst bij een netwerkfout of 5xx nog twee keer (na 1 en 3 s), `timeoutMs`
  breekt een vastgelopen lijstverzoek af. `listDocuments(db, coll, queries, { signal })`
  geeft een signal door. Alles standaard uit. Webapp, timetable en archief
  gebruiken deze shim sinds 21-11-2026 (audit PUB-13).
- `new Databases(client, { inclusiefVerleden: true })` (v0.7.0) — bij
  `executions` ook de voorbije uitvoeringen (`include_past=1`). Archief en impact
  zetten dit; tot v0.7.0 raadde de shim het uit de hostnaam.
- Weg in v0.7.0 (audit POR-08): `Functions`/`ExecutionMethod` (Appwrite-functies
  bestaan niet meer) en de koppeling `app_users`.

```js
import { Databases, ID, fetchPublic } from 'ctf-ui/api';
```

### `ctf-ui/formulier` — de formulier-apps (v0.7.0)
Voor open call, marketing en sollicitaties (audit FRM-13):
- `maakRequest(apiUrl, { kop })` — JSON-verzoek met nette fout (`status`, `body`);
  `kop` geeft de inlogheader, `{ anoniem: true }` laat hem bij één verzoek weg.
- `useAutosave(data, saveFn, delayMs)` — tussentijds opslaan; `flush()` wacht en
  gooit bij een mislukte laatste opslag (audit FRM-09).
- `<ErrorBoundary kleur bewaard>` — geen wit scherm bij een crash; verouderd
  tabblad herlaadt één keer; met `bewaard` (de app slaat tussentijds op) herlaadt
  hij bij elke fout één keer per sessie en zegt hij dat het werk bewaard is.

### `ctf-ui/commi` — de kern van Commi web en mobiel (v0.8.0)
Platte JS, geen React (audit COM-17): `maakChatApi(apiFetch, { bijlage })` met
alle chat-eindpunten, `lokaleTijd`/`voorInvoerveld`/`vasteMomenten`/`wanneer`,
`dagSleutel`/`dagLabel` en `EMOTICONS`/`convertEmoticons`. Mobiel geeft
`bijlage: f => ({ uri, name, type })` mee. Tests: `npm test`.

### `ctf-ui/push` en `ctf-ui/vite` — web-push in de portalen (v0.6.0)
`maakPush({ apiUrl, pad, kop })` geeft `pushSupported`, `getPushState`,
`enablePush(vapidKey, lang)` en `disablePush()`; `kop` levert de inlogheader
van het portaal. De service worker (`sw.js`) zit in dit pakket; zet
`ctfServiceWorker()` uit `ctf-ui/vite` bij de plugins in `vite.config.js` en
haal `public/sw.js` weg. Gebruikt door ctfartiest, ctfhoreca en ctfprogrammeur
(audit POR-07).

```js
import { maakPush } from 'ctf-ui/push';
export const { pushSupported, getPushState, enablePush, disablePush } =
    maakPush({ apiUrl: API_URL, pad: '/api/horeca/public', kop: authHeaders });
```

### `ctf-ui/i18n` — meertaligheid (NL/EN)
`LanguageProvider` (geef je eigen `translations={{nl:{...},en:{...}}}` mee),
`useTranslation()` → `{ t, language, setLanguage }`, en `LanguageSwitcher`.

### `ctf-ui/components`
- Display-familie: `AppShell`, `StatusMessage`, `SelectorNav`, `CardGrid`, `Card`
- Formulieren-familie: `FormField` (variant `light`/`dark`), `SubmitButton`, `useSubmitForm`
- Kleur-constanten: `CTF_GREEN` (#20747F), `CTF_BLUE` (#78b5e3)

### `ctf-ui/tekst` (v0.4.0)
`slugify`, `escHtml`, `escAttr`, `escHtmlStreng`, `parseDateForSorting`. Zonder
afhankelijkheden en als `.mjs`, zodat ook de prerender- en sitemapscripts (node)
hem importeren. De slug bepaalt de URL's van webapp en archief: verander hem
alleen met een plan voor de oude adressen.

### `ctf-ui/opmaak` (v0.4.0)
`applyFormatting`: [b]/[i]/[u] naar HTML, door DOMPurify. Alleen in de browser.

### `ctf-ui/tailwind-preset`
```js
// tailwind.config.js
module.exports = {
  presets: [require('ctf-ui/tailwind-preset')],
  content: ['./src/**/*.{js,jsx}', './public/index.html'],
};
```
Geeft `ctf-green`, `ctf-dark-green` en `ctf-blue` als Tailwind-kleuren.

## Ontwikkelen

Bronnen in `src/` (JSX); `npm run build` compileert naar `dist/` (CRA transpileert
géén JSX in node_modules, dus `dist/` wordt meegecommit). Release:

```bash
npm run build
git add -A && git commit -m "..."
git tag v0.x.y && git push origin main v0.x.y   # een kale tag gaat niet mee met --follow-tags
```

`.github/workflows/dist-klopt.yml` bouwt bij elke push opnieuw en faalt als
`dist/` niet bij `src/` past: dan is er een bron gewijzigd zonder te bouwen, en
krijgen de apps de oude code.

## Deploy-workflow voor de sites

`.github/workflows/deploy-site.yml` is de gedeelde bouw- en uitrolstap (rsync naar de
server, vaste hostsleutel, concurrency). Een app roept hem aan op de tag `deploy-v1`;
het voorbeeld staat bovenin het bestand. Een wijziging = commit + nieuwe tag
(`deploy-v2`) + de apps één voor één omzetten. Staat niet in `files`, dus komt niet
in `node_modules` van de apps terecht.
