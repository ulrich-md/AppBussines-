// POST /api/checkout → crea una sesión de pago de Stripe para el producto elegido y devuelve su URL.
// El precio sale siempre de productos.json (nunca del navegador).
import { cargarConfiguracion, responder, origenDe, ipDe, paisDe, limpiarVariable } from './_config.js';
import { monedaPorPais } from '../js/precios.js';
import { validarPeticion, permitido } from './_lectura.js';
import { codificarMetadata, crearSesion, esIdSesion, obtenerSesion } from './_stripe.js';
import { articuloTienda } from './_tienda.js';

// GET /api/checkout → moneda de la visita (pesos en México, dólares en el resto) e incentivos activos.
export function GET(request) {
  const activo = Boolean(process.env.STRIPE_SECRET_KEY && process.env.CUPON_RECUPERACION && process.env.CUPON_RECUPERACION_TEXTO);
  const pais = paisDe(request);
  return responder(200, {
    pagos: Boolean(process.env.STRIPE_SECRET_KEY),
    recuperacion: activo ? process.env.CUPON_RECUPERACION_TEXTO.slice(0, 40) : null,
    pais,
    moneda: monedaPorPais(pais),
  });
}

export async function POST(request) {
  const clave = limpiarVariable(process.env.STRIPE_SECRET_KEY);
  if (!clave) return responder(503, { error: 'Pagos no configurados' });
  // Error frecuente: pegar la clave publicable (pk_…) en lugar de la secreta (sk_… o rk_…).
  if (!/^(sk|rk)_(test|live)_/.test(clave)) {
    console.error('Error creando el pago: STRIPE_SECRET_KEY debe empezar por sk_test_ o sk_live_ (¿pegaste la clave publicable pk_?).');
    return responder(502, { error: 'No se pudo iniciar el pago', codigo: 'clave_no_secreta' });
  }
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
  // La moneda la decide el país de la IP (nunca el navegador): pesos en México, dólares en el resto.
  const moneda = monedaPorPais(paisDe(request));
  if (cuerpo.mejora_de !== undefined) return mejorar(cuerpo, { quiz, catalogo, clave, moneda, origen: origenDe(request) });
  if (cuerpo.tienda !== undefined) return comprarTienda(cuerpo.tienda, { catalogo, clave, moneda, origen: origenDe(request) });
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
    const sesion = await crearSesion({ producto, moneda, metadata, origen: origenDe(request), clave, cupon });
    return responder(200, { url: sesion.url });
  } catch (e) {
    console.error('Error creando el pago:', e.message);
    return responder(502, { error: 'No se pudo iniciar el pago', codigo: e.codigo ?? 'desconocido' });
  }
}

// Productos digitales de la tienda (guías en PDF, iguales para todas): precio fijo de productos.json.
async function comprarTienda(id, { catalogo, clave, moneda, origen }) {
  const producto = articuloTienda(catalogo, id);
  if (!producto) return responder(400, { error: 'Producto no válido' });
  try {
    const sesion = await crearSesion({
      producto: { ...producto, resumen: producto.resumen.slice(0, 250) },
      moneda,
      metadata: { t: producto.id },
      origen,
      clave,
      exito: 'descarga.html',
      cancelado: '#tienda',
    });
    return responder(200, { url: sesion.url });
  } catch (e) {
    console.error('Error creando el pago de la tienda:', e.message);
    return responder(502, { error: 'No se pudo iniciar el pago', codigo: e.codigo ?? 'desconocido' });
  }
}

// Mejora de un informe ya comprado: se paga solo la diferencia y se reutilizan sus datos
// (la compra original ya tiene la carta y las respuestas), sin repetir el cuestionario.
async function mejorar(cuerpo, { quiz, catalogo, clave, moneda, origen }) {
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
      producto: { ...destino, precio: mejora.precio, precio_usd: mejora.precio_usd, nombre: mejora.nombre, resumen: mejora.texto },
      moneda,
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
