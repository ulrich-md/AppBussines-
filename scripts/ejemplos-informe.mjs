// Genera las páginas de ejemplo que se enseñan en la oferta ("Así es un informe por dentro"),
// a partir del informe de muestra real de tests/fixtures/informe-premium.json.
// Uso: npm run ejemplos   → web/img/ejemplo/{perfil,meses,ritual}.webp
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium, devices } from 'playwright';
import sharp from 'sharp';

const WEB = new URL('../web/', import.meta.url).pathname;
const SALIDA = join(WEB, 'img', 'ejemplo');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const servidor = createServer(async (req, res) => {
  const archivo = normalize(join(WEB, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  try {
    const contenido = await readFile(archivo);
    res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' }).end(contenido);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
await mkdir(SALIDA, { recursive: true });

const informe = JSON.parse(await readFile(new URL('../tests/fixtures/informe-premium.json', import.meta.url), 'utf8'));
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ ...devices['iPhone 13'], colorScheme: 'light' });
await pagina.route('**/api/informe?*', (ruta) => ruta.fulfill({ json: informe }));
await pagina.goto(`http://127.0.0.1:${servidor.address().port}/informe.html?s=cs_test_ejemploInforme00001`);
await pagina.locator('#bienvenida').waitFor();
await pagina.addStyleTag({ content: '.barra-compra{display:none!important} *{animation:none!important}' });

// Recorte de 390×585 (proporción 2:3) empezando en el elemento indicado.
const recortes = { perfil: ['#perfil h3', 'Tus dones'], meses: ['#ciclos h3', 'Tus próximos 12 meses'], ritual: ['.ritual', ''] };
for (const [nombre, [selector, texto]] of Object.entries(recortes)) {
  const caja = await pagina.locator(selector).filter({ hasText: texto }).first().evaluate((n) => {
    n.scrollIntoView({ block: 'start' });
    const r = n.getBoundingClientRect();
    return { y: r.top + window.scrollY - 16 };
  });
  const png = await pagina.screenshot({ fullPage: true, clip: { x: 0, y: caja.y, width: 390, height: 585 } });
  await sharp(png).resize({ width: 600, height: 900 }).webp({ quality: 80 }).toFile(join(SALIDA, `${nombre}.webp`));
}
await navegador.close();
servidor.close();
console.log('✓ ejemplos en web/img/ejemplo/');
