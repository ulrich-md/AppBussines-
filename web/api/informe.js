// GET /api/informe?s=<id de compra>              → el informe completo (se genera la primera vez)
// GET /api/informe?s=<id de compra>&pareja=<n>   → compatibilidad con otro Número de Vida (plan con pareja)
// Solo funciona con compras pagadas en Stripe: la IA nunca trabaja gratis desde aquí.
import { cargarConfiguracion, responder, origenDe, ipDe, limpiarVariable } from './_config.js';
import { validarPeticion, permitido } from './_lectura.js';
import { decodificarMetadata, esIdSesion, obtenerSesion } from './_stripe.js';
import { datosFijos, esNumeroPareja, generarSecciones } from './_informe.js';
import { leer, guardar, rutaInforme } from './_almacen.js';
import { enviarEnlaceInforme } from './_email.js';
import { modelosConfigurados } from './_gemini.js';

const MAX_PAREJAS = 5;

export async function GET(request) {
  const url = new URL(request.url);
  const idSesion = url.searchParams.get('s');
  if (!esIdSesion(idSesion)) return responder(400, { error: 'Enlace de informe no válido' });
  const clave = limpiarVariable(process.env.STRIPE_SECRET_KEY);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!clave || !apiKey) return responder(503, { error: 'Informe no configurado' });
  if (!permitido(`informe:${ipDe(request)}`, { maximo: 30 })) return responder(429, { error: 'Demasiadas peticiones. Espera unos minutos.' });

  let sesion;
  try {
    sesion = await obtenerSesion(idSesion, { clave });
  } catch (e) {
    return responder(e.estado === 404 ? 404 : 502, { error: 'No encontramos esta compra' });
  }
  // Pagos en efectivo (p. ej. OXXO) quedan pendientes hasta que se abonan.
  if (sesion.payment_status !== 'paid') return responder(202, { estado: 'pendiente' });

  const { quiz, sitio, catalogo } = await cargarConfiguracion();
  const { producto: idProducto, nombre, cuerpo } = decodificarMetadata(sesion.metadata, quiz);
  const producto = catalogo.productos.find((p) => p.id === idProducto);
  const { datos, error } = validarPeticion(cuerpo, quiz);
  if (!producto || error) {
    console.error('Metadatos de compra no válidos:', error);
    return responder(500, { error: 'No pudimos leer los datos de tu compra. Escríbenos y lo resolvemos.' });
  }
  const opciones = { apiKey, modelos: modelosConfigurados(), nombre, marca: sitio.marca };

  // Compatibilidad con otra persona (solo en el producto que la incluye).
  const pareja = url.searchParams.get('pareja');
  if (pareja !== null) {
    if (!producto.secciones.includes('pareja')) return responder(403, { error: 'Tu informe no incluye compatibilidad' });
    if (!esNumeroPareja(pareja)) return responder(400, { error: 'Número no válido' });
    const ruta = rutaInforme(idSesion, `-pareja-${pareja}`);
    const guardada = await leer(ruta);
    if (guardada) return responder(200, { pareja: guardada });
    const indice = rutaInforme(idSesion, '-parejas');
    const hechas = (await leer(indice)) ?? [];
    if (hechas.length >= MAX_PAREJAS) return responder(429, { error: `Tu informe incluye hasta ${MAX_PAREJAS} compatibilidades.` });
    try {
      const { pareja: texto } = await generarSecciones(['pareja'], datos, quiz, { ...opciones, parejaNumero: Number(pareja) });
      const resultado = { numero: Number(pareja), titulo: quiz.resultados[pareja].titulo, ...texto };
      await guardar(ruta, resultado);
      await guardar(indice, [...hechas, pareja]);
      return responder(200, { pareja: resultado });
    } catch (e) {
      console.error('Error generando compatibilidad:', e.message);
      return responder(502, { error: 'No pudimos escribir la compatibilidad. Inténtalo de nuevo.' });
    }
  }

  const ruta = rutaInforme(idSesion);
  const guardado = await leer(ruta);
  if (guardado) return responder(200, guardado);

  try {
    const secciones = producto.secciones.filter((s) => s !== 'pareja');
    const informe = await generarSecciones(secciones, datos, quiz, opciones);
    const resultado = {
      estado: 'listo',
      producto: { id: producto.id, nombre: producto.nombre, secciones: producto.secciones },
      nombre,
      ...datosFijos(datos, quiz),
      informe,
      generado: new Date().toISOString(),
    };
    await guardar(ruta, resultado);
    await enviarEnlaceInforme({
      para: sesion.customer_details?.email,
      nombre,
      enlace: `${origenDe(request)}/informe.html?s=${idSesion}`,
      marca: sitio.marca,
    }).catch((e) => console.warn('Email no enviado:', e.message));
    return responder(200, resultado);
  } catch (e) {
    console.error('Error generando el informe:', e.message);
    return responder(502, { error: 'Tu informe se está escribiendo con mucha demanda. Vuelve a intentarlo en un momento.' });
  }
}
