// Capturas de todas las pantallas en varios móviles (modo claro y oscuro) para revisar el diseño.
// Uso: node scripts/capturas-movil.mjs   → tests/capturas/movil/<dispositivo>-<modo>-<paso>.png
// La IA, el pago y el informe se simulan (no hace falta ninguna clave).
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium, devices } from 'playwright';

const WEB = new URL('../web/', import.meta.url).pathname;
const SALIDA = new URL('../tests/capturas/movil/', import.meta.url).pathname;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const DISPOSITIVOS = {
  'iphone-se': devices['iPhone SE'],
  'iphone-13': devices['iPhone 13'],
  'android-360': { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } },
};
const soloDispositivo = process.argv[2];

const servidor = createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const archivo = normalize(join(WEB, ruta.endsWith('/') ? `${ruta}index.html` : ruta));
  try {
    const contenido = await readFile(archivo);
    res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' }).end(contenido);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${servidor.address().port}/`;
await mkdir(SALIDA, { recursive: true });

const lectura = {
  titular: 'Una constructora que aprende a confiar en su propia luz',
  esencia: 'Querida {{nombre}}, tu Número de Vida 4 te define como una mujer constante y leal, la base sobre la que otros se apoyan. Quienes te quieren te describen como responsable, y es verdad: cumples lo que prometes. Tu Número de Expresión 9 añade compasión a esa fuerza.',
  interior: 'Tu Número del Alma 9 revela un deseo profundo de vivir desde el amor y la comprensión, de soltar viejas cargas y encontrar paz.',
  momento: 'Transitas un Año Personal 9, un tiempo de cierres. Tus ganas de cambio no son casualidad: la vida te invita a soltar lo que ya cumplió su ciclo.',
  area: 'En el amor, estás abierta a algo nuevo. Tu reto es permitirte ser vulnerable y recibir el mismo cuidado que das.',
  senal: 'Ver el 11:11 es una invitación a prestar atención a lo que piensas en ese momento.',
  consejo: 'Esta semana, dedica diez minutos al día a caminar en silencio y anotar una cosa que agradeces.',
  frase: 'Confío en mi proceso y abro mi corazón al amor que merezco.',
  mes_clave: 'Ese mes tu energía se alinea con el hogar, los compromisos y el afecto genuino, justo lo que tu corazón está pidiendo.',
};
const informe = JSON.parse(await readFile(new URL('../tests/fixtures/informe-premium.json', import.meta.url), 'utf8'));

const navegador = await chromium.launch();
for (const [nombre, dispositivo] of Object.entries(DISPOSITIVOS)) {
  if (soloDispositivo && nombre !== soloDispositivo) continue;
  for (const modo of ['light', 'dark']) {
    const contexto = await navegador.newContext({ ...dispositivo, colorScheme: modo });
    const pagina = await contexto.newPage();
    const foto = async (paso) => {
      await pagina.waitForTimeout(700);
      await pagina.screenshot({ path: `${SALIDA}${nombre}-${modo}-${paso}.png` });
    };
    let lecturaLista;
    const esperaLectura = new Promise((ok) => { lecturaLista = ok; });
    await pagina.route('**/api/lectura', async (ruta) => { await esperaLectura; await ruta.fulfill({ json: { lectura } }); });
    await pagina.route('**/api/informe?*', (ruta) => ruta.fulfill({ json: informe }));

    await pagina.goto(base);
    await foto('01-inicio');
    await pagina.getByRole('button', { name: 'Descubrir mi número' }).click();
    await foto('02-fecha');
    await pagina.getByLabel('Día').selectOption('14');
    await pagina.getByLabel('Mes').selectOption('3');
    await pagina.getByLabel('Año').selectOption('1985');
    await pagina.getByRole('button', { name: 'Continuar' }).click();
    await foto('03-nombre');
    await pagina.getByRole('textbox').fill('María José Núñez Peña');
    await pagina.getByRole('button', { name: 'Continuar' }).click();
    await foto('04-opciones');
    for (const opcion of [/Soltera y abierta/, /El amor/, /A mi trabajo/, /Confiar en mí/, /Con ganas de cambio/, /^Amor$/, /Responsable/, /Creo en las señales/]) {
      await pagina.getByRole('button', { name: opcion }).click();
    }
    await pagina.getByRole('button', { name: /11:11/ }).click();
    await foto('05-cargando');
    lecturaLista();
    await pagina.locator('.oferta').waitFor();
    await foto('06-resultado');
    await pagina.locator('.lectura-bloque').nth(2).scrollIntoViewIfNeeded();
    await foto('07-lectura-con-barra');
    await pagina.locator('.mes-clave').scrollIntoViewIfNeeded();
    await foto('08-mes-clave');
    await pagina.locator('.informe-bloqueado').evaluate((n) => n.scrollIntoView({ block: 'start' }));
    await foto('08b-informe-bloqueado');
    await pagina.locator('#oferta').evaluate((n) => n.scrollIntoView({ block: 'start' }));
    await foto('09-oferta');
    await pagina.locator('.linea-meses').evaluate((n) => n.scrollIntoView({ block: 'start' }));
    await foto('09b-meses-y-ejemplos');
    await pagina.locator('.planes').evaluate((n) => n.scrollIntoView({ block: 'start' }));
    await foto('10-planes');
    await pagina.locator('.boton-compra').evaluate((n) => n.scrollIntoView({ block: 'center' }));
    await foto('11-boton-compra');
    await pagina.locator('.faq').evaluate((n) => n.scrollIntoView({ block: 'start' }));
    await pagina.locator('.faq summary').first().click();
    await foto('11b-faq');
    await pagina.screenshot({ path: `${SALIDA}${nombre}-${modo}-12-resultado-completo.png`, fullPage: true });

    await pagina.goto(`${base}informe.html?s=cs_test_capturaInforme00001`);
    await pagina.locator('#bienvenida').waitFor();
    await foto('13-informe');
    await pagina.locator('#ciclos .meses').evaluate((n) => n.scrollIntoView({ block: 'start' }));
    await foto('14-informe-meses');
    await contexto.close();
  }
}
await navegador.close();
servidor.close();
console.log(`Capturas en ${SALIDA}`);
