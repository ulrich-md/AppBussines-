// Lógica de la lectura personalizada con IA (Gemini). Sin dependencias: se usa desde la función
// de Vercel (api/lectura.js) y desde las pruebas. El archivo empieza por "_" para que Vercel no lo
// publique como una función aparte.
//
// Privacidad: al servidor solo llegan los números ya calculados (carta numerológica), la edad
// aproximada y las respuestas de opción múltiple. Ni el nombre ni la fecha de nacimiento salen del
// teléfono: la IA escribe el marcador {{nombre}} y el navegador lo sustituye.
import { NOMBRES_MES, TEMA_CICLO, describirCarta, validarCarta, validarMesClave } from './_numerologia.js';
import { limpiarTexto } from './_gemini.js';
import { generarJSON } from './_ia.js';

export const MARCADOR_NOMBRE = '{{nombre}}';
const RANGOS_EDAD = new Set(['18-29', '30-39', '40-49', '50-59', '60+']);

export const ESQUEMA_RESPUESTA = {
  type: 'OBJECT',
  properties: {
    titular: { type: 'STRING', description: 'Frase corta (máx. 10 palabras) que resume a esta mujer, sin nombre.' },
    esencia: { type: 'STRING', description: 'Quién es según su Número de Vida, su Número de Expresión y cómo la describen. 50-70 palabras.' },
    interior: { type: 'STRING', description: 'Su mundo interior: su Número del Alma (o, si no hay, su Número de Cumpleaños) y lo que desea en lo más hondo. 40-60 palabras.' },
    momento: { type: 'STRING', description: 'Su momento actual: Año y Mes Personal, ánimo, desafío y ocupación. 50-70 palabras.' },
    area: { type: 'STRING', description: 'El área que eligió entender, conectada con su situación y su carta. 50-70 palabras.' },
    senal: { type: 'STRING', description: 'Sus números repetidos y su espiritualidad. 30-45 palabras.' },
    consejo: { type: 'STRING', description: 'Un gesto práctico y sencillo para esta semana. 25-40 palabras.' },
    frase: { type: 'STRING', description: 'Afirmación personal en primera persona, máx. 15 palabras.' },
    mes_clave: { type: 'STRING', description: 'Por qué su mes clave encaja con lo que desea atraer, sin decir qué hacer ese mes. 30-45 palabras.' },
  },
  required: ['titular', 'esencia', 'interior', 'momento', 'area', 'senal', 'consejo', 'frase', 'mes_clave'],
  propertyOrdering: ['titular', 'esencia', 'interior', 'momento', 'area', 'senal', 'consejo', 'frase', 'mes_clave'],
};

const LIMITES = { titular: 120, esencia: 900, interior: 700, momento: 900, area: 900, senal: 600, consejo: 500, frase: 160, mes_clave: 450 };

// Comprueba la petición del navegador contra la configuración del cuestionario.
// Devuelve { datos } si todo es válido o { error } con el motivo.
export function validarPeticion(cuerpo, quiz) {
  if (!cuerpo || typeof cuerpo !== 'object') return { error: 'Cuerpo no válido' };
  const errorCarta = validarCarta(cuerpo.carta);
  if (errorCarta) return { error: errorCarta };
  const carta = cuerpo.carta;
  if (!quiz.resultados[String(carta.vida)]) return { error: 'Número no válido' };

  const errorMes = validarMesClave(cuerpo.mes_clave);
  if (errorMes) return { error: errorMes };

  const edad = String(cuerpo.edad ?? '');
  if (!RANGOS_EDAD.has(edad)) return { error: 'Edad no válida' };

  const respuestas = {};
  for (const pregunta of quiz.preguntas.filter((p) => p.tipo === 'opciones')) {
    const valor = cuerpo.respuestas?.[pregunta.id];
    // Una pregunta sin responder no impide la lectura ni el pago; una respuesta inventada sí se rechaza.
    if (valor === undefined || valor === null || valor === '') continue;
    const opcion = pregunta.opciones.find((o) => o.id === valor);
    if (!opcion) return { error: `Falta o no es válida la respuesta "${pregunta.id}"` };
    respuestas[pregunta.id] = opcion;
  }
  return {
    datos: {
      numero: String(carta.vida),
      carta: {
        vida: Number(carta.vida), cumpleanos: Number(carta.cumpleanos),
        expresion: carta.expresion ? Number(carta.expresion) : null,
        alma: carta.alma ? Number(carta.alma) : null,
        personalidad: carta.personalidad ? Number(carta.personalidad) : null,
        anio_personal: carta.anio_personal, anio_personal_siguiente: carta.anio_personal_siguiente, mes_personal: carta.mes_personal,
      },
      mesClave: cuerpo.mes_clave ?? null,
      edad,
      respuestas,
    },
  };
}

