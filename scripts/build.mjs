// Valida los cuestionarios y genera los recursos estáticos:
//   - web/img/iconos.svg                    sprite con los iconos de Phosphor que usa la web
//   - web/r/<quiz>/<id>.html                página para compartir cada resultado (con su vista previa)
//   - web/og/<quiz>/<id>.jpg, portada.jpg   imágenes de vista previa de 1200×630 (WhatsApp, Facebook…)
//   - web/img/informes/<quiz>-<id>.webp     portada del informe de pago (se muestra en el resultado)
// Uso: npm run build                      (todo)
//      npm run build -- --sin-imagenes    (solo validar, sprite y páginas)
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validarQuiz } from '../web/js/engine.js';

const RAIZ = new URL('..', import.meta.url).pathname;
const WEB = join(RAIZ, 'web');
const sitio = JSON.parse(readFileSync(join(WEB, 'site.json'), 'utf8'));
const c = sitio.colores;
const sinImagenes = process.argv.includes('--sin-imagenes');

// Iconos de la interfaz (además de los que declaran las opciones de cada cuestionario).
const ICONOS_INTERFAZ = ['arrow-right', 'arrow-left', 'whatsapp-logo', 'link', 'lock-simple', 'arrow-counter-clockwise'];

const esc = (texto = '') =>
  String(texto).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const urlAbsoluta = (ruta) => (sitio.url_base ? new URL(ruta, sitio.url_base.replace(/\/?$/, '/')).href : `../../${ruta}`);
const primeraFrase = (texto) => {
  const fin = texto.indexOf('. ');
  return fin > 0 ? texto.slice(0, fin + 1) : texto;
};

