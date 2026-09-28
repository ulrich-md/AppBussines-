// Interfaz del cuestionario: una pregunta por pantalla, resultado gratis y botón de compra.
// Toda la lógica de cálculo vive en engine.js; los textos, en quizzes/<id>.json y site.json.
import {
  anioPersonal, calcularResultado, componerResultado, esFechaValida, interpolar, limpiarNombre, opcionTexto, ponerNombre, rangoEdad,
} from './engine.js';
import { iniciarAnalitica, registrar } from './analytics.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const origen = (params.get('ref') || params.get('utm_source') || 'directo').slice(0, 40);

let sitio;
let quiz;
let paso = 0;
const respuestas = {};

// Crea elementos sin usar innerHTML, para que ningún texto se interprete como HTML.
function el(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave.startsWith('on')) nodo.addEventListener(clave.slice(2), valor);
    else if (clave === 'class') nodo.className = valor;
    else if (clave === 'style') Object.assign(nodo.style, valor);
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  }
  for (const hijo of hijos.flat()) {
    if (hijo === undefined || hijo === null || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
}

function mostrar(...nodos) {
  app.replaceChildren(...nodos.flat().filter(Boolean));
  window.scrollTo({ top: 0 });
  const titulo = app.querySelector('h1, h2');
  if (titulo) {
    titulo.setAttribute('tabindex', '-1');
    titulo.focus({ preventScroll: true });
  }
}

function aplicarMarca() {
  const raiz = document.documentElement.style;
  for (const [clave, valor] of Object.entries(sitio.colores ?? {})) {
    raiz.setProperty(`--${clave.replace(/_/g, '-')}`, valor);
  }
  document.querySelectorAll('[data-marca]').forEach((n) => (n.textContent = sitio.marca));
  if (quiz.aviso) document.querySelectorAll('[data-aviso]').forEach((n) => (n.textContent = quiz.aviso));
}

// ---------- Pantallas ----------

function pantallaInicio() {
  mostrar(
    el('section', { class: 'inicio' },
      el('div', { class: 'simbolo', 'aria-hidden': 'true' }, '✦'),
      el('h1', {}, quiz.titulo),
      el('p', { class: 'subtitulo' }, quiz.subtitulo),
      el('ul', { class: 'detalles' }, (quiz.detalles ?? []).map((d) => el('li', {}, d))),
      el('button', {
        class: 'boton', type: 'button',
        onclick: () => { registrar('quiz_inicio', { quiz: quiz.id, origen }); irAPaso(0); },
      }, quiz.boton_empezar ?? 'Empezar'),
    ),
  );
}

function progreso() {
  const total = quiz.preguntas.length;
  return el('div', { class: 'progreso' },
    el('div', { class: 'progreso-fila' },
      el('button', { class: 'atras', type: 'button', onclick: () => (paso === 0 ? pantallaInicio() : irAPaso(paso - 1)) }, '← Atrás'),
      el('span', {}, `Pregunta ${paso + 1} de ${total}`),
    ),
    el('div', { class: 'barra', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': paso + 1 },
      el('span', { style: { width: `${((paso + 1) / total) * 100}%` } }),
    ),
  );
}

function irAPaso(indice) {
  paso = indice;
  const pregunta = quiz.preguntas[paso];
  registrar('quiz_paso', { quiz: quiz.id, paso: pregunta.id });
  const vistas = { fecha: preguntaFecha, opciones: preguntaOpciones, texto: preguntaTexto };
  mostrar(progreso(), vistas[pregunta.tipo](pregunta));
}

function siguiente() {
  if (paso + 1 < quiz.preguntas.length) irAPaso(paso + 1);
  else pantallaCalculando();
}

// Si la persona dio su nombre, algunas preguntas se lo dicen ("María, ¿…?").
function textoPregunta(pregunta) {
  return respuestas.nombre && pregunta.texto_con_nombre
    ? interpolar(pregunta.texto_con_nombre, { nombre: respuestas.nombre })
    : pregunta.texto;
}

function preguntaOpciones(pregunta) {
  return el('section', { class: 'pregunta' },
    el('h2', {}, textoPregunta(pregunta)),
    pregunta.ayuda && el('p', { class: 'ayuda' }, pregunta.ayuda),
    el('div', { class: 'opciones' },
      pregunta.opciones.map((opcion) =>
        el('button', {
          class: 'opcion', type: 'button',
          'aria-pressed': respuestas[pregunta.id] === opcion.id ? 'true' : 'false',
          onclick: (evento) => {
            respuestas[pregunta.id] = opcion.id;
            evento.currentTarget.setAttribute('aria-pressed', 'true');
            setTimeout(siguiente, 180);
          },
        },
        opcion.emoji && el('span', { class: 'emoji', 'aria-hidden': 'true' }, opcion.emoji),
        el('span', {}, opcion.texto)),
      ),
    ),
  );
}

function preguntaFecha(pregunta) {
  const previa = respuestas[pregunta.id] ?? {};
  const anioActual = new Date().getFullYear();
  const selector = (id, etiqueta, opciones, valor) =>
    el('div', { class: 'campo' },
      el('label', { for: id }, etiqueta),
      el('select', { id, name: id, required: true },
        el('option', { value: '' }, etiqueta),
        opciones.map(([v, texto]) => el('option', { value: v, selected: Number(v) === valor }, texto)),
      ),
    );

  const error = el('p', { class: 'error', role: 'alert' });
  const formulario = el('form', {
    class: 'formulario', novalidate: true,
    onsubmit: (evento) => {
      evento.preventDefault();
      const datos = new FormData(formulario);
      const fecha = { dia: Number(datos.get('dia')), mes: Number(datos.get('mes')), anio: Number(datos.get('anio')) };
      if (!datos.get('dia') || !datos.get('mes') || !datos.get('anio')) {
        error.textContent = 'Elige tu día, mes y año de nacimiento.';
        return;
      }
      if (!esFechaValida(fecha)) {
        error.textContent = 'Esa fecha no existe. Revisa el día y el mes.';
        return;
      }
      respuestas[pregunta.id] = fecha;
      siguiente();
    },
  },
  el('div', { class: 'campos-fecha' },
    selector('dia', 'Día', Array.from({ length: 31 }, (_, i) => [i + 1, i + 1]), previa.dia),
    selector('mes', 'Mes', MESES.map((m, i) => [i + 1, m]), previa.mes),
    selector('anio', 'Año', Array.from({ length: anioActual - 1919 }, (_, i) => [anioActual - i, anioActual - i]), previa.anio),
  ),
  error,
  el('button', { class: 'boton', type: 'submit' }, 'Continuar'));

  return el('section', { class: 'pregunta' },
    el('h2', {}, pregunta.texto),
    pregunta.ayuda && el('p', { class: 'ayuda' }, pregunta.ayuda),
    formulario,
  );
}

function preguntaTexto(pregunta) {
  const campo = el('input', {
    type: 'text', id: pregunta.id, name: pregunta.id, maxlength: 30,
    autocomplete: 'given-name', autocapitalize: 'words', placeholder: pregunta.placeholder ?? '',
    value: respuestas[pregunta.id] ?? '',
  });
  const formulario = el('form', {
    class: 'formulario',
    onsubmit: (evento) => {
      evento.preventDefault();
      respuestas[pregunta.id] = limpiarNombre(campo.value);
      siguiente();
    },
  },
  el('label', { for: pregunta.id, class: 'ayuda' }, pregunta.ayuda ?? ''),
  campo,
  el('button', { class: 'boton', type: 'submit' }, pregunta.boton ?? 'Continuar'));

  return el('section', { class: 'pregunta' },
    el('h2', {}, pregunta.texto),
    formulario,
    pregunta.opcional && el('div', { class: 'centrado' },
      el('button', {
        class: 'enlace', type: 'button',
        onclick: () => { respuestas[pregunta.id] = ''; siguiente(); },
      }, pregunta.texto_omitir ?? 'Saltar'),
    ),
  );
}

function pantallaCalculando() {
  const mensajes = quiz.ia?.mensajes_espera ?? [quiz.texto_calculando ?? 'Calculando…'];
  const titulo = el('h2', {}, mensajes[0]);
  const nota = el('p', { class: 'ayuda' }, quiz.ia ? 'Estamos escribiendo una lectura solo para ti. Puede tardar unos segundos.' : '');
  mostrar(el('section', { class: 'calculando' }, el('div', { class: 'orbe', 'aria-hidden': 'true' }), titulo, nota));

  let indice = 0;
  const rotar = setInterval(() => {
    indice = Math.min(indice + 1, mensajes.length - 1);
    titulo.textContent = mensajes[indice];
  }, 3500);
  const terminar = (lectura) => {
    clearInterval(rotar);
    pantallaResultado(lectura);
  };

  if (!quiz.ia) {
    setTimeout(() => terminar(null), 1600);
    return;
  }
  const inicio = Date.now();
  pedirLectura()
    .then((lectura) => {
      registrar('lectura_ia', { quiz: quiz.id, estado: 'ok', segundos: Math.round((Date.now() - inicio) / 1000) });
      terminar(lectura);
    })
    .catch((error) => {
      // Si la IA falla, se muestra el resultado escrito de antemano: nadie se queda sin lectura.
      console.warn('Lectura con IA no disponible:', error.message);
      registrar('lectura_ia', { quiz: quiz.id, estado: 'fallo' });
      terminar(null);
    });
}

// Al servidor solo se envían el número, la edad aproximada y las respuestas de opción múltiple.
// El nombre y la fecha de nacimiento no salen del teléfono.
async function pedirLectura() {
  const numero = calcularResultado(quiz, respuestas);
  const cuerpo = {
    numero,
    anio_personal: anioPersonal(respuestas.fecha, new Date().getFullYear()),
    edad: rangoEdad(respuestas.fecha),
    respuestas: Object.fromEntries(
      quiz.preguntas.filter((p) => p.tipo === 'opciones').map((p) => [p.id, respuestas[p.id]]),
    ),
  };
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), quiz.ia.tiempo_maximo_ms ?? 30000);
  try {
    const respuesta = await fetch(quiz.ia.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: controlador.signal,
    });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const { lectura } = await respuesta.json();
    if (!lectura?.esencia) throw new Error('Respuesta sin lectura');
    return lectura;
  } finally {
    clearTimeout(limite);
  }
}

