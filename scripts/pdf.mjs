// Convierte los informes de Markdown a PDF con la plantilla de la marca.
// Entrada: informes/<quiz>/<resultado>.md   Salida: informes/pdf/<quiz>-<resultado>.pdf
// Uso: npm run pdf -- numero-de-vida 1      (un informe)
//      npm run pdf -- numero-de-vida        (todos los informes escritos de ese cuestionario)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { marked } from 'marked';
import { chromium } from 'playwright';

marked.use({ breaks: true });

const RAIZ = new URL('..', import.meta.url).pathname;
const INFORMES = join(RAIZ, 'informes');
const [quizId, soloResultado] = process.argv.slice(2);
if (!quizId) {
  console.error('Uso: npm run pdf -- <cuestionario> [resultado]');
  process.exit(1);
}

const sitio = JSON.parse(readFileSync(join(RAIZ, 'web/site.json'), 'utf8'));
const quiz = JSON.parse(readFileSync(join(RAIZ, 'web/quizzes', `${quizId}.json`), 'utf8'));
const esc = (t = '') => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const dirFuente = join(INFORMES, quizId);
const ids = soloResultado
  ? [soloResultado]
  : readdirSync(dirFuente).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

function documento(id) {
  const resultado = quiz.resultados[id];
  if (!resultado) throw new Error(`El cuestionario ${quizId} no tiene el resultado ${id}`);
  const markdown = readFileSync(join(dirFuente, `${id}.md`), 'utf8').replaceAll('{{marca}}', sitio.marca);
  const nombreInforme = quiz.titulo.replace(/^Descubre /, '');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="plantilla.css">
<style>:root { --color-numero: ${esc(resultado.color_hex ?? '#E59BBE')}; }</style>
</head><body>
<section class="portada"${resultado.imagen ? ` style="background-image: linear-gradient(180deg, rgba(11, 15, 30, 0.1), rgba(11, 15, 30, 0.88) 72%), url('../web/${esc(resultado.imagen)}-896.webp')"` : ''}>
  <div class="marca">${esc(sitio.marca)}</div>
  <div class="etiqueta">${esc(nombreInforme.charAt(0).toUpperCase() + nombreInforme.slice(1))}${resultado.maestro ? ', número maestro' : ''}</div>
  <div class="circulo">${esc(id)}</div>
  <h1>${esc(resultado.titulo)}</h1>
  <p class="sub">Tu informe personal completo</p>
  <p class="pie">Contenido de entretenimiento y autoconocimiento</p>
</section>
${marked.parse(markdown)}
</body></html>`;
}

mkdirSync(join(INFORMES, 'pdf'), { recursive: true });
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
for (const id of ids) {
  // El HTML temporal vive junto a la plantilla para que las rutas relativas (CSS y fuentes) funcionen.
  const temporal = join(INFORMES, `.tmp-${quizId}-${id}.html`);
  writeFileSync(temporal, documento(id));
  await pagina.goto(pathToFileURL(temporal).href, { waitUntil: 'load' });
  await pagina.evaluate(() => document.fonts.ready);
  const salida = join(INFORMES, 'pdf', `${quizId}-${id}.pdf`);
  await pagina.pdf({
    path: salida,
    format: 'A5',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-size:7pt;color:#6B7390;text-align:center;font-family:sans-serif;">
      ${esc(sitio.marca)} · <span class="pageNumber"></span></div>`,
  });
  if (existsSync(temporal)) rmSync(temporal);
  console.log(`✓ ${salida.replace(RAIZ, '')}`);

  // Portadas para la tienda: 600×600 (Hotmart) y 1280×720 (Gumroad).
  const soloPortada = documento(id).replace(/<\/section>[\s\S]*<\/body>/, '</section></body>')
    .replace('</style>', '.portada { height: 100vh; } body { margin: 0; }</style>');
  writeFileSync(temporal, soloPortada);
  mkdirSync(join(RAIZ, 'tienda', 'portadas'), { recursive: true });
  for (const [ancho, alto] of [[600, 600], [1280, 720]]) {
    await pagina.setViewportSize({ width: ancho, height: alto });
    await pagina.goto(pathToFileURL(temporal).href, { waitUntil: 'load' });
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.screenshot({ path: join(RAIZ, 'tienda', 'portadas', `${quizId}-${id}-${ancho}x${alto}.png`) });
  }
  rmSync(temporal);
}
await navegador.close();