function construirSprite(nombres) {
  const simbolos = [...nombres].sort().map((nombre) => {
    const svg = readFileSync(join(RAIZ, 'node_modules/@phosphor-icons/core/assets/regular', `${nombre}.svg`), 'utf8');
    const interior = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    return `<symbol id="${nombre}" viewBox="0 0 256 256">${interior}</symbol>`;
  });
  writeFileSync(join(WEB, 'img', 'iconos.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg"><!-- Phosphor Icons (MIT), generado por scripts/build.mjs -->${simbolos.join('')}</svg>\n`);
  return simbolos.length;
}

function paginaCompartida(quiz, id, r) {
  const nombreQuiz = quiz.titulo.replace(/^Descubre /, '');
  const descripcion = `${primeraFrase(r.teaser)} Descubre el tuyo gratis.`;
  const destino = `../../?q=${quiz.id}&ref=compartido-${id}`;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(`${r.titulo} · ${nombreQuiz} ${id}`)}</title>
  <meta name="description" content="${esc(descripcion)}">
  <meta name="theme-color" content="#F3F4F9" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0B0F1E" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(`Me salió el ${id}: ${r.titulo}. ¿Y a ti?`)}">
  <meta property="og:description" content="${esc(descripcion)}">
  <meta property="og:image" content="${esc(urlAbsoluta(`og/${quiz.id}/${id}.jpg`))}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="../../img/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../../css/styles.css">
  <style>:root { --color-resultado: ${esc(r.color_hex ?? c.acento)}; }</style>
</head>
<body>
  <header class="cabecera"><span class="marca">${esc(sitio.marca)}</span></header>
  <main class="app compartida">
    <p class="saludo">Alguien te compartió su resultado</p>
    ${r.imagen ? `<img class="resultado-imagen" src="../../${esc(r.imagen)}-896.webp" srcset="../../${esc(r.imagen)}-640.webp 640w, ../../${esc(r.imagen)}-896.webp 896w" sizes="(min-width: 640px) 560px, 100vw" width="896" height="1120" alt="${esc(r.imagen_alt ?? '')}">` : ''}
    <section class="resultado-cabecera">
      <div class="numero" aria-hidden="true">${esc(id)}</div>
      <div>
        <h1><span class="visualmente-oculto">${esc(id)}: </span>${esc(r.titulo)}</h1>
        ${r.maestro ? '<span class="sello">Número maestro</span>' : ''}
      </div>
    </section>
    <p>${esc(primeraFrase(r.teaser))}</p>
    <p><strong>¿Y tú? ¿Qué número eres?</strong></p>
    <a class="boton" href="${esc(destino)}">Descubrir mi número</a>
  </main>
  <footer class="pie"><p>${esc(quiz.aviso ?? '')}</p></footer>
</body>
</html>
`;
}

// ---------- Imágenes (vista previa y portadas) ----------

function recursosImagen() {
  const fuente = (familia, peso, archivo, estilo = 'normal') =>
    `@font-face { font-family: '${familia}'; font-weight: ${peso}; font-style: ${estilo}; src: url(data:font/woff2;base64,${readFileSync(join(WEB, 'fonts', archivo)).toString('base64')}) format('woff2'); }`;
  const fuentes = [
    fuente('Raleway', 600, 'raleway-latin-600-normal.woff2'),
    fuente('Raleway', 700, 'raleway-latin-700-normal.woff2'),
    fuente('Lora', 600, 'lora-latin-600-normal.woff2'),
    fuente('Lora', 700, 'lora-latin-700-normal.woff2'),
    fuente('Lora', 500, 'lora-latin-500-italic.woff2', 'italic'),
  ].join('\n');
  const incrustar = (ruta) => `data:image/webp;base64,${readFileSync(join(WEB, ruta)).toString('base64')}`;
  return { fuentes, cielo: incrustar('img/portada-896.webp'), incrustar };
}

const estilosBase = ({ fuentes }) => `${fuentes}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Raleway', sans-serif; color: ${c.texto_noche}; font-variant-numeric: lining-nums; }
  .anillo { display: grid; place-items: center; border-radius: 50%; background: ${c.noche_2};
    font-family: 'Lora', serif; font-weight: 700; color: ${c.texto_noche}; line-height: 1; }
  .marca { font-family: 'Lora', serif; font-weight: 600; color: ${c.texto_noche}; }
  .sello { display: inline-block; border: 2px solid ${c.acento_noche}; color: ${c.acento_noche}; border-radius: 99px; font-weight: 700; }`;

// Vista previa 1200×630: cielo nocturno a la izquierda, texto a la derecha.
function htmlVistaPrevia(recursos, { numero, titulo, subtitulo, pie, color, maestro, imagen = recursos.cielo }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${estilosBase(recursos)}
  body { width: 1200px; height: 630px; display: grid; grid-template-columns: 470px 1fr; background: ${c.noche}; }
  .foto { position: relative; background: url(${imagen}) center 35% / cover; }
  .texto { padding: 52px 60px 48px; display: flex; flex-direction: column; justify-content: center; }
  .marca { font-size: 28px; margin-bottom: 26px; }
  .fila { display: flex; align-items: center; gap: 22px; margin-bottom: 22px; }
  .anillo { width: 128px; height: 128px; flex-shrink: 0; border: 6px solid ${color}; box-shadow: 0 0 0 10px rgba(147, 166, 255, 0.18);
    font-size: ${String(numero).length > 1 ? 58 : 70}px; }
  .sello { font-size: 22px; padding: 4px 16px; }
  h1 { font-family: 'Lora', serif; font-weight: 600; font-size: 66px; line-height: 1.04; margin: 0 0 16px; }
  p { font-size: 32px; font-weight: 600; margin: 0; color: ${c.texto_noche_suave}; }
  .pie { margin-top: 30px; font-size: 30px; font-weight: 700; color: ${c.acento_noche}; }
</style></head><body>
  <div class="foto"></div>
  <div class="texto">
    <div class="marca">${esc(sitio.marca)}</div>
    <div class="fila"><div class="anillo">${esc(numero)}</div>${maestro ? '<span class="sello">Número maestro</span>' : ''}</div>
    <h1>${esc(titulo)}</h1>
    <p>${esc(subtitulo)}</p>
    <div class="pie">${esc(pie)}</div>
  </div>
</body></html>`;
}

// Portada del informe 600×800 (misma composición que la portada del PDF).
function htmlPortadaInforme(recursos, { numero, titulo, etiqueta, color, maestro, imagen = recursos.cielo }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${estilosBase(recursos)}
  body { width: 600px; height: 800px; display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 56px 40px; background: linear-gradient(180deg, rgba(11, 15, 30, 0.1), rgba(11, 15, 30, 0.88) 72%), url(${imagen}) center / cover; }
  .marca { font-size: 26px; }
  .etiqueta { margin-top: 60px; font-size: 20px; font-weight: 700; color: ${c.texto_noche_suave}; }
  .anillo { width: 230px; height: 230px; margin: 22px 0 28px; border: 8px solid ${color}; box-shadow: 0 0 0 14px rgba(147, 166, 255, 0.18);
    font-size: ${String(numero).length > 1 ? 104 : 124}px; }
  h1 { font-family: 'Lora', serif; font-weight: 600; font-size: 54px; line-height: 1.05; margin: 0 0 12px; }
  .sello { font-size: 18px; padding: 3px 14px; margin-bottom: 12px; }
  p { font-family: 'Lora', serif; font-style: italic; font-weight: 500; font-size: 24px; color: ${c.texto_noche_suave}; margin: 0; }
</style></head><body>
  <div class="marca">${esc(sitio.marca)}</div>
  <div class="etiqueta">${esc(etiqueta)}</div>
  <div class="anillo">${esc(numero)}</div>
  ${maestro ? '<span class="sello">Número maestro</span>' : ''}
  <h1>${esc(titulo)}</h1>
  <p>Tu informe personal completo</p>
</body></html>`;
}

async function generarImagenes(trabajos) {
  const { chromium } = await import('playwright');
  const sharp = (await import('sharp')).default;
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  for (const { html, salida, ancho, alto } of trabajos) {
    await pagina.setViewportSize({ width: ancho, height: alto });
    await pagina.setContent(html, { waitUntil: 'load' });
    await pagina.evaluate(() => document.fonts.ready);
    const png = await pagina.screenshot({ type: 'png' });
    if (salida.endsWith('.webp')) await sharp(png).webp({ quality: 82 }).toFile(salida);
    else if (salida.endsWith('.jpg')) await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile(salida);
    else writeFileSync(salida, png);
  }
  await navegador.close();
}

// ---------- Proceso ----------

const quizzes = readdirSync(join(WEB, 'quizzes'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(WEB, 'quizzes', f), 'utf8')));

let hayErrores = false;
const iconos = new Set(ICONOS_INTERFAZ);
const trabajos = [];
const recursos = sinImagenes ? null : recursosImagen();
mkdirSync(join(WEB, 'img', 'informes'), { recursive: true });

for (const quiz of quizzes) {
  const errores = validarQuiz(quiz);
  if (errores.length) {
    hayErrores = true;
    console.error(`✗ ${quiz.id}:\n  - ${errores.join('\n  - ')}`);
    continue;
  }
  for (const p of quiz.preguntas) for (const o of p.opciones ?? []) if (o.icono) iconos.add(o.icono);

  const dirPaginas = join(WEB, 'r', quiz.id);
  const dirVistas = join(WEB, 'og', quiz.id);
  mkdirSync(dirPaginas, { recursive: true });
  mkdirSync(dirVistas, { recursive: true });
  const nombreQuiz = quiz.titulo.replace(/^Descubre /, '');
  const etiqueta = nombreQuiz.charAt(0).toUpperCase() + nombreQuiz.slice(1);

  if (recursos) {
    trabajos.push({
      salida: join(dirVistas, 'portada.jpg'), ancho: 1200, alto: 630,
      html: htmlVistaPrevia(recursos, { numero: '?', titulo: etiqueta, subtitulo: 'Lo que tu fecha de nacimiento dice de ti', pie: 'Tu lectura personalizada gratis', color: c.acento_noche }),
    });
  }
  for (const [id, r] of Object.entries(quiz.resultados)) {
    writeFileSync(join(dirPaginas, `${id}.html`), paginaCompartida(quiz, id, r));
    if (!recursos) continue;
    const imagen = r.imagen ? recursos.incrustar(`${r.imagen}-640.webp`) : undefined;
    trabajos.push({
      salida: join(dirVistas, `${id}.jpg`), ancho: 1200, alto: 630,
      html: htmlVistaPrevia(recursos, { numero: id, titulo: r.titulo, subtitulo: `Me salió el ${id}. ¿Y a ti?`, pie: 'Descubre tu número gratis', color: r.color_hex, maestro: r.maestro, imagen }),
    });
    trabajos.push({
      salida: join(WEB, 'img', 'informes', `${quiz.id}-${id}.webp`), ancho: 600, alto: 800,
      html: htmlPortadaInforme(recursos, { numero: id, titulo: r.titulo, etiqueta, color: r.color_hex, maestro: r.maestro, imagen }),
    });
  }
  console.log(`✓ ${quiz.id}: ${Object.keys(quiz.resultados).length} resultados`);
}

if (hayErrores) process.exit(1);
console.log(`✓ sprite con ${construirSprite(iconos)} iconos`);
if (trabajos.length) {
  await generarImagenes(trabajos);
  console.log(`✓ ${trabajos.length} imágenes generadas`);
}
