// Prueba de principio a fin en móviles emulados (Chromium con perfiles de iPhone y Android).
// Uso: npm run test:e2e   (genera capturas en tests/capturas/)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium, devices } from 'playwright';

const WEB = new URL('../web/', import.meta.url).pathname;
const CAPTURAS = new URL('./capturas/', import.meta.url).pathname;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

let servidor;
let base;
let navegador;

before(async () => {
  servidor = createServer(async (req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const archivo = normalize(join(WEB, ruta.endsWith('/') ? `${ruta}index.html` : ruta));
    if (!archivo.startsWith(WEB)) return res.writeHead(403).end();
    try {
      const contenido = await readFile(archivo);
      res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' }).end(contenido);
    } catch {
      res.writeHead(404).end('no encontrado');
    }
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${servidor.address().port}/`;
  navegador = await chromium.launch();
  await mkdir(CAPTURAS, { recursive: true });
});

after(async () => {
  await navegador?.close();
  servidor?.close();
});

async function recorrer(pagina, { dia, mes, anio, nombre }) {
  await pagina.getByRole('button', { name: 'Descubrir mi número' }).click();
  await pagina.getByLabel('Día').selectOption(String(dia));
  await pagina.getByLabel('Mes').selectOption(String(mes));
  await pagina.getByLabel('Año').selectOption(String(anio));
  await pagina.getByRole('button', { name: 'Continuar' }).click();
  await pagina.getByRole('button', { name: /El amor/ }).click();
  await pagina.getByRole('button', { name: /Con ganas de cambio/ }).click();
  await pagina.getByRole('button', { name: /11:11/ }).click();
  if (nombre === undefined) await pagina.getByRole('button', { name: 'Prefiero no decirlo' }).click();
  else {
    await pagina.getByRole('textbox').fill(nombre);
    await pagina.getByRole('button', { name: 'Ver mi resultado' }).click();
  }
  await pagina.getByRole('heading', { level: 1 }).waitFor({ timeout: 5000 });
}

for (const dispositivo of ['iPhone 13', 'Pixel 7']) {
  test(`recorrido completo en ${dispositivo}`, async () => {
    const contexto = await navegador.newContext({ ...devices[dispositivo] });
    const pagina = await contexto.newPage();
    const errores = [];
    pagina.on('pageerror', (e) => errores.push(e.message));
    await pagina.goto(base);
    await pagina.screenshot({ path: `${CAPTURAS}${dispositivo}-1-inicio.png`, fullPage: true });

    await recorrer(pagina, { dia: 14, mes: 3, anio: 1985, nombre: '  maría ' });
    assert.match(await pagina.locator('h1').innerText(), /La Constructora/);
    assert.equal((await pagina.locator('.numero').innerText()).trim(), '4');
    const texto = await pagina.locator('main').innerText();
    assert.match(texto, /María, tu Número de Vida es el/);
    assert.match(texto, /Lo que tu número dice sobre el amor/);
    assert.match(texto, /Esas ganas de cambio/);
    assert.match(texto, /11:11/);
    assert.match(texto, /9 USD · pago único/);
    // Sin enlace de tienda configurado, el botón aparece desactivado.
    assert.equal(await pagina.locator('.informe [aria-disabled="true"]').innerText(), 'Muy pronto disponible');
    const whatsapp = await pagina.getByRole('link', { name: 'Compartir por WhatsApp' }).getAttribute('href');
    assert.match(decodeURIComponent(whatsapp), /La Constructora .*r\/numero-de-vida\/4\.html/);
    await pagina.screenshot({ path: `${CAPTURAS}${dispositivo}-2-resultado.png`, fullPage: true });

    // Sin horizontal scroll en el móvil.
    const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(desborde <= 0, `desborde horizontal de ${desborde}px`);
    assert.deepEqual(errores, []);
    await contexto.close();
  });
}

test('fecha imposible muestra un error', async () => {
  const pagina = await navegador.newPage({ ...devices['Pixel 7'] });
  await pagina.goto(base);
  await pagina.getByRole('button', { name: 'Descubrir mi número' }).click();
  await pagina.getByRole('button', { name: 'Continuar' }).click();
  assert.match(await pagina.getByRole('alert').innerText(), /Elige tu día/);
  await pagina.getByLabel('Día').selectOption('31');
  await pagina.getByLabel('Mes').selectOption('2');
  await pagina.getByLabel('Año').selectOption('1990');
  await pagina.getByRole('button', { name: 'Continuar' }).click();
  assert.match(await pagina.getByRole('alert').innerText(), /no existe/);
  await pagina.close();
});

test('número maestro sin nombre y botón de compra con enlace', async () => {
  const pagina = await navegador.newPage({ ...devices['iPhone 13'] });
  // Simula un enlace de tienda configurado para el resultado 11.
  await pagina.route('**/quizzes/numero-de-vida.json', async (ruta) => {
    const quiz = JSON.parse(await readFile(join(WEB, 'quizzes/numero-de-vida.json'), 'utf8'));
    quiz.resultados['11'].comprar_url = 'https://tienda.ejemplo/numero-11';
    await ruta.fulfill({ json: quiz });
  });
  await pagina.route('https://tienda.ejemplo/**', (ruta) => ruta.fulfill({ body: 'tienda' }));
  await pagina.goto(base);
  await recorrer(pagina, { dia: 29, mes: 9, anio: 1980 }); // 38 → 11
  assert.equal((await pagina.locator('.numero').innerText()).trim(), '11');
  assert.match(await pagina.locator('main').innerText(), /Número maestro/i);
  assert.match(await pagina.locator('.saludo').innerText(), /^Tu Número de Vida es el/);
  await pagina.getByRole('link', { name: 'Quiero mi informe completo' }).click();
  await pagina.waitForURL('https://tienda.ejemplo/numero-11');
  await pagina.close();
});

test('página para compartir lleva al cuestionario', async () => {
  const pagina = await navegador.newPage({ ...devices['Pixel 7'] });
  await pagina.goto(`${base}r/numero-de-vida/7.html`);
  assert.match(await pagina.locator('h1').innerText(), /La Sabia/);
  assert.equal(await pagina.locator('meta[property="og:image"]').getAttribute('content') !== null, true);
  await pagina.getByRole('link', { name: 'Descubrir mi número gratis' }).click();
  await pagina.getByRole('button', { name: 'Descubrir mi número' }).waitFor();
  assert.match(pagina.url(), /ref=compartido-7/);
  await pagina.close();
});
