// Tekst-helpers zonder afhankelijkheden, gedeeld door ctfwebapp, ctftimetable,
// ctfarchief en hun prerender-/sitemapscripts (audit PUB-13). Een .mjs, zodat
// node de scripts ook zonder "type": "module" als ES-module leest.
//
// Tot 21-11-2026 stonden deze functies in vijf kopieën met de waarschuwing
// "MOET identiek blijven, anders kloppen de URL's niet". Dat is nu vanzelf zo.

/** URL-vriendelijke slug: accenten weg, kleine letters, spaties wordt '-'. */
export const slugify = text => {
  if (!text) return '';
  return text.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
};

/** Voor tekst tussen tags in gegenereerde HTML (prerender): & < > */
export const escHtml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Voor een attribuutwaarde tussen dubbele aanhalingstekens. */
export const escAttr = s => escHtml(s).replace(/"/g, '&quot;');

/** Alles escapen, ook beide aanhalingstekens (pop-ups op de festivalkaart). */
export const escHtmlStreng = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
const MAANDEN = {
  januari: '01',
  jan: '01',
  februari: '02',
  feb: '02',
  maart: '03',
  mrt: '03',
  april: '04',
  apr: '04',
  mei: '05',
  juni: '06',
  jun: '06',
  juli: '07',
  jul: '07',
  augustus: '08',
  aug: '08',
  september: '09',
  sep: '09',
  oktober: '10',
  okt: '10',
  november: '11',
  nov: '11',
  december: '12',
  dec: '12'
};

/**
 * Een datum uit het CRM als Date, om op te sorteren. Kent jjjj-mm-dd,
 * dd-mm-jjjj en "13 februari 2027"; anders wat new Date() ervan maakt.
 * Onleesbaar geeft een ongeldige Date (NaN), geen fout.
 */
export const parseDateForSorting = dateString => {
  if (!dateString || typeof dateString !== 'string') return new Date(NaN);
  const tekst = dateString.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(tekst)) return new Date(tekst);
  const dmj = tekst.split('-');
  if (dmj.length === 3) {
    const [d, m, y] = dmj;
    if (!isNaN(parseInt(d, 10)) && !isNaN(parseInt(m, 10)) && !isNaN(parseInt(y, 10))) {
      const date = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      if (!isNaN(date.getTime())) return date;
    }
  }
  const delen = tekst.split(' ');
  if (delen.length === 3 && delen[1]) {
    const [dag, maandNaam, jaar] = delen;
    const maand = MAANDEN[maandNaam.toLowerCase()];
    if (dag && maand && jaar) {
      const date = new Date(`${jaar}-${maand}-${String(dag).padStart(2, '0')}`);
      if (!isNaN(date.getTime())) return date;
    }
  }
  const terugval = new Date(tekst);
  if (!isNaN(terugval.getTime())) return terugval;
  return new Date(NaN);
};