'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { articlePath, normalizeContact, normalizePosters, normalizeUnits, reorderCategory } = require('../api/_lib/site-content');
const { ensureSiteTables, readSite, savePosters } = require('../api/_lib/site-sqlite');

test('contact keeps two report phones and rejects a bad map link', () => {
  const saved = normalizeContact({ address: '110055 臺北市信義區忠孝東路四段553巷5號', servicePhone: '(02)27652122', reportPhones: ['(02)27661919', '(02)27668989'], mapUrl: 'javascript:alert(1)' });
  assert.equal(saved.error, '地圖連結須為 http 或 https 網址');
  const ok = normalizeContact({ address: '110055 臺北市信義區忠孝東路四段553巷5號', servicePhone: '(02)27652122', reportPhones: ['(02)27661919', ''] });
  assert.deepEqual(ok.contact.reportPhones, ['(02)27661919']);
});

test('unit emails stay on the fixed list and reject bad addresses', () => {
  const saved = normalizeUnits([{ key: 'prevention-division', email: 'UNIT@EXAMPLE.COM' }, { key: 'not-a-unit', email: 'other@example.com' }]);
  assert.equal(saved.units.find((unit) => unit.key === 'prevention-division').email, 'unit@example.com');
  assert.equal(saved.units.some((unit) => unit.key === 'not-a-unit'), false);
  const invalid = normalizeUnits([{ key: 'fingerprint-division', email: 'not-an-email' }]);
  assert.match(invalid.error, /指紋科/);
});

test('news order moves one item and keeps the rest behind it', () => {
  const items = [
    { id: 'a', category: 'breaking', sortOrder: 0 },
    { id: 'b', category: 'breaking', sortOrder: 1 },
    { id: 'c', category: 'notice', sortOrder: 0 }
  ];
  const moved = reorderCategory(items, 'b', 'up');
  assert.deepEqual(moved.orders.map((item) => item.id), ['b', 'a']);
  assert.equal(articlePath({ id: 'new', legacyPath: '' }), '/announcements/article.html?id=new');
  assert.equal(articlePath({ id: 'old', legacyPath: '/announcements/articles/tab01-01.html' }), '/announcements/articles/tab01-01.html');
});

test('posters keep upload order and refuse an empty list', () => {
  assert.equal(normalizePosters([]).error, '至少要留一張橫幅');
  assert.equal(normalizePosters(['javascript:alert(1)']).error, '圖片位址不正確');
  const saved = normalizePosters(['/public/home-posters/hero.jpg', '/uploads/site-posters/new.jpg']);
  assert.deepEqual(saved.posters.map((item) => item.url), ['/public/home-posters/hero.jpg', '/uploads/site-posters/new.jpg']);
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (_error) {
    return;
  }
  const db = new Database(':memory:');
  ensureSiteTables(db);
  assert.equal(readSite(db).posters.length, 1);
  const replaced = savePosters(db, { posters: ['/uploads/site-posters/only.jpg'] });
  assert.equal(replaced.status, 200);
  assert.deepEqual(replaced.payload.posters.map((item) => item.url), ['/uploads/site-posters/only.jpg']);
  assert.equal(savePosters(db, { posters: [] }).status, 400);
  assert.equal(readSite(db).posters.length, 1);
  db.close();
});
