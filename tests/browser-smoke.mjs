import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const screenshotDir = join(root, "screenshots");
const browserErrors = [];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
};

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolvePort(port));
    });
  });
}

function startStaticServer() {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = normalize(resolve(root, relativePath));

    if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const size = statSync(filePath).size;
    const contentType = mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    const range = request.headers.range?.match(/bytes=(\d+)-(\d*)/);

    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      response.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Type": contentType,
      });
      createReadStream(filePath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, {
      "Accept-Ranges": "bytes",
      "Content-Length": size,
      "Content-Type": contentType,
    });
    createReadStream(filePath).pipe(response);
  });

  return new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveServer(server));
  });
}

async function waitForPage(debugPort) {
  const endpoint = `http://127.0.0.1:${debugPort}/json`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const targets = await fetch(endpoint).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("Chrome DevTools target를 찾지 못했습니다.");
}

function createCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const { resolveCommand, rejectCommand } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) rejectCommand(new Error(message.error.message));
      else resolveCommand(message.result);
      return;
    }

    if (message.method === "Runtime.exceptionThrown") {
      browserErrors.push(message.params.exceptionDetails.text);
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      browserErrors.push(message.params.entry.text);
    }
    if (
      message.method === "Network.responseReceived" &&
      message.params.response.url.startsWith(baseUrl) &&
      message.params.response.status >= 400
    ) {
      browserErrors.push(`${message.params.response.status} ${message.params.response.url}`);
    }
  });

  const ready = new Promise((resolveSocket, rejectSocket) => {
    socket.addEventListener("open", resolveSocket, { once: true });
    socket.addEventListener("error", rejectSocket, { once: true });
  });

  return {
    async send(method, params = {}) {
      await ready;
      const commandId = (id += 1);
      return new Promise((resolveCommand, rejectCommand) => {
        pending.set(commandId, { resolveCommand, rejectCommand });
        socket.send(JSON.stringify({ id: commandId, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(client, expression) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function waitForReady(client) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if ((await evaluate(client, "document.readyState")) === "complete") return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error("페이지 로딩이 완료되지 않았습니다.");
}

async function capture(client, filename) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  writeFileSync(join(screenshotDir, filename), Buffer.from(result.data, "base64"));
}

assert.ok(existsSync(chromePath), "Chrome 실행 파일이 필요합니다.");
mkdirSync(screenshotDir, { recursive: true });

const server = await startStaticServer();
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const debugPort = await getFreePort();
const profileDir = join(tmpdir(), `junbeom-portfolio-chrome-${process.pid}`);
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    "--window-size=1440,1200",
    `${baseUrl}/`,
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
const chromeExited = new Promise((resolveExit) => chrome.once("exit", resolveExit));

let chromeStderr = "";
chrome.stderr.on("data", (chunk) => {
  chromeStderr += chunk.toString();
});

let client;
try {
  const page = await waitForPage(debugPort);
  client = createCdpClient(page.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  await client.send("Network.enable");
  await waitForReady(client);

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send("Page.reload", { ignoreCache: true });
  await waitForReady(client);
  assert.equal(await evaluate(client, "document.documentElement.scrollWidth <= window.innerWidth"), true);
  assert.equal(await evaluate(client, "document.querySelector('h1').textContent.trim()"), "이준범");
  assert.equal(
    await evaluate(client, "document.querySelector('.project-details summary').click(); document.querySelector('.project-details').open"),
    true,
  );
  assert.equal(
    await evaluate(client, "document.querySelector('[data-lightbox]').click(); document.querySelector('#image-dialog').open"),
    true,
  );
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
  assert.equal(await evaluate(client, "document.querySelector('#image-dialog').open"), false);
  await capture(client, "portfolio-desktop.png");

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 800,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.send("Page.reload", { ignoreCache: true });
  await waitForReady(client);
  assert.equal(await evaluate(client, "document.documentElement.scrollWidth <= window.innerWidth"), true);

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.send("Page.reload", { ignoreCache: true });
  await waitForReady(client);
  assert.equal(await evaluate(client, "document.documentElement.scrollWidth <= window.innerWidth"), true);
  assert.equal(
    await evaluate(client, "document.querySelector('.menu-toggle').click(); document.querySelector('.menu-toggle').getAttribute('aria-expanded')"),
    "true",
  );
  assert.equal(
    await evaluate(client, "document.querySelector('#site-nav a').click(); document.querySelector('.menu-toggle').getAttribute('aria-expanded')"),
    "false",
  );
  assert.equal(
    await evaluate(client, "document.querySelector('.menu-toggle').click(); document.querySelector('.menu-toggle').getAttribute('aria-expanded')"),
    "true",
  );
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
  assert.equal(await evaluate(client, "document.querySelector('.menu-toggle').getAttribute('aria-expanded')"), "false");
  await capture(client, "portfolio-mobile.png");

  assert.deepEqual(browserErrors, [], `브라우저 오류가 없어야 합니다: ${browserErrors.join(" | ")}`);
  console.log("Browser smoke: desktop/mobile overflow, menu, details, dialog, links, console PASS");
} catch (error) {
  if (chromeStderr.trim()) console.error(chromeStderr.trim().split(/\r?\n/).slice(-8).join("\n"));
  throw error;
} finally {
  if (chrome.exitCode === null && client) {
    try {
      await client.send("Browser.close");
    } catch {
      // Chrome may close the DevTools socket before acknowledging the command.
    }
  }
  client?.close();
  if (chrome.exitCode === null) {
    const exitedGracefully = await Promise.race([
      chromeExited.then(() => true),
      new Promise((resolveWait) => setTimeout(() => resolveWait(false), 5000)),
    ]);
    if (!exitedGracefully && chrome.exitCode === null) {
      chrome.kill();
      await chromeExited;
    }
  }
  await new Promise((resolveClose) => server.close(resolveClose));
  const safeTempRoot = resolve(tmpdir());
  const safeProfile = resolve(profileDir);
  if (safeProfile.startsWith(safeTempRoot)) {
    try {
      rmSync(safeProfile, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    } catch (error) {
      const transientWindowsLocks = new Set(["EBUSY", "ENOTEMPTY", "EPERM"]);
      if (!transientWindowsLocks.has(error.code)) throw error;
    }
  }
}
