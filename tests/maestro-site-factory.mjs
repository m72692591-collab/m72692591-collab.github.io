// Reproducible checks for MAESTRO website production route; no network or customer data.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { STAGES, buildSiteBrief, buildSitePrompts } from "../maestro/site-factory.mjs";

const root = path.resolve("maestro");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const readRoot = file => fs.readFileSync(path.resolve(file), "utf8");
let passes = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passes++;
  console.log("✓ " + label);
}

const input = {
  business: "Демо-мастерская",
  product: "Разработка внутренних сервисов",
  audience: "Руководители небольших компаний",
  advantage: "Возможность показать рабочий прототип",
  evidence: "Демонстрация (не клиентский кейс)",
  siteType: "Многостраничный сайт",
  action: "Получить заявку",
  region: "Россия, русский",
  mood: "Светлый и спокойный"
};
const result = buildSitePrompts(input);
check("Eight stages including mandatory acceptance", STAGES.length === 8 && result.length === 8 && result[7].id === "08");
check("Sequential IDs", result.every((s, i) => s.id === String(i + 1).padStart(2, "0")));
check("Every prompt contains the same business context", result.every(s => s.prompt.includes(input.business) && s.prompt.includes(input.audience)));
check("Prompts are distinct", new Set(result.map(s => s.prompt)).size === 8);
check("User proofs remain marked as supplied", result[0].prompt.includes("Подтверждённые факты") && result[0].prompt.includes(input.evidence));
check("No fake reviews instruction", result.every(s => s.prompt.includes("Не выдумывай отзывы")));
check("Security and real integration gates", result[5].prompt.includes("Фактические API") && result[7].prompt.includes("доставку заявок"));
check("SEO canonical, sitemap and robots mentioned", result[6].prompt.includes("canonical") && result[6].prompt.includes("sitemap"));
check("Site brief preserves no-data placeholder", buildSiteBrief({}).includes("не указано — уточнить"));
check("Untrusted input is length-limited and control characters replaced", !buildSiteBrief({ business: "A\nB\u0000" + "x".repeat(2000) }).includes("\u0000") && buildSiteBrief({ business: "A\nB\u0000" + "x".repeat(2000) }).length < 2500);
check("Browser-only code does not require document when imported by Node", typeof document === "undefined");

const html = read("site-factory.html");
check("Russian and responsive language metadata", /<html lang="ru">/.test(html) && html.includes('name="viewport"'));
check("Module linked from static page", html.includes('src="site-factory.mjs"'));
check("Exactly eight stage panels have corresponding generated outputs", [...html.matchAll(/data-prompt="(\d\d)"/g)].length === 8);
check("Eight separately copyable prompts", [...html.matchAll(/data-copy="(\d\d)"/g)].length === 8);
check("One-click copy and local save", html.includes('id="copy-all"') && html.includes('id="save-brief"'));
check("All stage IDs match template", result.every(s => html.includes('data-prompt="' + s.id + '"') && html.includes('data-copy="' + s.id + '"')));
check("Data is rendered as text rather than injected HTML", read("site-factory.mjs").includes("pre.textContent = stage.prompt") && !read("site-factory.mjs").includes(".innerHTML"));
check("No third-party content or hosted scripts", !/src="https?:\/\//.test(html) && !/fetch\s*\(/.test(read("site-factory.mjs")));
check("Accessible status and keyboard indicators", html.includes('role="status"') && html.includes(":focus-visible") && html.includes('prefers-reduced-motion'));

const canonical = {
  "index.html": "https://m72692591-collab.github.io/maestro/",
  "site-factory.html": "https://m72692591-collab.github.io/maestro/site-factory.html",
  "brief-builder.html": "https://m72692591-collab.github.io/maestro/brief-builder.html",
  "agency.html": "https://m72692591-collab.github.io/maestro/agency.html",
  "portfolio.html": "https://m72692591-collab.github.io/maestro/portfolio.html",
  "maestro-lab.html": "https://m72692591-collab.github.io/maestro/maestro-lab.html"
};
const sitemap = readRoot("sitemap.xml");
for (const [file, url] of Object.entries(canonical)) {
  check("Canonical matches sitemap for " + file, read(file).includes('<link rel="canonical" href="' + url + '">') && sitemap.includes("<loc>" + url + "</loc>"));
}
check("Root robots links to real sitemap", readRoot("robots.txt").includes("https://m72692591-collab.github.io/sitemap.xml"));
check("Homepage links to factory", read("index.html").includes('href="site-factory.html">Как создаём сайты'));
check("Factory leads to site-specific brief", html.includes('brief-builder.html?kind=site'));
check("Brief builder opens with site route selected", read("brief-builder.html").includes('get("kind") === "site"') && read("brief-builder.html").includes('$("kind").value = "Сайт"'));
check("Standalone standard and launch gates documented", read("SITE_FACTORY_STANDARD.md").toLowerCase().includes("приёмка") && read("SITE_FACTORY_STANDARD.md").toLowerCase().includes("приватность"));

console.log("\nPASSED " + passes + " website production checks.");
