// Tienda: guías digitales iguales para todas (no personalizadas). El índice de cada guía está escrito
// aquí; la IA redacta los capítulos UNA sola vez y el contenido se guarda (privado) en el almacén,
// así que todas las compradoras reciben el mismo PDF y la IA no vuelve a trabajar por cada venta.
import { generarJSON } from './_ia.js';
import { limpiarProfundo } from './_gemini.js';
import { leer, guardar } from './_almacen.js';

const VERSION = 'v1';
const T = (description) => ({ type: 'STRING', description });
const LISTA = (description, items = T('Elemento de la lista')) => ({ type: 'ARRAY', description, items });
const OBJ = (properties) => ({ type: 'OBJECT', properties, required: Object.keys(properties), propertyOrdering: Object.keys(properties) });

export const ARCANOS = ['El Loco', 'El Mago', 'La Sacerdotisa', 'La Emperatriz', 'El Emperador', 'El Hierofante', 'Los Enamorados', 'El Carro', 'La Fuerza', 'El Ermitaño', 'La Rueda de la Fortuna', 'La Justicia', 'El Colgado', 'La Muerte', 'La Templanza', 'El Diablo', 'La Torre', 'La Estrella', 'La Luna', 'El Sol', 'El Juicio', 'El Mundo'];
export const CRISTALES = ['Amatista', 'Cuarzo rosa', 'Cuarzo blanco', 'Citrino', 'Turmalina negra', 'Obsidiana', 'Ojo de tigre', 'Selenita', 'Labradorita', 'Aventurina verde', 'Lapislázuli', 'Piedra luna'];
const FASES = ['Luna nueva', 'Luna creciente', 'Cuarto creciente', 'Gibosa creciente', 'Luna llena', 'Gibosa menguante', 'Cuarto menguante', 'Luna balsámica (menguante)'];

// Índice de cada guía: [título, de qué trata]. `preguntas`: añade 3 preguntas para escribir.
export const GUIAS = {
  manifestacion: {
    tema: 'manifestación consciente: intención clara, acción y confianza',
    capitulos: [
      ['Qué es manifestar (y qué no)', 'Manifestar como intención + acción + paciencia. Desmonta la idea de la magia instantánea sin quitarle la ilusión.'],
      ['Tu intención clara: las tres preguntas', 'Qué deseo exactamente, para qué lo deseo y cómo me sentiré cuando llegue. Cómo escribir una intención en presente y en positivo.'],
      ['Las creencias que te frenan', 'Cómo detectar creencias limitantes frecuentes ("no me lo merezco", "ya es tarde") y suavizarlas con frases nuevas y pruebas pequeñas.'],
      ['Tu guion de 21 días', 'Semana 1 claridad, semana 2 acción, semana 3 confianza. Qué hacer cada semana en 10 minutos al día.'],
      ['Ritual de luna nueva para sembrar intenciones', 'Un ritual sencillo y seguro para la luna nueva: materiales, pasos y cómo cerrarlo.'],
      ['Gratitud y señales', 'Cómo llevar un registro de gratitud y reconocer avances y señales sin obsesionarse.'],
      ['Cuando algo no llega', 'Paciencia, ajuste de la intención y soltar el control. Cómo seguir sin frustrarte.'],
    ],
  },
  'tarot-guia': {
    tema: 'guía rápida de tarot para principiantes, con los 22 Arcanos Mayores',
    capitulos: [
      ['Cómo usar esta guía', 'Qué es el tarot como herramienta de reflexión, cómo barajar, cómo formular una buena pregunta y cómo leer cartas invertidas.'],
      ['Los cuatro palos de los Arcanos Menores', 'Bastos, Copas, Espadas y Oros: elemento, área de la vida y significado general de cada palo y de las figuras de la corte.'],
      ['Tres tiradas sencillas', 'La carta del día, pasado-presente-futuro y la tirada de la decisión (dos caminos). Cómo colocar y leer cada una.'],
    ],
    fichas: { tipo: 'arcanos', nombres: ARCANOS },
  },
  'diario-lunar': {
    tema: 'diario de magia lunar: vivir las 8 fases de la Luna con intención',
    preguntas: true,
    capitulos: [
      ['Cómo usar tu diario lunar', 'Cómo saber en qué fase estás, cuánto tiempo dedicar y cómo usar las páginas de diario del final.'],
      ...FASES.map((f) => [f, `Qué energía trae la fase "${f}", qué conviene hacer en ella y un pequeño ritual seguro para vivirla.`]),
    ],
    paginas: { titulo: 'Mi ciclo lunar', cantidad: 12, campos: ['Fecha de la luna nueva', 'Mi intención para este ciclo', 'En luna llena celebro', 'Lo que suelto en la luna menguante'] },
  },
  cristales: {
    tema: 'guía práctica de cristales para la vida diaria',
    capitulos: [
      ['Cómo elegir tu cristal', 'Elegir por intención, por color o por intuición. Qué mirar al comprar y cómo cuidarlos.'],
      ['Limpiar y cargar tus cristales', 'Métodos seguros: humo de hierbas, luz de luna, sonido y tierra. Advierte cuáles no deben mojarse ni ponerse al sol.'],
      ['Tus cristales en el día a día', 'En casa, en el trabajo, en la mesa de noche y como joya. Cómo programar una intención.'],
      ['Tres rituales sencillos con cristales', 'Un ritual para la calma, uno para el amor propio y uno para la abundancia, paso a paso.'],
    ],
    fichas: { tipo: 'cristales', nombres: CRISTALES },
  },
  'tarot-diario': {
    tema: 'el hábito de la carta del día con el tarot',
    preguntas: true,
    capitulos: [
      ['Por qué una carta al día', 'Beneficios de una práctica corta y constante como espejo para reflexionar.'],
      ['Tu ritual de 5 minutos', 'Preparar el espacio, respirar, formular la pregunta del día, sacar la carta y anotarla.'],
      ['Cómo interpretar sin memorizar', 'Mirar la imagen, los colores, los personajes y tu primera emoción. Relacionarla con tu día.'],
      ['Tiradas para el amor', 'Dos tiradas de tres cartas para relaciones y amor propio, con cómo leer cada posición.'],
      ['Tiradas para el trabajo y el dinero', 'Dos tiradas sencillas para decisiones laborales y hábitos con el dinero, sin predicciones.'],
      ['Tiradas para decisiones difíciles', 'La tirada de los dos caminos y la tirada de lo que necesito saber.'],
      ['Aprender de tus cartas', 'Cómo revisar tu registro cada mes y descubrir patrones.'],
    ],
    paginas: { titulo: 'Mi carta del día', cantidad: 8, campos: ['Fecha', 'Carta', 'Lo primero que sentí', 'Mensaje para hoy', 'Cómo resultó el día'] },
  },
  proteccion: {
    tema: 'rituales de protección y limpieza energética sencillos y seguros',
    capitulos: [
      ['Qué es protegerte (y qué no)', 'La protección como cuidado de tu energía, tu casa y tus límites. No sustituye pedir ayuda profesional cuando hace falta.'],
      ['Limpieza del hogar con sal y ventanas abiertas', 'Ritual paso a paso para limpiar la casa: orden, sal, agua, ventilación e intención.'],
      ['Sahumerio con hierbas, paso a paso y seguro', 'Hierbas comunes (romero, ruda, laurel), cómo hacerlo con seguridad y ventilación.'],
      ['Baño de limpieza energética', 'Un baño con hierbas y sal sencillo, con precauciones para la piel.'],
      ['Tu escudo de luz en 5 minutos', 'Visualización guiada para empezar el día protegida.'],
      ['Límites con amor', 'Frases y actitudes que protegen tu energía con familia, trabajo y amistades.'],
      ['Protección para tu familia', 'Gestos y bendiciones sencillas para los tuyos, respetando la fe de cada quien.'],
      ['Amuletos con intención', 'Cómo preparar un amuleto sencillo (una piedra, una cinta, una medalla) y cargarlo.'],
      ['Ritual de cierre de ciclo', 'Soltar lo que ya terminó: escribir, agradecer y cerrar.'],
    ],
  },
};

