// POST /api/opinion → guarda la opinión de una compradora (compra verificada en Stripe) para revisarla.
// Nada se publica solo: se aprueba con scripts/opiniones.mjs, que la copia a web/testimonios.json.
import { createHash } from 'node:crypto';
import { responder, ipDe } from './_config.js';
import { permitido } from './_lectura.js';
import { esIdSesion, obtenerSesion } from './_stripe.js';
import { guardar } from './_almacen.js';
import { limpiarTexto } from './_gemini.js';

export async function POST(request) {
  const clave = process.env.STRIPE_SECRET_KEY;
  if (!clave || !process.env.BLOB_READ_WRITE_TOKEN) return responder(503, { error: 'Opiniones no disponibles' });
  if (!permitido(`opinion:${ipDe(request)}`, { maximo: 5 })) return responder(429, { error: 'Demasiados intentos' });
  let cuerpo;
  try {
    cuerpo = JSON.parse((await request.text()).slice(0, 4000));
  } catch {
    return responder(400, { error: 'JSON no válido' });
  }
  if (!esIdSesion(cuerpo.s)) return responder(400, { error: 'Compra no válida' });
  const estrellas = Number(cuerpo.estrellas);
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return responder(400, { error: 'Elige de 1 a 5 estrellas' });
  const texto = limpiarTexto(cuerpo.texto, 600);
  if (texto.length < 10) return responder(400, { error: 'Cuéntanos un poco más (al menos una frase)' });

  let sesion;
  try {
    sesion = await obtenerSesion(cuerpo.s, { clave });
  } catch {
    return responder(404, { error: 'No encontramos tu compra' });
  }
  if (sesion.payment_status !== 'paid') return responder(403, { error: 'Solo pueden opinar compras confirmadas' });

  const id = createHash('sha256').update(cuerpo.s).digest('hex').slice(0, 24);
  await guardar(`opiniones/${id}.json`, {
    id,
    estrellas,
    texto,
    nombre: limpiarTexto(cuerpo.nombre, 30),
    pais: limpiarTexto(cuerpo.pais, 30),
    publicar: cuerpo.publicar === true,
    numero: Number(sesion.metadata?.c?.split(',')[0]) || null,
    producto: sesion.metadata?.p ?? null,
    fecha: new Date().toISOString(),
    verificada: true,
  });
  return responder(200, { ok: true });
}
