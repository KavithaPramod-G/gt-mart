import http from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');
const port = 8765;

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const fs = await import('node:fs/promises');
        const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
        const relative = urlPath.replace(/^\//, '') || 'docs/marketing/pamphlet-a4.html';
        const filePath = join(projectRoot, relative);
        if (!filePath.startsWith(projectRoot)) {
          res.writeHead(403).end('Forbidden');
          return;
        }
        const data = await fs.readFile(filePath);
        const ext = filePath.split('.').pop();
        const type = { html: 'text/html', js: 'text/javascript', png: 'image/png' }[ext] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type }).end(data);
      } catch {
        res.writeHead(404).end('Not found');
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function pdf(browser, path, out) {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/${path}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('#qrCode', { timeout: 20000 });
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  await page.close();
  console.log('Created', out);
}

const server = await startServer();
const browserPaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const executablePath = browserPaths.find((path) => existsSync(path));

const browser = await puppeteer.launch({
  headless: true,
  executablePath: executablePath || undefined,
});
try {
  await pdf(browser, 'docs/marketing/pamphlet-a4.html', join(__dirname, 'RR-Basket-pamphlet-A4.pdf'));
  await pdf(browser, 'docs/marketing/banner-shop.html', join(__dirname, 'RR-Basket-shop-banner.pdf'));
} finally {
  await browser.close();
  server.close();
}
