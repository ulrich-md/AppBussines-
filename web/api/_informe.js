// Informe de pago personalizado: se genera con Gemini por secciones (en paralelo) a partir de la
// carta numerológica y las respuestas del cuestionario. Qué secciones lleva depende del producto.
import { ponerNombre } from '../js/engine.js';
import { CLAVES, NOMBRES_MES, TEMA_CICLO, describirCarta, mesesDesdeCarta, NUMEROS_VALIDOS } from './_numerologia.js';
import { REGLAS_ESTILO } from './_lectura.js';
import { limpiarProfundo } from './_gemini.js';
import { generarJSON } from './_ia.js';

const T = (description) => ({ type: 'STRING', description });
const LISTA = (description, items = T('Elemento de la lista')) => ({ type: 'ARRAY', description, items });
const OBJ = (properties) => ({ type: 'OBJECT', properties, required: Object.keys(properties), propertyOrdering: Object.keys(properties) });

// Esquema de cada sección. Todas las longitudes son orientativas para la IA.
export const SECCIONES = {
  perfil: OBJ({
    introduccion: T('Carta de bienvenida: cómo se combinan sus números y su arquetipo combinado. 90-120 palabras.'),
    esencia: T('Su esencia según el Número de Vida, conectada con cómo la describen. 160-200 palabras.'),
    dones: LISTA('5 dones concretos, cada uno de 20-35 palabras, empezando por el nombre del don y dos puntos.'),
    sombras: LISTA('4 sombras o retos, cada uno de 20-35 palabras, con cariño y una salida práctica.'),
    alma: T('Su Número del Alma (o, si no hay, su Número de Cumpleaños): qué desea en lo más hondo. 110-150 palabras.'),
    expresion: T('Su Número de Expresión y de Personalidad (o, si no hay, sus talentos según el Número de Vida): talentos y cómo la ven. 110-150 palabras.'),
    cumpleanos: T('Su Número de Cumpleaños como un don especial. 60-90 palabras.'),
  }),
  areas: OBJ({
    amor: T('Amor y pareja según su carta y su situación sentimental. 170-220 palabras.'),
    fluyes: T('Con qué Números de Vida fluye con facilidad y por qué. 70-100 palabras.'),
    aprendes: T('Con qué Números de Vida aprende y crece, y cómo llevarlo. 70-100 palabras.'),
    dinero: T('Dinero y vocación: tendencias y talentos según su carta y su ocupación, sin consejos financieros. 160-200 palabras.'),
    familia: T('Familia y relaciones: su papel y su tarea en esta etapa. 120-160 palabras.'),
  }),
  espiritual: OBJ({
    senales: T('Sus números repetidos, su color de poder y su espiritualidad. 90-120 palabras.'),
    ritual_titulo: T('Nombre breve de un ritual personal pensado para ella (máx. 8 palabras).'),
    ritual_materiales: LISTA('3-5 materiales sencillos y seguros.'),
    ritual_pasos: LISTA('5-7 pasos claros del ritual, cada uno de 15-30 palabras.'),
    afirmaciones: LISTA('Exactamente 12 afirmaciones personales en primera persona, una por mes, máx. 14 palabras cada una.'),
    carta_final: T('Carta final de despedida, cálida y personal. 100-140 palabras.'),
  }),
  ciclos: OBJ({
    anio_actual: T('Su Año Personal actual: qué significa y cómo aprovecharlo según su momento. 130-170 palabras.'),
    anio_siguiente: T('Su Año Personal siguiente: qué trae y cómo prepararse. 130-170 palabras.'),
    meses: LISTA('Exactamente 12 textos, uno por cada mes de la lista y en el mismo orden, cada uno de 40-60 palabras: energía del mes y una sugerencia práctica.'),
    mes_clave: T('Qué hacer en su mes clave para atraer lo que desea: 3 o 4 sugerencias concretas en prosa. 110-150 palabras.'),
  }),
  plan: OBJ({
    semanas: LISTA('Exactamente 4 semanas.', OBJ({
      titulo: T('Título de la semana, máx. 6 palabras.'),
      practica: T('Qué hacer esa semana, con 3 gestos diarios sencillos, en prosa. 60-90 palabras.'),
    })),
  }),
  pareja: OBJ({
    resumen: T('Cómo se combinan su Número de Vida y el de la otra persona. 100-130 palabras.'),
    fortalezas: LISTA('3 fortalezas de la combinación, 20-30 palabras cada una.'),
    retos: LISTA('3 retos de la combinación con una salida práctica, 20-30 palabras cada uno.'),
    consejo: T('Un consejo para cuidar el vínculo. 60-90 palabras.'),
  }),
};

// Comprueba que la IA devolvió todo lo pedido (con las cantidades exactas donde importan).
const CANTIDADES = { dones: 4, sombras: 3, ritual_pasos: 4, ritual_materiales: 2, afirmaciones: 12, meses: 12, semanas: 4, fortalezas: 3, retos: 3 };
export function normalizarSeccion(nombre) {
  return (datos) => {
    const limpio = limpiarProfundo(datos, 2500);
    for (const campo of Object.keys(SECCIONES[nombre].properties)) {
      const valor = limpio?.[campo];
      if (Array.isArray(valor)) {
        const minimo = CANTIDADES[campo] ?? 1;
        if (valor.length < minimo) throw new Error(`Sección ${nombre}: "${campo}" incompleto`);
        if (campo === 'afirmaciones' || campo === 'meses') limpio[campo] = valor.slice(0, 12);
      } else if (!valor || (typeof valor === 'string' && valor.length < 5)) {
        throw new Error(`Sección ${nombre}: falta "${campo}"`);
      }
    }
    return limpio;
  };
}

