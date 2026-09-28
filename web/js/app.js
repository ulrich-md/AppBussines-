// Interfaz del cuestionario: una pregunta por pantalla, lectura personalizada y botón de compra.
// Toda la lógica de cálculo vive en engine.js; los textos, en quizzes/<id>.json y site.json.
import {
  anioPersonal, calcularResultado, componerResultado, esFechaValida, interpolar, limpiarNombre, opcionTexto, ponerNombre, rangoEdad,
} from './engine.js';
import { iniciarAnalitica, registrar } from './analytics.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SPRITE = 'img/iconos.svg';
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

// Icono de Phosphor (sprite generado por scripts/build.mjs). Siempre decorativo: el texto va al lado.
function icono(nombre) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icono');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `${SPRITE}#${nombre}`);
  svg.append(uso);
  return svg;
}

function mostrar(...nodos) {
  app.classList.remove('ancho');
  app.replaceChildren(...nodos.flat().filter(Boolean));
  window.scrollTo({ top: 0 });
  const titulo = app.querySelector('h1, h2');
  if (titulo) {
    titulo.setAttribute('tabindex', '-1');
    titulo.focus({ preventScroll: true });
  }
}

function aplicarMarca() {
  document.querySelectorAll('[data-marca]').forEach((n) => (n.textContent = sitio.marca));
  if (quiz.aviso) document.querySelectorAll('[data-aviso]').forEach((n) => (n.textContent = quiz.aviso));
}

// ---------- Pantallas ----------

function pantallaInicio() {
  mostrar(
    el('section', { class: 'inicio pantalla' },
      el('img', {
        class: 'inicio-imagen',
        src: 'img/portada-896.webp',
        srcset: 'img/portada-640.webp 640w, img/portada-896.webp 896w',
        sizes: '(min-width: 900px) 50vw, 100vw',
        width: 896, height: 1120,
        alt: 'Cielo nocturno sobre un lago en calma, con una constelación y la luna creciente',
        fetchpriority: 'high',
      }),
      el('div', { class: 'inicio-texto' },
        el('h1', {}, quiz.titulo),
        el('p', { class: 'subtitulo' }, quiz.subtitulo),
        el('button', {
          class: 'boton', type: 'button',
          onclick: () => { registrar('quiz_inicio', { quiz: quiz.id, origen }); irAPaso(0); },
        }, quiz.boton_empezar ?? 'Empezar', icono('arrow-right')),
      ),
    ),
  );
  app.classList.add('ancho');
}

