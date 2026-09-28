// Pruebas del pago (Stripe) y del informe de pago, con Stripe y Gemini simulados.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aFormulario, codificarMetadata, decodificarMetadata, esIdSesion } from '../web/api/_stripe.js';
import { validarPeticion } from '../web/api/_lectura.js';
import { SECCIONES, normalizarSeccion } from '../web/api/_informe.js';
import { mesesDesdeCarta } from '../web/api/_numerologia.js';
import { POST as checkout } from '../web/api/checkout.js';
import { GET as informe } from '../web/api/informe.js';

const quiz = JSON.parse(readFileSync(new URL('../web/quizzes/numero-de-vida.json', import.meta.url)));
const carta = { vida: 4, cumpleanos: 5, expresion: 9, alma: 9, personalidad: 9, anio_personal: 9, anio_personal_siguiente: 1, mes_personal: 9 };
const respuestas = {
  situacion_amor: 'soltera_abierta', area: 'amor', ocupacion: 'empleo', desafio: 'confiar', animo: 'cambio',
  deseo: 'amor', como_te_ven: 'responsable', espiritualidad: 'senales', repetidos: '1111',
};
const cuerpoCompra = (producto = 'completo') => ({ producto, carta, mes_clave: { mes: 5, anio: 2027, numero: 6 }, edad: '40-49', respuestas, nombre: 'María' });

// Rellena un esquema de Gemini con textos de prueba (12 elementos en las listas).
function rellenar(esquema) {
  if (esquema.type === 'STRING') return 'Texto de prueba personalizado para {{nombre}} con suficiente longitud.';
  if (esquema.type === 'ARRAY') return Array.from({ length: 12 }, () => rellenar(esquema.items));
  return Object.fromEntries(Object.entries(esquema.properties).map(([k, v]) => [k, rellenar(v)]));
}

let llamadas;
let sesionSimulada;
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  llamadas = { stripe: [], gemini: 0 };
  process.env.STRIPE_SECRET_KEY = 'sk_test_simulada';
  process.env.GEMINI_API_KEY = 'clave-simulada';
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.RESEND_API_KEY;
  sesionSimulada = { payment_status: 'paid', metadata: codificarMetadata({ ...cuerpoCompra('premium'), producto: 'premium', quiz, mesClave: cuerpoCompra().mes_clave }), customer_details: { email: 'maria@ejemplo.com' } };
  globalThis.fetch = async (url, opciones = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.stripe.com')) {
      llamadas.stripe.push({ url: u, cuerpo: opciones.body ? new URLSearchParams(opciones.body) : null });
      if (opciones.method === 'POST') return Response.json({ id: 'cs_test_nuevaSesion123', url: 'https://checkout.stripe.com/c/pay/cs_test_nuevaSesion123' });
      return Response.json(sesionSimulada);
    }
    if (u.includes('generativelanguage.googleapis.com')) {
      llamadas.gemini += 1;
      const esquema = JSON.parse(opciones.body).generationConfig.responseSchema;
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(rellenar(esquema)) }] } }] });
    }
    throw new Error(`fetch inesperado: ${u}`);
  };
});

afterEach(() => { globalThis.fetch = fetchOriginal; });

