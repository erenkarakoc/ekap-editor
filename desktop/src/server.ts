import { spawn, ChildProcess, execSync } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';

let serverProcess: ChildProcess | null = null;

/** Find a free TCP port by binding to port 0. */
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('Failed to get free port')));
      }
    });
    srv.on('error', reject);
  });
}

/** Parse a .env file into a key-value record. */
function loadEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

/** Check if a TCP port is accepting connections. */
function isPortReady(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      resolve(false);
    });
  });
}

/** Wait until the server is accepting connections. */
async function waitForReady(port: number, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortReady(port)) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

/**
 * Start the Next.js standalone server.
 * Returns the URL the server is listening on.
 */
export async function startServer(resourcesPath: string): Promise<string> {
  const port = await getFreePort();
  const standaloneDir = path.join(resourcesPath, 'nextjs-standalone');
  const serverScript = path.join(standaloneDir, 'server.js');

  if (!fs.existsSync(serverScript)) {
    throw new Error(`server.js not found at ${serverScript}`);
  }

  // Load .env from the standalone bundle
  const dotenvPath = path.join(standaloneDir, '.env');
  const envVars = loadEnvFile(dotenvPath);

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    ...envVars,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
  };

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: standaloneDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  serverProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[next] ${data.toString().trim()}`);
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[next] ${data.toString().trim()}`);
  });

  serverProcess.on('exit', (code) => {
    console.log(`[next] server exited with code ${code}`);
    serverProcess = null;
  });

  await waitForReady(port);

  const url = `http://127.0.0.1:${port}`;
  console.log(`[next] server ready at ${url}`);
  return url;
}

/** Stop the Next.js server process. */
export function stopServer(): void {
  if (!serverProcess) return;

  const pid = serverProcess.pid;
  if (!pid) return;

  console.log(`[next] stopping server (pid ${pid})`);

  try {
    if (process.platform === 'win32') {
      // Kill entire process tree on Windows
      execSync(`taskkill /T /F /PID ${pid}`, { stdio: 'ignore' });
    } else {
      serverProcess.kill('SIGTERM');
    }
  } catch {
    // Process may already be gone
  }

  serverProcess = null;
}
