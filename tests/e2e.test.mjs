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
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

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

const OPCIONES = [
  /Separada, empezando de nuevo/, /El amor/, /A cuidar de alguien/, /Tener tiempo para mí/,
  /Con ganas de cambio/, /Paz interior/, /Cariñosa/, /Tengo fe y rezo/, /11:11/,
];

async function recorrer(pagina, { dia, mes, anio, nombre }) {
  await pagina.getByRole('button', { name: 'Descubrir mi número' }).first().click();
  await pagina.getByLabel('Día').selectOption(String(dia));
  await pagina.getByLabel('Mes').selectOption(String(mes));
  await pagina.getByLabel('Año').selectOption(String(anio));
  await pagina.getByRole('button', { name: 'Continuar' }).click();
  if (nombre === undefined) await pagina.getByRole('button', { name: 'Prefiero solo usar mi fecha' }).click();
  else {
    await pagina.getByRole('textbox').fill(nombre);
    await pagina.getByRole('button', { name: 'Continuar' }).click();
  }
  for (const opcion of OPCIONES) await pagina.getByRole('button', { name: opcion }).click();
  await pagina.getByRole('heading', { level: 1 }).waitFor({ timeout: 10000 });
}

// Simula la función /api/lectura (en local no existe): responde con una lectura o con un error.
async function simularIA(pagina, { estado = 200, peticiones = [] } = {}) {
  await pagina.route('**/api/lectura', async (ruta) => {
    peticiones.push(JSON.parse(ruta.request().postData()));
    if (estado !== 200) return ruta.fulfill({ status: estado, json: { error: 'x' } });
    await ruta.fulfill({
      json: {
        lectura: {
          titular: 'Una constructora que aprende a descansar',
          esencia: 'Querida {{nombre}}, tu 4 habla de constancia.',
          momento: 'Estás cuidando de alguien y necesitas tiempo para ti.',
          area: 'En el amor buscas un refugio seguro.',
          senal: 'El 11:11 es una invitación a confiar.',
          consejo: 'Esta semana, reserva diez minutos para ti.',
          frase: 'Merezco descansar y ser cuidada.',
          interior: 'Tu alma desea calma y reconocimiento.',
          mes_clave: 'Ese mes resuena con tu deseo de paz.',
        },
      },
    });
  });
}

