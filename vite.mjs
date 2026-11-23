// Vite-plugin: zet de gedeelde service worker van ctf-ui als /sw.js in de
// build, en serveert hem tijdens `vite` (dev) op hetzelfde adres. Zo staat
// sw.js niet meer als kopie in public/ van elk portaal (audit POR-07).
//
//   import { ctfServiceWorker } from 'ctf-ui/vite';
//   plugins: [react(), ctfServiceWorker()]
//
// Staat er toch nog een public/sw.js, dan wint die in dev en botst hij bij het
// bouwen; haal hem weg.

import { readFileSync } from 'node:fs';

const BRON = new URL('./sw.js', import.meta.url);

export function ctfServiceWorker({ bestand = 'sw.js' } = {}) {
    const lees = () => readFileSync(BRON, 'utf8');

    return {
        name: 'ctf-ui-service-worker',
        configureServer(server) {
            server.middlewares.use(`/${bestand}`, (req, res) => {
                res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
                res.setHeader('Service-Worker-Allowed', '/');
                res.end(lees());
            });
        },
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: bestand, source: lees() });
        },
    };
}
