import fs from 'fs';

const root = new URL('../', import.meta.url);
const categories = [
  ['announcements/breaking-news.html', 'breaking', 'tab01'],
  ['announcements/clarifications.html', 'clarification', 'tab02'],
  ['announcements/notices.html', 'notice', 'tab03']
];
const listPattern = /<a id=listImageNum\d+ href="(\/announcements\/articles\/(tab0\d-\d+)\.html)" title="([^"]*)">\s*<div class=info>\s*<p class=color02>發布日期：([^<]*)<\/p>\s*<p class=color01>發布單位：([^<]*)<\/p>/g;
const items = [];

for (const [file, category] of categories) {
  const html = fs.readFileSync(new URL(file, root), 'utf8');
  let sortOrder = 0;
  let match = listPattern.exec(html);
  while (match) {
    items.push({
      id: `legacy-${match[2]}`,
      category,
      title: match[3].trim(),
      publishedOn: match[4].trim(),
      updatedOn: match[4].trim(),
      publisher: match[5].trim(),
      body: '',
      images: [],
      sortOrder,
      legacyPath: match[1]
    });
    sortOrder += 1;
    match = listPattern.exec(html);
  }
  listPattern.lastIndex = 0;
}

const crimeHtml = fs.readFileSync(new URL('announcements/crime-methods.html', root), 'utf8');
const crimePattern = /<a href="(\/announcements\/articles\/(tab04-\d+)\.html)"><span>([^<]*)<\/span>([^<]*)<\/a>/g;
let crimeOrder = 0;
let crimeMatch = crimePattern.exec(crimeHtml);
while (crimeMatch) {
  items.push({
    id: `legacy-${crimeMatch[2]}`,
    category: 'crime',
    title: crimeMatch[4].trim(),
    publishedOn: crimeMatch[3].trim(),
    updatedOn: crimeMatch[3].trim(),
    publisher: '刑事警察局公共關係室',
    body: '',
    images: [],
    sortOrder: crimeOrder,
    legacyPath: crimeMatch[1]
  });
  crimeOrder += 1;
  crimeMatch = crimePattern.exec(crimeHtml);
}

fs.writeFileSync(new URL('api/_lib/site-news-seed.json', root), JSON.stringify(items, null, 2));
const counts = items.reduce((all, item) => ({ ...all, [item.category]: (all[item.category] || 0) + 1 }), {});
console.log(items.length, counts);
