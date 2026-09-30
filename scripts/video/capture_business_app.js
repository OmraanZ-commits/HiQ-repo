import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../attached_assets/generated_videos/business-app-frames");
fs.mkdirSync(root, { recursive: true });
const origin = "http://127.0.0.1:5000";
const fps = 5;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/repl/tools/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("dialog", dialog => dialog.dismiss());

  async function click(testId) {
    const item = page.getByTestId(testId);
    if (await item.count()) await item.first().click({ timeout: 6000 });
  }
  async function hold(ms) { await page.waitForTimeout(ms); }
  async function goto(route) {
    await page.goto(origin + route, { waitUntil: "domcontentloaded" });
    await hold(1000);
  }
  async function scene(name, duration, actions) {
    const folder = path.join(root, name);
    fs.mkdirSync(folder, { recursive: true });
    let error;
    const actor = (async () => {
      try { await actions(); } catch (e) { error = String(e); }
    })();
    const frames = Math.round(duration * fps);
    for (let i = 0; i < frames; i++) {
      await page.screenshot({ path: path.join(folder, `${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 82, animations: "disabled" });
      await hold(1000 / fps);
    }
    await actor;
    console.log(name, frames, page.url(), error || "ok");
  }

  await goto("/");
  if (process.env.CAPTURE_DETAIL_ONLY === "1") {
    await goto("/ccr/mt-listing");
  }
  if (process.env.CAPTURE_NETWORK_ACTION_ONLY === "1") {
    await goto("/network");
  }
  if (process.env.CAPTURE_DETAIL_ONLY !== "1") {
  if (process.env.CAPTURE_NETWORK_ACTION_ONLY !== "1") {
  await scene("02-network-entry", 9, async () => {
    await hold(1100);
    await click("module-card-network");
    await hold(3200);
    await page.mouse.move(1020, 570, { steps: 20 });
  });
  await scene("03-network-dashboard", 8, async () => {
    await click("tab-entries");
    await hold(1700);
    await page.mouse.wheel(0, 480);
    await hold(1300);
    await page.mouse.wheel(0, -440);
  });
  }
  await scene("04-network-action", 9, async () => {
    await click("tab-entries");
    await hold(1400);
    const row = page.locator('[data-testid^="row-entry-"]').first();
    if (await row.count()) await row.click();
    await hold(2000);
    await page.mouse.move(970, 615, { steps: 18 });
    await hold(1100);
  });
  if (process.env.CAPTURE_NETWORK_ACTION_ONLY !== "1") {
  await goto("/");
  await scene("05-paid-bible-entry", 9, async () => {
    await hold(700);
    await click("module-card-paid-bible");
    await hold(2300);
    await click("nav-pb-overview");
    await hold(950);
    await page.mouse.wheel(0, 460);
  });
  await scene("06-paid-bible-sr", 9, async () => {
    await click("nav-pb-network-updates");
    await hold(1500);
    await click("nav-pb-service-requests");
    await hold(1100);
    await page.mouse.wheel(0, 420);
  });
  await goto("/");
  await scene("07-ccr-entry", 8, async () => {
    await hold(750);
    await click("module-card-ccr");
    await hold(3000);
    await page.mouse.wheel(0, 460);
  });
  await scene("08-mt-listing", 8, async () => {
    await click("nav-ccr-mt-listing");
    await hold(2000);
    await page.mouse.wheel(0, 450);
    await hold(850);
    await page.mouse.wheel(0, -440);
  });
  }
  }
  await scene("09-mt-detail", 8, async () => {
    await page.locator('tbody tr.cursor-pointer').first().click({ timeout: 5000 });
    await hold(1700);
    await page.getByText("ATP Criteria", { exact: true }).first().click({ timeout: 5000 });
    await hold(1200);
    await page.mouse.wheel(0, 460);
  });
  if (process.env.CAPTURE_DETAIL_ONLY !== "1" && process.env.CAPTURE_NETWORK_ACTION_ONLY !== "1") {
  await goto("/ccr/atp-agent-demo");
  await scene("10-atp-intake", 8, async () => {
    await hold(1300);
    await click("scenario-regional-listing");
    await hold(700);
    await click("demo-next");
    await hold(900);
    await click("demo-next");
  });
  await scene("11-atp-mapping", 8, async () => {
    await click("demo-next");
    await hold(900);
    await click("demo-next");
    await hold(900);
    await click("demo-next");
    await hold(900);
    await page.mouse.wheel(0, 280);
  });
  await scene("12-atp-review", 8, async () => {
    await click("demo-next");
    await hold(1100);
    await click("demo-next");
    await hold(1100);
    await click("demo-approve");
    await hold(850);
    await page.mouse.wheel(0, -280);
  });
  await goto("/");
  await scene("13-admin", 8, async () => {
    await hold(700);
    await click("module-card-admin");
    await hold(1450);
    await click("sidebar-tab-integration-monitoring");
    await hold(1200);
    await click("sidebar-tab-ccr-ruleset");
  });
  }
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });