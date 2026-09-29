// PDFs (A4) creados en el servidor: el informe de pago y las guías de la tienda.
// Mismo estilo que la web: portada índigo con estrellas y brillo violeta, títulos dorados y
// páginas interiores claras (se leen bien en pantalla y se imprimen sin gastar tinta).
import { readFile } from 'node:fs/promises';
import PDFDocument from 'pdfkit';
import { dividirParrafos } from '../js/engine.js';
import { TEMA_CICLO } from './_numerologia.js';

const C = {
  noche: '#120E2B', noche2: '#2B2358', violeta: '#7C5CE0', oro: '#E2B25A', oroTexto: '#946414',
  texto: '#231B45', suave: '#5A5480', lavanda: '#F4F1FF', borde: '#DED7F5', blanco: '#FFFFFF',
};
const FUENTES = {
  display: 'cinzel-latin-600-normal.ttf',
  titulo: 'lora-latin-600-normal.ttf',
  tituloFuerte: 'lora-latin-700-normal.ttf',
  cursiva: 'lora-latin-500-italic.ttf',
  texto: 'nunito-sans-latin-400-normal.ttf',
  seminegrita: 'nunito-sans-latin-600-normal.ttf',
  negrita: 'nunito-sans-latin-700-normal.ttf',
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ROMANOS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
const mayuscula = (t = '') => t.charAt(0).toLocaleUpperCase('es') + t.slice(1);
const leerRecurso = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url)).catch(() => null);

