import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;
const srcDir = path.join(root, "src");

let buildRunning = false;
let buildQueued = false;
let debounceTimer = null;

function runBuild() {
  if (buildRunning) {
    buildQueued = true;
    return;
  }

  buildRunning = true;
  console.log("[vite-host] building dist.js...");

  const child = spawn(process.execPath, ["build.mjs"], {
    cwd: root,
    stdio: "inherit"
  });

  child.on("exit", code => {
    buildRunning = false;

    if (code !== 0) {
      console.error(`[vite-host] build failed with code ${code}`);
    } else {
      console.log("[vite-host] dist.js updated");
    }

    if (buildQueued) {
      buildQueued = false;
      runBuild();
    }
  });
}

function scheduleBuild() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runBuild, 100);
}

async function start() {
  runBuild();

  watch(srcDir, { recursive: true }, (_eventType, filename) => {
    if (!filename) {
      scheduleBuild();
      return;
    }

    if (String(filename).includes(".git")) {
      return;
    }

    console.log(`[vite-host] change detected: ${filename}`);
    scheduleBuild();
  });

  const server = await createServer({
    root,
    server: {
      host: true,
      open: "/index.html"
    }
  });

  await server.listen();
  server.printUrls();
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
