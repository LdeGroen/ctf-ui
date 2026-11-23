// Web-push voor de pincode-portalen (artiest, horeca, programmeur): service
// worker registreren, abonneren en afmelden, en het abonnement naar de backend
// sturen. Stond tot 23-11-2026 drie keer in de portalen, op het API-pad na
// gelijk (audit POR-07).
//
//   import { maakPush } from 'ctf-ui/push';
//   export const { pushSupported, getPushState, enablePush, disablePush } =
//       maakPush({ apiUrl: API_URL, pad: '/api/horeca/public', kop: authHeaders });
//
// De service worker zelf komt uit ctf-ui (sw.js), via ctfServiceWorker() uit
// 'ctf-ui/vite' in vite.config.js.

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

/**
 * @param {object} opties
 * @param {string} opties.apiUrl  de backend, zonder slash aan het eind
 * @param {string} opties.pad     bijvoorbeeld '/api/artist/public'
 * @param {() => object} [opties.kop]  de inlogheader(s) van het portaal
 * @param {string} [opties.sw]    pad van de service worker
 */
export function maakPush({ apiUrl, pad, kop = () => ({}), sw = '/sw.js' }) {
    function pushSupported() {
        return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
            && 'PushManager' in window && 'Notification' in window;
    }

    async function getPushState() {
        if (!pushSupported()) return 'unsupported';
        if (Notification.permission === 'denied') return 'denied';
        try {
            const reg = await navigator.serviceWorker.getRegistration(sw);
            const sub = reg ? await reg.pushManager.getSubscription() : null;
            return sub ? 'subscribed' : 'default';
        } catch {
            return 'default';
        }
    }

    async function enablePush(vapidPublicKey, lang) {
        if (!pushSupported() || !vapidPublicKey) throw new Error('niet ondersteund');
        const reg = await navigator.serviceWorker.register(sw);
        await navigator.serviceWorker.ready;
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') throw new Error('geen toestemming');

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
        }
        const json = sub.toJSON();
        const encoding = (window.PushManager && PushManager.supportedContentEncodings)
            ? PushManager.supportedContentEncodings[0]
            : 'aes128gcm';

        const res = await fetch(`${apiUrl}${pad}/push/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...kop() },
            body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, contentEncoding: encoding, lang }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
    }

    async function disablePush() {
        if (!pushSupported()) return true;
        const reg = await navigator.serviceWorker.getRegistration(sw);
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
            try {
                await fetch(`${apiUrl}${pad}/push/unsubscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...kop() },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                });
            } catch { /* afmelden bij de backend mislukt: lokaal toch opzeggen */ }
            await sub.unsubscribe();
        }
        return true;
    }

    return { pushSupported, getPushState, enablePush, disablePush };
}