function progreso() {
  const total = quiz.preguntas.length;
  return el('div', { class: 'progreso' },
    el('div', { class: 'progreso-fila' },
      el('button', { class: 'atras', type: 'button', onclick: () => (paso === 0 ? pantallaInicio() : irAPaso(paso - 1)) },
        icono('arrow-left'), 'Atrás'),
      el('span', {}, `Pregunta ${paso + 1} de ${total}`),
    ),
    el('div', { class: 'barra', role: 'progressbar', 'aria-label': 'Progreso del cuestionario', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': paso + 1 },
      el('span', { style: { transform: `scaleX(${(paso + 1) / total})` } }),
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
  else pantallaResultado();
}

// Si la persona dio su nombre, algunas preguntas se lo dicen ("María, ¿…?").
function textoPregunta(pregunta) {
  return respuestas.nombre && pregunta.texto_con_nombre
    ? interpolar(pregunta.texto_con_nombre, { nombre: respuestas.nombre })
    : pregunta.texto;
}

function preguntaOpciones(pregunta) {
  return el('section', { class: 'pregunta pantalla' },
    el('h2', {}, textoPregunta(pregunta)),
    pregunta.ayuda && el('p', { class: 'ayuda' }, pregunta.ayuda),
    el('div', { class: 'opciones' },
      pregunta.opciones.map((opcion, i) =>
        el('button', {
          class: 'opcion', type: 'button', style: { '--i': i },
          'aria-pressed': respuestas[pregunta.id] === opcion.id ? 'true' : 'false',
          onclick: (evento) => {
            respuestas[pregunta.id] = opcion.id;
            evento.currentTarget.setAttribute('aria-pressed', 'true');
            setTimeout(siguiente, 200);
          },
        },
        opcion.icono && el('span', { class: 'opcion-icono' }, icono(opcion.icono)),
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
      el('select', { id, name: id, required: true, 'aria-describedby': 'error-fecha' },
        el('option', { value: '' }, etiqueta),
        opciones.map(([v, texto]) => el('option', { value: v, selected: Number(v) === valor }, texto)),
      ),
    );

  const error = el('p', { class: 'error', id: 'error-fecha', role: 'alert' });
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
      precargarImagen();
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

  return el('section', { class: 'pregunta pantalla' },
    el('h2', {}, pregunta.texto),
    pregunta.ayuda && el('p', { class: 'ayuda' }, pregunta.ayuda),
    formulario,
  );
}

function preguntaTexto(pregunta) {
  const campo = el('input', {
    type: 'text', id: pregunta.id, name: pregunta.id, maxlength: 30,
    autocomplete: 'given-name', autocapitalize: 'words', placeholder: pregunta.placeholder ?? '',
    value: respuestas[pregunta.id] ?? '', 'aria-describedby': 'ayuda-nombre',
  });
  const formulario = el('form', {
    class: 'formulario',
    onsubmit: (evento) => {
      evento.preventDefault();
      respuestas[pregunta.id] = limpiarNombre(campo.value);
      siguiente();
    },
  },
  el('label', { for: pregunta.id, class: 'etiqueta-campo' }, 'Tu nombre'),
  campo,
  el('p', { class: 'ayuda', id: 'ayuda-nombre' }, pregunta.ayuda ?? ''),
  el('button', { class: 'boton', type: 'submit' }, pregunta.boton ?? 'Continuar'));

  return el('section', { class: 'pregunta pantalla' },
    el('h2', {}, pregunta.texto),
    formulario,
    pregunta.opcional && el('button', {
      class: 'enlace', type: 'button',
      onclick: () => { respuestas[pregunta.id] = ''; siguiente(); },
    }, pregunta.texto_omitir ?? 'Saltar'),
  );
}

// ---------- Resultado ----------

// En cuanto se conoce la fecha ya se sabe el número: se precarga su imagen para que el resultado aparezca completo.
function precargarImagen() {
  const imagen = quiz.resultados[calcularResultado(quiz, respuestas)]?.imagen;
  if (imagen) new Image().src = `${imagen}-640.webp`;
}

function imagenArquetipo(resultado, clase) {
  if (!resultado.imagen) return null;
  return el('img', {
    class: clase,
    src: `${resultado.imagen}-896.webp`,
    srcset: `${resultado.imagen}-640.webp 640w, ${resultado.imagen}-896.webp 896w`,
    sizes: '(min-width: 640px) 560px, 100vw',
    width: 896, height: 1120,
    alt: resultado.imagen_alt ?? '',
  });
}

// El número se calcula en el teléfono, así que se muestra al momento. Mientras la IA escribe,
// la lectura aparece como un esqueleto con la misma forma que tendrá el texto final.
function pantallaResultado() {
  const compuesto = componerResultado(quiz, respuestas);
  const { id, resultado } = compuesto;
  document.documentElement.style.setProperty('--color-resultado', resultado.color_hex ?? 'var(--acento)');

  const zonaLectura = el('div', { class: 'zona-lectura', 'aria-live': 'polite', 'aria-busy': 'true' });
  const zonaFinal = el('div', { class: 'zona-final' });
  mostrar(imagenArquetipo(resultado, 'resultado-imagen'), cabeceraResultado(id, resultado), zonaLectura, zonaFinal);

  if (!quiz.ia) {
    pintarLectura(zonaLectura, zonaFinal, compuesto, null);
    return;
  }

  const mensajes = quiz.ia.mensajes_espera ?? ['Escribiendo tu lectura…'];
  const estado = el('p', { class: 'estado-carga' }, mensajes[0]);
  zonaLectura.replaceChildren(estado, ...Array.from({ length: 3 }, () => el('div', { class: 'esqueleto', 'aria-hidden': 'true' }, el('span'), el('span'), el('span'), el('span'))));
  let indice = 0;
  const rotar = setInterval(() => {
    indice = Math.min(indice + 1, mensajes.length - 1);
    estado.textContent = mensajes[indice];
  }, 3500);

  const inicio = Date.now();
  pedirLectura()
    .then((lectura) => {
      registrar('lectura_ia', { quiz: quiz.id, estado: 'ok', segundos: Math.round((Date.now() - inicio) / 1000) });
      return lectura;
    })
    .catch((error) => {
      // Si la IA falla, se muestra el resultado escrito de antemano: nadie se queda sin lectura.
      console.warn('Lectura con IA no disponible:', error.message);
      registrar('lectura_ia', { quiz: quiz.id, estado: 'fallo' });
      return null;
    })
    .then((lectura) => {
      clearInterval(rotar);
      pintarLectura(zonaLectura, zonaFinal, compuesto, lectura);
    });
}

function cabeceraResultado(id, resultado) {
  const nombre = respuestas.nombre;
  return el('section', { class: 'resultado-cabecera' },
    el('div', { class: 'numero', 'aria-hidden': 'true' }, id),
    el('div', {},
      el('p', { class: 'saludo' }, nombre ? `${nombre}, ${quiz.encabezado_resultado}` : quiz.encabezado_resultado_sin_nombre),
      el('h1', {}, el('span', { class: 'visualmente-oculto' }, `${id}: `), resultado.titulo),
      resultado.maestro && el('span', { class: 'sello' }, 'Número maestro'),
      resultado.color && el('p', { class: 'color-poder' }, el('i', { 'aria-hidden': 'true' }), `Tu color de poder: ${resultado.color}`),
    ),
  );
}

function pintarLectura(zonaLectura, zonaFinal, compuesto, lectura) {
  const { id, resultado } = compuesto;
  const nombre = respuestas.nombre;
  const bloques = lectura ? bloquesDeLectura(lectura) : compuesto.bloques;
  registrar('quiz_completado', { quiz: quiz.id, resultado: id, origen, ia: Boolean(lectura) });

  zonaLectura.setAttribute('aria-busy', 'false');
  zonaLectura.replaceChildren(
    lectura?.titular && el('p', { class: 'titular' }, ponerNombre(lectura.titular, nombre, '')),
    ...bloques.map((b, i) => el('section', { class: 'lectura-bloque', style: { '--i': i } }, el('h2', {}, b.titulo), el('p', {}, b.texto))),
    lectura?.frase && el('aside', { class: 'afirmacion' },
      el('p', { class: 'afirmacion-etiqueta' }, 'Tu frase para repetir'),
      el('p', { class: 'afirmacion-texto' }, ponerNombre(lectura.frase, nombre, '')),
    ),
    lectura && quiz.ia.nota && el('p', { class: 'nota-ia' }, quiz.ia.nota),
  );

  const urlCompartir = new URL(`r/${quiz.id}/${id}.html`, location.href).href;
  zonaFinal.replaceChildren(
    bloqueInforme(id, resultado),
    el('section', { class: 'compartir' },
      el('h2', {}, '¿Quién de tus amigas querría saber su número?'),
      el('div', { class: 'acciones' },
        el('a', {
          class: 'boton boton-secundario',
          href: `https://wa.me/?text=${encodeURIComponent(`${resultado.compartir} ${urlCompartir}`)}`,
          target: '_blank', rel: 'noopener',
          onclick: () => registrar('compartir', { quiz: quiz.id, resultado: id, canal: 'whatsapp' }),
        }, icono('whatsapp-logo'), 'Enviar por WhatsApp'),
        botonCopiar(id, resultado, urlCompartir),
      ),
      el('button', { class: 'enlace', type: 'button', onclick: reiniciar }, icono('arrow-counter-clockwise'), 'Hacer el cuestionario otra vez'),
    ),
  );
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

function bloquesDeLectura(lectura) {
  const nombre = respuestas.nombre;
  const porDefecto = quiz.ia.nombre_por_defecto;
  const opcion = opcionTexto(quiz, 'area', respuestas.area);
  return quiz.ia.bloques
    .filter((b) => lectura[b.campo])
    .map((b) => ({ titulo: interpolar(b.titulo, { opcion }), texto: ponerNombre(lectura[b.campo], nombre, porDefecto) }));
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
    el('img', {
      class: 'informe-portada', src: `img/informes/${quiz.id}-${id}.webp`, width: 600, height: 800, loading: 'lazy', decoding: 'async',
      alt: `Portada del informe completo del Número ${id}, ${resultado.titulo}`,
    }),
    el('div', {},
      el('h2', { id: 'titulo-informe' }, interpolar(informe.titulo, { id, titulo: resultado.titulo })),
      el('ul', {}, informe.incluye.map((item) => el('li', {}, icono('lock-simple'), el('span', {}, item)))),
      el('p', { class: 'precio' }, precio.texto),
      boton,
      el('p', { class: 'formato' }, informe.formato),
    ),
  );
}

function botonCopiar(id, resultado, url) {
  const boton = el('button', {
    class: 'enlace', type: 'button',
    onclick: async () => {
      registrar('compartir', { quiz: quiz.id, resultado: id, canal: 'copiar' });
      try {
        await navigator.clipboard.writeText(`${resultado.compartir} ${url}`);
        boton.lastChild.textContent = 'Enlace copiado';
      } catch {
        boton.lastChild.textContent = url;
      }
    },
  }, icono('link'), el('span', {}, 'Copiar enlace'));
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
    mostrar(el('section', { class: 'pantalla' },
      el('h2', {}, 'Algo salió mal'),
      el('p', {}, 'No pudimos cargar el cuestionario. Revisa tu conexión y vuelve a intentarlo.'),
      el('button', { class: 'boton', type: 'button', onclick: () => location.reload() }, 'Reintentar'),
    ));
  }
}

iniciar();
