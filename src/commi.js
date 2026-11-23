// De kern van CTF Commi die web (ctfcommi) en mobiel (ctfcommi-mobile) delen:
// alle chat-eindpunten, de vaste tijden, de datumstrepen en de emoticons.
// Platte JS, geen React en geen DOM: de mobiele app draait op React Native.
//
// Stond tot 23-11-2026 twee keer, en was al uit elkaar gelopen (audit COM-17):
// een endpoint dat alleen het web kende, een todo-notitie die mobiel niet
// meestuurde. Verander je hier iets, hoog dan in beide apps de tag op. Mobiel
// merkt het pas na een nieuwe store-build.
//
//   import { maakChatApi, vasteMomenten, dagLabel } from 'ctf-ui/commi';
//   export const chat = maakChatApi(apiFetch);                       // web
//   export const chat = maakChatApi(apiFetch, { bijlage: f => ({ uri: f.uri, name: f.name, type: f.type }) }); // mobiel
//
// Deze repo is publiek: hier hoort niets geheims in.

// ---------------------------------------------------------------------------
// Chat-API

/**
 * @param {(pad: string, opties?: object) => Promise<any>} apiFetch  de fetch van de app (token, 401)
 * @param {{ bijlage?: (bestand: any) => any }} [opties]  hoe een bestand in FormData gaat
 */
