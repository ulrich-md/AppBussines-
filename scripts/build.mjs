// Valida los cuestionarios y genera, para cada resultado:
//   - web/r/<quiz>/<id>.html   página para compartir (con su propia imagen de vista previa)
//   - web/og/<quiz>/<id>.png   imagen de vista previa de 1200×630 (WhatsApp, Facebook…)
//   - web/og/<quiz>/portada.png imagen general del cuestionario
// Uso: npm run build            (todo)
//      npm run build -- --sin-imagenes   (solo validar y generar las páginas)
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validarQuiz } from '../web/js/engine.js';

const RAIZ = new URL('..', import.meta.url).pathname;
const WEB = join(RAIZ, 'web');
const sitio = JSON.parse(readFileSync(join(WEB, 'site.json'), 'utf8'));
const sinImagenes = process.argv.includes('--sin-imagenes');

// Las imágenes se generan en una página en blanco: las fuentes se incrustan en base64.
const fuente = (familia, peso, archivo) =>
  `@font-face { font-family: '${familia}'; font-weight: ${peso}; src: url(data:font/woff2;base64,${readFileSync(join(WEB, 'fonts', archivo)).toString('base64')}) format('woff2'); }`;
const FUENTES = sinImagenes ? '' : [
  fuente('Nunito', 700, 'nunito-latin-700-normal.woff2'),
  fuente('Nunito', 800, 'nunito-latin-800-normal.woff2'),
  fuente('Cormorant Garamond', 700, 'cormorant-garamond-latin-700-normal.woff2'),
].join('\n');

const esc = (texto = '') =>
  String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const urlAbsoluta = (ruta) => (sitio.url_base ? new URL(ruta, sitio.url_base.replace(/\/?$/, '/')).href : `../../${ruta}`);

function primeraFrase(texto) {
  const fin = texto.indexOf('. ');
  return fin > 0 ? texto.slice(0, fin + 1) : texto;
}

function paginaCompartida(quiz, id, r) {
  const titulo = `${r.titulo} · ${quiz.titulo.replace(/^Descubre /, '')} ${id}`;
  const descripcion = `${primeraFrase(r.teaser)} Descubre el tuyo gratis.`;
  const imagen = urlAbsoluta(`og/${quiz.id}/${id}.png`);
  const destino = `../../?q=${quiz.id}&ref=compartido-${id}`;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(descripcion)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(`Me salió ${id}: ${r.titulo}. ¿Y a ti?`)}">
  <meta property="og:description" content="${esc(descripcion)}">
  <meta property="og:image" content="${esc(imagen)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="../../img/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../../css/styles.css">
  <style>:root { --color-resultado: ${esc(r.color_hex ?? '#5B2E8C')}; }</style>
</head>
<body>
  <header class="cabecera"><span class="marca">${esc(sitio.marca)}</span></header>
  <main class="app compartida">
    <p class="saludo">Alguien te compartió su resultado:</p>
    <div class="numero" aria-hidden="true">${esc(id)}</div>
    ${r.maestro ? '<span class="sello">Número maestro</span>' : ''}
    <h1><span class="visualmente-oculto">${esc(id)}: </span>${esc(r.titulo)}</h1>
    <p>${esc(primeraFrase(r.teaser))}</p>
    <p><strong>¿Y tú? ¿Qué número eres?</strong></p>
    <a class="boton" href="${esc(destino)}">Descubrir mi número gratis</a>
  </main>
  <footer class="pie"><p>${esc(quiz.aviso ?? '')}</p></footer>
