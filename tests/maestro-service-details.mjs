import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog} from '../maestro/assets/maestro-next-catalog.js';
let checks = 0;
for (const item of catalog) {
  const data = item.details;
  assert.ok(data?.lead && data.offers.length >= 3 && data.steps.length >= 3 && data.deliverables.length >= 3 && data.preparation && data.question, `${item.id}: complete service explanation`);
  assert.ok(fs.existsSync('maestro/' + data.image.src) && data.image.alt, `${item.id}: real local image and description`);
  assert.ok(data.offers.every(offer => offer.title && offer.text.length > 60), `${item.id}: substantive choices`);
  checks += 3;
}
assert.equal(catalog.length, 11);
assert.equal(new Set(catalog.map(item => item.id)).size, 11);
assert.ok(!catalog.some(item => item.topic.link?.href.includes('site-factory')));
assert.ok(!fs.readFileSync('sitemap.xml','utf8').includes('site-factory'));
assert.ok(!fs.readFileSync('maestro/index.html','utf8').includes('href="site-factory.html"'));
console.log(`PASSED ${checks + 5} service content checks.`);
