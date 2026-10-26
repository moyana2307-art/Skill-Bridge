const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const root = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

const SERVICES = [
  {
    name: 'backend',
    cwd: path.join(root, 'backend'),
    script: 'dev',
    port: 5000,
    url: 'http://localhost:5000/api/health',
    color: '\x1b[36m',
  },
  {
    name: 'frontend',
    cwd: path.join(root, 'frontend'),
    script: 'start',
    port: 3000,
    url: 'http://localhost:3000',
    color: '\x1b[35m',
  },
];

const FRONTEND_URL = 'http://localhost:3000';
const OPEN_BROWSER = !process.argv.includes('--no-open') && process.env.NO_OPEN !== '1';

const children = [];
let shuttingDown = false;

function openBrowser(url) {
  if (!OPEN_BROWSER) return;

  const command =
    process.platform === 'win32'
      ? { file: 'cmd', args: ['/c', 'start', '""', url] }
      : process.platform === 'darwin'
        ? { file: 'open', args: [url] }
        : { file: 'xdg-open', args: [url] };

  try {
    const child = spawn(command.file, command.args, {
      stdio: 'ignore',
      detached: true,
      windowsHide: true,
      windowsVerbatimArguments: process.platform === 'win32',
    });
    child.unref();
    console.log(`Opening ${url} in your browser...`);
  } catch (err) {
    console.log(`Could not open the browser automatically. Open ${url} manually.`);
  }
}

function isPortOpen(port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    let settled = false;

    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function waitForPort(port, timeoutMs = 180000, intervalMs = 300) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (shuttingDown) return false;
    if (await isPortOpen(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

function writePrefixed(stream, name, color) {
  let buffer = '';

  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();

    for (const line of lines) {
      if (line.trim()) {
        process.stdout.write(`${color}[${name}]\x1b[0m ${line}\n`);
      }
    }
  });
}

function killTree(child) {
  if (!child.pid || child.killed) return;

  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  } else {
    child.kill('SIGTERM');
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    killTree(child);
  }

  setTimeout(() => process.exit(exitCode), 400);
}

function startService(service) {
  const command = `npm run ${service.script}`;
  const child = spawn(command, {
    cwd: service.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  children.push(child);
  writePrefixed(child.stdout, service.name, service.color);
  writePrefixed(child.stderr, service.name, service.color);

  child.on('exit', (code) => {
    if (shuttingDown) return;
    console.log(`[${service.name}] stopped${code ? ` with code ${code}` : ''}.`);
    shutdown(code || 0);
  });
}

async function main() {
  console.log('Checking which services are already running...');

  const statuses = await Promise.all(
    SERVICES.map(async (service) => ({
      service,
      running: await isPortOpen(service.port),
    }))
  );

  for (const { service, running } of statuses) {
    if (running) {
      console.log(
        `${service.color}[${service.name}]\x1b[0m already running on port ${service.port} - skipping.`
      );
    } else {
      console.log(
        `${service.color}[${service.name}]\x1b[0m starting on port ${service.port} ...`
      );
      startService(service);
    }
  }

  if (children.length === 0) {
    console.log('Both backend and frontend are already running.');
  } else {
    console.log('Waiting for both services to be ready...');
  }

  const ready = await Promise.all(
    SERVICES.map((service) => waitForPort(service.port))
  );

  if (shuttingDown) return;

  if (ready.every(Boolean)) {
    console.log('Both services are ready.');
    openBrowser(FRONTEND_URL);
  } else {
    const missing = SERVICES.filter((_, index) => !ready[index])
      .map((service) => service.name)
      .join(', ');
    console.log(
      `Could not reach ${missing} in time. Open ${FRONTEND_URL} once it is running.`
    );
  }

  if (children.length === 0) {
    setTimeout(() => process.exit(0), 500);
  }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((err) => {
  console.error(err);
  shutdown(1);
});
