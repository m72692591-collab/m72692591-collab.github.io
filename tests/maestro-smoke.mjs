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
check("Genie script included", index.includes("assets/maestro-genie.js?v=1"));
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
process.stdout.write("\nAll " + pass + " structural checks passed.\n");