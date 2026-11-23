// node --test test/  (Node 22: ESM in een .js wordt vanzelf herkend)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dagLabel, dagSleutel, lokaleTijd, vasteMomenten, convertEmoticons, maakChatApi } from '../src/commi.js';

const dagenTerug = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(12, 0, 0, 0); return d; };

test('dagLabel: vandaag, gisteren, weekdag, datum, jaartal', () => {
  assert.equal(dagLabel(dagenTerug(0).toISOString()), 'Vandaag');
  assert.equal(dagLabel(dagenTerug(1).toISOString()), 'Gisteren');
  const drie = dagenTerug(3);
  const weekdag = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'][drie.getDay()];
  assert.equal(dagLabel(drie.toISOString()), weekdag);
  assert.match(dagLabel('2019-03-05T12:00:00'), /^Dinsdag 5 maart 2019$/);
  assert.equal(dagLabel(null), '');
  assert.equal(dagSleutel(null), '', 'geen streep uit 1970');
  assert.equal(dagSleutel('2027-02-13T21:00:00'), '2027-02-13');
});

test('lokaleTijd is wandtijd zonder zone', () => {
  assert.equal(lokaleTijd(new Date(2026, 6, 1, 9, 5, 0)), '2026-07-01 09:05:00');
});

test('vasteMomenten: [label, moment], allemaal in de toekomst', () => {
  const m = vasteMomenten();
  assert.deepEqual(m.map(([l]) => l), ['Over 1 uur', 'Vanavond 18:00', 'Morgen 09:00', 'Volgende week']);
  for (const [, d] of m) assert.ok(d > new Date());
  assert.equal(m[2][1].getHours(), 9);
});

test('emoticons', () => {
  assert.equal(convertEmoticons('hoi :) <3'), 'hoi 🙂 ❤️');
});

test('maakChatApi: bestanden gaan via bijlage() de FormData in', async () => {
  const gezien = [];
  const api = maakChatApi(async (pad, opties) => { gezien.push([pad, opties]); return null; },
    { bijlage: (f) => ({ uri: f.uri, name: f.name, type: f.type }) });
  const fd = [];
  globalThis.FormData = class { append(k, v) { fd.push([k, v]); } };
  await api.sendMessage(7, { body: 'x', files: [{ uri: 'file://a', name: 'a.jpg', type: 'image/jpeg', extra: 1 }], parentId: 3 });
  assert.equal(gezien[0][0], '/api/chat/conversations/7/messages');
  assert.deepEqual(fd.find(([k]) => k === 'attachments[]')[1], { uri: 'file://a', name: 'a.jpg', type: 'image/jpeg' });
  assert.deepEqual(fd.find(([k]) => k === 'parent_id'), ['parent_id', '3']);
  await api.updateTodo(1, 2, 'tekst');
  assert.equal(gezien[1][1].body, JSON.stringify({ text: 'tekst' }));
});
