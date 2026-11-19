const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:3000";
const OUT = "C:\\Users\\Asus\\AppData\\Local\\Temp\\opencode\\ui-audit";

const pagesAdmin = [
  "/dashboard",
  "/dashboard/trips",
  "/dashboard/documenti",
  "/dashboard/vehicles",
  "/dashboard/users",
  "/dashboard/carico",
  "/dashboard/preventivi",
  "/dashboard/ordini",
  "/dashboard/scadenze",
  "/dashboard/costi-mezzi",
  "/dashboard/cisterne",
  "/dashboard/analisi-clienti",
  "/dashboard/flotta",
  "/dashboard/abbonamenti",
  "/dashboard/agevolazioni",
  "/dashboard/integrazioni",
];

const pagesDriver = ["/dashboard/autista"];

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("#email", { timeout: 20000 });
  await page.type("#email", email);
  await page.type("#password", password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => {}),
    page.click("button[type=submit]"),
  ]);
  await new Promise((r) => setTimeout(r, 1500));
}

async function audit(page, route, width) {
  await page.setViewport({ width, height: width === 390 ? 844 : 900 });
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 60000 });
  } catch {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  }
  await new Promise((r) => setTimeout(r, 1800));
  const data = await page.evaluate(() => {
    const text = document.body.innerText || "";
    const hits = [];
    const re = /.{0,35}_.{0,35}/g;
    let m;
    while ((m = re.exec(text)) && hits.length < 20) {
      hits.push(m[0].replace(/\s+/g, " ").trim());
    }
    return {
      url: location.pathname,
      title: document.title,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      hits,
      textSample: text.slice(0, 300).replace(/\s+/g, " "),
    };
  });
  const file = path.join(OUT, `${route.replace(/\//g, "_") || "root"}-${width}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  return { route, width, ...data, screenshot: file };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });
  const results = [];

  const admin = await browser.newPage();
  await login(admin, "admin@demo.com", "Demo123!");
  for (const route of pagesAdmin) {
    for (const width of [1440, 390]) {
      const r = await audit(admin, route, width);
      results.push(r);
      console.log(`${width} ${route} overflow=${r.overflow} hits=${r.hits.length}${r.hits.length ? " :: " + r.hits.join(" || ") : ""}`);
    }
  }

  const driver = await browser.newPage();
  await login(driver, "autista@demo.com", "Demo123!");
  for (const route of pagesDriver) {
    for (const width of [1440, 390]) {
      const r = await audit(driver, route, width);
      results.push(r);
      console.log(`${width} ${route} overflow=${r.overflow} hits=${r.hits.length}${r.hits.length ? " :: " + r.hits.join(" || ") : ""}`);
    }
  }

  fs.writeFileSync(path.join(OUT, "audit.json"), JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