const peticionCheckout = (cuerpo) => new Request('https://sitio.test/api/checkout', {
  method: 'POST', body: JSON.stringify(cuerpo), headers: { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` },
});
const peticionInforme = (query) => new Request(`https://sitio.test/api/informe?${query}`, { headers: { 'x-forwarded-for': `10.1.0.${Math.floor(Math.random() * 250)}` } });

test('metadatos: ida y vuelta sin perder datos (y sin fecha de nacimiento)', () => {
  const { datos } = validarPeticion(cuerpoCompra(), quiz);
  const meta = codificarMetadata({ producto: 'completo', quiz, carta: datos.carta, mesClave: datos.mesClave, respuestas: datos.respuestas, nombre: '  maría josé ', edad: '40-49' });
  for (const valor of Object.values(meta)) assert.ok(String(valor).length <= 500, 'Stripe limita cada valor a 500 caracteres');
  assert.equal(meta.n, 'María josé');
  const { producto, nombre, cuerpo } = decodificarMetadata(meta, quiz);
  assert.equal(producto, 'completo');
  assert.equal(nombre, 'María josé');
  const revalidado = validarPeticion(cuerpo, quiz);
  assert.equal(revalidado.error, undefined);
  assert.deepEqual(revalidado.datos.carta, datos.carta);
  assert.deepEqual(revalidado.datos.mesClave, { mes: 5, anio: 2027, numero: 6 });
});

test('aFormulario usa la notación de Stripe', () => {
  const f = aFormulario({ line_items: [{ price_data: { unit_amount: 999 } }], metadata: { p: 'x' }, vacio: null });
  assert.equal(f.get('line_items[0][price_data][unit_amount]'), '999');
  assert.equal(f.get('metadata[p]'), 'x');
  assert.equal(f.has('vacio'), false);
  assert.equal(esIdSesion('cs_test_a1B2c3D4e5F6g7'), true);
  assert.equal(esIdSesion('cs_test_../../x'), false);
});

test('checkout: crea la sesión con el precio del catálogo (nunca el del navegador)', async () => {
  const respuesta = await checkout(peticionCheckout({ ...cuerpoCompra('completo'), precio: 1 }));
  assert.equal(respuesta.status, 200);
  assert.match((await respuesta.json()).url, /^https:\/\/checkout\.stripe\.com/);
  const enviado = llamadas.stripe[0].cuerpo;
  assert.equal(enviado.get('line_items[0][price_data][unit_amount]'), '1499');
  assert.equal(enviado.get('mode'), 'payment');
  assert.equal(enviado.get('metadata[p]'), 'completo');
  assert.match(enviado.get('success_url'), /\/informe\.html\?s=\{CHECKOUT_SESSION_ID\}$/);
  assert.doesNotMatch(enviado.toString(), /1985/);
});

test('checkout: rechaza productos inexistentes y datos manipulados', async () => {
  assert.equal((await checkout(peticionCheckout({ ...cuerpoCompra(), producto: 'gratis' }))).status, 400);
  assert.equal((await checkout(peticionCheckout({ ...cuerpoCompra(), carta: { ...carta, vida: 99 } }))).status, 400);
  delete process.env.STRIPE_SECRET_KEY;
  assert.equal((await checkout(peticionCheckout(cuerpoCompra()))).status, 503);
});

test('informe: se genera una vez, se guarda y se sirve sin volver a llamar a la IA', async () => {
  const id = 'cs_test_informePremium0001';
  const primera = await informe(peticionInforme(`s=${id}`));
  assert.equal(primera.status, 200);
  const datos = await primera.json();
  assert.equal(datos.nombre, 'María');
  assert.equal(datos.arquetipo, 'La Constructora con alma de sanadora');
  assert.deepEqual(Object.keys(datos.informe).sort(), ['areas', 'ciclos', 'espiritual', 'perfil', 'plan']);
  assert.equal(datos.informe.ciclos.meses.length, 12);
  assert.equal(datos.informe.espiritual.afirmaciones.length, 12);
  assert.match(datos.informe.perfil.esencia, /para María con/);
  assert.equal(datos.meses.length, 12);
  const llamadasIA = llamadas.gemini;
  assert.equal(llamadasIA, 5);

  const segunda = await informe(peticionInforme(`s=${id}`));
  assert.equal(segunda.status, 200);
  assert.equal(llamadas.gemini, llamadasIA, 'la segunda visita no debe llamar a la IA');
});

test('informe: compra pendiente (pago en efectivo) y enlaces no válidos', async () => {
  sesionSimulada.payment_status = 'unpaid';
  assert.equal((await informe(peticionInforme('s=cs_test_pendiente0000001'))).status, 202);
  assert.equal(llamadas.gemini, 0, 'sin pago no se genera nada');
  assert.equal((await informe(peticionInforme('s=otra-cosa'))).status, 400);
});

test('informe: compatibilidad solo en el Pack Completo y con números válidos', async () => {
  const id = 'cs_test_parejaPremium00001';
  const ok = await informe(peticionInforme(`s=${id}&pareja=7`));
  assert.equal(ok.status, 200);
  const { pareja } = await ok.json();
  assert.equal(pareja.numero, 7);
  assert.equal(pareja.titulo, 'La Sabia');
  assert.equal((await informe(peticionInforme(`s=${id}&pareja=10`))).status, 400);

  sesionSimulada.metadata = { ...sesionSimulada.metadata, p: 'esencial' };
  assert.equal((await informe(peticionInforme('s=cs_test_esencialSinPareja1&pareja=7'))).status, 403);
});

test('normalizarSeccion exige las cantidades del informe', () => {
  const ciclos = rellenar(SECCIONES.ciclos);
  assert.equal(normalizarSeccion('ciclos')(ciclos).meses.length, 12);
  assert.throws(() => normalizarSeccion('ciclos')({ ...ciclos, meses: ['solo uno'] }));
  assert.throws(() => normalizarSeccion('perfil')({ ...rellenar(SECCIONES.perfil), esencia: '' }));
});

test('meses desde la carta coinciden con el cálculo con fecha', () => {
  const meses = mesesDesdeCarta(carta, new Date('2026-09-28T12:00:00'));
  assert.deepEqual(meses[0], { anio: 2026, mes: 10, numero: 1 });
  assert.deepEqual(meses[7], { anio: 2027, mes: 5, numero: 6 });
});

test('mejora: se paga la diferencia y se reutilizan los datos de la compra original', async () => {
  sesionSimulada.metadata = { ...sesionSimulada.metadata, p: 'esencial' };
  const respuesta = await checkout(peticionCheckout({ producto: 'completo', mejora_de: 'cs_test_compraOriginal00001' }));
  assert.equal(respuesta.status, 200);
  const creada = llamadas.stripe.find((l) => l.cuerpo)?.cuerpo;
  assert.equal(creada.get('line_items[0][price_data][unit_amount]'), '599');
  assert.equal(creada.get('metadata[p]'), 'completo');
  assert.equal(creada.get('metadata[o]'), 'cs_test_compraOriginal00001');
  assert.equal(creada.get('metadata[c]'), sesionSimulada.metadata.c);
});

test('mejora: no se puede bajar de plan ni mejorar una compra sin pagar', async () => {
  sesionSimulada.metadata = { ...sesionSimulada.metadata, p: 'completo' };
  assert.equal((await checkout(peticionCheckout({ producto: 'esencial', mejora_de: 'cs_test_compraOriginal00001' }))).status, 400);
  sesionSimulada.payment_status = 'unpaid';
  assert.equal((await checkout(peticionCheckout({ producto: 'premium', mejora_de: 'cs_test_compraOriginal00001' }))).status, 409);
  assert.equal((await checkout(peticionCheckout({ producto: 'premium', mejora_de: 'no-es-un-id' }))).status, 400);
});
