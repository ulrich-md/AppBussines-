// Función de Vercel: POST /api/lectura → lectura personalizada generada con Gemini.
// Variables de entorno (configurarlas en Vercel, nunca en el código):
//   GEMINI_API_KEY  clave de la API de Gemini (obligatoria)
//   GEMINI_MODEL    modelos a usar, separados por comas, en orden de preferencia (opcional)
import { readFile } from 'node:fs/promises';
import { validarPeticion, construirPrompt, generarLectura, permitido } from './_lectura.js';

// Si el primero está saturado, se prueba el siguiente.
const MODELOS_POR_DEFECTO = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
let cache;

async function cargarConfiguracion() {
  cache ??= Promise.all([
    readFile(new URL('../quizzes/numero-de-vida.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../site.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);
  return cache;
}

const responder = (estado, cuerpo) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return responder(503, { error: 'Lectura con IA no configurada' });

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconocida';
  if (!permitido(ip)) return responder(429, { error: 'Demasiadas lecturas seguidas. Inténtalo en unos minutos.' });

  const texto = await request.text();
  if (texto.length > 4000) return responder(413, { error: 'Petición demasiado grande' });

  let cuerpo;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return responder(400, { error: 'JSON no válido' });
  }

  const [quiz, sitio] = await cargarConfiguracion();
  const { datos, error } = validarPeticion(cuerpo, quiz);
  if (error) return responder(400, { error });

  try {
    const prompt = construirPrompt(datos, quiz, { marca: sitio.marca, anio: new Date().getFullYear() });
    const modelos = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.split(',').map((m) => m.trim()).filter(Boolean) : MODELOS_POR_DEFECTO;
    const { lectura } = await generarLectura(prompt, { apiKey, modelos });
    return responder(200, { lectura });
  } catch (e) {
    console.error('Error generando la lectura:', e.message);
    return responder(502, { error: 'No se pudo generar la lectura' });
  }
}
