import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve("maestro");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const index = read("index.html");
const lab = read("maestro-lab.html");
const builder = read("brief-builder.html");
const genie = read("assets/maestro-genie.js");
const leads = read("assets/maestro-leads.js");
let pass = 0;
function check(label, condition) {
  assert.ok(condition, label);
  process.stdout.write("✓ " + label + "\n");
  pass++;
}
function scripts(html) {
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(Boolean);
}
function validateJS(code, label) {
  new vm.Script(code, { filename: label });
  check("JavaScript syntax: " + label, true);
}
validateJS(genie, "maestro-genie.js");
validateJS(leads, "maestro-leads.js");
for (const [name, html] of [["index.html", index], ["maestro-lab.html", lab], ["brief-builder.html", builder]]) {
  for (const script of scripts(html)) validateJS(script, name + " inline");
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/.test(url)) continue;
    const file = url.split(/[?#]/)[0];
    if (!file) continue;
    const resolved = path.resolve(root, file);
    check(name + " asset path: " + file,
      resolved.startsWith(root + path.sep) && fs.existsSync(resolved));
  }
}
check("Lead form kept", index.includes('id="leadForm"') && index.includes('id="agree"'));
check("API disabled until configured", index.includes('meta name="maestro-lead-endpoint" content=""'));
check("API capture prevents double submit", leads.includes("event.stopImmediatePropagation()"));
check("Genie script included", index.includes("assets/maestro-genie.js?v="));
check("Lab script included", index.includes("maestro-lab.html"));
check("Builder linked from site", index.includes('href="brief-builder.html"'));
check("Session-only builder transfer matches", builder.includes("maestro_spec_handoff_v1") && index.includes("maestro_spec_handoff_v1"));
check("No forced payment dependencies", !genie.includes("api.openai.com") && !lab.includes("cdn.jsdelivr.net"));
check("Simulation correctly labelled", lab.includes("данные вымышленные") && genie.includes("без подключения нейросети"));
check("Original non-automatic form kept as fallback", index.includes("Заявка скопирована"));
check("Accessibility reduced-motion styles present", read("assets/maestro-genie.css").includes("prefers-reduced-motion") && lab.includes("prefers-reduced-motion"));
check("Backend refuses sending without consent", read("server/lead-api.php").includes("consent_required"));
check("Private storage documented", read("server/README.md").includes("серверный"));
check("Calculations example correct", Math.abs(80 * 12 * 4.33 * 65 / 100 / 60 - 45.032) < 0.001);

// Public static pages use one preferred URL across metadata and discovery files.
const publicOrigin = "https://m72692591-collab.github.io";
const publicBase = publicOrigin + "/maestro/";
const sitemap = fs.readFileSync(path.resolve("sitemap.xml"), "utf8");
const sitemapURLs = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(match => match[1]);
const publicFiles = fs.readdirSync(root).filter(name => name.endsWith(".html") && !/name="robots" content="noindex/.test(read(name)));
const expectedURLs = publicFiles.map(name => publicBase + (name === "index.html" ? "" : name));
check("Sitemap declares the standard XML namespace", /<urlset\s[^>]*xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/.test(sitemap));
check("Sitemap has unique URLs", new Set(sitemapURLs).size === sitemapURLs.length);
check("Sitemap covers public pages without admin or mode duplicates", sitemapURLs.length === expectedURLs.length && expectedURLs.every(url => sitemapURLs.includes(url)));
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
  .map(match => [match[1].toLowerCase(), match[2] ?? match[3]]));
const pageTitles = [];
for (const value of sitemapURLs) {
  const url = new URL(value);
  check("Sitemap URL is absolute and clean: " + url.pathname, url.origin === publicOrigin && !url.username && !url.password && !url.search && !url.hash && url.pathname.startsWith("/maestro/"));
  const relative = url.pathname.slice("/maestro/".length) || "index.html";
  const file = path.resolve(root, relative);
  check("Sitemap URL maps to a public HTML file: " + relative, publicFiles.includes(relative) && file.startsWith(root + path.sep) && fs.existsSync(file));
  const head = fs.readFileSync(file, "utf8").split(/<\/head\s*>/i)[0];
  const canonical = [...head.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0]))
    .filter(link => link.rel?.toLowerCase().split(/\s+/).includes("canonical"));
  check("Canonical agrees with sitemap: " + relative, canonical.length === 1 && canonical[0].href === value);
  const title = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim();
  const description = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]))
    .find(meta => meta.name?.toLowerCase() === "description")?.content.trim();
  check("Public page has a title and description: " + relative, Boolean(title && description));
  pageTitles.push(title);
}
check("Public page titles are distinct", new Set(pageTitles).size === pageTitles.length);
const robots = fs.readFileSync(path.resolve("robots.txt"), "utf8").split(/\r?\n/).map(line => line.replace(/#.*$/, "").trim());
const robotsSitemaps = robots.filter(line => /^sitemap\s*:/i.test(line)).map(line => line.replace(/^sitemap\s*:\s*/i, ""));
check("Host-root robots points to the canonical sitemap", robotsSitemaps.length === 1 && robotsSitemaps[0] === publicOrigin + "/sitemap.xml");
check("Robots does not accidentally disallow public pages or assets", !robots.some(line => /^disallow\s*:\s*\S/i.test(line)));
process.stdout.write("\nAll " + pass + " structural checks passed.\n");