</body>
</html>
`;
}

function htmlImagen({ numero, titulo, subtitulo, pie, color, maestro }) {
  const c = sitio.colores;
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${FUENTES}
  body { margin: 0; width: 1200px; height: 630px; display: flex; align-items: center; gap: 64px; padding: 0 80px; box-sizing: border-box;
    background: radial-gradient(circle at 20% 20%, rgba(184,134,11,.22), transparent 55%), radial-gradient(circle at 90% 90%, ${c.primario}33, transparent 50%), ${c.fondo};
    font-family: 'Nunito', sans-serif; color: ${c.texto}; }
  .circulo { flex-shrink: 0; width: 330px; height: 330px; border-radius: 50%; display: grid; place-items: center;
    background: radial-gradient(circle at 35% 30%, #fff, #F3ECFA 70%); border: 10px solid ${color};
    box-shadow: 0 0 0 22px rgba(184,134,11,.18); font-family: 'Cormorant Garamond', serif; font-weight: 700;
    font-size: ${String(numero).length > 2 ? 120 : 190}px; color: ${c.primario}; font-variant-numeric: lining-nums; }
  .marca { font-family: 'Cormorant Garamond', serif; font-weight: 700; font-size: 34px; color: ${c.primario}; letter-spacing: .04em; }
  .sello { display: inline-block; margin-top: 18px; padding: 6px 18px; border-radius: 99px; background: ${c.acento}; color: #fff; font-weight: 800; font-size: 24px; text-transform: uppercase; letter-spacing: .05em; }
  h1 { font-family: 'Cormorant Garamond', serif; font-size: 84px; line-height: 1; margin: 14px 0 12px; }
  p { font-size: 34px; margin: 0; color: ${c.texto_suave}; font-weight: 700; }
  .pie { margin-top: 26px; font-size: 30px; color: ${c.primario}; font-weight: 800; }
</style></head><body>
  <div class="circulo">${esc(numero)}</div>
  <div>
    <div class="marca">✦ ${esc(sitio.marca)} ✦</div>
    ${maestro ? '<span class="sello">Número maestro</span>' : ''}
    <h1>${esc(titulo)}</h1>
    <p>${esc(subtitulo)}</p>
    <div class="pie">${esc(pie)}</div>
  </div>
</body></html>`;
}

async function generarImagenes(trabajos) {
  const { chromium } = await import('playwright');
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
  for (const { html, salida } of trabajos) {
    await pagina.setContent(html, { waitUntil: 'networkidle' }).catch(() => pagina.setContent(html));
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.screenshot({ path: salida, type: 'png' });
  }
  await navegador.close();
}

const quizzes = readdirSync(join(WEB, 'quizzes'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(WEB, 'quizzes', f), 'utf8')));

let hayErrores = false;
const imagenes = [];
for (const quiz of quizzes) {
  const errores = validarQuiz(quiz);
  if (errores.length) {
    hayErrores = true;
    console.error(`✗ ${quiz.id}:\n  - ${errores.join('\n  - ')}`);
    continue;
  }
  const dirPaginas = join(WEB, 'r', quiz.id);
  const dirImagenes = join(WEB, 'og', quiz.id);
  mkdirSync(dirPaginas, { recursive: true });
  mkdirSync(dirImagenes, { recursive: true });

  const nombreCorto = quiz.titulo.replace(/^Descubre /, '');
  imagenes.push({
    salida: join(dirImagenes, 'portada.png'),
    html: htmlImagen({ numero: '✦', titulo: nombreCorto.charAt(0).toUpperCase() + nombreCorto.slice(1), subtitulo: 'Lo que tu fecha de nacimiento dice de ti', pie: 'Tu lectura personalizada gratis →', color: sitio.colores.acento }),
  });
  for (const [id, r] of Object.entries(quiz.resultados)) {
    writeFileSync(join(dirPaginas, `${id}.html`), paginaCompartida(quiz, id, r));
    imagenes.push({
      salida: join(dirImagenes, `${id}.png`),
      html: htmlImagen({ numero: id, titulo: r.titulo, subtitulo: `Me salió el ${id}. ¿Y a ti?`, pie: 'Descubre tu número gratis →', color: r.color_hex, maestro: r.maestro }),
    });
  }
  console.log(`✓ ${quiz.id}: ${Object.keys(quiz.resultados).length} resultados`);
}

if (hayErrores) process.exit(1);
if (!sinImagenes) {
  await generarImagenes(imagenes);
  console.log(`✓ ${imagenes.length} imágenes de vista previa generadas`);
}