// Bloques del resultado: los de la IA si hay lectura, o los textos escritos de antemano si no.
function bloquesDeLectura(lectura) {
  const nombre = respuestas.nombre;
  const porDefecto = quiz.ia.nombre_por_defecto;
  const opcion = opcionTexto(quiz, 'area', respuestas.area);
  return quiz.ia.bloques
    .filter((b) => lectura[b.campo])
    .map((b) => ({ titulo: interpolar(b.titulo, { opcion }), texto: ponerNombre(lectura[b.campo], nombre, porDefecto) }));
}

function pantallaResultado(lectura = null) {
  const compuesto = componerResultado(quiz, respuestas);
  const { id, resultado } = compuesto;
  const bloques = lectura ? bloquesDeLectura(lectura) : compuesto.bloques;
  const nombre = respuestas.nombre;
  registrar('quiz_completado', { quiz: quiz.id, resultado: id, origen, ia: Boolean(lectura) });
  document.documentElement.style.setProperty('--color-resultado', resultado.color_hex ?? 'var(--primario)');

  const urlCompartir = new URL(`r/${quiz.id}/${id}.html`, location.href).href;
  const textoCompartir = `${resultado.compartir} ${urlCompartir}`;

  mostrar(
    el('section', { class: 'resultado-cabecera' },
      el('p', { class: 'saludo' }, nombre ? `${nombre}, ${quiz.encabezado_resultado}` : quiz.encabezado_resultado_sin_nombre),
      el('div', { class: 'numero', 'aria-hidden': 'true' }, id),
      resultado.maestro && el('span', { class: 'sello' }, 'Número maestro'),
      el('h1', {}, el('span', { class: 'visualmente-oculto' }, `${id}: `), resultado.titulo),
      resultado.color && el('p', { class: 'color-poder' }, el('i', { 'aria-hidden': 'true' }), `Tu color de poder: ${resultado.color}`),
      lectura?.titular && el('p', { class: 'titular' }, `«${ponerNombre(lectura.titular, nombre, '')}»`),
    ),
    bloques.map((b) => el('article', { class: 'tarjeta' }, el('h3', {}, b.titulo), el('p', {}, b.texto))),
    lectura?.frase && el('aside', { class: 'afirmacion' },
      el('p', { class: 'afirmacion-etiqueta' }, 'Tu frase para repetir'),
      el('p', { class: 'afirmacion-texto' }, ponerNombre(lectura.frase, nombre, '')),
    ),
    lectura && quiz.ia.nota && el('p', { class: 'nota-ia' }, quiz.ia.nota),
    bloqueInforme(id, resultado),
    el('section', { class: 'compartir' },
      el('h3', {}, '¿Quién de tus amigas querría saber su número?'),
      el('a', {
        class: 'boton boton-whatsapp',
        href: `https://wa.me/?text=${encodeURIComponent(textoCompartir)}`,
        target: '_blank', rel: 'noopener',
        onclick: () => registrar('compartir', { quiz: quiz.id, resultado: id, canal: 'whatsapp' }),
      }, 'Compartir por WhatsApp'),
      botonCompartirOtro(id, resultado, urlCompartir),
      el('button', { class: 'enlace', type: 'button', onclick: reiniciar }, 'Hacer el cuestionario otra vez'),
    ),
  );
}

