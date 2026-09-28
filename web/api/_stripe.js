// Stripe Checkout sin SDK (API REST). La clave secreta se lee de STRIPE_SECRET_KEY en Vercel.
// En los metadatos de la compra se guarda solo lo necesario para escribir el informe:
// los números de la carta, las respuestas (identificadores), el nombre de pila y la edad aproximada.
import { limpiarNombre } from '../js/engine.js';

const API = 'https://api.stripe.com/v1';

// Convierte un objeto anidado al formato de formulario que usa la API de Stripe (a[b][0][c]=…).
export function aFormulario(objeto, prefijo = '', pares = new URLSearchParams()) {
  for (const [clave, valor] of Object.entries(objeto)) {
    if (valor === undefined || valor === null) continue;
    const nombre = prefijo ? `${prefijo}[${clave}]` : clave;
    if (typeof valor === 'object') aFormulario(valor, nombre, pares);
    else pares.append(nombre, String(valor));
  }
  return pares;
}

export async function llamarStripe(ruta, { metodo = 'GET', datos, clave, fetchImpl = fetch } = {}) {
  const respuesta = await fetchImpl(`${API}${ruta}`, {
    method: metodo,
    headers: {
      authorization: `Bearer ${clave}`,
      ...(datos ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: datos ? aFormulario(datos).toString() : undefined,
  });
  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(`Stripe ${respuesta.status}: ${json?.error?.message ?? 'error desconocido'}`);
    error.estado = respuesta.status;
    // Código corto de Stripe (p. ej. "api_key_invalid", "url_invalid"): no contiene datos secretos.
    error.codigo = String(json?.error?.code ?? json?.error?.type ?? `http_${respuesta.status}`).slice(0, 60);
    throw error;
  }
  return json;
}

const CAMPOS_CARTA = ['vida', 'cumpleanos', 'expresion', 'alma', 'personalidad', 'anio_personal', 'anio_personal_siguiente', 'mes_personal'];

export function codificarMetadata({ producto, quiz, carta, mesClave, respuestas, nombre, edad }) {
  const preguntas = quiz.preguntas.filter((p) => p.tipo === 'opciones');
  return {
    p: producto,
    q: quiz.id,
    c: CAMPOS_CARTA.map((k) => carta[k] ?? 0).join(','),
    m: mesClave ? `${mesClave.mes}-${mesClave.anio}-${mesClave.numero}` : '',
    r: preguntas.map((p) => respuestas[p.id]?.id ?? respuestas[p.id]).join('|'),
    n: limpiarNombre(nombre ?? '').slice(0, 40),
    e: edad,
  };
}

// Reconstruye la petición original a partir de los metadatos (se vuelve a validar después).
export function decodificarMetadata(meta, quiz) {
  const valores = String(meta?.c ?? '').split(',').map(Number);
  const carta = Object.fromEntries(CAMPOS_CARTA.map((k, i) => [k, valores[i] || null]));
  const [mes, anio, numero] = String(meta?.m ?? '').split('-').map(Number);
  const ids = String(meta?.r ?? '').split('|');
  const respuestas = Object.fromEntries(quiz.preguntas.filter((p) => p.tipo === 'opciones').map((p, i) => [p.id, ids[i]]));
  return {
    producto: meta?.p,
    nombre: meta?.n ?? '',
    cuerpo: { carta, mes_clave: mes ? { mes, anio, numero } : null, edad: meta?.e, respuestas },
  };
}

export function crearSesion({ producto, catalogo, metadata, origen, clave, fetchImpl, cupon }) {
  return llamarStripe('/checkout/sessions', {
    metodo: 'POST',
    clave,
    fetchImpl,
    datos: {
      mode: 'payment',
      locale: 'es-419',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: catalogo.moneda,
          unit_amount: producto.precio,
          product_data: { name: producto.nombre, description: producto.resumen },
        },
      }],
      metadata,
      payment_intent_data: { description: producto.nombre, metadata },
      // Stripe no permite combinar un cupón aplicado con el campo de códigos promocionales.
      ...(cupon ? { discounts: [{ coupon: cupon }] } : { allow_promotion_codes: 'true' }),
      success_url: `${origen}/informe.html?s={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origen}/?q=${metadata.q}&compra=cancelada`,
    },
  });
}

export const obtenerSesion = (id, { clave, fetchImpl }) => llamarStripe(`/checkout/sessions/${encodeURIComponent(id)}`, { clave, fetchImpl });

export const esIdSesion = (id) => typeof id === 'string' && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id);
