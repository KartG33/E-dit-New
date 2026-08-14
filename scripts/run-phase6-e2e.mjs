import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const viteCli = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const playwrightCli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));
const appUrl = 'http://127.0.0.1:4173';

const waitForServer = async () => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(appUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Vite did not become available at ${appUrl}`);
};

const waitForExit = child => new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', code => resolve(code ?? 1));
});

const server = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', '4173'], {
  stdio: 'ignore',
  windowsHide: true,
});

let exitCode = 1;
try {
  await waitForServer();
  const tests = spawn(process.execPath, [playwrightCli, 'test', '--config', 'playwright.phase6.config.ts'], {
    stdio: 'inherit',
    windowsHide: true,
  });
  exitCode = await waitForExit(tests);
} finally {
  server.kill('SIGTERM');
}

process.exitCode = exitCode;
