// PDF del informe de pago (A4), creado en el servidor a partir del informe ya guardado.
// Se descarga como archivo: no depende del diálogo de imprimir del navegador.
import { readFile } from 'node:fs/promises';
import PDFDocument from 'pdfkit';
import { dividirParrafos } from '../js/engine.js';
import { TEMA_CICLO } from './_numerologia.js';

const COLOR = { acento: '#8A2D5E', texto: '#2A1E28', suave: '#5C4B57', crema: '#FBF6EF', rosa: '#F5E9EF', dorado: '#8A5A14', borde: '#E8DCD0' };
const FUENTES = {
  titulo: 'lora-latin-600-normal.ttf',
  tituloFuerte: 'lora-latin-700-normal.ttf',
  cursiva: 'lora-latin-500-italic.ttf',
  texto: 'nunito-sans-latin-400-normal.ttf',
  seminegrita: 'nunito-sans-latin-600-normal.ttf',
  negrita: 'nunito-sans-latin-700-normal.ttf',
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mayuscula = (t = '') => t.charAt(0).toLocaleUpperCase('es') + t.slice(1);

const leerRecurso = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url)).catch(() => null);

// Nombre de archivo seguro: "Informe-Maria-Jose.pdf".
export function nombreArchivo(nombre) {
  const limpio = String(nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `Informe-${limpio || 'Numero-de-Vida'}.pdf`;
}

export async function crearPdf(datos, { parejas = [], marca = 'Tu Número Sagrado' } = {}) {
  const inf = datos.informe;
  const fuentes = Object.fromEntries(await Promise.all(Object.entries(FUENTES).map(async ([k, f]) => [k, await leerRecurso(`fonts/pdf/${f}`)])));
  const imagenArquetipo = await leerRecurso(`img/pdf/arquetipo-${datos.vida}.jpg`);
  const imagenAlma = datos.carta?.alma ? await leerRecurso(`img/pdf/alma-${datos.carta.alma}.jpg`) : null;

  const doc = new PDFDocument({
    size: 'A4', bufferPages: true,
    margins: { top: 64, bottom: 70, left: 64, right: 64 },
    info: { Title: `El informe de ${datos.nombre || 'tu Número de Vida'}`, Author: marca },
  });
  for (const [nombre, contenido] of Object.entries(fuentes)) if (contenido) doc.registerFont(nombre, contenido);
  const usar = (fuente) => doc.font(fuentes[fuente] ? fuente : 'Helvetica');

  const W = doc.page.width;
  const H = doc.page.height;
  const izq = doc.page.margins.left;
  const ancho = W - izq - doc.page.margins.right;
  const fin = () => H - doc.page.margins.bottom;
  const asegurar = (alto) => { if (doc.y + alto > fin()) doc.addPage(); };

  const parrafos = (texto, { tam = 11.5, color = COLOR.texto, x = izq, w = ancho, fuente = 'texto' } = {}) => {
    for (const p of dividirParrafos(texto)) {
      usar(fuente).fontSize(tam).fillColor(color);
      asegurar(Math.min(doc.heightOfString(p, { width: w, lineGap: 3.5 }), 60));
      doc.text(p, x, doc.y, { width: w, lineGap: 3.5, align: 'left' });
      doc.moveDown(0.6);
    }
  };
  const subtitulo = (texto) => {
    doc.moveDown(0.4);
    asegurar(70);
    usar('titulo').fontSize(14.5).fillColor(COLOR.acento).text(texto, izq, doc.y, { width: ancho });
    doc.moveDown(0.35);
  };
  const encabezado = (parte, titulo, { nuevaPagina = true } = {}) => {
    if (nuevaPagina) doc.addPage();
    else { doc.moveDown(1); asegurar(120); }
    usar('seminegrita').fontSize(9.5).fillColor(COLOR.dorado).text(parte.toUpperCase(), izq, doc.y, { width: ancho, characterSpacing: 1.2 });
    doc.moveDown(0.2);
    usar('tituloFuerte').fontSize(24).fillColor(COLOR.texto).text(titulo, izq, doc.y, { width: ancho });
    const y = doc.y + 6;
    doc.moveTo(izq, y).lineTo(izq + 60, y).lineWidth(2).strokeColor(COLOR.acento).stroke();
    doc.y = y + 16;
  };
  // Viñetas: si el texto empieza por "Nombre: …", el nombre va en negrita.
  const vinetas = (items, { numeradas = false } = {}) => {
    items?.forEach((item, i) => {
      const texto = String(item);
      usar('texto').fontSize(11.5);
      asegurar(Math.min(doc.heightOfString(texto, { width: ancho - 20, lineGap: 3 }) + 8, 70));
      const y = doc.y;
      if (numeradas) usar('negrita').fontSize(11).fillColor(COLOR.acento).text(`${i + 1}.`, izq, y, { width: 18 });
      else doc.circle(izq + 5, y + 7.5, 2.6).fill(COLOR.acento);
      const dosPuntos = texto.indexOf(':');
      if (dosPuntos > 0 && dosPuntos < 40) {
        usar('negrita').fontSize(11.5).fillColor(COLOR.texto).text(texto.slice(0, dosPuntos + 1), izq + 20, y, { width: ancho - 20, lineGap: 3, continued: true });
        usar('texto').text(texto.slice(dosPuntos + 1), { lineGap: 3 });
      } else {
        usar('texto').fontSize(11.5).fillColor(COLOR.texto).text(texto, izq + 20, y, { width: ancho - 20, lineGap: 3 });
      }
      doc.moveDown(0.45);
    });
  };
  // Recuadro de color con texto dentro (mes clave, ritual…).
  const recuadro = (dibujar, { fondo = COLOR.rosa, borde = COLOR.acento, alto }) => {
    asegurar(alto + 10);
    const y = doc.y;
    doc.roundedRect(izq, y, ancho, alto, 10).fillAndStroke(fondo, borde);
    doc.y = y + 16;
    dibujar(izq + 18, ancho - 36);
    doc.y = y + alto + 14;
  };

  // ---------- Portada ----------
  doc.rect(0, 0, W, H).fill(COLOR.crema);
  usar('titulo').fontSize(12).fillColor(COLOR.acento).text(marca, izq, 48, { width: ancho, align: 'center' });
  const imgW = 300;
  const imgH = 375;
  const imgX = (W - imgW) / 2;
  const imgY = 88;
  if (imagenArquetipo) {
    doc.save();
    doc.roundedRect(imgX, imgY, imgW, imgH, 18).clip();
    doc.image(imagenArquetipo, imgX, imgY, { cover: [imgW, imgH], align: 'center', valign: 'center' });
    doc.restore();
  }
  const cy = imgY + imgH;
  doc.circle(W / 2, cy, 36).fillAndStroke('#FFFFFF', datos.color_hex || COLOR.acento);
  doc.lineWidth(3).circle(W / 2, cy, 36).stroke(datos.color_hex || COLOR.acento);
  usar('tituloFuerte').fontSize(String(datos.vida).length > 1 ? 26 : 32).fillColor(COLOR.texto)
    .text(String(datos.vida), W / 2 - 36, cy - (String(datos.vida).length > 1 ? 16 : 20), { width: 72, align: 'center' });
  doc.y = cy + 56;
  usar('texto').fontSize(13).fillColor(COLOR.suave)
    .text(datos.nombre ? `El informe personal de ${datos.nombre}` : 'Tu informe personal', izq, doc.y, { width: ancho, align: 'center' });
  doc.moveDown(0.4);
  usar('tituloFuerte').fontSize(27).fillColor(COLOR.texto).text(datos.arquetipo ?? datos.titulo ?? '', izq + 20, doc.y, { width: ancho - 40, align: 'center' });
  doc.moveDown(0.6);
  const fecha = datos.generado ? new Date(datos.generado) : new Date();
  usar('texto').fontSize(11).fillColor(COLOR.suave)
    .text(`Número de Vida ${datos.vida}${datos.maestro ? ' · Número maestro' : ''} · Escrito para ti el ${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`, izq, doc.y, { width: ancho, align: 'center' });
  // Aviso al pie de la portada (dentro del margen inferior: se anula un momento para no saltar de página).
  const margenPortada = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  usar('texto').fontSize(8.5).fillColor(COLOR.suave)
    .text('Contenido de entretenimiento y autoconocimiento basado en la tradición de la numerología. No es una predicción ni sustituye el consejo de profesionales.', izq + 30, H - 70, { width: ancho - 60, align: 'center' });
  doc.page.margins.bottom = margenPortada;

  // ---------- Tu carta y tu informe en un minuto ----------
  encabezado('Tu carta', 'Tus números, de un vistazo');
  const anio = fecha.getFullYear();
  const c = datos.carta ?? {};
  const celdas = [['Vida', c.vida], ['Alma', c.alma], ['Expresión', c.expresion], ['Personalidad', c.personalidad], ['Cumpleaños', c.cumpleanos], [`Año ${anio}`, c.anio_personal]]
    .filter(([, v]) => v);
  const colW = (ancho - 20) / 3;
  const filaH = 62;
  const yCeldas = doc.y;
  celdas.forEach(([etiqueta, valor], i) => {
    const x = izq + (i % 3) * (colW + 10);
    const y = yCeldas + Math.floor(i / 3) * (filaH + 10);
    doc.roundedRect(x, y, colW, filaH, 10).fillAndStroke('#FFFFFF', COLOR.borde);
    usar('seminegrita').fontSize(10).fillColor(COLOR.suave).text(etiqueta, x, y + 10, { width: colW, align: 'center' });
    usar('tituloFuerte').fontSize(22).fillColor(COLOR.texto).text(String(valor), x, y + 26, { width: colW, align: 'center' });
  });
  doc.y = yCeldas + Math.ceil(celdas.length / 3) * (filaH + 10) + 16;

  subtitulo('Tu informe en un minuto');
  if (inf.perfil?.resumen?.length) vinetas(inf.perfil.resumen);
  const tema = datos.tema_anio || TEMA_CICLO[c.anio_personal] || '';
  vinetas([
    c.anio_personal && `Tu año ${anio}: Año Personal ${c.anio_personal}${tema ? `, ${tema}` : ''}.`,
    datos.mes_clave && `Tu mes clave${datos.deseo ? ` para ${datos.deseo}` : ''}: ${MESES[datos.mes_clave.mes - 1]} de ${datos.mes_clave.anio}.`,
  ].filter(Boolean));

  // ---------- Secciones ----------
  encabezado('Parte 1', 'Una carta para ti');
  parrafos(inf.perfil?.introduccion);

  encabezado('Parte 2', 'Tu perfil', { nuevaPagina: false });
  subtitulo('Tu esencia');
  parrafos(inf.perfil?.esencia);
  subtitulo('Tus dones');
  vinetas(inf.perfil?.dones);
  subtitulo('Tus sombras (y cómo transformarlas)');
  vinetas(inf.perfil?.sombras);
  subtitulo(c.alma ? `Tu mundo interior: Número del Alma ${c.alma}${datos.alma ? `, alma de ${datos.alma.nombre}` : ''}` : 'Tu mundo interior');
  if (imagenAlma) {
    const altoImg = ancho * 0.42;
    asegurar(altoImg + 20);
    const y = doc.y;
    doc.save();
    doc.roundedRect(izq, y, ancho, altoImg, 12).clip();
    doc.image(imagenAlma, izq, y, { cover: [ancho, altoImg], align: 'center', valign: 'center' });
    doc.restore();
    doc.y = y + altoImg + 12;
  }
  parrafos(inf.perfil?.alma);
  subtitulo(c.expresion ? `Tus talentos: Número de Expresión ${c.expresion}` : 'Tus talentos');
  parrafos(inf.perfil?.expresion);
  subtitulo(`Tu don de cumpleaños: el ${c.cumpleanos}`);
  parrafos(inf.perfil?.cumpleanos);

  encabezado('Parte 3', 'Amor y pareja');
  parrafos(inf.areas?.amor);
  subtitulo('Con quién fluyes');
  parrafos(inf.areas?.fluyes);
  subtitulo('Con quién aprendes');
  parrafos(inf.areas?.aprendes);

  encabezado('Parte 4', 'Dinero y vocación', { nuevaPagina: false });
  parrafos(inf.areas?.dinero);
  encabezado('Parte 5', 'Familia y relaciones', { nuevaPagina: false });
  parrafos(inf.areas?.familia);

  let parte = 6;
  if (inf.ciclos) {
    encabezado(`Parte ${parte++}`, 'Tus ciclos');
    subtitulo(`Tu año ${anio}: Año Personal ${c.anio_personal}`);
    parrafos(inf.ciclos.anio_actual);
    subtitulo(`Tu año ${anio + 1}: Año Personal ${c.anio_personal_siguiente}`);
    parrafos(inf.ciclos.anio_siguiente);
    if (datos.mes_clave && inf.ciclos.mes_clave) {
      usar('texto').fontSize(11);
      const textoMes = dividirParrafos(inf.ciclos.mes_clave).join('\n\n');
      const alto = doc.heightOfString(textoMes, { width: ancho - 36, lineGap: 3 }) + 74;
      recuadro((x, w) => {
        usar('negrita').fontSize(10.5).fillColor(COLOR.acento).text(`Tu mes clave${datos.deseo ? ` para ${datos.deseo}` : ''}`.toUpperCase(), x, doc.y, { width: w, characterSpacing: 0.8 });
        usar('tituloFuerte').fontSize(19).fillColor(COLOR.texto).text(`${mayuscula(MESES[datos.mes_clave.mes - 1])} de ${datos.mes_clave.anio}`, x, doc.y + 2, { width: w });
        doc.moveDown(0.3);
        usar('texto').fontSize(11).fillColor(COLOR.texto).text(textoMes, x, doc.y, { width: w, lineGap: 3 });
      }, { alto });
    }
    subtitulo('Tus próximos 12 meses');
    inf.ciclos.meses?.forEach((texto, i) => {
      const m = datos.meses?.[i];
      const esClave = m && datos.mes_clave && m.mes === datos.mes_clave.mes && m.anio === datos.mes_clave.anio;
      usar('texto').fontSize(11);
      asegurar(doc.heightOfString(texto, { width: ancho - 50, lineGap: 3 }) + 34);
      const y = doc.y;
      usar('negrita').fontSize(12).fillColor(esClave ? COLOR.acento : COLOR.texto)
        .text(`${m ? `${mayuscula(m.nombre)} ${m.anio}` : `Mes ${i + 1}`}${esClave ? '  ·  tu mes clave' : ''}`, izq, y, { width: ancho - 40 });
      if (m) {
        doc.circle(izq + ancho - 12, y + 8, 12).fill(esClave ? COLOR.acento : COLOR.rosa);
        usar('tituloFuerte').fontSize(12).fillColor(esClave ? '#FFFFFF' : COLOR.acento).text(String(m.numero), izq + ancho - 24, y + 1.5, { width: 24, align: 'center' });
      }
      doc.y = y + 20;
      usar('texto').fontSize(11).fillColor(COLOR.texto).text(texto, izq, doc.y, { width: ancho - 40, lineGap: 3 });
      doc.moveDown(0.5);
      doc.moveTo(izq, doc.y).lineTo(izq + ancho, doc.y).lineWidth(0.6).strokeColor(COLOR.borde).stroke();
      doc.moveDown(0.6);
    });
  }

  encabezado(`Parte ${parte++}`, 'Tu lado espiritual');
  parrafos(inf.espiritual?.senales);
  if (inf.espiritual?.ritual_pasos?.length) {
    subtitulo(`Tu ritual: ${inf.espiritual.ritual_titulo}`);
    usar('seminegrita').fontSize(11).fillColor(COLOR.suave).text('Necesitas', izq, doc.y);
    doc.moveDown(0.3);
    vinetas(inf.espiritual.ritual_materiales);
    usar('seminegrita').fontSize(11).fillColor(COLOR.suave).text('Paso a paso', izq, doc.y);
    doc.moveDown(0.3);
    vinetas(inf.espiritual.ritual_pasos, { numeradas: true });
    usar('texto').fontSize(9.5).fillColor(COLOR.suave).text('Es un ejercicio simbólico de intención. Si usas velas, no las dejes nunca encendidas sin vigilancia.', izq, doc.y, { width: ancho });
  }
  if (inf.espiritual?.afirmaciones?.length) {
    subtitulo('Tus 12 afirmaciones');
    inf.espiritual.afirmaciones.forEach((a, i) => {
      usar('cursiva').fontSize(12.5);
      asegurar(doc.heightOfString(a, { width: ancho }) + 26);
      usar('negrita').fontSize(9.5).fillColor(COLOR.acento).text(mayuscula(datos.meses?.[i]?.nombre ?? `Mes ${i + 1}`).toUpperCase(), izq, doc.y, { characterSpacing: 0.8 });
      usar('cursiva').fontSize(12.5).fillColor(COLOR.texto).text(a, izq, doc.y + 1, { width: ancho, lineGap: 2 });
      doc.moveDown(0.6);
    });
  }

  if (inf.plan?.semanas?.length) {
    encabezado(`Parte ${parte++}`, 'Tu plan de 4 semanas');
    inf.plan.semanas.forEach((s, i) => {
      // El título de la semana nunca queda solo al final de una página: va con su primer párrafo.
      usar('texto').fontSize(11.5);
      asegurar(doc.heightOfString(dividirParrafos(s.practica)[0] ?? '', { width: ancho, lineGap: 3.5 }) + 56);
      usar('negrita').fontSize(9.5).fillColor(COLOR.dorado).text(`SEMANA ${i + 1}`, izq, doc.y, { characterSpacing: 1 });
      usar('titulo').fontSize(14.5).fillColor(COLOR.acento).text(s.titulo, izq, doc.y + 1, { width: ancho });
      doc.moveDown(0.3);
      parrafos(s.practica);
      doc.moveDown(0.3);
    });
  }

  if (parejas.length) {
    encabezado(`Parte ${parte++}`, 'Compatibilidad');
    for (const p of parejas) {
      subtitulo(`Tú y un ${p.numero}: ${p.titulo}`);
      parrafos(p.resumen);
      usar('seminegrita').fontSize(11).fillColor(COLOR.suave).text('Lo que los une', izq, doc.y);
      doc.moveDown(0.3);
      vinetas(p.fortalezas);
      usar('seminegrita').fontSize(11).fillColor(COLOR.suave).text('Lo que los reta', izq, doc.y);
      doc.moveDown(0.3);
      vinetas(p.retos);
      usar('seminegrita').fontSize(11).fillColor(COLOR.suave).text('Para cuidar el vínculo', izq, doc.y);
      doc.moveDown(0.3);
      parrafos(p.consejo);
    }
  }

  encabezado('Para terminar', datos.nombre ? `Con cariño, ${datos.nombre}` : 'Con cariño');
  parrafos(inf.espiritual?.carta_final, { tam: 12.5, fuente: 'cursiva' });

  // Pie de página en todas las páginas menos la portada.
  const rango = doc.bufferedPageRange();
  for (let i = rango.start + 1; i < rango.start + rango.count; i += 1) {
    doc.switchToPage(i);
    const margen = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    usar('texto').fontSize(8.5).fillColor(COLOR.suave)
      .text(`${marca} · ${datos.nombre ? `El informe de ${datos.nombre}` : 'Tu informe personal'}`, izq, H - 44, { width: ancho - 60, lineBreak: false })
      .text(`${i + 1}`, izq + ancho - 40, H - 44, { width: 40, align: 'right', lineBreak: false });
    doc.page.margins.bottom = margen;
  }

  const partes = [];
  doc.on('data', (d) => partes.push(d));
  const terminado = new Promise((ok, mal) => { doc.on('end', ok); doc.on('error', mal); });
  doc.end();
  await terminado;
  return Buffer.concat(partes);
}
