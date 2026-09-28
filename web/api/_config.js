// Carga (una vez por instancia) la configuración que comparten las funciones del servidor.
import { readFile } from 'node:fs/promises';

let cache;
export function cargarConfiguracion() {
  cache ??= Promise.all([
    readFile(new URL('../quizzes/numero-de-vida.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../site.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../productos.json', import.meta.url), 'utf8').then(JSON.parse),
  ]).then(([quiz, sitio, catalogo]) => ({ quiz, sitio, catalogo }));
  return cache;
}

export const responder = (estado, cuerpo) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// Dirección pública del sitio (para los enlaces de Stripe). SITE_URL tiene prioridad.
export function origenDe(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export const ipDe = (request) => (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconocida';