for (const dispositivo of ['iPhone 13', 'Pixel 7']) {
  test(`recorrido completo en ${dispositivo}`, async () => {
    const contexto = await navegador.newContext({ ...devices[dispositivo] });
    const pagina = await contexto.newPage();
    const errores = [];
    const peticiones = [];
    pagina.on('pageerror', (e) => errores.push(e.message));
    await simularIA(pagina, { peticiones });
    await pagina.goto(base);
    await pagina.screenshot({ path: `${CAPTURAS}${dispositivo}-1-inicio.png`, fullPage: true });

    await recorrer(pagina, { dia: 14, mes: 3, anio: 1985, nombre: '  maría josé núñez peña ' });
    // Arquetipo combinado: Número de Vida 4 + Número del Alma 9 (vocales del nombre completo).
    assert.match(await pagina.locator('h1').innerText(), /La Constructora con alma de sanadora$/);
    assert.equal((await pagina.locator('.numero').innerText()).trim(), '4');
    // Cada arquetipo tiene su propia imagen.
    assert.match(await pagina.locator('.resultado-imagen').getAttribute('src'), /arquetipos\/4-896\.webp$/);
    assert.ok(await pagina.locator('.resultado-imagen').evaluate((img) => img.decode().then(() => img.naturalWidth > 0)));
    const texto = await pagina.locator('main').innerText();
    assert.match(texto, /María, tu Número de Vida es el/);
    assert.match(texto, /Una constructora que aprende a descansar/);
    assert.match(texto, /Querida María, tu 4 habla de constancia/);
    assert.match(texto, /Lo que tu número dice sobre el amor/);
    assert.match(texto, /Tu gesto para esta semana/);
    assert.match(texto, /Merezco descansar y ser cuidada/);
    assert.match(texto, /escrita con inteligencia artificial/);
    assert.match(texto, /Tu mundo interior/);
    assert.match(texto, /Tu mes clave para tu paz interior/);
    // Imagen del alma: una por Número del Alma (aquí, el 9).
    assert.match(await pagina.locator('.lectura-bloque .bloque-imagen').getAttribute('src'), /almas\/9\.webp$/);
    // Carta completa visible: Vida 4, Alma 9, Expresión 9, Cumpleaños 5.
    assert.deepEqual(await pagina.locator('.resultado-cabecera .carta dd').allInnerTexts(), ['4', '9', '9', '5', '9']);
    // Ni el nombre ni la fecha de nacimiento salen del teléfono: solo los números ya calculados.
    assert.equal(peticiones.length, 1);
    assert.deepEqual(Object.keys(peticiones[0]).sort(), ['carta', 'edad', 'mes_clave', 'respuestas']);
    assert.equal(peticiones[0].carta.vida, 4);
    assert.equal(peticiones[0].carta.alma, 9);
    assert.doesNotMatch(JSON.stringify(peticiones[0]), /Mar[ií]a|1985|núñez/i);
    // Oferta: 3 planes, el recomendado preseleccionado y el precio en el botón.
    assert.equal(await pagina.locator('.plan').count(), 3);
    assert.equal(await pagina.locator('.plan input:checked').getAttribute('value'), 'completo');
    assert.match(await pagina.locator('.boton-compra').innerText(), /US\$14\.99/);
    assert.match(await pagina.locator('.portada-viva').innerText(), /El informe de María/);
    const whatsapp = await pagina.getByRole('link', { name: 'Enviar por WhatsApp' }).getAttribute('href');
    assert.match(decodeURIComponent(whatsapp), /La Constructora con alma de sanadora .*r\/numero-de-vida\/4\.html/);
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
  await pagina.getByRole('button', { name: 'Descubrir mi número' }).first().click();
  await pagina.getByRole('button', { name: 'Continuar' }).click();
  assert.match(await pagina.getByRole('alert').innerText(), /Elige tu día/);
  await pagina.getByLabel('Día').selectOption('31');
  await pagina.getByLabel('Mes').selectOption('2');
  await pagina.getByLabel('Año').selectOption('1990');
  await pagina.getByRole('button', { name: 'Continuar' }).click();
  assert.match(await pagina.getByRole('alert').innerText(), /no existe/);
  await pagina.close();
});

test('número maestro sin nombre, elegir plan y pagar', async () => {
  const pagina = await navegador.newPage({ ...devices['iPhone 13'] });
  await simularIA(pagina);
  const compras = [];
  await pagina.route('**/api/checkout', async (ruta) => {
    if (ruta.request().method() === 'GET') return ruta.fulfill({ json: { moneda: 'usd' } });
    compras.push(JSON.parse(ruta.request().postData()));
    await ruta.fulfill({ json: { url: 'https://tienda.ejemplo/checkout/cs_test_1' } });
  });
  await pagina.route('https://tienda.ejemplo/**', (ruta) => ruta.fulfill({ body: 'pago' }));
  await pagina.goto(base);
  await recorrer(pagina, { dia: 29, mes: 9, anio: 1980 }); // 38 → 11
  assert.equal((await pagina.locator('.numero').innerText()).trim(), '11');
  assert.match(await pagina.locator('main').innerText(), /Número maestro/i);
  assert.match(await pagina.locator('.saludo').innerText(), /^Tu Número de Vida es el/);
  // Sin nombre, el marcador se adapta: "Querida {{nombre}}," → "Querida,".
  assert.match(await pagina.locator('main').innerText(), /Querida, tu 4 habla/);
  // Sin nombre, la portada del informe no inventa uno.
  assert.match(await pagina.locator('.portada-viva').innerText(), /Tu informe personal/);
  await pagina.getByText('Informe + 12 meses + Pareja', { exact: true }).click();
  assert.match(await pagina.locator('.boton-compra').innerText(), /US\$19\.99/);
  await pagina.locator('.boton-compra').click();
  await pagina.waitForURL('https://tienda.ejemplo/checkout/cs_test_1');
  assert.equal(compras[0].producto, 'premium');
  assert.equal(compras[0].carta.vida, 11);
  assert.equal(compras[0].nombre, '');
  await pagina.close();
});

test('página para compartir lleva al cuestionario', async () => {
  const pagina = await navegador.newPage({ ...devices['Pixel 7'] });
  await pagina.goto(`${base}r/numero-de-vida/7.html`);
  assert.match(await pagina.locator('h1').innerText(), /La Sabia/);
  assert.equal(await pagina.locator('meta[property="og:image"]').getAttribute('content') !== null, true);
  await pagina.getByRole('link', { name: 'Descubrir mi número' }).click();
  await pagina.getByRole('button', { name: 'Descubrir mi número' }).first().waitFor();
  assert.match(pagina.url(), /ref=compartido-7/);
  await pagina.close();
});

test('si la IA falla, se muestra el resultado escrito de antemano', async () => {
  const pagina = await navegador.newPage({ ...devices['Pixel 7'] });
  await simularIA(pagina, { estado: 502 });
  await pagina.goto(base);
  await recorrer(pagina, { dia: 14, mes: 3, anio: 1985, nombre: 'Lucía' });
  const texto = await pagina.locator('main').innerText();
  assert.match(texto, /La Constructora/);
  assert.match(texto, /Tu esencia/);
  assert.match(texto, /Esas ganas de cambio/);
  assert.doesNotMatch(texto, /inteligencia artificial/);
  await pagina.close();
});

test('las preguntas usan el nombre', async () => {
  const pagina = await navegador.newPage({ ...devices['Pixel 7'] });
  await pagina.goto(base);
  await pagina.getByRole('button', { name: 'Descubrir mi número' }).first().click();
  await pagina.getByLabel('Día').selectOption('1');
  await pagina.getByLabel('Mes').selectOption('1');
  await pagina.getByLabel('Año').selectOption('1980');
  await pagina.getByRole('button', { name: 'Continuar' }).click();
  await pagina.getByRole('textbox').fill('carmen');
  await pagina.getByRole('button', { name: 'Continuar' }).click();
  assert.equal(await pagina.locator('h2').innerText(), 'Carmen, ¿cómo está tu vida amorosa ahora?');
  await pagina.close();
});

// Reglas de diseño (taste-skill / ui-ux-pro-max): sin emojis como iconos y sin guiones largos visibles.
const EMOJI = /\p{Extended_Pictographic}/u;
const GUION_LARGO = /[—–]/;

for (const esquema of ['light', 'dark']) {
  test(`reglas de diseño y capturas en modo ${esquema === 'light' ? 'claro' : 'oscuro'}`, async () => {
    const contexto = await navegador.newContext({ ...devices['iPhone 13'], colorScheme: esquema });
    const pagina = await contexto.newPage();
    await simularIA(pagina);
    await pagina.goto(base);
    await pagina.locator('.inicio-imagen').evaluate((img) => img.decode());
    await pagina.waitForTimeout(600); // fin de la animación de entrada
    await pagina.screenshot({ path: `${CAPTURAS}${esquema}-1-inicio.png` });
    const textos = [await pagina.locator('body').innerText()];

    await pagina.getByRole('button', { name: 'Descubrir mi número' }).first().click();
    await pagina.getByLabel('Día').selectOption('14');
    await pagina.getByLabel('Mes').selectOption('3');
    await pagina.getByLabel('Año').selectOption('1985');
    await pagina.getByRole('button', { name: 'Continuar' }).click();
    await pagina.getByRole('textbox').fill('Rosa');
    await pagina.getByRole('button', { name: 'Continuar' }).click();
    await pagina.waitForTimeout(500);
    await pagina.screenshot({ path: `${CAPTURAS}${esquema}-2-pregunta.png` });
    // Cada opción lleva un icono SVG de la librería (no un emoji).
    assert.equal(await pagina.locator('.opcion svg use').count(), await pagina.locator('.opcion').count());
    for (const opcion of OPCIONES) {
      textos.push(await pagina.locator('main').innerText());
      await pagina.getByRole('button', { name: opcion }).click();
    }
    await pagina.getByRole('heading', { level: 1 }).waitFor();
    await pagina.locator('.afirmacion').waitFor();
    await pagina.waitForTimeout(800);
    await pagina.screenshot({ path: `${CAPTURAS}${esquema}-3-resultado.png`, fullPage: true });
    textos.push(await pagina.locator('body').innerText());

    for (const texto of textos) {
      assert.doesNotMatch(texto, EMOJI, 'hay un emoji visible');
      assert.doesNotMatch(texto, GUION_LARGO, 'hay un guion largo visible');
    }
    // Las imágenes respetan su proporción (4:3 el arquetipo, 3:4 la portada del informe).
    const proporcion = (sel) => pagina.locator(sel).evaluate((n) => n.getBoundingClientRect().width / n.getBoundingClientRect().height);
    assert.ok(Math.abs((await proporcion('.resultado-imagen')) - 4 / 3) < 0.05);
    assert.ok(Math.abs((await proporcion('.portada-viva')) - 3 / 4) < 0.05);
    await contexto.close();
  });
}

test('si cancela el pago, vuelve a su resultado sin repetir el cuestionario', async () => {
  const pagina = await navegador.newPage({ ...devices['Pixel 7'] });
  const peticiones = [];
  await simularIA(pagina, { peticiones });
  await pagina.route('**/api/checkout', (ruta) => ruta.fulfill({ json: { url: `${base}?q=numero-de-vida&compra=cancelada` } }));
  await pagina.goto(base);
  await recorrer(pagina, { dia: 14, mes: 3, anio: 1985, nombre: 'Rosa' });
  await pagina.locator('.boton-compra').click();
  await pagina.waitForURL(/compra=cancelada/);
  await pagina.locator('.oferta').waitFor();
  assert.match(await pagina.locator('h1').innerText(), /La Constructora/);
  assert.match(await pagina.locator('main').innerText(), /Querida Rosa/);
  assert.equal(peticiones.length, 1, 'no vuelve a pedir la lectura a la IA');
  await pagina.close();
});

test('si los pagos no están configurados, lo explica sin romper nada', async () => {
  const pagina = await navegador.newPage({ ...devices['Pixel 7'] });
  await simularIA(pagina);
  await pagina.route('**/api/checkout', (ruta) => ruta.fulfill({ status: 503, json: { error: 'Pagos no configurados' } }));
  await pagina.goto(base);
  await recorrer(pagina, { dia: 14, mes: 3, anio: 1985, nombre: 'Rosa' });
  await pagina.locator('.boton-compra').click();
  await pagina.locator('.oferta .error', { hasText: /se están activando/ }).waitFor();
  assert.match(await pagina.locator('.boton-compra').innerText(), /Quiero mi informe/);
  await pagina.close();
});

async function simularInforme(pagina, { producto } = {}) {
  const informe = JSON.parse(await readFile(new URL('./fixtures/informe-premium.json', import.meta.url), 'utf8'));
  if (producto) informe.producto = { ...informe.producto, id: producto, secciones: ['perfil', 'areas', 'espiritual'] };
  await pagina.route('**/api/informe?*', async (ruta) => {
    const url = new URL(ruta.request().url());
    if (url.searchParams.get('pareja')) {
      return ruta.fulfill({ json: { pareja: { numero: Number(url.searchParams.get('pareja')), titulo: 'La Sabia', resumen: 'Una combinación profunda y tranquila.', fortalezas: ['Respeto', 'Calma', 'Lealtad'], retos: ['Silencios', 'Rutina', 'Distancia'], consejo: 'Hablen claro cada semana.' } } });
    }
    return ruta.fulfill({ json: informe });
  });
}

test('página del informe de pago: resumen, secciones, 12 meses, compatibilidad y PDF', async () => {
  for (const esquema of ['light', 'dark']) {
    const contexto = await navegador.newContext({ ...devices['iPhone 13'], colorScheme: esquema });
    const pagina = await contexto.newPage();
    const errores = [];
    pagina.on('pageerror', (e) => errores.push(e.message));
    await simularInforme(pagina);
    await pagina.goto(`${base}informe.html?s=cs_test_demoInforme000001`);
    await pagina.locator('#bienvenida').waitFor();
    const texto = await pagina.locator('main').innerText();
    assert.match(await pagina.locator('h1').innerText(), /La Constructora con alma de sanadora/);
    assert.match(texto, /El informe personal de María/);
    for (const titulo of ['Una carta para ti', 'Tu perfil', 'Amor y pareja', 'Dinero y vocación', 'Tus ciclos', 'Tu lado espiritual', 'Tu plan de 4 semanas', 'Compatibilidad', 'Para terminar']) {
      assert.ok(texto.toLowerCase().includes(titulo.toLowerCase()), titulo);
    }
    assert.equal(await pagina.locator('.mes').count(), 12);
    assert.match(await pagina.locator('#perfil .bloque-imagen').getAttribute('src'), /almas\/9\.webp$/);
    assert.equal(await pagina.locator('.afirmaciones li').count(), 12);
    assert.equal(await pagina.locator('.semana').count(), 4);
    assert.doesNotMatch(texto, /[—–]/);
    assert.doesNotMatch(texto, /\p{Extended_Pictographic}/u);
    // Compatibilidad: solo se envía el Número de Vida de la otra persona.
    const pedidas = [];
    pagina.on('request', (r) => { if (r.url().includes('pareja=')) pedidas.push(r.url()); });
    await pagina.getByLabel('Día').selectOption('7');
    await pagina.getByLabel('Mes').selectOption('7');
    await pagina.getByLabel('Año').selectOption('1980');
    await pagina.getByRole('button', { name: 'Ver nuestra compatibilidad' }).click();
    await pagina.locator('.pareja').waitFor();
    assert.match(pedidas[0], /pareja=\d+$/);
    assert.doesNotMatch(pedidas[0], /1980/);
    assert.match(await pagina.locator('.pareja h3').innerText(), /Tú y un \d+: La Sabia/);
    await pagina.screenshot({ path: `${CAPTURAS}${esquema}-4-informe.png`, fullPage: true });
    // Guardado en el teléfono: al volver no se pide otra vez al servidor.
    let pedidasInforme = 0;
    pagina.on('request', (r) => { if (r.url().includes('api/informe') && !r.url().includes('pareja')) pedidasInforme += 1; });
    await pagina.reload();
    await pagina.locator('#bienvenida').waitFor();
    assert.equal(pedidasInforme, 0);
    // Resumen arriba, textos en párrafos cortos y mes clave destacado.
    await pagina.locator('.vistazo').waitFor();
    assert.match(await pagina.locator('.vistazo').innerText(), /Tu mes clave para el amor[\s\S]*Mayo de 2027/i);
    assert.ok(await pagina.locator('#amor p').count() >= 3, 'el texto del amor se divide en párrafos');
    assert.equal(await pagina.locator('.mes.mes-es-clave').count(), 1);
    // Descargar PDF: baja un archivo (no abre el diálogo de imprimir).
    await pagina.route('**/api/pdf?*', (ruta) => ruta.fulfill({ status: 200, contentType: 'application/pdf', body: Buffer.from('%PDF-1.3\n%prueba\n') }));
    const [descarga] = await Promise.all([
      pagina.waitForEvent('download'),
      pagina.getByRole('button', { name: 'Descargar mi informe en PDF' }).click(),
    ]);
    assert.equal(descarga.suggestedFilename(), 'Informe-Maria.pdf');
    await pagina.locator('.informe-acciones [role="status"]', { hasText: 'se ha descargado' }).waitFor();
    // Al imprimir, la versión impresa oculta botones y formularios.
    await pagina.emulateMedia({ media: 'print' });
    assert.equal(await pagina.locator('.informe-acciones').isVisible(), false);
    assert.equal(await pagina.locator('form').first().isVisible(), false);
    assert.deepEqual(errores, []);
    await contexto.close();
  }
});

test('informe pendiente de pago (efectivo)', async () => {
  const pagina = await navegador.newPage({ ...devices['Pixel 7'] });
  await pagina.route('**/api/informe?*', (ruta) => ruta.fulfill({ status: 202, json: { estado: 'pendiente' } }));
  await pagina.goto(`${base}informe.html?s=cs_test_pendienteOxxo00001`);
  await pagina.getByRole('heading', { name: 'Tu pago está pendiente' }).waitFor();
  await pagina.close();
});

test('páginas legales', async () => {
  const pagina = await navegador.newPage({ ...devices['Pixel 7'] });
  for (const [ruta, titulo] of [['terminos.html', 'Términos y reembolsos'], ['privacidad.html', 'Privacidad']]) {
    await pagina.goto(`${base}${ruta}`);
    assert.equal(await pagina.locator('h1').innerText(), titulo);
    assert.doesNotMatch(await pagina.locator('main').innerText(), /[—–]/);
  }
  await pagina.close();
});

test('informe básico: ofrece mejorar pagando la diferencia', async () => {
  const pagina = await navegador.newPage({ ...devices['Pixel 7'] });
  await simularInforme(pagina, { producto: 'esencial' });
  const pedidas = [];
  await pagina.route('**/api/checkout', async (ruta) => {
    if (ruta.request().method() === 'GET') return ruta.fulfill({ json: { moneda: 'usd' } });
    pedidas.push(JSON.parse(ruta.request().postData()));
    await ruta.fulfill({ json: { url: 'https://tienda.ejemplo/mejora' } });
  });
  await pagina.route('https://tienda.ejemplo/**', (ruta) => ruta.fulfill({ body: 'pago' }));
  await pagina.goto(`${base}informe.html?s=cs_test_informeBasico000001`);
  await pagina.locator('.mejora').waitFor();
  assert.equal(await pagina.locator('.mejora-opcion').count(), 2);
  assert.equal(await pagina.locator('#ciclos').count(), 0, 'el básico no incluye los ciclos');
  await pagina.getByRole('button', { name: 'Añadir por US$5.99' }).click();
  await pagina.waitForURL('https://tienda.ejemplo/mejora');
  assert.deepEqual(pedidas[0], { producto: 'completo', mejora_de: 'cs_test_informeBasico000001' });
  await pagina.close();
});

test('incentivos de compra en el móvil (iPhone SE)', async () => {
  const pagina = await navegador.newPage({ ...devices['iPhone SE'] });
  await simularIA(pagina);
  await pagina.goto(base);
  // Portada: el botón principal se ve sin hacer scroll incluso en una pantalla pequeña.
  const botonInicio = pagina.getByRole('button', { name: 'Descubrir mi número' }).first();
  await pagina.waitForTimeout(500);
  const caja = await botonInicio.boundingBox();
  assert.ok(caja.y + caja.height <= 667, `el botón de la portada queda bajo el pliegue (${caja.y + caja.height}px)`);

  await recorrer(pagina, { dia: 14, mes: 3, anio: 1985, nombre: 'María José Núñez Peña' });
  await pagina.locator('.oferta').waitFor();
  // Sus 12 meses reales, con el mes clave marcado.
  assert.equal(await pagina.locator('.meses-mini li').count(), 12);
  assert.equal(await pagina.locator('.meses-mini li.es-clave').count(), 1);
  // Ejemplos reales del informe (imágenes que cargan).
  for (const img of await pagina.locator('.ejemplos img').all()) {
    const ancho = await img.evaluate((i) => {
      i.loading = 'eager';
      return i.complete && i.naturalWidth ? i.naturalWidth : new Promise((ok) => { i.onload = () => ok(i.naturalWidth); i.onerror = () => ok(0); });
    });
    assert.ok(ancho > 0, 'la imagen de ejemplo no carga');
  }
  // La portada personalizada usa la imagen del arquetipo (URL absoluta, no relativa a css/).
  const fondo = await pagina.locator('.portada-viva').evaluate((n) => getComputedStyle(n).backgroundImage);
  assert.match(fondo, /url\("http:\/\/127\.0\.0\.1:\d+\/img\/arquetipos\/4-640\.webp"\)/);
  // Barra fija: visible desde el principio del resultado y escondida mientras se ve la oferta.
  await pagina.evaluate(() => window.scrollTo(0, 0));
  await pagina.locator('.barra-compra:not([hidden])').waitFor();
  await pagina.locator('.planes').scrollIntoViewIfNeeded();
  await pagina.locator('.barra-compra[hidden]').waitFor({ state: 'attached' });
  // Lectura corta arriba: el informe bloqueado llega antes que el resto de la lectura gratis.
  const orden = await pagina.evaluate(() => {
    const y = (sel) => document.querySelector(sel).getBoundingClientRect().top + window.scrollY;
    return [y('.informe-bloqueado'), y('#oferta'), y('.lectura-resto')];
  });
  assert.ok(orden[0] < orden[1] && orden[1] < orden[2], `orden inesperado: ${orden}`);
  // El botón "Desbloquear mi informe completo" lleva a los planes.
  await pagina.locator('.boton-desbloquear').scrollIntoViewIfNeeded();
  await pagina.locator('.boton-desbloquear').click();
  await pagina.waitForTimeout(900);
  const planes = await pagina.locator('.planes').boundingBox();
  assert.ok(planes.y < 200, 'los planes quedan arriba de la pantalla');
  // El botón de compra cabe en el ancho.
  const compra = await pagina.locator('.boton-compra').evaluate((b) => b.scrollWidth <= b.clientWidth);
  assert.ok(compra);
  const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(desborde <= 0, `desborde horizontal de ${desborde}px`);
  await pagina.close();
});

test('ningún botón ni texto se sale de la pantalla (iPhone SE)', async () => {
  const pagina = await navegador.newPage({ ...devices['iPhone SE'] });
  await simularIA(pagina);
  await pagina.goto(base);
  await recorrer(pagina, { dia: 14, mes: 3, anio: 1985, nombre: 'María José Núñez Peña' });
  await pagina.locator('.oferta').waitFor();
  await pagina.evaluate(() => window.scrollTo(0, 0));
  await pagina.locator('.barra-compra:not([hidden])').waitFor();
  const fuera = await pagina.evaluate(() => [...document.querySelectorAll('.boton, h1, h2, h3, .plan, .carta div, .meses-mini li')]
    .filter((n) => n.offsetParent !== null && !n.closest('.ejemplos-carrusel'))
    .filter((n) => { const r = n.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1 || n.scrollWidth > n.clientWidth + 1; })
    .map((n) => `${n.className || n.tagName}: ${n.textContent.trim().slice(0, 40)}`));
  assert.deepEqual(fuera, []);
  await pagina.close();
});

test('tienda en la portada: pesos y OXXO en México, dólares fuera', async () => {
  for (const [zona, esperado, oxxo] of [['America/Mexico_City', /\$149 MXN/, true], ['America/Bogota', /US\$7\.99/, false]]) {
    const contexto = await navegador.newContext({ ...devices['iPhone 13'], timezoneId: zona });
    const pagina = await contexto.newPage();
    await pagina.goto(base);
    const tienda = pagina.locator('#tienda');
    await tienda.waitFor();
    assert.equal(await tienda.locator('.producto').count(), 6);
    assert.match(await tienda.locator('.producto').first().innerText(), esperado);
    assert.equal((await tienda.innerText()).includes('OXXO'), oxxo);
    // Comprar lleva a Stripe con el producto elegido.
    const pedidas = [];
    await pagina.route('**/api/checkout', (ruta) => {
      if (ruta.request().method() === 'POST') pedidas.push(ruta.request().postDataJSON());
      return ruta.request().method() === 'POST' ? ruta.fulfill({ json: { url: `${base}?stripe=simulado` } }) : ruta.fulfill({ status: 404, body: '' });
    });
    await tienda.getByRole('button', { name: 'Comprar' }).first().click();
    await pagina.waitForURL(/stripe=simulado/);
    assert.deepEqual(pedidas[0], { tienda: 'manifestacion' });
    await contexto.close();
  }
});
