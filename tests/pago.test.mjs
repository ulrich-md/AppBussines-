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
import { GET as pdf } from '../web/api/pdf.js';
import { crearPdf, nombreArchivo } from '../web/api/_pdf.js';

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
  delete process.env.ANTHROPIC_API_KEY;
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

const peticionCheckout = (cuerpo, pais) => new Request('https://sitio.test/api/checkout', {
  method: 'POST', body: JSON.stringify(cuerpo),
  headers: { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}`, ...(pais ? { 'x-vercel-ip-country': pais } : {}) },
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
  assert.equal(enviado.get('line_items[0][price_data][currency]'), 'usd');
  assert.equal(enviado.get('payment_method_types[0]'), null, 'fuera de México no se fuerza OXXO');
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

test('cupón de recuperación: solo si está configurado y solo para quien vuelve tras cancelar', async () => {
  const { GET: infoCheckout } = await import('../web/api/checkout.js');
  delete process.env.CUPON_RECUPERACION;
  assert.equal((await (await infoCheckout()).json()).recuperacion, null);
  process.env.CUPON_RECUPERACION = 'VUELVE15';
  process.env.CUPON_RECUPERACION_TEXTO = '15%';
  assert.equal((await (await infoCheckout()).json()).recuperacion, '15%');

  await checkout(peticionCheckout({ ...cuerpoCompra(), recuperacion: true }));
  let enviado = llamadas.stripe.at(-1).cuerpo;
  assert.equal(enviado.get('discounts[0][coupon]'), 'VUELVE15');
  assert.equal(enviado.has('allow_promotion_codes'), false);

  await checkout(peticionCheckout(cuerpoCompra()));
  enviado = llamadas.stripe.at(-1).cuerpo;
  assert.equal(enviado.has('discounts[0][coupon]'), false);
  assert.equal(enviado.get('allow_promotion_codes'), 'true');
  delete process.env.CUPON_RECUPERACION;
  delete process.env.CUPON_RECUPERACION_TEXTO;
});

test('opiniones: solo compras pagadas, con validación, y nunca publicadas sin permiso', async () => {
  const { POST: opinar } = await import('../web/api/opinion.js');
  const { leer } = await import('../web/api/_almacen.js');
  const { createHash } = await import('node:crypto');
  const pedir = (cuerpo) => opinar(new Request('https://sitio.test/api/opinion', { method: 'POST', body: JSON.stringify(cuerpo), headers: { 'x-forwarded-for': `10.2.0.${Math.floor(Math.random() * 250)}` } }));
  const id = 'cs_test_opinion0000000001';
  // Sin almacenamiento configurado, el formulario se oculta (503).
  assert.equal((await pedir({ s: id, estrellas: 5, texto: 'Me encantó mi informe' })).status, 503);

  process.env.BLOB_READ_WRITE_TOKEN = 'memoria-pruebas';
  assert.equal((await pedir({ s: 'otra-cosa', estrellas: 5, texto: 'Me encantó mi informe' })).status, 400);
  assert.equal((await pedir({ s: id, estrellas: 7, texto: 'Me encantó mi informe' })).status, 400);
  assert.equal((await pedir({ s: id, estrellas: 5, texto: 'ok' })).status, 400);
  sesionSimulada.payment_status = 'unpaid';
  assert.equal((await pedir({ s: id, estrellas: 5, texto: 'Me encantó mi informe' })).status, 403);
  sesionSimulada.payment_status = 'paid';

  const ok = await pedir({ s: id, estrellas: 5, texto: 'Me encantó, <b>me describe</b> muy bien — gracias', nombre: 'Rosa', pais: 'México' });
  assert.equal(ok.status, 200);
  const guardada = await leer(`opiniones/${createHash('sha256').update(id).digest('hex').slice(0, 24)}.json`);
  assert.equal(guardada.estrellas, 5);
  assert.equal(guardada.texto, 'Me encantó, me describe muy bien, gracias');
  assert.equal(guardada.publicar, false, 'sin la casilla marcada no se puede publicar');
  assert.equal(guardada.verificada, true);
  assert.equal(guardada.numero, 4);
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

test('testimonios.json empieza vacío (no hay opiniones inventadas)', () => {
  const t = JSON.parse(readFileSync(new URL('../web/testimonios.json', import.meta.url)));
  assert.deepEqual(t.opiniones, []);
});

test('config: SITE_URL y clave de Stripe tolerantes a errores al pegarlas', async () => {
  const { origenDe, limpiarVariable } = await import('../web/api/_config.js');
  const peticion = new Request('https://proyecto.vercel.app/api/checkout');
  const anterior = process.env.SITE_URL;
  try {
    process.env.SITE_URL = ' tunumero.com/ ';
    assert.equal(origenDe(peticion), 'https://tunumero.com');
    process.env.SITE_URL = '"https://tunumero.com/"';
    assert.equal(origenDe(peticion), 'https://tunumero.com');
    process.env.SITE_URL = 'no es una url';
    assert.equal(origenDe(peticion), 'https://proyecto.vercel.app');
  } finally {
    if (anterior === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = anterior;
  }
  assert.equal(limpiarVariable(' "sk_test_abc" \n'), 'sk_test_abc');
});

const peticionPdf = (query) => new Request(`https://sitio.test/api/pdf?${query}`, { headers: { 'x-forwarded-for': `10.2.0.${Math.floor(Math.random() * 250)}` } });

test('pdf: se descarga como archivo a partir del informe guardado, sin volver a llamar a la IA', async () => {
  const id = 'cs_test_informeParaPdf0001';
  // Sin informe escrito todavía: pide abrirlo primero.
  assert.equal((await pdf(peticionPdf(`s=${id}`))).status, 404);
  assert.equal((await informe(peticionInforme(`s=${id}`))).status, 200);
  const llamadasIA = llamadas.gemini;
  const respuesta = await pdf(peticionPdf(`s=${id}`));
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.headers.get('content-type'), 'application/pdf');
  assert.match(respuesta.headers.get('content-disposition'), /attachment; filename="Informe-Maria\.pdf"/);
  const bytes = Buffer.from(await respuesta.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.ok(bytes.length > 50000, `PDF demasiado pequeño (${bytes.length} bytes)`);
  assert.equal(llamadas.gemini, llamadasIA, 'el PDF no llama a la IA');
  // Sin pago confirmado, no hay PDF.
  sesionSimulada.payment_status = 'unpaid';
  assert.equal((await pdf(peticionPdf(`s=${id}`))).status, 409);
  assert.equal((await pdf(peticionPdf('s=otra-cosa'))).status, 400);
});

test('pdf: el informe real de ejemplo produce un PDF de varias páginas', async () => {
  const datos = JSON.parse(readFileSync(new URL('./fixtures/informe-premium.json', import.meta.url)));
  const bytes = await crearPdf(datos, { marca: 'Tu Número Sagrado' });
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  const paginas = (bytes.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;
  assert.ok(paginas >= 10, `solo ${paginas} páginas`);
  assert.equal(nombreArchivo('María José Núñez'), 'Informe-Maria-Jose-Nunez.pdf');
  assert.equal(nombreArchivo(''), 'Informe-Numero-de-Vida.pdf');
});

test('tienda: checkout con precio fijo del catálogo y descarga solo de lo comprado', async () => {
  const { GET: descarga } = await import('../web/api/descarga.js');
  const catalogoTienda = JSON.parse(readFileSync(new URL('../web/productos.json', import.meta.url)));
  const respuesta = await checkout(peticionCheckout({ tienda: 'cristales' }, 'MX'));
  assert.equal(respuesta.status, 200);
  const enviado = llamadas.stripe.at(-1).cuerpo;
  assert.equal(enviado.get('line_items[0][price_data][currency]'), 'mxn');
  assert.equal(enviado.get('line_items[0][price_data][unit_amount]'), String(catalogoTienda.tienda.find((t) => t.id === 'cristales').precio));
  assert.equal(enviado.get('metadata[t]'), 'cristales');
  assert.equal(enviado.get('payment_method_types[1]'), 'oxxo');
  assert.equal(enviado.get('payment_method_options[oxxo][expires_after_days]'), '3');
  assert.match(enviado.get('success_url'), /\/descarga\.html\?s=\{CHECKOUT_SESSION_ID\}$/);
  assert.equal((await checkout(peticionCheckout({ tienda: 'regalo' }))).status, 400);

  // Una compra del paquete incluye las 6 guías; una suelta, solo la suya.
  const pedir = (q) => descarga(new Request(`https://sitio.test/api/descarga?${q}`, { headers: { 'x-forwarded-for': `10.3.0.${Math.floor(Math.random() * 250)}` } }));
  sesionSimulada = { payment_status: 'paid', metadata: { t: 'pack' } };
  const lista = await (await pedir('s=cs_test_compraTienda0001')).json();
  assert.equal(lista.guias.length, 6);
  sesionSimulada = { payment_status: 'paid', metadata: { t: 'cristales' } };
  assert.equal((await pedir('s=cs_test_compraTienda0002&p=proteccion')).status, 403);
  sesionSimulada = { payment_status: 'unpaid', metadata: { t: 'cristales' } };
  assert.equal((await pedir('s=cs_test_compraTienda0003')).status, 202);
  // Preparar una guía exige la clave secreta de la dueña.
  process.env.INFORME_SECRETO = 'secreto-de-prueba';
  assert.equal((await pedir('preparar=cristales&clave=otra')).status, 403);
});

test('tienda: la guía se escribe una sola vez y se entrega como PDF', async () => {
  const { GET: descarga } = await import('../web/api/descarga.js');
  process.env.BLOB_READ_WRITE_TOKEN = 'memoria-pruebas';
  sesionSimulada = { payment_status: 'paid', metadata: { t: 'tarot-guia' } };
  const pedir = () => descarga(new Request('https://sitio.test/api/descarga?s=cs_test_compraTienda0004&p=tarot-guia', { headers: { 'x-forwarded-for': `10.4.0.${Math.floor(Math.random() * 250)}` } }));
  const primera = await pedir();
  assert.equal(primera.status, 200);
  assert.equal(primera.headers.get('content-type'), 'application/pdf');
  assert.match(primera.headers.get('content-disposition'), /filename="Guia-Guia-rapida-del-Tarot\.pdf"/);
  const bytes = Buffer.from(await primera.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  const llamadasIA = llamadas.gemini;
  assert.ok(llamadasIA >= 4, 'escribe introducción, capítulos y fichas');
  assert.equal((await pedir()).status, 200);
  assert.equal(llamadas.gemini, llamadasIA, 'la segunda compra no vuelve a llamar a la IA');
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

test('checkout: en México cobra en pesos con OXXO; si la cuenta no tiene OXXO, sigue solo con tarjeta', async () => {
  const catalogo = JSON.parse(readFileSync(new URL('../web/productos.json', import.meta.url)));
  let intentos = 0;
  const fetchPrevio = globalThis.fetch;
  globalThis.fetch = async (url, opciones = {}) => {
    if (String(url).startsWith('https://api.stripe.com') && opciones.method === 'POST') {
      intentos += 1;
      const cuerpo = new URLSearchParams(opciones.body);
      llamadas.stripe.push({ url: String(url), cuerpo });
      if (cuerpo.get('payment_method_types[1]') === 'oxxo') {
        return Response.json({ error: { message: 'The payment method type "oxxo" is invalid.' } }, { status: 400 });
      }
      return Response.json({ id: 'cs_test_sinOxxo000001', url: 'https://checkout.stripe.com/c/pay/cs_test_sinOxxo000001' });
    }
    return fetchPrevio(url, opciones);
  };
  const respuesta = await checkout(peticionCheckout(cuerpoCompra('completo'), 'MX'));
  assert.equal(respuesta.status, 200);
  assert.equal(intentos, 2);
  const final = llamadas.stripe.at(-1).cuerpo;
  assert.equal(final.get('line_items[0][price_data][currency]'), 'mxn');
  assert.equal(final.get('line_items[0][price_data][unit_amount]'), String(catalogo.productos.find((p) => p.id === 'completo').precio));
  assert.equal(final.get('payment_method_types[0]'), null);
  globalThis.fetch = fetchPrevio;

  const { GET } = await import('../web/api/checkout.js');
  assert.equal((await (await GET(new Request('https://sitio.test/api/checkout', { headers: { 'x-vercel-ip-country': 'MX' } }))).json()).moneda, 'mxn');
  assert.equal((await (await GET(new Request('https://sitio.test/api/checkout', { headers: { 'x-vercel-ip-country': 'CO' } }))).json()).moneda, 'usd');
});