function bloqueInforme(id, resultado) {
  const { informe, precio } = quiz;
  const disponible = Boolean(resultado.comprar_url);
  const boton = disponible
    ? el('a', {
      class: 'boton', href: resultado.comprar_url,
      onclick: (evento) => {
        evento.preventDefault();
        registrar('comprar_clic', { quiz: quiz.id, resultado: id, origen });
        // Pequeña espera para que el evento de analítica salga antes de cambiar de página.
        setTimeout(() => { location.href = resultado.comprar_url; }, 200);
      },
    }, informe.boton)
    : el('span', { class: 'boton', 'aria-disabled': 'true' }, informe.boton_no_disponible);

  return el('section', { class: 'informe', 'aria-labelledby': 'titulo-informe' },
    el('h3', { id: 'titulo-informe' }, interpolar(informe.titulo, { id, titulo: resultado.titulo })),
    el('ul', {}, informe.incluye.map((item) => el('li', {}, item))),
    el('p', { class: 'borroso', 'aria-hidden': 'true' },
      'Tu número guarda una lección que se repite en tu vida una y otra vez, y cuando la reconoces todo empieza a fluir con más facilidad…'),
    el('p', { class: 'precio' }, precio.texto),
    boton,
    el('p', { class: 'formato' }, informe.formato),
  );
}