export function maakChatApi(apiFetch, { bijlage = (f) => f } = {}) {
  return {
    listConversations: () => apiFetch('/api/chat/conversations'),
    browseChannels: () => apiFetch('/api/chat/conversations/browse'),
    getConversation: (id) => apiFetch(`/api/chat/conversations/${id}`),
    createChannel: (data) => apiFetch('/api/chat/conversations', { method: 'POST', body: JSON.stringify(data) }),
    updateChannel: (id, data) => apiFetch(`/api/chat/conversations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteChannel: (id) => apiFetch(`/api/chat/conversations/${id}`, { method: 'DELETE' }),
    // Zelfde eindpunt als deleteChannel; zo heet hij in de mobiele app.
    deleteConversation: (id) => apiFetch(`/api/chat/conversations/${id}`, { method: 'DELETE' }),
    joinChannel: (id) => apiFetch(`/api/chat/conversations/${id}/join`, { method: 'POST' }),
    leaveChannel: (id) => apiFetch(`/api/chat/conversations/${id}/leave`, { method: 'POST' }),
    addMembers: (id, memberIds) => apiFetch(`/api/chat/conversations/${id}/members`, { method: 'POST', body: JSON.stringify({ member_ids: memberIds }) }),
    removeMember: (id, userId) => apiFetch(`/api/chat/conversations/${id}/members/${userId}`, { method: 'DELETE' }),
    startDm: (userIds) => apiFetch('/api/chat/dm', { method: 'POST', body: JSON.stringify({ user_ids: userIds }) }),
    markRead: (id, lastReadMessageId) => apiFetch(`/api/chat/conversations/${id}/read`, { method: 'POST', body: JSON.stringify({ last_read_message_id: lastReadMessageId }) }),

    listMessages: (id, { before, limit = 30 } = {}) => {
      const qs = new URLSearchParams();
      if (before) qs.set('before', before);
      if (limit) qs.set('limit', limit);
      return apiFetch(`/api/chat/conversations/${id}/messages?${qs.toString()}`);
    },
    // Eén bericht volledig, voor een uitzending die te groot was voor Pusher en
    // daarom afgekapt binnenkwam (body_truncated).
    getMessage: (messageId) => apiFetch(`/api/chat/messages/${messageId}`),
    // scheduledFor: lokale wandtijd ('2026-09-16 09:00:00'). Staat die erin, dan
    // wordt het bericht wel aangemaakt maar pas op dat moment verstuurd -- en tot
    // die tijd ziet niemand anders het.
    sendMessage: (id, { body, mentionUserIds = [], files = [], parentId = null, isAnnouncement = false, scheduledFor = null }) => {
      if (files && files.length) {
        const fd = new FormData();
        if (body) fd.append('body', body);
        if (parentId) fd.append('parent_id', String(parentId));
        if (isAnnouncement) fd.append('is_announcement', '1');
        if (scheduledFor) fd.append('scheduled_for', scheduledFor);
        mentionUserIds.forEach((uid) => fd.append('mention_user_ids[]', String(uid)));
        files.forEach((f) => fd.append('attachments[]', bijlage(f)));
        return apiFetch(`/api/chat/conversations/${id}/messages`, { method: 'POST', body: fd });
      }
      return apiFetch(`/api/chat/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body, mention_user_ids: mentionUserIds, parent_id: parentId, is_announcement: isAnnouncement, scheduled_for: scheduledFor }),
      });
    },

    // Eigen berichten die nog klaarstaan. Alleen van jezelf: een ander kan ze niet
    // zien en dus ook niet tegenhouden.
    listScheduled: (conversationId = null) =>
      apiFetch(`/api/chat/ingepland${conversationId ? `?conversation_id=${conversationId}` : ''}`),
    updateScheduled: (id, { body, scheduledFor } = {}) =>
      apiFetch(`/api/chat/ingepland/${id}`, { method: 'PUT', body: JSON.stringify({ body, scheduled_for: scheduledFor }) }),
    sendScheduledNow: (id) => apiFetch(`/api/chat/ingepland/${id}/nu`, { method: 'POST' }),
    deleteScheduled: (id) => apiFetch(`/api/chat/ingepland/${id}`, { method: 'DELETE' }),
    editMessage: (messageId, body, mentionUserIds = []) => apiFetch(`/api/chat/messages/${messageId}`, { method: 'PUT', body: JSON.stringify({ body, mention_user_ids: mentionUserIds }) }),
    hideConversation: (id) => apiFetch(`/api/chat/conversations/${id}/hide`, { method: 'POST' }),
    hiddenConversations: () => apiFetch('/api/chat/conversations/hidden'),
    // Groepsgesprek archiveren voor iedereen (alleen wie het startte); terugzetten = unhideConversation.
    archiveConversation: (id) => apiFetch(`/api/chat/conversations/${id}/archiveer`, { method: 'POST' }),
    unhideConversation: (id) => apiFetch(`/api/chat/conversations/${id}/unhide`, { method: 'POST' }),
    favoriteConversation: (id) => apiFetch(`/api/chat/conversations/${id}/favorite`, { method: 'POST' }),
    muteConversation: (id, muted) => apiFetch(`/api/chat/conversations/${id}/mute`, { method: 'POST', body: JSON.stringify({ muted }) }),
    saveDraft: (id, body) => apiFetch(`/api/chat/conversations/${id}/draft`, { method: 'PUT', body: JSON.stringify({ body }) }),
    conversationAttachments: (id) => apiFetch(`/api/chat/conversations/${id}/attachments`),
    deleteMessage: (messageId) => apiFetch(`/api/chat/messages/${messageId}`, { method: 'DELETE' }),
    listReplies: (messageId) => apiFetch(`/api/chat/messages/${messageId}/replies`),
    toggleReaction: (messageId, emoji) => apiFetch(`/api/chat/messages/${messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),

    unfurl: (url) => apiFetch(`/api/chat/unfurl?url=${encodeURIComponent(url)}`),

    // Gedeelde notities = berichten van soort 'note' die in de stroom staan.
    // Polls (ChatPollController). De stand verschilt per kijker; die haal je op
    // met getPoll, opnieuw zodra msg.poll.versie verandert.
    createPoll: (id, data) => apiFetch(`/api/chat/conversations/${id}/polls`, { method: 'POST', body: JSON.stringify(data) }),
    getPoll: (messageId) => apiFetch(`/api/chat/messages/${messageId}/poll`),
    stemPoll: (messageId, stem) => apiFetch(`/api/chat/messages/${messageId}/poll/stem`, { method: 'POST', body: JSON.stringify(stem) }),
    trekPollStemIn: (messageId) => apiFetch(`/api/chat/messages/${messageId}/poll/stem`, { method: 'DELETE' }),
    pollOptieToevoegen: (messageId, optie) => apiFetch(`/api/chat/messages/${messageId}/poll/opties`, { method: 'POST', body: JSON.stringify(optie) }),
    sluitPoll: (messageId) => apiFetch(`/api/chat/messages/${messageId}/poll/sluiten`, { method: 'POST' }),
    heropenPoll: (messageId) => apiFetch(`/api/chat/messages/${messageId}/poll/heropenen`, { method: 'POST' }),
    placeNote: (id, { title = '', body = '', noteType = 'note' } = {}) => apiFetch(`/api/chat/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ kind: 'note', title, body, note_type: noteType }) }),
    // basis = edited_at van de versie waar je van uitging (null = nooit bewerkt);
    // weglaten = toch opslaan. Zie de botsingscontrole in ChatMessageController.
    updateNote: (messageId, { title = '', body = '', noteType, basis } = {}) => apiFetch(`/api/chat/messages/${messageId}`, { method: 'PUT', body: JSON.stringify({ title, body, ...(noteType ? { note_type: noteType } : {}), ...(basis !== undefined ? { basis } : {}) }) }),
    togglePinNote: (messageId) => apiFetch(`/api/chat/messages/${messageId}/pin`, { method: 'POST' }),
    // To-do-items binnen een notitie (parentId = subitem onder dat item).
    addTodo: (noteId, text, parentId = null) => apiFetch(`/api/chat/messages/${noteId}/todos`, { method: 'POST', body: JSON.stringify({ text, parent_id: parentId }) }),
    // notities is optioneel; laat je hem weg, dan blijft wat er stond staan.
    updateTodo: (noteId, itemId, text, notities) => apiFetch(`/api/chat/messages/${noteId}/todos/${itemId}`, { method: 'PUT', body: JSON.stringify(notities === undefined ? { text } : { text, notities }) }),
    toggleTodo: (noteId, itemId) => apiFetch(`/api/chat/messages/${noteId}/todos/${itemId}/toggle`, { method: 'POST' }),
    moveTodo: (noteId, itemId, direction) => apiFetch(`/api/chat/messages/${noteId}/todos/${itemId}/move`, { method: 'POST', body: JSON.stringify({ direction }) }),
    // Slepen: regelrecht naar een plek in de lijst.
    verplaatsTodo: (noteId, itemId, naarPositie) => apiFetch(`/api/chat/messages/${noteId}/todos/${itemId}/move`, { method: 'POST', body: JSON.stringify({ naar_positie: naarPositie }) }),
    assignTodo: (noteId, itemId, userIds) => apiFetch(`/api/chat/messages/${noteId}/todos/${itemId}/assignees`, { method: 'PUT', body: JSON.stringify({ user_ids: userIds }) }),
    setTodoDue: (noteId, itemId, dueOn) => apiFetch(`/api/chat/messages/${noteId}/todos/${itemId}/due`, { method: 'PUT', body: JSON.stringify({ due_on: dueOn }) }),
    setTodoRecurrence: (noteId, itemId, recurrence) => apiFetch(`/api/chat/messages/${noteId}/todos/${itemId}/recurrence`, { method: 'PUT', body: JSON.stringify({ recurrence }) }),
    deleteTodo: (noteId, itemId) => apiFetch(`/api/chat/messages/${noteId}/todos/${itemId}`, { method: 'DELETE' }),
    // Mijn taken: alle aan mij toegewezen open to-do's over alle gesprekken.
    myTodos: () => apiFetch('/api/chat/todos/mine'),
    // Leesbevestiging van een aankondiging.
    messageReads: (messageId) => apiFetch(`/api/chat/messages/${messageId}/reads`),
    // Herinner-me op een bericht/gesprek.
    listReminders: () => apiFetch('/api/chat/reminders'),
    addReminder: ({ messageId = null, conversationId = null, note = null, remindAt }) =>
      apiFetch('/api/chat/reminders', { method: 'POST', body: JSON.stringify({ message_id: messageId, conversation_id: conversationId, note, remind_at: remindAt }) }),
    deleteReminder: (id) => apiFetch(`/api/chat/reminders/${id}`, { method: 'DELETE' }),

    // Google Drive-koppeling
    driveStatus: () => apiFetch('/api/chat/drive/status'),
    driveAuthorizeUrl: (returnTo) => apiFetch(`/api/chat/drive/authorize${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ''}`),
    driveDisconnect: () => apiFetch('/api/chat/drive/disconnect', { method: 'POST' }),
    drivePickerToken: () => apiFetch('/api/chat/drive/picker-token'),
    driveShare: (conversationId, { file, body = null, parentId = null, role = 'reader' }) =>
      apiFetch(`/api/chat/drive/conversations/${conversationId}/share`, {
        method: 'POST',
        body: JSON.stringify({ file, body, parent_id: parentId, role }),
      }),
    activity: ({ before, limit = 30 } = {}) => {
      const qs = new URLSearchParams();
      if (before) qs.set('before', before);
      if (limit) qs.set('limit', limit);
      return apiFetch(`/api/chat/activity?${qs.toString()}`);
    },
    // Persoonlijke activiteit (reacties op mij, nieuwe thread-antwoorden, vermeldingen).
    activityFeed: ({ limit = 40 } = {}) => apiFetch(`/api/chat/activity/feed?limit=${limit}`),
    threads: ({ limit = 30 } = {}) => apiFetch(`/api/chat/threads?limit=${limit}`),
    userProfile: (id) => apiFetch(`/api/chat/users/${id}/profile`),
    // Bewaren voor later.
    saved: () => apiFetch('/api/chat/saved'),
    toggleSave: (messageId) => apiFetch(`/api/chat/messages/${messageId}/save`, { method: 'POST' }),
    // Delen in een ander gesprek: bericht als citaat, notitie als kopie (17-11-2026).
    shareMessage: (messageId, conversationId, body = '') => apiFetch(`/api/chat/messages/${messageId}/share`, {
      method: 'POST', body: JSON.stringify({ conversation_id: conversationId, body }),
    }),
    search: ({ q, conversationId, before, limit = 30 } = {}) => {
      const qs = new URLSearchParams();
      qs.set('q', q || '');
      if (conversationId) qs.set('conversation_id', conversationId);
      if (before) qs.set('before', before);
      if (limit) qs.set('limit', limit);
      return apiFetch(`/api/chat/search?${qs.toString()}`);
    },

    listUsers: (search = '') => apiFetch(`/api/chat/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    registerDeviceToken: (token, platform) => apiFetch('/api/chat/device-tokens', { method: 'POST', body: JSON.stringify({ token, platform }) }),

    // Beheer
    adminOverview: () => apiFetch('/api/chat/admin/overview'),
    adminInvite: (payload) => apiFetch('/api/chat/admin/invite', { method: 'POST', body: JSON.stringify(payload) }),
    adminSetAdmin: (userId, isAdmin) => apiFetch(`/api/chat/admin/users/${userId}/admin`, { method: 'POST', body: JSON.stringify({ is_admin: isAdmin }) }),
    adminUpdateGuest: (email, days) => apiFetch('/api/chat/admin/guests', { method: 'PUT', body: JSON.stringify({ email, days }) }),
    adminRevokeGuest: (email) => apiFetch('/api/chat/admin/guests', { method: 'DELETE', body: JSON.stringify({ email }) }),

    // Welke versies van de apps er zijn (UpdateMelding).
    appVersies: () => apiFetch('/api/app-versies'),

    // Wie zit er nu in de app? Zegt tegelijk dat jij er bent.
    aanwezig: () => apiFetch('/api/chat/aanwezig', { method: 'POST' }),

    // Eigen profiel
    me: () => apiFetch('/api/chat/me'),
    updateSettings: (settings) => apiFetch('/api/chat/me/settings', { method: 'PUT', body: JSON.stringify(settings) }),
    uploadAvatar: (file) => {
      const fd = new FormData();
      fd.append('avatar', bijlage(file));
      return apiFetch('/api/chat/me/avatar', { method: 'POST', body: fd });
    },
  };
}

// ---------------------------------------------------------------------------
// Vaste keuzemomenten voor "later versturen" en "herinner me".
//
// Eén plek, want de twee horen hetzelfde te doen: als "Morgen" bij het inplannen
// 09:00 betekent en bij een herinnering 08:00, ga je je afvragen welke van de
// twee je nu eigenlijk had ingesteld.

/**
 * Wat de backend verwacht: lokale wandtijd zonder tijdzone.
 *
 * Bewust géén toISOString() -- dat maakt er UTC van, en dan komt een bericht
 * dat je op 09:00 zet er 's zomers om 11:00 uit. De backend leest een kale
 * wandtijd in Europe/Amsterdam, en dat is precies wat de gebruiker bedoelde.
 */
export const lokaleTijd = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
};

/** Hetzelfde moment, maar in de vorm die een <input type="datetime-local"> wil. */
export const voorInvoerveld = (d) => lokaleTijd(d).slice(0, 16).replace(' ', 'T');

/**
 * De vier vaste momenten. "Vanavond" schuift naar morgen als het al voorbij is,
 * anders bied je een tijdstip aan dat meteen verstreken is.
 */
export const vasteMomenten = () => {
  const nu = new Date();
  const overEenUur = new Date(nu.getTime() + 3600 * 1000);
  const vanavond = new Date(nu); vanavond.setHours(18, 0, 0, 0);
  if (vanavond <= nu) vanavond.setDate(vanavond.getDate() + 1);
  const morgen = new Date(nu); morgen.setDate(morgen.getDate() + 1); morgen.setHours(9, 0, 0, 0);
  const week = new Date(nu.getTime() + 7 * 24 * 3600 * 1000);
  return [
    ['Over 1 uur', overEenUur],
    ['Vanavond 18:00', vanavond],
    ['Morgen 09:00', morgen],
    ['Volgende week', week],
  ];
};

/** "morgen om 09:00", "over 20 minuten" — kort genoeg voor naast een knop. */
export const wanneer = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const nu = new Date();
  const minuten = Math.round((d - nu) / 60000);
  if (minuten < 1) return 'zo meteen';
  if (minuten < 60) return `over ${minuten} minuten`;

  const tijd = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const zelfdeDag = (a, b) => a.toDateString() === b.toDateString();
  const morgen = new Date(nu); morgen.setDate(morgen.getDate() + 1);
  if (zelfdeDag(d, nu)) return `vandaag om ${tijd}`;
  if (zelfdeDag(d, morgen)) return `morgen om ${tijd}`;

  return `${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} om ${tijd}`;
};

// ---------------------------------------------------------------------------
// Datumstrepen in een gesprek ("Vandaag", "Gisteren", weekdag, datum)

const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

/** Kale datumsleutel (YYYY-MM-DD) in lokale tijd, om dagen mee te vergelijken. */
export function dagSleutel(iso) {
  // new Date(null) is 1 januari 1970, geen ongeldige datum -- zonder deze regel
  // belandt een bericht zonder tijdstip onder een streep uit 1970.
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * "Vandaag", "Gisteren", "donderdag" (binnen de afgelopen week) of
 * "donderdag 11 september". Het jaar komt er alleen bij als het niet dit jaar
 * is -- anders staat er onnodig veel op een streepje dat je twintig keer per
 * dag ziet.
 */
export function dagLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const vandaag = new Date();
  const kaal = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const verschil = Math.round((kaal(vandaag) - kaal(d)) / 86400000);

  if (verschil === 0) return 'Vandaag';
  if (verschil === 1) return 'Gisteren';

  const dag = DAGEN[d.getDay()];
  if (verschil > 1 && verschil < 7) return dag.charAt(0).toUpperCase() + dag.slice(1);

  const basis = `${dag} ${d.getDate()} ${MAANDEN[d.getMonth()]}`;
  const metHoofdletter = basis.charAt(0).toUpperCase() + basis.slice(1);

  return d.getFullYear() === vandaag.getFullYear() ? metHoofdletter : `${metHoofdletter} ${d.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Emoticons

// Tekst-emoticons → emoji. De webclient zet ze ook om tijdens het typen
// (Tiptap-regel in src/lib/emoticons.js van ctfcommi), met deze lijst.
export const EMOTICONS = {
  ':)': '🙂', ':-)': '🙂', '=)': '🙂',
  ':(': '🙁', ':-(': '🙁',
  ':D': '😄', ':-D': '😄',
  ';)': '😉', ';-)': '😉',
  ':P': '😛', ':p': '😛', ':-P': '😛', ':-p': '😛',
  ':O': '😮', ':o': '😮', ':-O': '😮',
  ':|': '😐', ':-|': '😐',
  ":'(": '😢',
  ':*': '😘', ':-*': '😘',
  '8)': '😎', 'B)': '😎',
  '<3': '❤️', '</3': '💔',
};

// Zet emoticons in een string om naar emoji.
export function convertEmoticons(text) {
  let out = text;
  Object.entries(EMOTICONS).forEach(([k, v]) => {
    if (out.includes(k)) out = out.split(k).join(v);
  });
  return out;
}