// Nombre de archivo seguro: "Informe-Maria-Jose.pdf".
export function nombreArchivo(nombre, prefijo = 'Informe') {
  const limpio = String(nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${prefijo}-${limpio || 'Numero-de-Vida'}.pdf`;
}

// ---------- Motor común ----------
async function crearLienzo({ titulo, marca }) {
  const fuentes = Object.fromEntries(await Promise.all(Object.entries(FUENTES).map(async ([k, f]) => [k, await leerRecurso(`fonts/pdf/${f}`)])));
  const doc = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: 60, bottom: 72, left: 62, right: 62 }, info: { Title: titulo, Author: marca } });
  for (const [nombre, contenido] of Object.entries(fuentes)) if (contenido) doc.registerFont(nombre, contenido);
  const usar = (f) => doc.font(fuentes[f] ? f : 'Helvetica');
  const W = doc.page.width;
  const H = doc.page.height;
  const izq = doc.page.margins.left;
  const ancho = W - izq - doc.page.margins.right;
  const fin = () => H - doc.page.margins.bottom;
  const asegurar = (alto) => { if (doc.y + alto > fin()) doc.addPage(); };
  let semilla = 7;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };

  // Cielo: fondo índigo, brillos violetas y estrellas (dentro de un rectángulo).
  const cielo = (x, y, w, h, { estrellas = 90 } = {}) => {
    doc.save();
    doc.rect(x, y, w, h).fill(C.noche);
    for (const [cx, cy, r, color, op] of [[x + w * 0.5, y - h * 0.1, w * 0.7, '#7C3AED', 0.45], [x + w, y + h * 0.4, w * 0.5, '#6D28D9', 0.3], [x, y + h * 0.8, w * 0.5, '#4C1D95', 0.35]]) {
      const g = doc.radialGradient(cx, cy, 0, cx, cy, r);
      g.stop(0, color, op).stop(1, color, 0);
      doc.rect(x, y, w, h).fill(g);
    }
    for (let i = 0; i < estrellas; i += 1) {
      const dorada = azar() < 0.1;
      doc.circle(x + azar() * w, y + azar() * h, dorada ? 1.1 : 0.4 + azar() * 0.7).fillOpacity(0.35 + azar() * 0.6).fill(dorada ? C.oro : C.blanco);
    }
    doc.fillOpacity(1).restore();
  };
  // Ornamento dorado: línea, rombo, línea.
  const ornamento = (cx, y, largo = 60, color = C.oro) => {
    doc.save().lineWidth(0.8).strokeColor(color);
    doc.moveTo(cx - largo - 6, y).lineTo(cx - 8, y).stroke();
    doc.moveTo(cx + 8, y).lineTo(cx + largo + 6, y).stroke();
    doc.polygon([cx, y - 4], [cx + 4, y], [cx, y + 4], [cx - 4, y]).fill(color);
    doc.restore();
  };
  const imagenRedondeada = (img, x, y, w, h, r = 14, marco = C.oro) => {
    if (!img) return;
    doc.save();
    doc.roundedRect(x, y, w, h, r).clip();
    doc.image(img, x, y, { cover: [w, h], align: 'center', valign: 'center' });
    doc.restore();
    doc.save().lineWidth(1).strokeColor(marco).strokeOpacity(0.7).roundedRect(x, y, w, h, r).stroke().restore();
  };
  // Texto fuera de márgenes (portadas y pies) sin que pdfkit salte de página.
  const sinMargen = (dibujar) => {
    const m = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    dibujar();
    doc.page.margins.bottom = m;
  };

  const parrafos = (texto, { tam = 11.5, color = C.texto, x = izq, w = ancho, fuente = 'texto' } = {}) => {
    for (const p of dividirParrafos(texto)) {
      usar(fuente).fontSize(tam).fillColor(color);
      asegurar(Math.min(doc.heightOfString(p, { width: w, lineGap: 3.8 }), 64));
      doc.text(p, x, doc.y, { width: w, lineGap: 3.8 });
      doc.moveDown(0.65);
    }
  };
  const subtitulo = (texto, { color = C.texto } = {}) => {
    doc.moveDown(0.5);
    asegurar(80);
    usar('titulo').fontSize(15).fillColor(color).text(texto, izq, doc.y, { width: ancho });
    const y = doc.y + 3;
    doc.save().moveTo(izq, y).lineTo(izq + 34, y).lineWidth(1.6).strokeColor(C.oro).stroke().restore();
    doc.y = y + 9;
  };
  // Cabecera de parte o capítulo: banda de cielo con el título en blanco y la etiqueta dorada.
  const banda = (etiqueta, titulo) => {
    doc.addPage();
    const alto = 150;
    cielo(0, 0, W, alto, { estrellas: 45 });
    usar('display').fontSize(10).fillColor(C.oro).text(etiqueta.toUpperCase(), izq, 52, { width: ancho, characterSpacing: 2 });
    usar('tituloFuerte').fontSize(titulo.length > 34 ? 21 : 25).fillColor(C.blanco).text(titulo, izq, 70, { width: ancho, lineGap: 1 });
    doc.y = Math.max(doc.y, alto) + 26;
  };
  const vinetas = (items, { numeradas = false } = {}) => {
    items?.forEach((item, i) => {
      const texto = String(item);
      usar('texto').fontSize(11.5);
      asegurar(Math.min(doc.heightOfString(texto, { width: ancho - 22, lineGap: 3 }) + 8, 72));
      const y = doc.y;
      if (numeradas) usar('negrita').fontSize(11).fillColor(C.oroTexto).text(`${i + 1}.`, izq, y, { width: 20 });
      else doc.save().polygon([izq + 5, y + 3.5], [izq + 8.5, y + 7.5], [izq + 5, y + 11.5], [izq + 1.5, y + 7.5]).fill(C.oro).restore();
      const corte = texto.indexOf(':');
      if (corte > 0 && corte < 42) {
        usar('negrita').fontSize(11.5).fillColor(C.texto).text(texto.slice(0, corte + 1), izq + 22, y, { width: ancho - 22, lineGap: 3, continued: true });
        usar('texto').text(texto.slice(corte + 1), { lineGap: 3 });
      } else {
        usar('texto').fontSize(11.5).fillColor(C.texto).text(texto, izq + 22, y, { width: ancho - 22, lineGap: 3 });
      }
      doc.moveDown(0.45);
    });
  };
  // Recuadro lavanda con barra dorada (práctica, ritual, mes clave…). Mide el contenido antes.
  const recuadro = (etiqueta, texto, { titulo, lista, numerada } = {}) => {
    const w = ancho - 40;
    usar('texto').fontSize(11);
    const cuerpo = texto ? dividirParrafos(texto).join('\n\n') : '';
    let alto = 30 + (titulo ? 28 : 0) + (cuerpo ? doc.heightOfString(cuerpo, { width: w, lineGap: 3 }) + 8 : 0);
    lista?.forEach((item) => { alto += doc.heightOfString(String(item), { width: w - 20, lineGap: 3 }) + 7; });
    alto += 14;
    if (alto > fin() - doc.page.margins.top - 20) {
      // Demasiado largo para un recuadro: se escribe como texto normal.
      subtitulo(titulo ?? etiqueta);
      if (cuerpo) parrafos(cuerpo);
      if (lista) vinetas(lista, { numeradas: numerada });
      return;
    }
    asegurar(alto + 12);
    const y = doc.y;
    doc.save().roundedRect(izq, y, ancho, alto, 10).fill(C.lavanda).restore();
    doc.save().rect(izq, y, 4, alto).fill(C.oro).restore();
    usar('display').fontSize(9.5).fillColor(C.oroTexto).text(etiqueta.toUpperCase(), izq + 20, y + 14, { width: w, characterSpacing: 1.4 });
    doc.y = y + 30;
    if (titulo) { usar('tituloFuerte').fontSize(17).fillColor(C.texto).text(titulo, izq + 20, doc.y, { width: w }); doc.moveDown(0.3); }
    if (cuerpo) { usar('texto').fontSize(11).fillColor(C.texto).text(cuerpo, izq + 20, doc.y, { width: w, lineGap: 3 }); doc.moveDown(0.4); }
    lista?.forEach((item, i) => {
      const yl = doc.y;
      usar('negrita').fontSize(11).fillColor(C.oroTexto).text(numerada ? `${i + 1}.` : '·', izq + 20, yl, { width: 16 });
      usar('texto').fontSize(11).fillColor(C.texto).text(String(item), izq + 38, yl, { width: w - 20, lineGap: 3 });
      doc.moveDown(0.3);
    });
    doc.y = y + alto + 14;
  };
  const pies = (texto) => {
    const rango = doc.bufferedPageRange();
    for (let i = rango.start + 1; i < rango.start + rango.count; i += 1) {
      doc.switchToPage(i);
      sinMargen(() => {
        doc.save().moveTo(izq, H - 50).lineTo(izq + ancho, H - 50).lineWidth(0.5).strokeColor(C.borde).stroke().restore();
        usar('texto').fontSize(8.5).fillColor(C.suave).text(texto, izq, H - 42, { width: ancho - 50, lineBreak: false });
        usar('display').fontSize(9).fillColor(C.oroTexto).text(String(i + 1), izq + ancho - 40, H - 42, { width: 40, align: 'right', lineBreak: false });
      });
    }
  };
  const terminar = async () => {
    const partes = [];
    doc.on('data', (d) => partes.push(d));
    const listo = new Promise((ok, mal) => { doc.on('end', ok); doc.on('error', mal); });
    doc.end();
    await listo;
    return Buffer.concat(partes);
  };
  return { doc, usar, W, H, izq, ancho, fin, asegurar, cielo, ornamento, imagenRedondeada, sinMargen, parrafos, subtitulo, banda, vinetas, recuadro, pies, terminar };
}

// Portada cósmica común: cielo a página completa, imagen enmarcada en oro y título.
function portada(l, { marca, imagen, etiqueta, titulo, subtitulo, detalle, numero }) {
  const { doc, usar, W, H, izq, ancho } = l;
  l.cielo(0, 0, W, H, { estrellas: 160 });
  usar('display').fontSize(12).fillColor(C.oro).text(marca.toUpperCase(), izq, 46, { width: ancho, align: 'center', characterSpacing: 2.5 });
  l.ornamento(W / 2, 72, 50);
  const iw = 290;
  const ih = numero !== undefined ? 360 : 290;
  const ix = (W - iw) / 2;
  const iy = 96;
  l.imagenRedondeada(imagen, ix, iy, iw, ih, 16);
  let y = iy + ih + 26;
  if (numero !== undefined) {
    const cy = iy + ih;
    doc.circle(W / 2, cy, 36).fill(C.noche);
    doc.lineWidth(2.5).circle(W / 2, cy, 36).stroke(C.oro);
    usar('tituloFuerte').fontSize(String(numero).length > 1 ? 26 : 32).fillColor(C.blanco)
      .text(String(numero), W / 2 - 36, cy - (String(numero).length > 1 ? 16 : 20), { width: 72, align: 'center' });
    y = cy + 54;
  }
  if (etiqueta) { usar('texto').fontSize(12.5).fillColor('#D6CCF2').text(etiqueta, izq, y, { width: ancho, align: 'center' }); y = doc.y + 8; }
  usar('display').fontSize(titulo.length > 30 ? 22 : 26).fillColor(C.oro).text(titulo.toUpperCase(), izq + 10, y, { width: ancho - 20, align: 'center', characterSpacing: 1.2, lineGap: 2 });
  if (subtitulo) { doc.moveDown(0.4); usar('cursiva').fontSize(14).fillColor(C.blanco).text(subtitulo, izq + 30, doc.y, { width: ancho - 60, align: 'center' }); }
  const yOrn = doc.y + 18;
  l.ornamento(W / 2, yOrn, 40);
  if (detalle) usar('texto').fontSize(10.5).fillColor('#D6CCF2').text(detalle, izq, yOrn + 14, { width: ancho, align: 'center' });
  l.sinMargen(() => {
    usar('texto').fontSize(8.5).fillColor('#BFB4E6')
      .text('Contenido de entretenimiento y autoconocimiento basado en la tradición espiritual. No es una predicción ni sustituye el consejo de profesionales.', izq + 30, H - 64, { width: ancho - 60, align: 'center' });
  });
}

// ---------- Informe de pago ----------
export async function crearPdf(datos, { parejas = [], marca = 'Tu Número Sagrado' } = {}) {
  const inf = datos.informe;
  const nombre = datos.nombre;
  const l = await crearLienzo({ titulo: `El informe de ${nombre || 'tu Número de Vida'}`, marca });
  const { doc, usar, izq, ancho } = l;
  const imagenArquetipo = await leerRecurso(`img/pdf/arquetipo-${datos.vida}.jpg`);
  const imagenAlma = datos.carta?.alma ? await leerRecurso(`img/pdf/alma-${datos.carta.alma}.jpg`) : null;
  const fecha = datos.generado ? new Date(datos.generado) : new Date();
  const anio = fecha.getFullYear();
  const c = datos.carta ?? {};

  portada(l, {
    marca, imagen: imagenArquetipo, numero: datos.vida,
    etiqueta: nombre ? `El informe personal de ${nombre}` : 'Tu informe personal',
    titulo: datos.arquetipo ?? datos.titulo ?? '',
    detalle: `Número de Vida ${datos.vida}${datos.maestro ? ' · Número maestro' : ''} · ${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${anio}`,
  });

  // Tus números y el resumen.
  l.banda('Tu carta numerológica', 'Tus números, de un vistazo');
  const celdas = [['Vida', c.vida], ['Alma', c.alma], ['Expresión', c.expresion], ['Personalidad', c.personalidad], ['Cumpleaños', c.cumpleanos], [`Año ${anio}`, c.anio_personal]].filter(([, v]) => v);
  const colW = (ancho - 20) / 3;
  const y0 = doc.y;
  celdas.forEach(([etiqueta, valor], i) => {
    const x = izq + (i % 3) * (colW + 10);
    const y = y0 + Math.floor(i / 3) * 74;
    doc.save().roundedRect(x, y, colW, 64, 10).fill(C.noche).restore();
    doc.save().lineWidth(0.8).strokeColor(C.oro).strokeOpacity(0.6).roundedRect(x, y, colW, 64, 10).stroke().restore();
    usar('display').fontSize(8.5).fillColor(C.oro).text(etiqueta.toUpperCase(), x, y + 11, { width: colW, align: 'center', characterSpacing: 1 });
    usar('tituloFuerte').fontSize(23).fillColor(C.blanco).text(String(valor), x, y + 26, { width: colW, align: 'center' });
  });
  doc.y = y0 + Math.ceil(celdas.length / 3) * 74 + 14;
  const tema = datos.tema_anio || TEMA_CICLO[c.anio_personal] || '';
  l.recuadro('Tu informe en un minuto', null, {
    lista: [
      ...(inf.perfil?.resumen ?? []),
      c.anio_personal && `Tu año ${anio}: Año Personal ${c.anio_personal}${tema ? `, ${tema}` : ''}.`,
      datos.mes_clave && `Tu mes clave${datos.deseo ? ` para ${datos.deseo}` : ''}: ${MESES[datos.mes_clave.mes - 1]} de ${datos.mes_clave.anio}.`,
    ].filter(Boolean),
  });

  let parte = 1;
  l.banda(`Parte ${parte++}`, 'Una carta para ti');
  l.parrafos(inf.perfil?.introduccion);

  l.banda(`Parte ${parte++}`, 'Tu perfil');
  l.subtitulo('Tu esencia');
  l.parrafos(inf.perfil?.esencia);
  l.subtitulo('Tus dones');
  l.vinetas(inf.perfil?.dones);
  l.subtitulo('Tus sombras (y cómo transformarlas)');
  l.vinetas(inf.perfil?.sombras);
  l.subtitulo(c.alma ? `Tu mundo interior: Número del Alma ${c.alma}${datos.alma ? `, alma de ${datos.alma.nombre}` : ''}` : 'Tu mundo interior');
  if (imagenAlma) {
    const alto = ancho * 0.42;
    l.asegurar(alto + 20);
    l.imagenRedondeada(imagenAlma, izq, doc.y, ancho, alto, 12);
    doc.y += alto + 14;
  }
  l.parrafos(inf.perfil?.alma);
  l.subtitulo(c.expresion ? `Tus talentos: Número de Expresión ${c.expresion}` : 'Tus talentos');
  l.parrafos(inf.perfil?.expresion);
  l.subtitulo(`Tu don de cumpleaños: el ${c.cumpleanos}`);
  l.parrafos(inf.perfil?.cumpleanos);

  l.banda(`Parte ${parte++}`, 'Amor y pareja');
  l.parrafos(inf.areas?.amor);
  l.subtitulo('Con quién fluyes');
  l.parrafos(inf.areas?.fluyes);
  l.subtitulo('Con quién aprendes');
  l.parrafos(inf.areas?.aprendes);

  l.banda(`Parte ${parte++}`, 'Dinero, vocación y familia');
  l.subtitulo('Dinero y vocación');
  l.parrafos(inf.areas?.dinero);
  l.subtitulo('Familia y relaciones');
  l.parrafos(inf.areas?.familia);

  if (inf.ciclos) {
    l.banda(`Parte ${parte++}`, 'Tus ciclos');
    l.subtitulo(`Tu año ${anio}: Año Personal ${c.anio_personal}`);
    l.parrafos(inf.ciclos.anio_actual);
    l.subtitulo(`Tu año ${anio + 1}: Año Personal ${c.anio_personal_siguiente}`);
    l.parrafos(inf.ciclos.anio_siguiente);
    if (datos.mes_clave && inf.ciclos.mes_clave) {
      l.recuadro(`Tu mes clave${datos.deseo ? ` para ${datos.deseo}` : ''}`, inf.ciclos.mes_clave, { titulo: `${mayuscula(MESES[datos.mes_clave.mes - 1])} de ${datos.mes_clave.anio}` });
    }
    l.subtitulo('Tus próximos 12 meses');
    inf.ciclos.meses?.forEach((texto, i) => {
      const m = datos.meses?.[i];
      const esClave = m && datos.mes_clave && m.mes === datos.mes_clave.mes && m.anio === datos.mes_clave.anio;
      usar('texto').fontSize(11);
      l.asegurar(doc.heightOfString(texto, { width: ancho - 40, lineGap: 3 }) + 38);
      const y = doc.y;
      doc.save().circle(izq + 14, y + 12, 14).fill(esClave ? C.oro : C.noche).restore();
      usar('tituloFuerte').fontSize(13).fillColor(esClave ? C.noche : C.blanco).text(String(m?.numero ?? i + 1), izq, y + 4, { width: 28, align: 'center' });
      usar('negrita').fontSize(12).fillColor(esClave ? C.oroTexto : C.texto)
        .text(`${m ? `${mayuscula(m.nombre)} ${m.anio}` : `Mes ${i + 1}`}${esClave ? '  ·  tu mes clave' : ''}`, izq + 40, y + 4, { width: ancho - 40 });
      usar('texto').fontSize(11).fillColor(C.texto).text(texto, izq + 40, doc.y + 3, { width: ancho - 40, lineGap: 3 });
      doc.moveDown(0.9);
    });
  }

  l.banda(`Parte ${parte++}`, 'Tu lado espiritual');
  l.parrafos(inf.espiritual?.senales);
  if (inf.espiritual?.ritual_pasos?.length) {
    l.recuadro('Tu ritual personal', null, { titulo: inf.espiritual.ritual_titulo, lista: (inf.espiritual.ritual_materiales ?? []).map((m) => `Necesitas: ${m}`) });
    l.subtitulo('Paso a paso');
    l.vinetas(inf.espiritual.ritual_pasos, { numeradas: true });
    usar('texto').fontSize(9.5).fillColor(C.suave).text('Es un ejercicio simbólico de intención. Si usas velas, no las dejes nunca encendidas sin vigilancia.', izq, doc.y, { width: ancho });
  }
  if (inf.espiritual?.afirmaciones?.length) {
    l.subtitulo('Tus 12 afirmaciones');
    inf.espiritual.afirmaciones.forEach((a, i) => {
      usar('cursiva').fontSize(12.5);
      l.asegurar(doc.heightOfString(a, { width: ancho }) + 26);
      usar('display').fontSize(8.5).fillColor(C.oroTexto).text(mayuscula(datos.meses?.[i]?.nombre ?? `Mes ${i + 1}`).toUpperCase(), izq, doc.y, { characterSpacing: 1 });
      usar('cursiva').fontSize(12.5).fillColor(C.texto).text(a, izq, doc.y + 1, { width: ancho, lineGap: 2 });
      doc.moveDown(0.6);
    });
  }

  if (inf.plan?.semanas?.length) {
    l.banda(`Parte ${parte++}`, 'Tu plan de 4 semanas');
    inf.plan.semanas.forEach((s, i) => {
      usar('texto').fontSize(11.5);
      l.asegurar(doc.heightOfString(dividirParrafos(s.practica)[0] ?? '', { width: ancho, lineGap: 3.8 }) + 60);
      usar('display').fontSize(9.5).fillColor(C.oroTexto).text(`SEMANA ${i + 1}`, izq, doc.y, { characterSpacing: 1.4 });
      usar('titulo').fontSize(15).fillColor(C.texto).text(s.titulo, izq, doc.y + 2, { width: ancho });
      doc.moveDown(0.3);
      l.parrafos(s.practica);
    });
  }

  if (parejas.length) {
    l.banda(`Parte ${parte++}`, 'Compatibilidad');
    for (const p of parejas) {
      l.subtitulo(`Tú y un ${p.numero}: ${p.titulo}`);
      l.parrafos(p.resumen);
      l.recuadro('Lo que los une', null, { lista: p.fortalezas });
      l.recuadro('Lo que los reta', null, { lista: p.retos });
      l.parrafos(p.consejo);
    }
  }

  l.banda('Para terminar', nombre ? `Con cariño, ${nombre}` : 'Con cariño');
  l.parrafos(inf.espiritual?.carta_final, { tam: 12.5, fuente: 'cursiva' });

  l.pies(`${marca} · ${nombre ? `El informe de ${nombre}` : 'Tu informe personal'}`);
  return l.terminar();
}

// ---------- Guías de la tienda ----------
export async function crearPdfGuia(producto, contenido, { marca = 'Tu Número Sagrado' } = {}) {
  const l = await crearLienzo({ titulo: producto.nombre, marca });
  const { doc, usar, izq, ancho } = l;
  const imagen = await leerRecurso(`img/pdf/producto-${producto.id}.jpg`);
  portada(l, { marca, imagen, titulo: producto.nombre, subtitulo: producto.resumen, detalle: producto.tipo });

  l.banda('Bienvenida', 'Antes de empezar');
  l.parrafos(contenido.introduccion);
  l.subtitulo('En esta guía');
  l.vinetas([
    ...contenido.capitulos.map((cap, i) => `Capítulo ${i + 1}: ${cap.titulo}`),
    contenido.fichas?.lista?.length && (contenido.fichas.tipo === 'arcanos' ? 'Las 22 fichas de los Arcanos Mayores' : `Las ${contenido.fichas.lista.length} fichas de cristales`),
    contenido.paginas && `${contenido.paginas.cantidad} páginas para escribir: ${contenido.paginas.titulo}`,
  ].filter(Boolean));

  contenido.capitulos.forEach((cap, i) => {
    l.banda(`Capítulo ${i + 1}`, cap.titulo);
    l.parrafos(cap.texto);
    if (cap.practica) l.recuadro('Práctica de hoy', cap.practica);
    if (cap.preguntas?.length) l.recuadro('Para escribir', null, { lista: cap.preguntas });
  });

  if (contenido.fichas?.lista?.length) {
    const esArcanos = contenido.fichas.tipo === 'arcanos';
    l.banda(esArcanos ? 'Arcanos Mayores' : 'Fichas', esArcanos ? 'Las 22 cartas, una a una' : 'Tus cristales, uno a uno');
    contenido.fichas.lista.forEach((f, i) => {
      const lineas = esArcanos
        ? [['Palabras clave', f.claves], ['Al derecho', f.derecho], ['Invertida', f.invertida], ['En el amor', f.amor], ['Consejo', f.consejo]]
        : [['Color', f.color], ['Para qué', f.para_que], ['Cómo usarlo', f.como_usar], ['Afirmación', f.afirmacion]];
      usar('texto').fontSize(10.8);
      const alto = 50 + lineas.reduce((s, [, t]) => s + doc.heightOfString(String(t ?? ''), { width: ancho - 130, lineGap: 2.5 }) + 8, 0);
      l.asegurar(alto + 10);
      const y = doc.y;
      doc.save().roundedRect(izq, y, ancho, alto, 10).fill(C.lavanda).restore();
      doc.save().roundedRect(izq, y, ancho, 36, 10).fill(C.noche).rect(izq, y + 20, ancho, 16).fill(C.noche).restore();
      if (esArcanos) usar('display').fontSize(10).fillColor(C.oro).text(ROMANOS[i] ?? '', izq + 14, y + 12, { width: 40 });
      usar('tituloFuerte').fontSize(14).fillColor(C.blanco).text(f.nombre, izq + (esArcanos ? 56 : 16), y + 9, { width: ancho - 70 });
      let yl = y + 48;
      for (const [k, t] of lineas) {
        usar('display').fontSize(8.5).fillColor(C.oroTexto).text(k.toUpperCase(), izq + 14, yl + 2, { width: 100, characterSpacing: 0.8 });
        usar(k === 'Afirmación' ? 'cursiva' : 'texto').fontSize(10.8).fillColor(C.texto).text(String(t ?? ''), izq + 116, yl, { width: ancho - 130, lineGap: 2.5 });
        yl = doc.y + 8;
      }
      doc.y = y + alto + 12;
    });
  }

  if (contenido.paginas) {
    for (let n = 1; n <= contenido.paginas.cantidad; n += 1) {
      l.banda(`Página ${n} de ${contenido.paginas.cantidad}`, contenido.paginas.titulo);
      const campos = contenido.paginas.campos;
      const espacio = (l.fin() - doc.y - 10) / campos.length;
      for (const campo of campos) {
        const y = doc.y;
        usar('display').fontSize(9.5).fillColor(C.oroTexto).text(campo.toUpperCase(), izq, y, { width: ancho, characterSpacing: 1 });
        for (let r = doc.y + 22; r < y + espacio - 8; r += 24) {
          doc.save().moveTo(izq, r).lineTo(izq + ancho, r).lineWidth(0.6).strokeColor(C.borde).stroke().restore();
        }
        doc.y = y + espacio;
      }
    }
  }

  l.banda('Para terminar', 'Gracias por acompañarte');
  l.parrafos(contenido.cierre, { tam: 12.5, fuente: 'cursiva' });
  if (producto.id === 'proteccion' || producto.id === 'cristales') {
    doc.moveDown(0.6);
    usar('texto').fontSize(9.5).fillColor(C.suave).text('Estas prácticas son simbólicas y de bienestar. No sustituyen la atención médica, psicológica ni legal. Usa velas y hierbas con precaución.', izq, doc.y, { width: ancho });
  }
  l.pies(`${marca} · ${producto.nombre}`);
  return l.terminar();
}
