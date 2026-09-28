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
// Tolera errores típicos al pegar la variable en Vercel: espacios, comillas o falta de "https://".
export function origenDe(request) {
  const texto = limpiarVariable(process.env.SITE_URL);
  if (texto) {
    try {
      return new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`).origin;
    } catch {
      console.error('SITE_URL no es una dirección válida; se usa la del propio sitio.');
    }
  }
  return new URL(request.url).origin;
}

export const limpiarVariable = (valor) => String(valor ?? '').trim().replace(/^["']|["']$/g, '').trim();

export const ipDe = (request) => (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconocida';
