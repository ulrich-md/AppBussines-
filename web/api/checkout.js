// POST /api/checkout → crea una sesión de pago de Stripe para el producto elegido y devuelve su URL.
// El precio sale siempre de productos.json (nunca del navegador).
import { cargarConfiguracion, responder, origenDe, ipDe } from './_config.js';
import { validarPeticion, permitido } from './_lectura.js';
import { codificarMetadata, crearSesion, esIdSesion, obtenerSesion } from './_stripe.js';

// GET /api/checkout → qué incentivos están activos (para mostrarlos solo si existen de verdad).
export function GET() {
  const activo = Boolean(process.env.STRIPE_SECRET_KEY && process.env.CUPON_RECUPERACION && process.env.CUPON_RECUPERACION_TEXTO);
  return responder(200, { pagos: Boolean(process.env.STRIPE_SECRET_KEY), recuperacion: activo ? process.env.CUPON_RECUPERACION_TEXTO.slice(0, 40) : null });
}

export async function POST(request) {
  const clave = process.env.STRIPE_SECRET_KEY;
  if (!clave) return responder(503, { error: 'Pagos no configurados' });
  if (!permitido(`checkout:${ipDe(request)}`, { maximo: 10 })) return responder(429, { error: 'Demasiados intentos. Espera unos minutos.' });

  const texto = await request.text();
  if (texto.length > 4000) return responder(413, { error: 'Petición demasiado grande' });
  let cuerpo;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return responder(400, { error: 'JSON no válido' });
  }

  const { quiz, catalogo } = await cargarConfiguracion();
  if (cuerpo.mejora_de !== undefined) return mejorar(cuerpo, { quiz, catalogo, clave, origen: origenDe(request) });
  const producto = catalogo.productos.find((p) => p.id === cuerpo.producto);
  if (!producto) return responder(400, { error: 'Producto no válido' });
  const { datos, error } = validarPeticion(cuerpo, quiz);
  if (error) return responder(400, { error });

  try {
    const metadata = codificarMetadata({
      producto: producto.id, quiz, carta: datos.carta, mesClave: datos.mesClave,
      respuestas: datos.respuestas, nombre: cuerpo.nombre, edad: datos.edad,
    });
    // Cupón opcional para quien vuelve tras cancelar el pago (CUPON_RECUPERACION = id de un cupón de Stripe).
    const cupon = cuerpo.recuperacion === true ? process.env.CUPON_RECUPERACION : undefined;
    const sesion = await crearSesion({ producto, catalogo, metadata, origen: origenDe(request), clave, cupon });
    return responder(200, { url: sesion.url });
  } catch (e) {
    console.error('Error creando el pago:', e.message);
    return responder(502, { error: 'No se pudo iniciar el pago' });
  }
}

// Mejora de un informe ya comprado: se paga solo la diferencia y se reutilizan sus datos
// (la compra original ya tiene la carta y las respuestas), sin repetir el cuestionario.
async function mejorar(cuerpo, { quiz, catalogo, clave, origen }) {
  if (!esIdSesion(cuerpo.mejora_de)) return responder(400, { error: 'Compra no válida' });
  let original;
  try {
    original = await obtenerSesion(cuerpo.mejora_de, { clave });
  } catch {
    return responder(404, { error: 'No encontramos tu compra' });
  }
  if (original.payment_status !== 'paid') return responder(409, { error: 'Tu compra original aún no está pagada' });
  const mejora = catalogo.mejoras?.find((m) => m.desde === original.metadata?.p && m.hacia === cuerpo.producto);
  if (!mejora) return responder(400, { error: 'Esta mejora no está disponible para tu informe' });
  const destino = catalogo.productos.find((p) => p.id === mejora.hacia);
  try {
    const sesion = await crearSesion({
      producto: { ...destino, precio: mejora.precio, nombre: mejora.nombre, resumen: mejora.texto },
      catalogo,
      metadata: { ...original.metadata, p: mejora.hacia, o: cuerpo.mejora_de.slice(0, 200) },
      origen,
      clave,
    });
    return responder(200, { url: sesion.url });
  } catch (e) {
    console.error('Error creando la mejora:', e.message);
    return responder(502, { error: 'No se pudo iniciar el pago' });
  }
}