function sistema(marca) {
  return `Eres la voz de "${marca}", una marca de numerología de entretenimiento y autoconocimiento para mujeres hispanohablantes de 30 a 55 años.
Estás escribiendo una parte de su INFORME COMPLETO DE PAGO: debe ser profundo, concreto, práctico y muy personal, claramente más rico que una lectura gratuita.
Evita frases genéricas que valdrían para cualquiera: cada párrafo debe apoyarse en sus números y en sus respuestas.
No hables de productos, precios ni compras.

${REGLAS_ESTILO}`;
}

function contexto(datos, quiz, anio) {
  const respuestas = quiz.preguntas
    .filter((p) => p.tipo === 'opciones')
    .map((p) => `- ${p.texto_ia ?? p.texto} → ${datos.respuestas[p.id].texto}`)
    .join('\n');
  const deseo = datos.respuestas.deseo?.etiqueta ?? '';
  const mes = datos.mesClave
    ? `Su mes clave para ${deseo}: ${NOMBRES_MES[datos.mesClave.mes - 1]} de ${datos.mesClave.anio} (Mes Personal ${datos.mesClave.numero}).`
    : '';
  return `SU CARTA NUMEROLÓGICA
${describirCarta(datos.carta, quiz, anio)}
${mes}

CONTEXTO
Año actual: ${anio}. Edad aproximada: ${datos.edad} años.

SUS RESPUESTAS
${respuestas}`;
}

function peticionSeccion(nombre, datos, quiz, { anio, hoy, parejaNumero }) {
  let extra = '';
  if (nombre === 'ciclos') {
    const meses = mesesDesdeCarta(datos.carta, hoy)
      .map((m, i) => `${i + 1}. ${NOMBRES_MES[m.mes - 1]} de ${m.anio}: Mes Personal ${m.numero} (${TEMA_CICLO[m.numero].replace('año', 'mes')})`)
      .join('\n');
    extra = `\n\nSUS PRÓXIMOS 12 MESES (escribe un texto para cada uno, en este orden):\n${meses}`;
  }
  if (nombre === 'pareja') {
    const r = quiz.resultados[String(parejaNumero)];
    extra = `\n\nLA OTRA PERSONA: Número de Vida ${parejaNumero}, ${r.titulo}. Claves: ${CLAVES[parejaNumero]}. ${r.teaser}\nPuede ser su pareja, un amor posible o alguien importante; no des por hecho el tipo de relación.`;
  }
  const encargo = {
    perfil: 'Escribe la parte "Tu perfil" de su informe.',
    areas: 'Escribe la parte "Tus áreas de vida" de su informe (amor, compatibilidades, dinero y vocación, familia).',
    espiritual: 'Escribe la parte "Tu lado espiritual" de su informe (señales, ritual personal, afirmaciones y carta final).',
    ciclos: 'Escribe la parte "Tus ciclos" de su informe (sus dos Años Personales, sus 12 meses y su mes clave).',
    plan: 'Escribe su plan personal de 4 semanas para trabajar su desafío principal y atraer lo que desea.',
    pareja: 'Escribe su compatibilidad numerológica con la otra persona.',
  }[nombre];
  return { sistema: sistema(quiz.marca ?? 'la marca'), usuario: `${contexto(datos, quiz, anio)}${extra}\n\n${encargo}` };
}

// Sustituye {{nombre}} en todos los textos de una sección.
function conNombre(valor, nombre) {
  if (typeof valor === 'string') return ponerNombre(valor, nombre, 'querida');
  if (Array.isArray(valor)) return valor.map((v) => conNombre(v, nombre));
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, conNombre(v, nombre)]));
  return valor;
}

// Genera las secciones indicadas en paralelo. Si alguna falla, falla todo (el navegador reintenta).
export async function generarSecciones(secciones, datos, quiz, opciones) {
  const { apiKey, modelos, nombre, marca, hoy = new Date(), parejaNumero, fetchImpl, tiempoTotalMs = 50000, tiempoPorModeloMs = 30000 } = opciones;
  const anio = hoy.getFullYear();
  const quizConMarca = { ...quiz, marca };
  const resultados = await Promise.all(secciones.map(async (seccion) => {
    const prompt = peticionSeccion(seccion, datos, quizConMarca, { anio, hoy, parejaNumero });
    const { datos: texto } = await generarJSON(prompt, {
      apiKey, modelos, fetchImpl, tiempoTotalMs, tiempoPorModeloMs,
      esquema: SECCIONES[seccion],
      normalizar: normalizarSeccion(seccion),
    });
    return [seccion, conNombre(texto, nombre)];
  }));
  return Object.fromEntries(resultados);
}

// Datos que se muestran junto al informe (calculados, no generados por la IA).
export function datosFijos(datos, quiz, hoy = new Date()) {
  const r = quiz.resultados[String(datos.carta.vida)];
  const alma = datos.carta.alma ? quiz.almas?.[String(datos.carta.alma)] : null;
  return {
    vida: datos.carta.vida,
    titulo: r.titulo,
    arquetipo: alma ? `${r.titulo} con alma de ${alma.nombre}` : r.titulo,
    maestro: Boolean(r.maestro),
    color: r.color,
    color_hex: r.color_hex,
    imagen: r.imagen,
    imagen_alt: r.imagen_alt,
    alma: alma ? { nombre: alma.nombre, imagen: alma.imagen, imagen_alt: alma.imagen_alt } : null,
    carta: datos.carta,
    mes_clave: datos.mesClave,
    deseo: datos.respuestas.deseo?.etiqueta ?? '',
    meses: mesesDesdeCarta(datos.carta, hoy).map((m) => ({ ...m, nombre: NOMBRES_MES[m.mes - 1] })),
  };
}

export const esNumeroPareja = (valor) => NUMEROS_VALIDOS.has(String(valor));