export const articuloTienda = (catalogo, id) => {
  if (id === 'pack') return catalogo.pack ? { ...catalogo.pack } : null;
  return catalogo.tienda?.find((p) => p.id === id) ?? null;
};
// Guías que incluye una compra: una sola o todas las del paquete.
export const guiasDeCompra = (catalogo, id) => (id === 'pack' ? catalogo.pack?.productos ?? [] : catalogo.tienda?.some((p) => p.id === id) ? [id] : []);

const sistema = (marca) => `Eres la voz de "${marca}", una marca de numerología, tarot y bienestar espiritual para mujeres hispanohablantes de 40 a 65 años.
Escribes una guía digital de pago: clara, cálida, práctica y bien organizada, como un buen libro de autoayuda espiritual.
REGLAS:
- Español neutro latinoamericano. Tutea ("tú"). Sin palabras de España ("vosotras", "coger", "móvil").
- Contenido de entretenimiento y autoconocimiento: nada de promesas, predicciones concretas, miedo ni consejos médicos, psicológicos, legales o financieros.
- Seguridad: velas siempre vigiladas y lejos de cortinas; hierbas y sal sin ingerir y probando antes en la piel; ventilación al usar humo.
- Respeta cualquier fe; no impongas doctrinas.
- Frases cortas y concretas, con ejemplos cotidianos. Evita fórmulas repetidas como "el universo te invita".
- Separa los párrafos con una línea en blanco.
- No uses emojis ni guiones largos (— ni –). No menciones que eres una IA.
- Respeta las longitudes indicadas.`;

const normalizarTextos = (minimos = {}) => (datos) => {
  const limpio = limpiarProfundo(datos, 4000);
  for (const [campo, valor] of Object.entries(limpio ?? {})) {
    if (Array.isArray(valor)) {
      if (valor.length < (minimos[campo] ?? 1)) throw new Error(`"${campo}" incompleto`);
    } else if (typeof valor === 'string' && valor.length < 20 && !['claves', 'color'].includes(campo)) {
      throw new Error(`"${campo}" demasiado corto`);
    }
  }
  return limpio;
};

