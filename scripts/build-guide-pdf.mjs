// Rebuilds public/resources/chazarat-hashas-guide.pdf — the Guide's
// Download file — from the Guide's own print layout, so the PDF is the
// same words as the screen. Run it after changing the Guide's copy:
//
//   npm run dev          (in another terminal)
//   node scripts/build-guide-pdf.mjs [http://localhost:5173]
//
// Drives a locally installed Chrome (or Edge) headless over the DevTools
// protocol with Node's built-in WebSocket, so it needs no extra packages.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:5173";
const out = new URL("../public/resources/chazarat-hashas-guide.pdf", import.meta.url);
const port = 9333;

const browsers = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browser = browsers.find((p) => existsSync(p));
if (!browser) throw new Error("No Chrome or Edge found — set CHROME_PATH.");

const profile = mkdtempSync(join(tmpdir(), "guide-pdf-"));
const chrome = spawn(browser, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pageSocketUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = targets.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // not listening yet
    }
    await sleep(200);
  }
  throw new Error("Chrome's DevTools port never came up.");
}

const ws = new WebSocket(await pageSocketUrl());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 0;
const pending = new Map();
let onLoad = null;
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.method === "Page.loadEventFired") onLoad?.();
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
});
// Every step times out rather than hanging the script forever.
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => pending.has(id) && reject(new Error(`${method} timed out`)), 20000);
  });
// Waits for the new page's load event — asking the page anything before
// that reaches the document being unloaded, which never answers.
const navigate = async (url) => {
  const loaded = new Promise((r) => (onLoad = r));
  await send("Page.navigate", { url });
  await loaded;
};
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

try {
  await send("Page.enable");
  // A fresh profile is a first visit, which opens the sign-in card on top
  // of everything. Mark it already retired so it never appears.
  await navigate(base);
  await evaluate(
    `localStorage.setItem("chazarat-hashas:firstOpenPrompt", JSON.stringify({ askedCount: 2, retired: true, exceptionUsed: true }))`,
  );
  await navigate(`${base}/guide`);
  // The app, its fonts and the Guide need to be up before the Print
  // overlay can be opened — wait for the button rather than a fixed time.
  for (let i = 0; i < 100 && !(await evaluate("!!document.querySelector('.guide-print-btn')")); i++) await sleep(200);
  await evaluate("document.querySelector('.guide-print-btn').click()");
  // Polled from here rather than awaited inside the page: a promise left
  // pending in the page (document.fonts.ready) can hang the whole call.
  const ready = "!!document.querySelector('.print-overlay .guide-panel--print') && document.fonts.status === 'loaded'";
  for (let i = 0; i < 100 && !(await evaluate(ready)); i++) await sleep(200);
  if (!(await evaluate(ready))) throw new Error("The Guide's print layout didn't open, or its fonts never loaded.");
  await sleep(500);
  const { data } = await send("Page.printToPDF", {
    printBackground: true,
    paperWidth: 8.5,
    paperHeight: 11,
    marginTop: 0.6,
    marginBottom: 0.6,
    marginLeft: 0.6,
    marginRight: 0.6,
  });
  writeFileSync(out, Buffer.from(data, "base64"));
  console.log(`Wrote ${out.pathname}`);
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
