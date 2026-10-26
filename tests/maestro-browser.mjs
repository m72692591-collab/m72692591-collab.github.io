// End-to-end smoke tests using Playwright on GitHub Actions.
// Served locally; no secrets or real customer data.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";

const base = "http://127.0.0.1:8765/maestro/";
const artifacts = "test-artifacts/maestro";
fs.mkdirSync(artifacts, { recursive: true });
const server = spawn("python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1", "--directory", "."], { stdio: "ignore" });
let browser;
let checks = 0;
function okay(label, condition) {
  assert.ok(condition, label);
  checks++;
  process.stdout.write("✓ " + label + "\n");
}
async function ready() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base + "index.html")).ok) return; } catch { }
    await delay(200);
  }
  throw Error("Static test server did not start");
}
async function goto(page, path) {
  const response = await page.goto(base + path, { waitUntil: "domcontentloaded" });
  okay("Page served: " + path, response?.status() === 200);
}
function watchErrors(page, errors) {
  page.on("pageerror", e => errors.push(e.message));
}
try {
  await ready();
  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const page = await desktop.newPage();
  const errors = [];
  watchErrors(page, errors);
  await goto(page, "index.html");
  okay("Home title", (await page.title()).includes("Maestro"));
  okay("Lead form exists", await page.locator("#leadForm").count() === 1);
  okay("LAB hero entry", await page.getByRole("link", { name: /Испытать автоматизацию/ }).count() > 0);
  okay("Builder menu entry", await page.getByRole("link", { name: "Создать ТЗ" }).count() === 1);

  const call = page.getByRole("button", { name: "Вызвать консультанта МАЭСТРО" });
  await call.click();
  okay("Genie appeared", await page.locator("#maestro-genie-panel").isVisible());
  await page.locator('[data-mg-question="Нужен ИИ-оператор для заявок"]').click();
  okay("Genie answers AI service", await page.locator(".maestro-genie-msg.assistant").last().innerText().then(s => s.includes("ИИ-оператор")));
  await page.getByRole("button", { name: /Перейти к заявке/ }).click();
  okay("Genie moved topic to form", await page.locator("#interest").inputValue() === "ИИ-оператор");

  // Real visitor journey: build a brief through the conversational advisor.
  await page.locator(".maestro-genie-launcher").click();
  await page.locator('[data-mg="brief-start"]').click();
  const questions = [
    "Нужен бот для обработки заявок",
    "Строительная компания",
    "Собирать обращения клиентов автоматически",
    "Сейчас заявки обрабатывает менеджер",
    "Telegram и CRM"
  ];
  for (const answer of questions) {
    await page.locator('.maestro-genie-form input[name="question"]').fill(answer);
    await page.locator('.maestro-genie-form button[type="submit"]').click();
  }
  okay("Genie questionnaire completed", await page.locator('[data-mg="brief-go"]').isVisible());
  await page.locator('[data-mg="brief-go"]').click();
  await page.waitForURL(/brief-builder\.html$/);
  okay("Genie questionnaire copied to builder", await page.locator("#goal").inputValue() === questions[2]);
  okay("Genie preselected Telegram integration", await page.locator('#integrations input[value="Telegram"]').isChecked());
  okay("Genie preselected CRM integration", await page.locator('#integrations input[value="CRM"]').isChecked());

  await goto(page, "maestro-lab.html");
  okay("Lab has scenario buttons", await page.locator("[data-scenario]").count() === 3);
  await page.locator('[data-scenario="crm"]').click();
  okay("CRM scenario selected", await page.locator("#process-name").innerText().then(s => s.includes("CRM")));
  await page.locator("#advance").click();
  okay("Lab advances to step one", await page.locator("#progress").innerText() === "Этап 1 из 5");
  for (let i = 0; i < 4; i++) await page.locator("#advance").click();
  okay("Lab reaches last step", await page.locator("#progress").innerText() === "Этап 5 из 5");
  okay("Lab finish disables next step", await page.locator("#advance").isDisabled());
  await page.locator("#restart").click();
  okay("Lab restart", await page.locator("#progress").innerText() === "Готов к запуску");
  okay("Calculator initial value", await page.locator("#hours").innerText() === "45,0");
  await page.locator("#fraction").evaluate(el => { el.value = "50"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  okay("Calculator responds to input", await page.locator("#hours").innerText() === "34,6");
  await page.screenshot({ path: artifacts + "/lab-desktop.png", fullPage: true });

  await goto(page, "brief-builder.html");
  okay("Builder loads", await page.locator("#builder").count() === 1);
  await page.locator("#kind").selectOption("Сайт");
  await page.locator("#industry").fill("Учебная компания — демонстрация");
  await page.locator("#goal").fill("Создать сайт, который собирает запросы на обучение.");
  await page.locator('#integrations input[value="Telegram"]').check();
  okay("Brief preview contains entered goal", await page.locator("#output").innerText().then(s => s.includes("собирает запросы")));
  okay("Brief preview includes selected integration", await page.locator("#output").innerText().then(s => s.includes("Telegram")));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#download").click()
  ]);
  okay("Brief TXT generated", download.suggestedFilename() === "MAESTRO_preliminary_TZ.txt");
  await page.screenshot({ path: artifacts + "/brief-desktop.png", fullPage: true });
  await page.locator("#lead").click();
  await page.waitForURL(/index\.html#lead$/);
  okay("Brief handoff chose service", await page.locator("#interest").inputValue() === "Сайт");
  okay("Brief handoff filled project description", await page.locator("#business").inputValue().then(s => s.includes("собирает запросы")));
  okay("Brief handoff filled source field", (await page.locator("#channels").inputValue()).length > 10);

  // Test what visitors see if the server has not yet been configured.
  okay("Not claiming backend receipt", (await page.locator('meta[name="maestro-lead-endpoint"]').getAttribute("content")) === "");

  // A delayed response must not undo the operator's explicit privacy action.
  const admin = await desktop.newPage();
  watchErrors(admin, errors);
  await admin.addInitScript(() => {
    window.pendingAdminLoads = [];
    window.fetch = (_url, options) => new Promise((resolve, reject) => {
      window.pendingAdminLoads.push({
        signal: options?.signal,
        resolve: leads => resolve({ ok: true, status: 200, json: async () => ({ ok: true, leads }) }),
        reject
      });
    });
  });
  await goto(admin, "server/leads-admin.html");
  await admin.locator("#token").fill("maestro-ci-synthetic-token-not-for-production");
  await admin.locator("#load").click();
  await admin.locator("#clear").click();
  await admin.evaluate(async () => {
    pendingAdminLoads[0].resolve([{ id: "synthetic", name: "CI only", contact: "synthetic contact", business: "Synthetic project", channels: "Demo", interest: "Бот" }]);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  okay("Hidden client data stays hidden after delayed response", await admin.locator("#cards").innerText() === "Данные скрыты.");
  okay("Hidden status and empty count survive delayed response", await admin.locator("#status").innerText() === "Данные скрыты." && await admin.locator("#count").innerText() === "0 обращений");
  okay("Hide aborts the pending network request", await admin.evaluate(() => pendingAdminLoads[0].signal.aborted));
  await admin.locator("#token").fill("maestro-ci-synthetic-token-not-for-production");
  await admin.locator("#load").click();
  await admin.locator("#clear").click();
  await admin.evaluate(async () => {
    pendingAdminLoads[1].reject(new Error("Synthetic delayed failure"));
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  okay("Late failure cannot replace hidden status", await admin.locator("#status").innerText() === "Данные скрыты.");
  await admin.close();

  // Verify responsive layout, launcher position and mobile interactions.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    acceptDownloads: true
  });
  const m = await mobile.newPage();
  watchErrors(m, errors);
  await goto(m, "index.html");
  okay("Mobile genie launcher visible", await m.locator(".maestro-genie-launcher").isVisible());
  await m.locator(".maestro-genie-launcher").click();
  okay("Mobile genie panel visible", await m.locator(".maestro-genie-panel").isVisible());
  const bounds = await m.locator(".maestro-genie-panel").boundingBox();
  okay("Genie panel fits mobile width", Boolean(bounds && bounds.x >= -1 && bounds.x + bounds.width <= 391));
  await m.waitForTimeout(600); // Capture after the panel's entry animation, not mid-fade.
  await m.screenshot({ path: artifacts + "/genie-mobile.png", fullPage: false });
  await m.locator('[data-mg="brief-start"]').click();
  const mobileAnswers = [
    "Создать сайт услуг",
    "Сервисная компания",
    "Получать заявки",
    "Звонки принимаются вручную",
    "Сайт и Telegram"
  ];
  for (const answer of mobileAnswers) {
    await m.locator('.maestro-genie-form input[name="question"]').fill(answer);
    await m.locator('.maestro-genie-form button[type="submit"]').click();
  }
  await m.locator('[data-mg="brief-go"]').scrollIntoViewIfNeeded();
  okay("Mobile genie five-question brief can finish without clipped CTA", await m.locator('[data-mg="brief-go"]').isVisible());
  await m.locator('[data-mg="close"]').click();
  await goto(m, "maestro-lab.html");
  okay("Mobile lab demo visible", await m.locator("#advance").isVisible());
  await m.screenshot({ path: artifacts + "/lab-mobile.png", fullPage: true });
  await goto(m, "brief-builder.html");
  okay("Mobile builder visible", await m.locator("#download").isVisible());
  await m.screenshot({ path: artifacts + "/brief-mobile.png", fullPage: true });
  okay("Browser produced no uncaught errors", errors.length === 0 || (process.stderr.write(errors.join("\n")), false));
  process.stdout.write("\nPASSED " + checks + " browser assertions (desktop + mobile)\n");
} finally {
  if (browser) await browser.close();
  server.kill();
}
