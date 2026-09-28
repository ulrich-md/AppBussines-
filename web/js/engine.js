// Motor de cuestionarios: lógica pura, sin DOM. Se usa en el navegador y en las pruebas (Node).

const MAESTROS = new Set([11, 22, 33]);

export function sumaDigitos(n) {
  return String(n)
    .split('')
    .reduce((total, d) => total + Number(d), 0);
}

// Reduce un número a un dígito (1–9), deteniéndose en 11, 22 o 33.
export function reducir(n) {
  let actual = n;
  while (actual > 9 && !MAESTROS.has(actual)) {
    actual = sumaDigitos(actual);
  }
  return actual;
}

export function esFechaValida({ dia, mes, anio }) {
  if (![dia, mes, anio].every(Number.isInteger)) return false;
  if (mes < 1 || mes > 12 || dia < 1 || anio < 1900 || anio > 2100) return false;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

// Número de Vida: suma de todos los dígitos de la fecha completa, reducida y conservando 11, 22 y 33.
// Ejemplo: 14/03/1985 → 1+4+0+3+1+9+8+5 = 31 → 4.
export function numeroDeVida(fecha) {
  if (!esFechaValida(fecha)) throw new Error('Fecha no válida');
  const digitos = `${fecha.dia}${fecha.mes}${fecha.anio}`;
  return reducir(sumaDigitos(digitos));
}

// Año Personal: día + mes + año indicado, reducido a 1–9 (sin números maestros).
export function anioPersonal(fecha, anio) {
  if (!esFechaValida(fecha)) throw new Error('Fecha no válida');
  let n = sumaDigitos(`${fecha.dia}${fecha.mes}${anio}`);
  while (n > 9) n = sumaDigitos(n);
  return n;
}

const FORMULAS = {
  numero_de_vida: (respuestas, calculo) => numeroDeVida(respuestas[calculo.campo]),
  anio_personal: (respuestas, calculo) => anioPersonal(respuestas[calculo.campo], calculo.anio),
};

// Puntuación por respuestas: cada opción suma puntos a uno o varios resultados.
// Gana el de más puntos; en caso de empate, el que aparece antes en `calculo.desempate`
// (o en el orden de `quiz.resultados`).
export function puntuar(quiz, respuestas) {
  const orden = quiz.calculo.desempate ?? Object.keys(quiz.resultados);
  const puntos = Object.fromEntries(orden.map((id) => [id, 0]));
  for (const pregunta of quiz.preguntas) {
    if (pregunta.tipo !== 'opciones') continue;
    const opcion = pregunta.opciones.find((o) => o.id === respuestas[pregunta.id]);
    for (const [resultado, valor] of Object.entries(opcion?.puntos ?? {})) {
      puntos[resultado] = (puntos[resultado] ?? 0) + valor;
    }
  }
  return orden.reduce((mejor, id) => (puntos[id] > puntos[mejor] ? id : mejor), orden[0]);
}

export function calcularResultado(quiz, respuestas) {
  const { calculo } = quiz;
  if (calculo.tipo === 'formula') {
    const formula = FORMULAS[calculo.formula];
    if (!formula) throw new Error(`Fórmula desconocida: ${calculo.formula}`);
    return String(formula(respuestas, calculo));
  }
  if (calculo.tipo === 'puntuacion') return puntuar(quiz, respuestas);
  throw new Error(`Tipo de cálculo desconocido: ${calculo.tipo}`);
}

// Arma los bloques de texto del resultado gratis a partir de la configuración del cuestionario.
export function componerResultado(quiz, respuestas) {
  const id = calcularResultado(quiz, respuestas);
  const resultado = quiz.resultados[id];
  if (!resultado) throw new Error(`Resultado sin configurar: ${id}`);

  const bloques = [];
  for (const pieza of quiz.plantilla_resultado ?? []) {
    if (pieza.tipo === 'resultado') {
      const texto = resultado[pieza.campo];
      if (texto) bloques.push({ titulo: pieza.titulo, texto });
    } else if (pieza.tipo === 'resultado_por_respuesta') {
      const clave = respuestas[pieza.pregunta];
      const texto = resultado[pieza.campo]?.[clave];
      const etiqueta = opcionTexto(quiz, pieza.pregunta, clave);
      if (texto) bloques.push({ titulo: interpolar(pieza.titulo, { opcion: etiqueta }), texto });
    } else if (pieza.tipo === 'por_respuesta') {
      const texto = quiz.textos_por_respuesta?.[pieza.pregunta]?.[respuestas[pieza.pregunta]];
      if (texto) bloques.push({ titulo: pieza.titulo, texto });
    }
  }
  return { id, resultado, bloques };
}

export function opcionTexto(quiz, preguntaId, opcionId) {
  const pregunta = quiz.preguntas.find((p) => p.id === preguntaId);
  const opcion = pregunta?.opciones?.find((o) => o.id === opcionId);
  return opcion?.etiqueta ?? opcion?.texto ?? '';
}

export function interpolar(plantilla = '', valores = {}) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => valores[clave] ?? '');
}

