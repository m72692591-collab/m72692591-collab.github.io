// End-to-end smoke tests using Playwright on GitHub Actions.
// Served locally; no secrets or real customer data.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";

const base = "http://127.0.0.1:8765/maestro/";
const artifacts = "test-artifacts/maestro";
fs.mkdirSync(artifacts, { recursive: true });
const server = spawn(process.platform === "win32" ? "python" : "python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1", "--directory", "."], { stdio: "ignore", windowsHide: true });
let browser;
let checks = 0;
function okay(label, condition) {
  assert.ok(condition, label);
  checks++;
  process.stdout.write("✓ " + label + "\n");
}
async function ready() {
  for (let i = 0; i < 50; i++) {
    const online = await new Promise(resolve => {
      http.get(base + "index.html", response => { response.resume(); resolve(response.statusCode === 200); })
        .on("error", () => resolve(false));
    });
    if (online) return;
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
async function carouselClearsConsultation(page) {
  const detail = await page.locator(".next-detail").boundingBox();
  const controls = await page.locator(".architect-carousel-controls").boundingBox();
  return Boolean(detail && controls && (
    controls.y >= detail.y + detail.height ||
    controls.y + controls.height <= detail.y ||
    controls.x >= detail.x + detail.width ||
    controls.x + controls.width <= detail.x
  ));
}
try {
  await ready();
  okay("Optional desktop 3D sketch stays under 3.2 MB", fs.statSync("maestro/assets/models/architect-human.glb").size < 3_200_000);
  okay("Optional mobile 3D sketch stays under 1.8 MB", fs.statSync("maestro/assets/models/architect-human-mobile.glb").size < 1_800_000);
  browser = await chromium.launch({ headless: true, args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"], ...(process.env.CI ? {} : { channel: "chrome" }) });
  const desktop = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const page = await desktop.newPage();
  const errors = [];
  watchErrors(page, errors);
  const desktopModelRequests = [];
  page.on("request", request => { if (/architect-human(?:-mobile)?\.glb/.test(new URL(request.url()).pathname)) desktopModelRequests.push(request.url()); });
  await goto(page, "index.html");
  okay("Home title", (await page.title()).includes("Maestro"));
  okay("Lead form exists", await page.locator("#leadForm").count() === 1);
  okay("LAB hero entry", await page.locator('.hero a[href="#lab"]').count() === 1);
  okay("Builder menu entry", await page.getByRole("link", { name: "Создать ТЗ" }).count() === 1);
  await page.locator("#next-classic-list a").first().waitFor();
  okay("NEXT uses the shared direction catalog", await page.locator("#next-classic-list a").count() === 11);
  await page.locator('[data-next-mode="live"]').click();
  okay("Live mode changes the whole homepage", await page.locator(".hero").isHidden());
  okay("Live announces scene loading", await page.locator("#next-model-status").isVisible());
  await page.waitForFunction(() => document.querySelector("#next-canvas")?.dataset.portraitState === "loaded", null, { timeout: 30000 });
  okay("Live opens the approved animated raster portrait", await page.locator("#next-live").getAttribute("data-presentation") === "portrait" && await page.locator("#next-live").getAttribute("data-portrait-ready") === "true" && await page.locator("#next-canvas canvas").count() === 1);
  okay("Opening the portrait does not request the optional GLB", desktopModelRequests.length === 0);
  await page.waitForFunction(() => {
    const image = document.querySelector(".architect-art");
    return image?.complete && image.naturalWidth > 500;
  });
  const desktopModel = page.waitForResponse(response => new URL(response.url()).pathname.endsWith("architect-human.glb") && response.status() === 200);
  await page.locator('button[data-presentation="model"]').click();
  await desktopModel;
  await page.waitForFunction(() => document.querySelector("#next-canvas")?.dataset.modelState === "loaded", null, { timeout: 30000 });
  okay("Visitor can choose the optional rigged 3D sketch", await page.locator("#next-live").getAttribute("data-presentation") === "model" && await page.locator('button[data-presentation="model"]').getAttribute("aria-pressed") === "true" && await page.locator('#next-canvas').getAttribute('data-body-rig') === 'true' && await page.locator('#next-canvas').getAttribute('data-face-rig') === 'true' && desktopModelRequests.length === 1);
  await page.screenshot({ path: artifacts + "/architect-model-desktop.png", fullPage: false });
  await page.locator('button[data-presentation="portrait"]').click();
  okay("Visitor can return to the loaded portrait composition", await page.locator("#next-live").getAttribute("data-presentation") === "portrait" && await page.locator('button[data-presentation="model"]').getAttribute("aria-pressed") === "false" && await page.locator("#next-live").getAttribute("data-portrait-ready") === "true");
  const sitesStartingLeft = await page.locator('#next-orbit button[data-id="sites"]').evaluate(button => {
    const value = button.style.left;
    return value.endsWith('%') ? parseFloat(value) / 100 * button.closest('.next-orbit').clientWidth : parseFloat(value);
  });
  await page.locator("#architect-next").click();
  await page.waitForFunction(() => document.querySelector("#next-live")?.dataset.panelPresenting === "moving", null, { timeout: 10000 });
  okay("Hidden consultation panel is inert during the hand gesture", await page.locator(".next-detail").evaluate(detail => detail.inert && getComputedStyle(detail).opacity === "0"));
  await page.waitForFunction(() => {
    const card = document.querySelector('#next-orbit button[data-id="sites"]');
    return document.querySelector('#next-live')?.dataset.panelPresenting === 'moving' && card?.style.zIndex === '28' && Number(card.style.opacity) < .8;
  }, null, { timeout: 15000 });
  okay("Portrait gesture carries and fades the selected card", await page.locator('#next-orbit button[data-id="sites"]').evaluate((card, initial) => Math.abs(parseFloat(card.style.left) - initial) > 30 && card.style.transform.includes("scale("), sitesStartingLeft));
  await page.waitForFunction(() => document.querySelector("#next-live")?.dataset.panelPresenting === "open", null, { timeout: 15000 });
  okay("Chosen direction opens beside the portrait after the gesture", await page.locator(".next-detail").evaluate(detail => !detail.inert && getComputedStyle(detail).opacity === "1") && await page.locator('#next-orbit button[data-id="sites"]').isHidden());
  okay("Carousel advances the detail and form together", await page.locator("#next-title").innerText() === "Сайты и дизайн" && await page.locator("#interest").inputValue() === "Сайт");
  await page.locator("#architect-prev").click();
  await page.waitForFunction(() => document.querySelector("#next-live")?.dataset.panelPresenting === "moving", null, { timeout: 10000 });
  okay("Carousel returns to Strategy and its Audit service", await page.locator("#next-title").innerText() === "Стратегия" && await page.locator("#interest").inputValue() === "Аудит");
  await page.locator("#architect-pause").click();
  okay("Canceling a portrait gesture restores panel keyboard access", await page.locator(".next-detail").evaluate(detail => !detail.inert && getComputedStyle(detail).opacity === "1"));
  await page.mouse.move(1, 1);
  const pausedPosition = await page.locator('#next-orbit button[data-id="strategy"]').getAttribute("style");
  await page.waitForTimeout(350);
  okay("Carousel pause holds its position", await page.locator("#architect-pause").getAttribute("aria-pressed") === "true" && await page.locator('#next-orbit button[data-id="strategy"]').getAttribute("style") === pausedPosition);
  await page.locator("#architect-pause").click();
  await page.mouse.move(1, 1);
  const resumedPosition = await page.locator('#next-orbit button[data-id="strategy"]').getAttribute("style");
  await page.waitForFunction(before => document.querySelector('#next-orbit button[data-id="strategy"]')?.getAttribute("style") !== before, resumedPosition, { timeout: 10000 });
  okay("Carousel resumes movement on request", await page.locator("#architect-pause").getAttribute("aria-pressed") === "false" && await page.locator('#next-orbit button[data-id="strategy"]').getAttribute("style") !== resumedPosition);
  await page.locator('#next-orbit button[data-id="strategy"]').focus();
  await page.locator('#next-orbit button[data-id="strategy"]').hover();
  await page.mouse.move(1, 1);
  const focusedPosition = await page.locator('#next-orbit button[data-id="strategy"]').getAttribute("style");
  await page.waitForTimeout(350);
  okay("Keyboard focus holds the slide even when the pointer leaves", await page.locator('#next-orbit button[data-id="strategy"]').getAttribute("style") === focusedPosition);
  await page.locator("#architect-pause").focus();
  const blurredPosition = await page.locator('#next-orbit button[data-id="strategy"]').getAttribute("style");
  await page.waitForFunction(before => document.querySelector('#next-orbit button[data-id="strategy"]')?.getAttribute("style") !== before, blurredPosition, { timeout: 10000 });
  okay("Carousel resumes after keyboard focus leaves its slides", await page.locator('#next-orbit button[data-id="strategy"]').getAttribute("style") !== blurredPosition);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedPosition = await page.locator('#next-orbit button[data-id="strategy"]').getAttribute("style");
  await page.waitForTimeout(350);
  okay("Reduced motion stops the carousel without disabling navigation", await page.locator('#next-orbit button[data-id="strategy"]').getAttribute("style") === reducedPosition && await page.locator("#architect-next").isEnabled());
  await page.locator('#architect-select').selectOption('automation');
  okay("Reduced motion shows selected details immediately without trapping focus", await page.locator("#next-title").innerText() === "Автоматизация" && await page.locator(".next-detail").evaluate(detail => !detail.inert && getComputedStyle(detail).opacity === "1") && await page.locator("#next-live").getAttribute("data-panel-presenting") !== "moving");
  await page.locator('#architect-select').selectOption('strategy');
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator('#next-lead').click();
  okay("Initial Strategy lead maps to Audit", await page.locator("#interest").inputValue() === "Аудит");
  await page.locator('#architect-select').selectOption('automation');
  okay("NEXT selection opens the chosen direction", await page.locator("#next-title").innerText() === "Автоматизация");
  if (!await page.locator("#next-question").isVisible()) await page.locator(".architect-question summary").click();
  await page.locator("#next-question").fill("Заявки теряются в чатах");
  await page.locator("#next-ask").click();
  okay("NEXT opens the existing consultant inline", await page.locator(".next-detail #maestro-genie-panel").isVisible());
  await page.locator('.next-detail [data-mg="lead"]').click();
  okay("Consultant preserves the selected service", await page.locator("#interest").inputValue() === "Автоматизация");
  await page.locator('#architect-select').selectOption('strategy');
  if (!await page.locator("#next-question").isVisible()) await page.locator(".architect-question summary").click();
  await page.locator("#next-question").fill("Нужен первый план роста");
  await page.locator("#next-ask").click();
  await page.locator('.next-detail [data-mg="lead"]').click();
  okay("Strategy handoff keeps its catalog service", await page.locator("#interest").inputValue() === "Аудит");
  await page.locator('[data-next-mode="classic"]').click();
  okay("Classic site remains available", await page.locator(".hero").isVisible());

  const fallbackPage = await desktop.newPage();
  await fallbackPage.route('**/architect-scene.js*', route => route.abort());
  await goto(fallbackPage, 'index.html');
  await fallbackPage.locator('[data-next-mode="live"]').click();
  await fallbackPage.locator('#next-fallback').waitFor({ state: 'visible' });
  okay("2D fallback shows the static Architect and clears loading", await fallbackPage.locator('#next-model-status').isHidden() && await fallbackPage.locator('#next-orbit button').count() === 11 && await fallbackPage.locator('.architect-art').isVisible());
  await fallbackPage.close();

  const compatPage = await desktop.newPage();
  const compatErrors = [];
  watchErrors(compatPage, compatErrors);
  await goto(compatPage, 'index.html');
  await compatPage.locator('#next-model-status').evaluate(element => element.remove());
  await compatPage.locator('[data-next-mode="live"]').click();
  await compatPage.waitForFunction(() => document.querySelector('#next-canvas')?.dataset.portraitState === 'loaded', null, { timeout: 30000 });
  okay("Older cached markup can still load the Architect scene", await compatPage.locator('#next-canvas canvas').count() === 1 && await compatPage.locator('#next-model-status').count() === 1 && compatErrors.length === 0);
  await compatPage.close();

  const failedModel = await desktop.newPage();
  await failedModel.route('**/architect-human.glb*', route => route.abort());
  await goto(failedModel, 'index.html?mode=live');
  await failedModel.waitForFunction(() => document.querySelector('#next-canvas')?.dataset.portraitState === 'loaded', null, { timeout: 30000 });
  await failedModel.locator('button[data-presentation="model"]').click();
  await failedModel.waitForFunction(() => document.querySelector('#next-canvas')?.dataset.modelState === 'failed');
  okay('A failed optional 3D sketch returns to the approved portrait', await failedModel.locator('#next-live').getAttribute('data-presentation') === 'portrait' && await failedModel.locator('button[data-presentation=portrait]').getAttribute('aria-pressed') === 'true' && !await failedModel.locator('button[data-presentation=model]').isEnabled());
  await failedModel.locator('#architect-select').selectOption('automation');
  okay('Model failure preserves service and lead context', await failedModel.locator('#interest').inputValue() === 'Автоматизация');
  await failedModel.close();

  const lostContext = await desktop.newPage();
  await goto(lostContext, 'index.html?mode=live');
  await lostContext.waitForFunction(() => document.querySelector('#next-canvas')?.dataset.portraitState === 'loaded', null, { timeout: 30000 });
  await lostContext.locator('#next-canvas canvas').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await lostContext.locator('#next-fallback').waitFor({ state: 'visible' });
  okay('Context loss disposes the renderer and reveals all eleven static slides', await lostContext.locator('#next-canvas canvas').count() === 0 && await lostContext.locator('#next-orbit button:not([hidden])').count() === 11);
  okay('Context loss restores the static approved portrait', await lostContext.locator('.architect-art').isVisible() && await lostContext.locator('button[data-presentation=model]').getAttribute('aria-pressed') === 'false' && await lostContext.locator('button[data-presentation=portrait]').getAttribute('aria-pressed') === 'true');
  await lostContext.close();

  const call = page.getByRole("button", { name: "Вызвать консультанта МАЭСТРО" });
  await page.locator('[data-next-mode="live"]').click();
  await page.locator('#architect-select').selectOption('automation');
  await page.locator('[data-next-mode="classic"]').click();
  await call.click();
  await page.locator('[data-mg-question="Нужен сайт"]').click();
  await page.getByRole("button", { name: /Перейти к заявке/ }).click();
  okay("Classic consultant is not bound to a stale NEXT choice", await page.locator("#interest").inputValue() === "Сайт");
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
  const mobileModelRequests = [];
  m.on("request", request => { if (new URL(request.url()).pathname.endsWith("architect-human-mobile.glb")) mobileModelRequests.push(request.url()); });
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
  await goto(m, "index.html?mode=live");
  await m.waitForFunction(() => document.querySelector("#next-canvas")?.dataset.portraitState === "loaded", null, { timeout: 30000 });
  okay("Mobile opens the approved portrait with its WebGL gesture layer", await m.locator("#next-canvas canvas").count() === 1 && await m.locator("#next-live").getAttribute("data-presentation") === "portrait" && await m.locator("#next-live").getAttribute("data-portrait-ready") === "true");
  okay("Mobile portrait does not download the optional GLB", mobileModelRequests.length === 0);
  await m.waitForFunction(() => {
    const image = document.querySelector(".architect-art");
    return image?.complete && image.naturalWidth > 500;
  });
  await m.screenshot({ path: artifacts + '/architect-portrait-mobile-initial.png', fullPage: true });
  await m.locator("#architect-next").click();
  okay("Mobile carousel updates the selected service", await m.locator("#next-title").innerText() === "Сайты и дизайн" && await m.locator("#interest").inputValue() === "Сайт");
  await m.waitForFunction(() => document.querySelector("#next-live")?.dataset.panelPresenting === "open", null, { timeout: 15000 });
  okay("Mobile gesture reveals the selected consultation", await m.locator(".next-detail").evaluate(detail => !detail.inert && getComputedStyle(detail).opacity === "1"));
  const mobileModel = m.waitForResponse(response => new URL(response.url()).pathname.endsWith("architect-human-mobile.glb") && response.status() === 200);
  await m.locator('button[data-presentation="model"]').click();
  await mobileModel;
  await m.waitForFunction(() => document.querySelector("#next-canvas")?.dataset.modelState === "loaded", null, { timeout: 30000 });
  okay("Mobile can choose the smaller optional 3D sketch", await m.locator("#next-live").getAttribute("data-presentation") === "model" && await m.locator('#next-canvas').getAttribute('data-body-rig') === 'true' && await m.locator('#next-canvas').getAttribute('data-face-rig') === 'true' && mobileModelRequests.length === 1);
  await m.screenshot({ path: artifacts + '/architect-human-mobile.png', fullPage: true });
  await m.locator('button[data-presentation="portrait"]').click();
  okay("Mobile returns to the loaded portrait", await m.locator("#next-live").getAttribute("data-presentation") === "portrait" && await m.locator("#next-live").getAttribute("data-portrait-ready") === "true");
  okay("Mobile reference layout has no horizontal overflow", await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  okay("Mobile carousel controls do not cover the consultation panel", await carouselClearsConsultation(m));
  await m.locator(".architect-question summary").click();
  await m.locator("#next-question").fill("Как связать сайт с обработкой заявок?");
  okay("Expanded mobile question form stays clear of carousel controls", await carouselClearsConsultation(m));
  await m.screenshot({ path: artifacts + "/architect-question-mobile.png", fullPage: true });
  await m.locator(".architect-question summary").click();
  await m.locator("#architect-select").selectOption("automation");
  await m.locator("#architect-orb").click();
  okay("Mobile header orb opens the existing consultant", await m.locator(".next-detail #maestro-genie-panel").isVisible());
  await m.locator('.next-detail [data-mg="lead"]').click();
  okay("Mobile orb preserves the selected service in its lead handoff", await m.locator("#interest").inputValue() === "Автоматизация");
  await m.locator('[data-next-mode="classic"]').click();
  okay("Architect orb is hidden in Classic mode", await m.locator("#architect-orb").isHidden());
  await m.locator('[data-next-mode="live"]').click();
  await m.evaluate(() => scrollTo(0, 0));
  okay("Orb handoff and mode changes do not pan the mobile scene sideways", await m.evaluate(() => document.querySelector("#next-live").scrollLeft === 0 && document.querySelector(".architect-intro").getBoundingClientRect().left >= 0));
  await m.screenshot({ path: artifacts + "/architect-portrait-mobile.png", fullPage: true });
  okay("Browser produced no uncaught errors", errors.length === 0 || (process.stderr.write(errors.join("\n")), false));
  process.stdout.write("\nPASSED " + checks + " browser assertions (desktop + mobile)\n");
} finally {
  if (browser) await browser.close();
  server.kill();
}
