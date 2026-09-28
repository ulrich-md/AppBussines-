// Lógica de la lectura personalizada con IA (Gemini). Sin dependencias: se usa desde la función
// de Vercel (api/lectura.js) y desde las pruebas. El archivo empieza por "_" para que Vercel no lo
// publique como una función aparte.
//
// Privacidad: al servidor solo llegan el número calculado, la edad aproximada y las respuestas
// de opción múltiple. Ni el nombre ni la fecha de nacimiento salen del teléfono: la IA escribe el
// marcador {{nombre}} y el navegador lo sustituye.

export const MARCADOR_NOMBRE = '{{nombre}}';
const NUMEROS_VALIDOS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22', '33']);
const RANGOS_EDAD = new Set(['18-29', '30-39', '40-49', '50-59', '60+']);

export const ESQUEMA_RESPUESTA = {
  type: 'OBJECT',
  properties: {
    titular: { type: 'STRING', description: 'Frase corta (máx. 10 palabras) que resume a esta mujer, sin nombre.' },
    esencia: { type: 'STRING', description: 'Quién es según su número y cómo la describen. 70–100 palabras.' },
    momento: { type: 'STRING', description: 'Su momento actual: ánimo, desafío, ocupación y Año Personal. 70–100 palabras.' },
    area: { type: 'STRING', description: 'El área que eligió entender, conectada con su situación. 70–100 palabras.' },
    senal: { type: 'STRING', description: 'Sus números repetidos y su espiritualidad. 40–60 palabras.' },
    consejo: { type: 'STRING', description: 'Un gesto práctico y sencillo para esta semana. 30–50 palabras.' },
    frase: { type: 'STRING', description: 'Afirmación personal en primera persona, máx. 15 palabras.' },
  },
  required: ['titular', 'esencia', 'momento', 'area', 'senal', 'consejo', 'frase'],
  propertyOrdering: ['titular', 'esencia', 'momento', 'area', 'senal', 'consejo', 'frase'],
};

const LIMITES = { titular: 120, esencia: 900, momento: 900, area: 900, senal: 600, consejo: 500, frase: 160 };

// Comprueba la petición del navegador contra la configuración del cuestionario.
// Devuelve { datos } si todo es válido o { error } con el motivo.
export function validarPeticion(cuerpo, quiz) {
  if (!cuerpo || typeof cuerpo !== 'object') return { error: 'Cuerpo no válido' };
  const numero = String(cuerpo.numero ?? '');
  if (!NUMEROS_VALIDOS.has(numero) || !quiz.resultados[numero]) return { error: 'Número no válido' };

  const anioPersonal = Number(cuerpo.anio_personal);
  if (!Number.isInteger(anioPersonal) || anioPersonal < 1 || anioPersonal > 9) return { error: 'Año personal no válido' };

  const edad = String(cuerpo.edad ?? '');
  if (!RANGOS_EDAD.has(edad)) return { error: 'Edad no válida' };

  const respuestas = {};
  for (const pregunta of quiz.preguntas.filter((p) => p.tipo === 'opciones')) {
    const valor = cuerpo.respuestas?.[pregunta.id];
    const opcion = pregunta.opciones.find((o) => o.id === valor);
    if (!opcion) return { error: `Falta o no es válida la respuesta "${pregunta.id}"` };
    respuestas[pregunta.id] = opcion;
  }
  return { datos: { numero, anioPersonal, edad, respuestas } };
}

export function construirPrompt({ numero, anioPersonal, edad, respuestas }, quiz, { marca, anio }) {
  const r = quiz.resultados[numero];
  const preguntasIA = quiz.preguntas.filter((p) => p.tipo === 'opciones');
  const lineasRespuestas = preguntasIA
    .map((p) => `- ${p.texto_ia ?? p.texto} → ${respuestas[p.id].texto}`)
    .join('\n');

  const sistema = `Eres la voz de "${marca}", una marca de numerología de entretenimiento y autoconocimiento para mujeres hispanohablantes de 30 a 55 años.
Escribes lecturas personalizadas cálidas, cercanas y esperanzadoras, como una amiga sabia de unos 45 años.

REGLAS OBLIGATORIAS:
- Español neutro latinoamericano. Tutea ("tú"). Nunca uses "vosotros" ni palabras de España como "coger", "vale", "móvil", "ordenador" o "guay".
- Basa la lectura en la numerología tradicional y en los datos del número que te doy, sin contradecirlos.
- Personaliza de verdad: conecta de forma natural al menos 5 de sus respuestas. No las repitas como lista ni cites las preguntas; que se sienta escrito solo para ella.
- Tono de esperanza y cariño. NUNCA metas miedo, NUNCA hagas predicciones concretas ("vas a conocer a alguien", "vas a ganar dinero") ni promesas. Habla de energía, tendencias, invitaciones y posibilidades.
- NUNCA des consejos médicos, psicológicos clínicos, legales ni financieros. No hables de enfermedades ni diagnósticos.
- Si es viuda, está separada o vive una relación complicada, trátalo con mucha delicadeza y sin juzgar.
- Adapta el vocabulario espiritual a su forma de vivir la espiritualidad: si tiene fe o reza, habla con respeto de la fe y la oración sin imponer ninguna doctrina; si hace rituales, de intención y rituales; si cree en señales, del universo y las señales; si es curiosa sin etiquetas, usa un lenguaje sereno y poco místico.
- Para dirigirte a ella usa exactamente el marcador ${MARCADOR_NOMBRE} (una o dos veces en total, nunca en el titular). No inventes ningún nombre.
- No menciones que eres una IA, no hables de productos ni de compras y no uses emojis.
- Respeta las longitudes indicadas en cada campo.`;

  const usuario = `DATOS DE SU NÚMERO
Número de Vida: ${numero}${r.maestro ? ' (número maestro)' : ''} — ${r.titulo}
Color de poder: ${r.color}
Descripción base: ${r.teaser}
Amor: ${r.areas.amor}
Dinero y trabajo: ${r.areas.dinero}
Paz interior: ${r.areas.paz}
Familia: ${r.areas.familia}

CONTEXTO
Año actual: ${anio}. Su Año Personal ${anio} es el ${anioPersonal}.
Edad aproximada: ${edad} años.

SUS RESPUESTAS
${lineasRespuestas}

Escribe su lectura personalizada.`;

  return { sistema, usuario };
}