// Nombre para mostrar: recortado, sin caracteres raros, con la primera letra en mayúscula.
export function limpiarNombre(nombre = '') {
  const limpio = nombre
    .replace(/[^\p{L}\p{M}' -]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);
  return limpio ? limpio.charAt(0).toLocaleUpperCase('es') + limpio.slice(1) : '';
}

// Comprueba que la configuración de un cuestionario está completa. Devuelve una lista de errores.
export function validarQuiz(quiz) {
  const errores = [];
  const requeridos = ['id', 'titulo', 'calculo', 'preguntas', 'resultados', 'precio'];
  for (const campo of requeridos) if (!quiz[campo]) errores.push(`Falta "${campo}"`);
  if (errores.length) return errores;

  const ids = new Set();
  for (const p of quiz.preguntas) {
    if (ids.has(p.id)) errores.push(`Pregunta repetida: ${p.id}`);
    ids.add(p.id);
    if (p.tipo === 'opciones' && !(p.opciones?.length >= 2)) errores.push(`La pregunta ${p.id} necesita opciones`);
    if (quiz.calculo.tipo === 'puntuacion' && p.tipo === 'opciones' && !p.sin_puntos) {
      for (const o of p.opciones) {
        for (const r of Object.keys(o.puntos ?? {})) {
          if (!quiz.resultados[r]) errores.push(`La opción ${p.id}/${o.id} puntúa un resultado inexistente: ${r}`);
        }
      }
    }
  }

  for (const pieza of quiz.plantilla_resultado ?? []) {
    if (pieza.tipo === 'resultado_por_respuesta') {
      const pregunta = quiz.preguntas.find((p) => p.id === pieza.pregunta);
      for (const [id, r] of Object.entries(quiz.resultados)) {
        for (const o of pregunta?.opciones ?? []) {
          if (!r[pieza.campo]?.[o.id]) errores.push(`Resultado ${id}: falta ${pieza.campo}.${o.id}`);
        }
      }
    }
    if (pieza.tipo === 'por_respuesta') {
      const pregunta = quiz.preguntas.find((p) => p.id === pieza.pregunta);
      for (const o of pregunta?.opciones ?? []) {
        if (!quiz.textos_por_respuesta?.[pieza.pregunta]?.[o.id]) {
          errores.push(`Falta textos_por_respuesta.${pieza.pregunta}.${o.id}`);
        }
      }
    }
  }

  for (const [id, r] of Object.entries(quiz.resultados)) {
    for (const campo of ['titulo', 'teaser', 'compartir']) {
      if (!r[campo]) errores.push(`Resultado ${id}: falta "${campo}"`);
    }
  }
  return errores;
}

// Sustituye el marcador {{nombre}} que escribe la IA. Sin nombre, adapta la frase para que siga
// sonando natural ("querida {{nombre}}" → "querida", "{{nombre}}, eres…" → "Eres…").
export function ponerNombre(texto = '', nombre = '', porDefecto = 'querida') {
  if (nombre) return texto.replaceAll('{{nombre}}', nombre);
  return texto
    .replace(/(querida|querido|mi querida)\s+\{\{nombre\}\}/gi, '$1')
    .replace(/(^|[.!?¡¿]\s*)\{\{nombre\}\},?\s*(\p{L})/gu, (_, inicio, letra) => inicio + letra.toLocaleUpperCase('es'))
    .replace(/,\s*\{\{nombre\}\}/g, '')
    .replaceAll('{{nombre}}', porDefecto);
}

// Rango de edad aproximado a partir de la fecha (es lo único de la fecha que sale del teléfono).
export function rangoEdad({ dia, mes, anio }, hoy = new Date()) {
  let edad = hoy.getFullYear() - anio;
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) edad -= 1;
  if (edad < 30) return '18-29';
  if (edad < 40) return '30-39';
  if (edad < 50) return '40-49';
  if (edad < 60) return '50-59';
  return '60+';
}
