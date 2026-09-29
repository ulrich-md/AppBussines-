// Descargas de la tienda.
//   GET /api/descarga?s=<compra>            → qué guías incluye la compra (para la página de descarga)
//   GET /api/descarga?s=<compra>&p=<guía>   → el PDF de esa guía (se escribe una sola vez y se guarda)
//   GET /api/descarga?preparar=<guía>&clave=<INFORME_SECRETO> → la dueña la prepara y la revisa antes de vender
import { timingSafeEqual } from 'node:crypto';
import { cargarConfiguracion, responder, ipDe, limpiarVariable } from './_config.js';
import { permitido } from './_lectura.js';
import { esIdSesion, obtenerSesion } from './_stripe.js';
import { articuloTienda, contenidoGuia, guiasDeCompra, GUIAS } from './_tienda.js';
import { crearPdfGuia, nombreArchivo } from './_pdf.js';
import { hayIA } from './_ia.js';

const iguales = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

async function pdfDeGuia(id, { catalogo, sitio }) {
  const producto = articuloTienda(catalogo, id);
  const contenido = await contenidoGuia(id, { marca: sitio.marca });
  const pdf = await crearPdfGuia(producto, contenido, { marca: sitio.marca });
  return new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${nombreArchivo(producto.nombre, 'Guia')}"`,
      'cache-control': 'private, no-store',
    },
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const { catalogo, sitio } = await cargarConfiguracion();
  if (!permitido(`descarga:${ipDe(request)}`, { maximo: 40 })) return responder(429, { error: 'Demasiadas descargas seguidas. Espera unos minutos.' });

  // Preparación por la dueña (con su clave secreta): escribe la guía si hace falta y la devuelve.
  const preparar = url.searchParams.get('preparar');
  if (preparar !== null) {
    const secreto = limpiarVariable(process.env.INFORME_SECRETO);
    if (!secreto || !iguales(url.searchParams.get('clave') ?? '', secreto)) return responder(403, { error: 'Clave no válida' });
    if (!GUIAS[preparar]) return responder(404, { error: 'Guía desconocida' });
    if (!hayIA()) return responder(503, { error: 'IA no configurada' });
    try {
      return await pdfDeGuia(preparar, { catalogo, sitio });
    } catch (e) {
      console.error('Error preparando la guía:', e.message);
      return responder(502, { error: 'No se pudo preparar la guía. Inténtalo de nuevo.', codigo: e.codigo });
    }
  }

  const idSesion = url.searchParams.get('s');
  if (!esIdSesion(idSesion)) return responder(400, { error: 'Enlace de descarga no válido' });
  const clave = limpiarVariable(process.env.STRIPE_SECRET_KEY);
  if (!clave) return responder(503, { error: 'Tienda no configurada' });
  let sesion;
  try {
    sesion = await obtenerSesion(idSesion, { clave });
  } catch (e) {
    return responder(e.estado === 404 ? 404 : 502, { error: 'No encontramos esta compra' });
  }
  if (sesion.payment_status !== 'paid') return responder(202, { estado: 'pendiente' });
  const compra = sesion.metadata?.t;
  const incluidas = guiasDeCompra(catalogo, compra);
  if (!incluidas.length) return responder(404, { error: 'Esta compra no incluye guías de la tienda' });

  const pedida = url.searchParams.get('p');
  if (pedida === null) {
    return responder(200, {
      compra: articuloTienda(catalogo, compra)?.nombre,
      guias: incluidas.map((id) => {
        const p = articuloTienda(catalogo, id);
        return { id, nombre: p.nombre, tipo: p.tipo, imagen: p.imagen, imagen_alt: p.imagen_alt };
      }),
    });
  }
  if (!incluidas.includes(pedida)) return responder(403, { error: 'Esta guía no está incluida en tu compra' });
  try {
    return await pdfDeGuia(pedida, { catalogo, sitio });
  } catch (e) {
    console.error('Error entregando la guía:', e.message);
    return responder(502, { error: 'Tu guía se está preparando. Vuelve a intentarlo en un minuto.', codigo: e.codigo });
  }
}
