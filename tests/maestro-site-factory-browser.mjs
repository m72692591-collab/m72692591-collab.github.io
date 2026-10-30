// Browser acceptance for the standalone site-production route; synthetic inputs only.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";
import http from "node:http";

const port = 8767;
const origin = "http://127.0.0.1:" + port;
const server = spawn(process.platform === "win32" ? "python" : "python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], { stdio: "ignore", windowsHide: true });
process.on('exit', () => server.kill());
let browser;
let passes = 0;
function check(label, condition) {
  assert.ok(condition, label);
  console.log("✓ " + label);
  passes++;
}
async function ready() {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error("Local test server ended unexpectedly");
    const online = await new Promise(resolve => {
      const request = http.get(origin + "/maestro/site-factory.html", response => { response.resume(); resolve(response.statusCode === 200); });
      request.on('error', () => resolve(false));
      request.setTimeout(1000, () => request.destroy());
    });
    if (online) return;
    await delay(150);
  }
  throw new Error("Local test server did not become ready");
}
try {
  await ready();
  browser = await chromium.launch({ headless: true, ...(process.env.CI ? {} : {channel:"chrome"}) });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["clipboard-read", "clipboard-write"]
  });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (!request.url().startsWith(origin + "/")) external.push(request.url());
  });
  const response = await page.goto(origin + "/maestro/site-factory.html");
  check("Page returns a successful response", response?.ok());
  check("Page has its own Russian heading", (await page.locator("h1").textContent()).includes("От идеи до сайта"));
  await page.locator("#business").fill("Демонстрационная фирма");
  await page.locator("#product").fill("Ремонт и обслуживание оборудования");
  await page.locator("#siteType").selectOption({ label: "Многостраничный сайт" });
  const first = await page.locator('[data-prompt="01"]').textContent();
  const last = await page.locator('[data-prompt="08"]').textContent();
  check("Live prompts keep the entered business context", first.includes("Демонстрационная фирма") && last.includes("Демонстрационная фирма"));
  check("Plan contains genuine acceptance criteria", last.includes("проверяемый протокол приёмки"));
  check("Local brief updates on every input", (await page.locator("#brief-preview").textContent()).includes("Ремонт и обслуживание оборудования"));
  await page.locator("#copy-all").click();
  await page.waitForFunction(() => document.querySelector("#factory-status").textContent.includes("скопирован"), null, { timeout: 5000 });
  check("One-click copy reports a real clipboard result", true);
  const downloading = page.waitForEvent("download", { timeout: 10000 });
  await page.locator("#save-brief").click();
  const file = await downloading;
  check("Browser downloads a local site brief", file.suggestedFilename() === "MAESTRO_site_brief.txt");
  const mobile = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  check("Mobile viewport has no horizontal overflow", mobile.width <= mobile.viewport + 1);
  fs.mkdirSync("test-artifacts/maestro", { recursive: true });
  await page.screenshot({ path: "test-artifacts/maestro/site-factory-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  const desktop = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  check("Desktop viewport has no horizontal overflow", desktop.width <= desktop.viewport + 1);
  await page.screenshot({ path: "test-artifacts/maestro/site-factory-desktop.png", fullPage: true });
  await page.goto(origin + "/maestro/brief-builder.html?kind=site");
  check("Factory handoff selects website in existing brief builder", await page.locator("#kind").inputValue() === "Сайт");
  check("No external user-input transmission", external.length === 0);
  check("No uncaught JavaScript errors", errors.length === 0 || (console.error(errors), false));
  await context.close();
  console.log("\nPASSED " + passes + " site factory browser assertions.");
} finally {
  if (browser) await browser.close();
  server.kill();
}
