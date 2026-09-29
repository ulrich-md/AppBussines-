// GET /api/pdf?s=<id de compra> → descarga el informe en PDF (archivo, no el diálogo de imprimir).
// Usa el informe ya guardado: nunca vuelve a llamar a la IA. Incluye las compatibilidades hechas.
import { cargarConfiguracion, responder, ipDe, limpiarVariable } from './_config.js';
import { permitido } from './_lectura.js';
import { esIdSesion, obtenerSesion } from './_stripe.js';
import { leer, rutaInforme } from './_almacen.js';
import { crearPdf, nombreArchivo } from './_pdf.js';

export async function GET(request) {
  const idSesion = new URL(request.url).searchParams.get('s');
  if (!esIdSesion(idSesion)) return responder(400, { error: 'Enlace de informe no válido' });
  const clave = limpiarVariable(process.env.STRIPE_SECRET_KEY);
  if (!clave) return responder(503, { error: 'Informe no configurado' });
  if (!permitido(`pdf:${ipDe(request)}`, { maximo: 20 })) return responder(429, { error: 'Demasiadas descargas seguidas. Espera unos minutos.' });

  let sesion;
  try {
    sesion = await obtenerSesion(idSesion, { clave });
  } catch (e) {
    return responder(e.estado === 404 ? 404 : 502, { error: 'No encontramos esta compra' });
  }
  if (sesion.payment_status !== 'paid') return responder(409, { error: 'Tu pago aún no está confirmado' });

  const informe = await leer(rutaInforme(idSesion));
  if (!informe?.informe) return responder(404, { error: 'Abre primero tu informe para que se termine de escribir; después podrás descargarlo.' });

  const numeros = (await leer(rutaInforme(idSesion, '-parejas'))) ?? [];
  const parejas = (await Promise.all(numeros.map((n) => leer(rutaInforme(idSesion, `-pareja-${n}`))))).filter(Boolean);
  const { sitio } = await cargarConfiguracion();

  try {
    const pdf = await crearPdf(informe, { parejas, marca: sitio.marca });
    const archivo = nombreArchivo(informe.nombre);
    return new Response(pdf, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${archivo}"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (e) {
    console.error('Error creando el PDF:', e.message);
    return responder(500, { error: 'No pudimos crear el PDF. Inténtalo de nuevo.' });
  }
}