function botonCompartirOtro(id, resultado, url) {
  const texto = resultado.compartir;
  if (navigator.share) {
    return el('button', {
      class: 'boton boton-secundario', type: 'button',
      onclick: async () => {
        registrar('compartir', { quiz: quiz.id, resultado: id, canal: 'nativo' });
        try { await navigator.share({ text: texto, url }); } catch { /* la persona canceló */ }
      },
    }, 'Compartir en otra app');
  }
  const boton = el('button', {
    class: 'boton boton-secundario', type: 'button',
    onclick: async () => {
      registrar('compartir', { quiz: quiz.id, resultado: id, canal: 'copiar' });
      try {
        await navigator.clipboard.writeText(`${texto} ${url}`);
        boton.textContent = '¡Enlace copiado!';
      } catch {
        boton.textContent = url;
      }
    },
  }, 'Copiar enlace');
  return boton;
}

function reiniciar() {
  for (const clave of Object.keys(respuestas)) delete respuestas[clave];
  document.documentElement.style.removeProperty('--color-resultado');
  pantallaInicio();
}

// ---------- Arranque ----------

async function cargarJSON(ruta) {
  const respuesta = await fetch(ruta, { cache: 'no-cache' });
  if (!respuesta.ok) throw new Error(`No se pudo cargar ${ruta}`);
  return respuesta.json();
}

async function iniciar() {
  try {
    sitio = await cargarJSON('site.json');
    const pedido = params.get('q');
    const id = pedido && /^[a-z0-9-]{1,60}$/.test(pedido) ? pedido : sitio.quiz_principal;
    quiz = await cargarJSON(`quizzes/${id}.json`);
    aplicarMarca();
    iniciarAnalitica(sitio.analitica);
    pantallaInicio();
  } catch (error) {
    console.error(error);
    mostrar(el('section', { class: 'inicio' },
      el('h2', {}, 'Algo salió mal'),
      el('p', {}, 'No pudimos cargar el cuestionario. Revisa tu conexión y vuelve a intentarlo.'),
      el('button', { class: 'boton', type: 'button', onclick: () => location.reload() }, 'Reintentar'),
    ));
  }
}

iniciar();