const ESQUEMA_FICHA = {
  arcanos: OBJ({
    claves: T('3 o 4 palabras clave separadas por comas.'),
    derecho: T('Significado al derecho, 30-45 palabras.'),
    invertida: T('Significado invertida, 25-40 palabras.'),
    amor: T('En el amor, 20-30 palabras.'),
    consejo: T('Consejo de la carta, 15-25 palabras.'),
  }),
  cristales: OBJ({
    color: T('Color o colores habituales, máx. 6 palabras.'),
    para_que: T('Para qué se usa tradicionalmente, 30-45 palabras (sin propiedades curativas).'),
    como_usar: T('Cómo usarlo en el día a día y cómo limpiarlo, 25-40 palabras.'),
    afirmacion: T('Afirmación en primera persona, máx. 14 palabras.'),
  }),
};

// Escribe una guía completa (capítulos en paralelo). Tarda unos segundos; se hace una sola vez.
export async function escribirGuia(id, { marca, fetchImpl } = {}) {
  const guia = GUIAS[id];
  if (!guia) throw new Error(`Guía desconocida: ${id}`);
  const opciones = { fetchImpl, tiempoTotalMs: 80000, tiempoPorModeloMs: 60000 };
  const indice = guia.capitulos.map(([t], i) => `${i + 1}. ${t}`).join('\n');
  const base = `GUÍA: ${id} (${guia.tema}).\nÍNDICE COMPLETO:\n${indice}`;
  const capituloEsquema = OBJ({
    texto: T('Desarrollo del capítulo, 300-400 palabras en 3 o 4 párrafos separados por una línea en blanco.'),
    practica: T('Ejercicio o ritual práctico paso a paso para hacer hoy, 70-110 palabras.'),
    ...(guia.preguntas ? { preguntas: LISTA('Exactamente 3 preguntas para escribir en el diario.') } : {}),
  });
  const tareas = [
    generarJSON({ sistema: sistema(marca), usuario: `${base}\n\nEscribe la introducción y el cierre de la guía.` }, {
      ...opciones,
      esquema: OBJ({ introduccion: T('Bienvenida y cómo aprovechar la guía, 150-200 palabras en 2 párrafos.'), cierre: T('Despedida cálida y motivadora, 90-130 palabras.') }),
      normalizar: normalizarTextos(),
    }),
    ...guia.capitulos.map(([titulo, detalle], i) => generarJSON({
      sistema: sistema(marca),
      usuario: `${base}\n\nEscribe el capítulo ${i + 1}: "${titulo}". De qué trata: ${detalle}\nNo repitas lo que corresponde a otros capítulos del índice.`,
    }, { ...opciones, esquema: capituloEsquema, normalizar: normalizarTextos({ preguntas: guia.preguntas ? 3 : 0 }) })),
  ];
  // Fichas (arcanos o cristales) en grupos, para que cada respuesta sea corta y rápida.
  const grupos = [];
  if (guia.fichas) {
    for (let i = 0; i < guia.fichas.nombres.length; i += 8) grupos.push(guia.fichas.nombres.slice(i, i + 8));
    for (const nombres of grupos) {
      tareas.push(generarJSON({
        sistema: sistema(marca),
        usuario: `${base}\n\nEscribe una ficha para cada uno de estos ${guia.fichas.tipo === 'arcanos' ? 'Arcanos Mayores' : 'cristales'}, en este mismo orden:\n${nombres.map((n, j) => `${j + 1}. ${n}`).join('\n')}`,
      }, {
        ...opciones,
        esquema: OBJ({ fichas: LISTA(`Exactamente ${nombres.length} fichas, en el orden indicado.`, ESQUEMA_FICHA[guia.fichas.tipo]) }),
        normalizar: normalizarTextos({ fichas: nombres.length }),
      }));
    }
  }
  const [marco, ...resto] = await Promise.all(tareas);
  const capitulos = resto.slice(0, guia.capitulos.length).map(({ datos }, i) => ({ titulo: guia.capitulos[i][0], ...datos }));
  const fichas = resto.slice(guia.capitulos.length).flatMap(({ datos }, g) =>
    datos.fichas.slice(0, grupos[g].length).map((f, j) => ({ nombre: grupos[g][j], ...f })));
  return {
    id, version: VERSION,
    introduccion: marco.datos.introduccion,
    capitulos,
    fichas: guia.fichas ? { tipo: guia.fichas.tipo, lista: fichas } : null,
    paginas: guia.paginas ?? null,
    cierre: marco.datos.cierre,
    creado: new Date().toISOString(),
  };
}

const rutaGuia = (id) => `tienda/${id}-${VERSION}.json`;

// Devuelve el contenido guardado; si aún no existe, lo escribe y lo guarda (una sola vez).
export async function contenidoGuia(id, opciones = {}) {
  const guardado = await leer(rutaGuia(id));
  if (guardado?.capitulos?.length) return guardado;
  const contenido = await escribirGuia(id, opciones);
  await guardar(rutaGuia(id), contenido);
  return contenido;
}