export const REGLAS_ESTILO = `REGLAS OBLIGATORIAS:
- Español neutro latinoamericano. Tutea ("tú"). Nunca uses "vosotros" ni palabras de España como "coger", "vale", "móvil", "ordenador" o "guay".
- Basa todo en la numerología tradicional y en los datos de su carta, sin contradecirlos. Menciona sus números por su nombre (Número de Vida, del Alma, de Expresión) cuando aporte.
- Personaliza de verdad: conecta de forma natural sus respuestas con su carta. No las repitas como lista ni cites las preguntas; que se sienta escrito solo para ella.
- Tono de esperanza y cariño. NUNCA metas miedo, NUNCA hagas predicciones concretas ("vas a conocer a alguien", "vas a ganar dinero") ni promesas. Habla de energía, tendencias, invitaciones y posibilidades.
- NUNCA des consejos médicos, psicológicos clínicos, legales ni financieros. No hables de enfermedades ni diagnósticos.
- Si es viuda, está separada o vive una relación complicada, trátalo con mucha delicadeza y sin juzgar.
- Adapta el vocabulario espiritual a su forma de vivir la espiritualidad: si tiene fe o reza, habla con respeto de la fe y la oración sin imponer ninguna doctrina; si hace rituales, de intención y rituales; si cree en señales, del universo y las señales; si es curiosa sin etiquetas, usa un lenguaje sereno y poco místico.
- Para dirigirte a ella usa exactamente el marcador ${MARCADOR_NOMBRE} (una o dos veces en total, nunca en el titular). No inventes ningún nombre.
- No menciones que eres una IA y no uses emojis.
- No uses guiones largos (— ni –). Usa comas, puntos o dos puntos.
- Respeta las longitudes indicadas en cada campo.`;

export function construirPrompt({ carta, mesClave, edad, respuestas }, quiz, { marca, anio }) {
  const lineasRespuestas = quiz.preguntas
    .filter((p) => p.tipo === 'opciones' && respuestas[p.id])
    .map((p) => `- ${p.texto_ia ?? p.texto} → ${respuestas[p.id].texto}`)
    .join('\n');
  const deseo = respuestas.deseo?.etiqueta ?? respuestas.deseo?.texto ?? '';
  const lineaMes = mesClave
    ? `Su mes clave para ${deseo}: ${NOMBRES_MES[mesClave.mes - 1]} de ${mesClave.anio} (Mes Personal ${mesClave.numero}, ${TEMA_CICLO[mesClave.numero].replace('año', 'mes')}).`
    : 'No tiene un mes clave claro en los próximos 12 meses: habla de cómo su año la prepara para lo que desea.';

  const sistema = `Eres la voz de "${marca}", una marca de numerología de entretenimiento y autoconocimiento para mujeres hispanohablantes de 30 a 55 años.
Escribes lecturas personalizadas cálidas, cercanas y esperanzadoras, como una amiga sabia de unos 45 años.
Esta es su lectura GRATUITA: debe ser valiosa y sentirse muy personal. En el campo mes_clave explica por qué ese mes resuena con lo que desea, pero deja para su informe completo qué hacer ese mes.
No hables de productos, precios ni compras.

${REGLAS_ESTILO}`;

  const usuario = `SU CARTA NUMEROLÓGICA
${describirCarta(carta, quiz, anio)}

${lineaMes}

CONTEXTO
Año actual: ${anio}. Edad aproximada: ${edad} años.

SUS RESPUESTAS
${lineasRespuestas}

Escribe su lectura personalizada.`;

  return { sistema, usuario };
}

// Limpia y valida la respuesta de la IA. Devuelve la lectura o lanza un error.
export function normalizarLectura(entrada) {
  const datos = typeof entrada === 'string' ? JSON.parse(entrada) : entrada;
  const lectura = {};
  for (const [campo, maximo] of Object.entries(LIMITES)) {
    const limpio = limpiarTexto(datos?.[campo], maximo);
    if (limpio.length < 5) throw new Error(`Falta el campo "${campo}"`);
    lectura[campo] = limpio;
  }
  return lectura;
}

// Prueba los modelos en orden hasta que uno responda bien, sin pasarse del tiempo total.
export async function generarLectura(prompt, opciones) {
  const { datos, modelo } = await generarJSON(prompt, { ...opciones, esquema: ESQUEMA_RESPUESTA, normalizar: normalizarLectura });
  return { lectura: datos, modelo };
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
