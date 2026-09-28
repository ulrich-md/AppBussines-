// POST /api/suscribir → guarda un email (con consentimiento) para enviar "tu número del mes".
// Necesita Vercel Blob (BLOB_READ_WRITE_TOKEN). Se exporta con scripts/exportar-suscriptoras.mjs.
import { createHash } from 'node:crypto';
import { responder, ipDe } from './_config.js';
import { permitido } from './_lectura.js';
import { guardar } from './_almacen.js';
import { NUMEROS_VALIDOS } from './_numerologia.js';
import { MESES_POR_DESEO } from '../js/engine.js';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return responder(503, { error: 'Suscripción no disponible' });
  if (!permitido(`suscribir:${ipDe(request)}`, { maximo: 5 })) return responder(429, { error: 'Demasiados intentos' });
  let cuerpo;
  try {
    cuerpo = JSON.parse((await request.text()).slice(0, 2000));
  } catch {
    return responder(400, { error: 'JSON no válido' });
  }
  const email = String(cuerpo.email ?? '').trim().toLowerCase();
  if (!EMAIL.test(email)) return responder(400, { error: 'Revisa tu email' });
  if (cuerpo.consentimiento !== true) return responder(400, { error: 'Necesitamos tu permiso para escribirte' });
  const vida = NUMEROS_VALIDOS.has(String(cuerpo.vida)) ? Number(cuerpo.vida) : null;
  const deseo = Object.hasOwn(MESES_POR_DESEO, cuerpo.deseo) ? cuerpo.deseo : null;
  const id = createHash('sha256').update(email).digest('hex').slice(0, 32);
  await guardar(`suscriptoras/${id}.json`, {
    email, vida, deseo, nombre: String(cuerpo.nombre ?? '').slice(0, 40), fecha: new Date().toISOString(), consentimiento: true,
  });
  return responder(200, { ok: true });
}
