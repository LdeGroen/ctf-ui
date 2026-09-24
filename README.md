# ctf-ui

Gedeelde UI-componenten en utilities voor de web-apps van het Café Theater Festival.
Vervangt de kopieer-plak-duplicatie tussen de ~20 kleine React-apps (CRA + Tailwind).

## Installeren (in een app)

```bash
npm install github:LdeGroen/ctf-ui#v0.1.0
```

Pin altijd op een tag (`#v0.1.0`), nooit op `main` — dan kan een wijziging hier
nooit onverwacht een app breken. Nieuwe versie gebruiken = tag ophogen in de app.

## Modules

### `ctf-ui/api` — backend-toegang
- `Client`, `Databases`, `Query`, `ID` — de Appwrite-compatibele shim (voorheen
  het 6× gekopieerde `src/appwriteShim.js`). Zelfde gedrag, zelfde mapping.
- `fetchPublic(path)` — GET naar de publieke API met 15s-timeout, geeft `json.data`.
- `API_URL` — de backend-URL (respecteert `REACT_APP_API_URL`).

```js
import { Databases, ID, fetchPublic } from 'ctf-ui/api';
```

### `ctf-ui/i18n` — meertaligheid (NL/EN)
`LanguageProvider` (geef je eigen `translations={{nl:{...},en:{...}}}` mee),
`useTranslation()` → `{ t, language, setLanguage }`, en `LanguageSwitcher`.

### `ctf-ui/components`
- Display-familie: `AppShell`, `StatusMessage`, `SelectorNav`, `CardGrid`, `Card`
- Formulieren-familie: `FormField` (variant `light`/`dark`), `SubmitButton`, `useSubmitForm`
- Kleur-constanten: `CTF_GREEN` (#20747F), `CTF_BLUE` (#78b5e3)

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
git tag v0.x.y && git push origin main --tags
```

## Deploy-workflow voor de sites

`.github/workflows/deploy-site.yml` is de gedeelde bouw- en uitrolstap (rsync naar de
server, vaste hostsleutel, concurrency). Een app roept hem aan op de tag `deploy-v1`;
het voorbeeld staat bovenin het bestand. Een wijziging = commit + nieuwe tag
(`deploy-v2`) + de apps één voor één omzetten. Staat niet in `files`, dus komt niet
in `node_modules` van de apps terecht.
