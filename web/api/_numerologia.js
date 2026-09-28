// Significados base de la numerología pitagórica que se le dan a la IA como referencia,
// para que la lectura y el informe sean coherentes entre sí y con la tradición.

export const NUMEROS_VALIDOS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22', '33']);

export const CLAVES = {
  1: 'iniciativa, independencia, comienzos, liderazgo',
  2: 'unión, sensibilidad, paciencia, alianzas',
  3: 'expresión, alegría, creatividad, vida social',
  4: 'orden, trabajo constante, bases sólidas, estabilidad',
  5: 'cambio, libertad, movimiento, aventura',
  6: 'amor, hogar, familia, responsabilidad afectiva',
  7: 'introspección, espiritualidad, estudio, silencio',
  8: 'abundancia, logros, poder personal, reconocimiento',
  9: 'cierres, compasión, soltar, sanar',
  11: 'intuición elevada, inspiración, sensibilidad espiritual',
  22: 'grandes proyectos, legado, visión práctica',
  33: 'amor incondicional, guía, enseñanza desde el corazón',
};

// Tema de cada Año Personal (y de cada Mes Personal, a menor escala).
export const TEMA_CICLO = {
  1: 'año de comienzos: sembrar, decidir, empezar algo propio',
  2: 'año de paciencia y vínculos: alianzas, pareja, esperar la cosecha',
  3: 'año de expresión: alegría, creatividad, vida social',
  4: 'año de construir: trabajo, orden, bases firmes',
  5: 'año de cambios: movimiento, libertad, oportunidades nuevas',
  6: 'año del hogar y el amor: familia, compromisos, cuidar y cuidarse',
  7: 'año de mirar hacia dentro: descanso, estudio, espiritualidad',
  8: 'año de cosecha material: logros, dinero, reconocimiento',
  9: 'año de cierres: soltar, perdonar, preparar un ciclo nuevo',
};

const esNumero = (v) => v === null || v === undefined || NUMEROS_VALIDOS.has(String(v));
const esCiclo = (v) => Number.isInteger(v) && v >= 1 && v <= 9;

// Valida la carta que envía el navegador (todos los campos se calculan en el teléfono).
export function validarCarta(carta) {
  if (!carta || typeof carta !== 'object') return 'Falta la carta numerológica';
  if (!NUMEROS_VALIDOS.has(String(carta.vida))) return 'Número de Vida no válido';
  for (const campo of ['cumpleanos', 'expresion', 'alma', 'personalidad']) {
    if (!esNumero(carta[campo])) return `Número "${campo}" no válido`;
  }
  if (carta.cumpleanos === null || carta.cumpleanos === undefined) return 'Falta el número de cumpleaños';
  for (const campo of ['anio_personal', 'anio_personal_siguiente', 'mes_personal']) {
    if (!esCiclo(carta[campo])) return `Ciclo "${campo}" no válido`;
  }
  return null;
}

export function validarMesClave(mesClave) {
  if (mesClave === null || mesClave === undefined) return null;
  const { mes, anio, numero } = mesClave;
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return 'Mes clave no válido';
  if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) return 'Año del mes clave no válido';
  if (!esCiclo(numero)) return 'Número del mes clave no válido';
  return null;
}

export const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Texto de la carta para el prompt (lo comparten la lectura gratis y el informe de pago).
export function describirCarta(carta, quiz, anio) {
  const r = quiz.resultados[String(carta.vida)];
  const alma = carta.alma ? quiz.almas?.[String(carta.alma)] : null;
  const lineas = [
    `Número de Vida: ${carta.vida}${r.maestro ? ' (número maestro)' : ''}, ${r.titulo}. Claves: ${CLAVES[carta.vida]}.`,
    `Descripción base del Número de Vida: ${r.teaser}`,
    `Amor: ${r.areas.amor}`,
    `Dinero y trabajo: ${r.areas.dinero}`,
    `Paz interior: ${r.areas.paz}`,
    `Familia: ${r.areas.familia}`,
    `Color de poder: ${r.color}.`,
    alma
      ? `Número del Alma (deseo profundo, vocales del nombre): ${carta.alma}, alma de ${alma.nombre}. ${alma.texto}`
      : 'Número del Alma: no disponible (no dio su nombre completo).',
    carta.expresion ? `Número de Expresión (talentos, nombre completo): ${carta.expresion}. Claves: ${CLAVES[carta.expresion]}.` : null,
    carta.personalidad ? `Número de Personalidad (cómo la ven, consonantes): ${carta.personalidad}. Claves: ${CLAVES[carta.personalidad]}.` : null,
    `Número de Cumpleaños (un don especial): ${carta.cumpleanos}. Claves: ${CLAVES[carta.cumpleanos]}.`,
    `Año Personal ${anio}: ${carta.anio_personal}, ${TEMA_CICLO[carta.anio_personal]}.`,
    `Año Personal ${anio + 1}: ${carta.anio_personal_siguiente}, ${TEMA_CICLO[carta.anio_personal_siguiente]}.`,
    `Mes Personal actual: ${carta.mes_personal}, ${TEMA_CICLO[carta.mes_personal].replace('año', 'mes')}.`,
  ];
  return lineas.filter(Boolean).join('\n');
}

// Próximos 12 meses con su número personal, calculados solo con los Años Personales de la carta
// (el servidor no recibe la fecha de nacimiento).
export function mesesDesdeCarta(carta, hoy = new Date()) {
  const anioActual = hoy.getFullYear();
  const meses = [];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(anioActual, hoy.getMonth() + i, 1);
    const anio = d.getFullYear();
    const mes = d.getMonth() + 1;
    const anioPersonal = anio === anioActual ? carta.anio_personal : carta.anio_personal_siguiente;
    let numero = anioPersonal + mes;
    while (numero > 9) numero = String(numero).split('').reduce((t, x) => t + Number(x), 0);
    meses.push({ anio, mes, numero });
  }
  return meses;
}
