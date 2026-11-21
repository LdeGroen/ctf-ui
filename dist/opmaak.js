import DOMPurify from 'dompurify';

// Opmaak van makersteksten (marketingformulier): [b], [i], [u] worden HTML,
// en alles behalve die eigen opmaak gaat eruit. Gedeeld door ctfwebapp en
// ctfarchief (audit PUB-13). Alleen in de browser: DOMPurify heeft een DOM
// nodig, daarom staat dit los van ctf-ui/tekst.

const sanitize = html => DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['strong', 'em', 'u', 'a', 'br'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
});
export const applyFormatting = text => {
  if (!text) return '';
  const formatted = text.replace(/\[b\](.*?)\[b\]/g, '<strong>$1</strong>').replace(/\[i\](.*?)\[i\]/g, '<em>$1</em>').replace(/\[u\](.*?)\[u\]/g, '<u>$1</u>');
  return sanitize(formatted);
};