// Limpia y valida la respuesta de la IA. Devuelve la lectura o lanza un error.
export function normalizarLectura(texto) {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('La IA no devolvió JSON válido');
  }
  const lectura = {};
  for (const [campo, maximo] of Object.entries(LIMITES)) {
    const valor = typeof datos?.[campo] === 'string' ? datos[campo] : '';
    const limpio = valor.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (limpio.length < 5) throw new Error(`Falta el campo "${campo}"`);
    lectura[campo] = limpio.slice(0, maximo);
  }
  return lectura;
}

async function llamarModelo({ sistema, usuario }, { apiKey, modelo, tiempoMaximoMs, fetchImpl, nivelRazonamiento = 'minimal' }) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), tiempoMaximoMs);
  try {
    const respuesta = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
      {
        method: 'POST',
        signal: controlador.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sistema }] },
          contents: [{ role: 'user', parts: [{ text: usuario }] }],
          generationConfig: {
            temperature: 1,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: ESQUEMA_RESPUESTA,
            // Sin apenas razonamiento: la lectura es creativa, no analítica, y así responde mucho más rápido.
            thinkingConfig: { thinkingLevel: nivelRazonamiento },
          },
        }),
      },
    );
    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '');
      const error = new Error(`${modelo} respondió ${respuesta.status}: ${detalle.slice(0, 200)}`);
      // Algunos modelos no aceptan el nivel de razonamiento "minimal": se repite con "low".
      if (respuesta.status === 400 && nivelRazonamiento !== 'low' && /thinking level/i.test(detalle)) {
        clearTimeout(temporizador);
        return llamarModelo({ sistema, usuario }, { apiKey, modelo, tiempoMaximoMs, fetchImpl, nivelRazonamiento: 'low' });
      }
      // Clave inválida o sin permisos: no tiene sentido probar otros modelos.
      error.reintentable = ![401, 403].includes(respuesta.status);
      throw error;
    }
    const json = await respuesta.json();
    const partes = json?.candidates?.[0]?.content?.parts ?? [];
    const texto = partes.filter((p) => !p.thought).map((p) => p.text ?? '').join('');
    return normalizarLectura(texto);
  } catch (error) {
    // Tiempo agotado o respuesta mal formada: también se prueba con el siguiente modelo.
    if (error.name === 'AbortError' || error.message.startsWith('La IA') || error.message.startsWith('Falta')) {
      error.reintentable = true;
    }
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}

// Prueba los modelos en orden hasta que uno responda bien, sin pasarse del tiempo total.
export async function generarLectura(prompt, { apiKey, modelos, tiempoTotalMs = 26000, tiempoPorModeloMs = 14000, fetchImpl = fetch }) {
  const inicio = Date.now();
  let ultimoError;
  for (const modelo of modelos) {
    const restante = tiempoTotalMs - (Date.now() - inicio);
    if (restante < 3000) break;
    try {
      return { lectura: await llamarModelo(prompt, { apiKey, modelo, tiempoMaximoMs: Math.min(tiempoPorModeloMs, restante), fetchImpl }), modelo };
    } catch (error) {
      ultimoError = error;
      console.warn(`Fallo con ${modelo}: ${error.message}`);
      if (!error.reintentable) break;
    }
  }
  throw ultimoError ?? new Error('Sin tiempo para generar la lectura');
}

// Límite sencillo de peticiones por IP (en memoria de cada instancia). Frena el abuso básico;
// el tope real de gasto debe configurarse también en Google Cloud (presupuesto y cuotas).
const historial = new Map();
export function permitido(ip, { maximo = 6, ventanaMs = 10 * 60 * 1000, ahora = Date.now() } = {}) {
  const recientes = (historial.get(ip) ?? []).filter((t) => ahora - t < ventanaMs);
  if (recientes.length >= maximo) {
    historial.set(ip, recientes);
    return false;
  }
  recientes.push(ahora);
  historial.set(ip, recientes);
  if (historial.size > 5000) historial.clear();
  return true;
}
