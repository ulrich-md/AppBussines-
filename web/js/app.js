// Interfaz del cuestionario: una pregunta por pantalla, lectura personalizada y botón de compra.
// Toda la lógica de cálculo vive en engine.js; los textos, en quizzes/<id>.json y site.json.
import {
  arquetipoCombinado, calcularResultado, cartaNumerologica, componerResultado, esFechaValida, interpolar, limpiarNombre, mesClave,
  NOMBRES_MES, opcionTexto, ponerNombre, primerNombre, rangoEdad,
} from './engine.js';
import { iniciarAnalitica, registrar } from './analytics.js';
import { almacen, el, formatearPrecio, icono } from './ui.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const origen = (params.get('ref') || params.get('utm_source') || 'directo').slice(0, 40);

let sitio;
let quiz;
let catalogo;
let ultimaLectura = null;
let paso = 0;
const respuestas = {};

function mostrar(...nodos) {
  app.classList.remove('ancho');
  document.querySelector('.barra-compra')?.remove();
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
  return nombreSaludo() && pregunta.texto_con_nombre
    ? interpolar(pregunta.texto_con_nombre, { nombre: nombreSaludo() })
    : pregunta.texto;
}

// La persona escribe su nombre completo (para los números del nombre); se la saluda por el primero.
const nombreSaludo = () => primerNombre(respuestas.nombre ?? '');

// Carta numerológica y mes clave: se calculan en el teléfono a partir de la fecha y el nombre.
function datosCarta() {
  const carta = cartaNumerologica(respuestas.fecha, respuestas.nombre ?? '');
  return { carta, mesClave: mesClave(respuestas.fecha, respuestas.deseo) };
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
    type: 'text', id: pregunta.id, name: pregunta.id, maxlength: 60,
    autocomplete: 'name', autocapitalize: 'words', placeholder: pregunta.placeholder ?? '',
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
  el('label', { for: pregunta.id, class: 'etiqueta-campo' }, 'Nombre completo'),
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

  if (!quiz.ia || ultimaLectura) {
    pintarLectura(zonaLectura, zonaFinal, compuesto, ultimaLectura);
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
  const nombre = nombreSaludo();
  const { carta } = datosCarta();
  return el('section', { class: 'resultado-cabecera' },
    el('div', { class: 'numero', 'aria-hidden': 'true' }, id),
    el('div', {},
      el('p', { class: 'saludo' }, nombre ? `${nombre}, ${quiz.encabezado_resultado}` : quiz.encabezado_resultado_sin_nombre),
      el('h1', {}, el('span', { class: 'visualmente-oculto' }, `${id}: `), arquetipoCombinado(quiz, carta)),
      resultado.maestro && el('span', { class: 'sello' }, 'Número maestro'),
      resultado.color && el('p', { class: 'color-poder' }, el('i', { 'aria-hidden': 'true' }), `Tu color de poder: ${resultado.color}`),
    ),
    cartaResumen(carta),
  );
}

// Tus números, de un vistazo: lo que hace la lectura única para cada persona.
function cartaResumen(carta) {
  const anio = new Date().getFullYear();
  const celdas = [
    ['Vida', carta.vida],
    ['Alma', carta.alma],
    ['Expresión', carta.expresion],
    ['Cumpleaños', carta.cumpleanos],
    [`Año ${anio}`, carta.anio_personal],
  ].filter(([, valor]) => valor);
  return el('dl', { class: 'carta', 'aria-label': 'Tu carta numerológica' },
    celdas.map(([etiqueta, valor]) => el('div', {}, el('dt', {}, etiqueta), el('dd', {}, valor))),
  );
}

function pintarLectura(zonaLectura, zonaFinal, compuesto, lectura) {
  const { id, resultado } = compuesto;
  const nombre = nombreSaludo();
  const bloques = lectura ? bloquesDeLectura(lectura) : bloquesFijos(compuesto);
  ultimaLectura = lectura;
  registrar('quiz_completado', { quiz: quiz.id, resultado: id, origen, ia: Boolean(lectura) });

  zonaLectura.setAttribute('aria-busy', 'false');
  zonaLectura.replaceChildren(
    lectura?.titular && el('p', { class: 'titular' }, ponerNombre(lectura.titular, nombre, '')),
    ...bloques.map((b, i) => el('section', { class: 'lectura-bloque', style: { '--i': i } },
      el('h2', {}, b.titulo),
      b.imagen && el('img', { class: 'bloque-imagen', src: b.imagen, alt: b.alt ?? '', width: 800, height: 600, loading: 'lazy', decoding: 'async' }),
      el('p', {}, b.texto))),
    tarjetaMesClave(lectura),
    lectura?.frase && el('aside', { class: 'afirmacion' },
      el('p', { class: 'afirmacion-etiqueta' }, 'Tu frase para repetir'),
      el('p', { class: 'afirmacion-texto' }, ponerNombre(lectura.frase, nombre, '')),
    ),
    lectura && quiz.ia.nota && el('p', { class: 'nota-ia' }, quiz.ia.nota),
  );

  const urlCompartir = new URL(`r/${quiz.id}/${id}.html`, location.href).href;
  zonaFinal.replaceChildren(
    ofertaPlanes(id, resultado),
    el('section', { class: 'compartir' },
      el('h2', {}, '¿Quién de tus amigas querría saber su número?'),
      el('div', { class: 'acciones' },
        el('a', {
          class: 'boton boton-secundario',
          href: `https://wa.me/?text=${encodeURIComponent(`${textoCompartir(id)} ${urlCompartir}`)}`,
          target: '_blank', rel: 'noopener',
          onclick: () => registrar('compartir', { quiz: quiz.id, resultado: id, canal: 'whatsapp' }),
        }, icono('whatsapp-logo'), 'Enviar por WhatsApp'),
        botonCopiar(id, urlCompartir),
      ),
      el('button', { class: 'enlace', type: 'button', onclick: reiniciar }, icono('arrow-counter-clockwise'), 'Hacer el cuestionario otra vez'),
    ),
    formularioSuscripcion(id),
  );
  barraCompra();
}

// Al servidor solo se envían el número, la edad aproximada y las respuestas de opción múltiple.
// El nombre y la fecha de nacimiento no salen del teléfono.
async function pedirLectura() {
  const { carta, mesClave: mes } = datosCarta();
  const cuerpo = {
    carta,
    mes_clave: mes,
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

// Sin IA: los textos escritos de antemano, más el alma si se conoce.
function bloquesFijos(compuesto) {
  const { carta } = datosCarta();
  const alma = carta.alma ? quiz.almas?.[String(carta.alma)] : null;
  const bloques = [...compuesto.bloques];
  if (alma) bloques.splice(1, 0, { titulo: `Tu mundo interior: alma de ${alma.nombre}`, texto: alma.texto, imagen: alma.imagen, alt: alma.imagen_alt });
  return bloques;
}

// "Tu mes clave para el amor: mayo de 2027": el puente honesto hacia el informe completo.
function tarjetaMesClave(lectura) {
  const { mesClave: mes } = datosCarta();
  if (!mes) return null;
  const deseo = quiz.preguntas.find((p) => p.id === 'deseo')?.opciones.find((o) => o.id === respuestas.deseo);
  const texto = lectura?.mes_clave
    ? ponerNombre(lectura.mes_clave, nombreSaludo(), quiz.ia?.nombre_por_defecto)
    : 'Según tu Año Personal, ese mes tu energía se alinea especialmente con lo que quieres atraer.';
  return el('aside', { class: 'mes-clave' },
    el('p', { class: 'mes-clave-etiqueta' }, `Tu mes clave para ${deseo?.etiqueta ?? 'lo que deseas'}`),
    el('p', { class: 'mes-clave-fecha' }, `${NOMBRES_MES[mes.mes - 1]} de ${mes.anio}`),
    el('p', {}, texto),
    el('p', { class: 'mes-clave-puente' }, 'En tu informe completo: qué hacer ese mes y tus 12 meses, uno a uno.'),
  );
}

function bloquesDeLectura(lectura) {
  const nombre = nombreSaludo();
  const porDefecto = quiz.ia.nombre_por_defecto;
  const opcion = opcionTexto(quiz, 'area', respuestas.area);
  const { carta } = datosCarta();
  const alma = carta.alma ? quiz.almas?.[String(carta.alma)] : null;
  return quiz.ia.bloques
    .filter((b) => lectura[b.campo])
    .map((b) => {
      const bloque = { titulo: interpolar(b.titulo, { opcion }), texto: ponerNombre(lectura[b.campo], nombre, porDefecto) };
      if (b.campo === 'interior' && alma) Object.assign(bloque, { titulo: `Tu mundo interior: alma de ${alma.nombre}`, imagen: alma.imagen, alt: alma.imagen_alt });
      return bloque;
    });
}

// ---------- Oferta: informe completo personalizado ----------

// Portada del informe con su nombre y su arquetipo: una vista previa real de lo que recibirá.
function portadaViva(id, resultado) {
  const { carta } = datosCarta();
  const nombre = nombreSaludo();
  return el('div', { class: 'portada-viva', style: { '--imagen': `url(${resultado.imagen}-640.webp)` }, 'aria-hidden': 'true' },
    el('p', { class: 'portada-marca' }, sitio.marca),
    el('div', { class: 'portada-numero' }, id),
    el('p', { class: 'portada-titulo' }, nombre ? `El informe de ${nombre}` : 'Tu informe personal'),
    el('p', { class: 'portada-sub' }, arquetipoCombinado(quiz, carta)),
  );
}

// Lo que descubrirá, escrito con sus propios datos.
function descubrimientos(resultado) {
  const { carta, mesClave: mes } = datosCarta();
  const deseo = opcionTexto(quiz, 'deseo', respuestas.deseo);
  return [
    `Tus dones y tus sombras como ${resultado.titulo}, explicados para ti`,
    carta.alma ? `Qué desea tu alma (Número del Alma ${carta.alma}) y cómo escucharla` : 'Qué desea tu alma y cómo escucharla',
    'Con qué números fluyes en el amor y con cuáles aprendes',
    mes ? `Qué hacer en ${NOMBRES_MES[mes.mes - 1]} de ${mes.anio}, tu mes clave para ${deseo}` : 'Tus próximos 12 meses, uno a uno',
    'Tu ritual personal y 12 afirmaciones para tus próximos meses',
  ];
}

function ofertaPlanes(id, resultado) {
  const productos = catalogo?.productos ?? [];
  let elegido = productos.find((p) => p.recomendado)?.id ?? productos[0]?.id;
  const precioDe = (pid) => formatearPrecio(productos.find((p) => p.id === pid)?.precio ?? 0, catalogo?.simbolo);
  const error = el('p', { class: 'error', role: 'alert' });
  const boton = el('button', { class: 'boton boton-compra', type: 'button', onclick: () => comprar(elegido, id, resultado, boton, error) },
    `Quiero mi informe · ${precioDe(elegido)}`);

  const planes = el('fieldset', { class: 'planes' },
    el('legend', {}, 'Elige tu informe'),
    productos.map((p) => el('label', { class: `plan${p.recomendado ? ' plan-recomendado' : ''}` },
      el('input', {
        type: 'radio', name: 'plan', value: p.id, checked: p.id === elegido,
        onchange: () => { elegido = p.id; boton.textContent = `Quiero mi informe · ${precioDe(p.id)}`; registrar('plan_elegido', { plan: p.id }); },
      }),
      el('span', { class: 'plan-cabecera' },
        el('span', { class: 'plan-nombre' }, p.nombre),
        el('span', { class: 'plan-precio' }, precioDe(p.id)),
      ),
      p.recomendado && el('span', { class: 'plan-sello' }, 'Recomendado'),
      el('span', { class: 'plan-resumen' }, p.resumen),
      el('ul', {}, p.incluye.map((item) => el('li', {}, icono('check'), el('span', {}, item)))),
    )),
  );

  const garantia = catalogo?.garantia_dias ?? 7;
  return el('section', { class: 'oferta', id: 'oferta', 'aria-labelledby': 'titulo-oferta' },
    el('h2', { id: 'titulo-oferta' }, 'Tu informe completo, escrito solo para ti'),
    el('p', { class: 'oferta-intro' }, 'Lo que acabas de leer es el comienzo. Tu informe desarrolla toda tu carta numerológica, con tus respuestas.'),
    el('div', { class: 'oferta-vista' },
      portadaViva(id, resultado),
      el('div', {},
        el('p', { class: 'oferta-etiqueta' }, 'En tu informe descubrirás'),
        el('ul', { class: 'descubrimientos' }, descubrimientos(resultado).map((t) => el('li', {}, icono('sparkle'), el('span', {}, t)))),
      ),
    ),
    planes,
    boton,
    error,
    el('ul', { class: 'confianza' },
      el('li', {}, icono('shield-check'), el('span', {}, `Garantía de ${garantia} días: si no te gusta, te devolvemos el dinero`)),
      el('li', {}, icono('credit-card'), el('span', {}, 'Pago único y seguro con Stripe. Sin suscripciones')),
      el('li', {}, icono('download-simple'), el('span', {}, 'Lo recibes al momento, por email y para descargar en PDF')),
    ),
    preguntasFrecuentes(garantia),
  );
}

function preguntasFrecuentes(garantia) {
  const preguntas = [
    ['¿Es igual para todas?', 'No. Se escribe en el momento para ti, con tu carta completa (Vida, Alma, Expresión, Personalidad, Cumpleaños y tus ciclos) y con tus respuestas. No hay dos informes iguales.'],
    ['¿Cuándo lo recibo?', 'Justo después del pago. Tarda alrededor de un minuto en escribirse y además te enviamos el enlace por email para que puedas volver cuando quieras.'],
    ['¿Es una suscripción?', 'No. Pagas una sola vez y el informe es tuyo para siempre.'],
    ['¿Y si no me gusta?', `Tienes ${garantia} días de garantía. Escríbenos y te devolvemos el dinero.`],
    ['¿Qué datos guardan?', 'Para escribir tu informe guardamos junto a tu compra tu nombre de pila, tus números y tus respuestas. Nunca tu fecha de nacimiento completa.'],
    ['¿Cómo puedo pagar?', 'Con tarjeta de crédito o débito y, según tu país, otros métodos locales que verás al pagar.'],
    ['¿Predice mi futuro?', 'No. Es contenido de entretenimiento y autoconocimiento basado en la tradición de la numerología, para reflexionar sobre tu vida.'],
  ];
  return el('div', { class: 'faq' },
    el('h3', {}, 'Preguntas frecuentes'),
    preguntas.map(([p, r]) => el('details', {}, el('summary', {}, p, icono('caret-down')), el('p', {}, r))),
  );
}

async function comprar(producto, id, resultado, boton, error) {
  registrar('comprar_clic', { quiz: quiz.id, resultado: id, producto, origen });
  error.textContent = '';
  const textoOriginal = boton.textContent;
  boton.setAttribute('aria-disabled', 'true');
  boton.textContent = 'Preparando tu pago seguro…';
  guardarSesion();
  try {
    const { carta, mesClave: mes } = datosCarta();
    const respuesta = await fetch('api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        producto, carta, mes_clave: mes, edad: rangoEdad(respuestas.fecha), nombre: nombreSaludo(),
        respuestas: Object.fromEntries(quiz.preguntas.filter((p) => p.tipo === 'opciones').map((p) => [p.id, respuestas[p.id]])),
      }),
    });
    const cuerpo = await respuesta.json().catch(() => ({}));
    if (respuesta.ok && cuerpo.url) {
      location.href = cuerpo.url;
      return;
    }
    // Sin pagos configurados todavía: enlace de tienda externo, si existe.
    if (respuesta.status === 503 && resultado.comprar_url) {
      location.href = resultado.comprar_url;
      return;
    }
    throw new Error(respuesta.status === 503 ? 'Los pagos se están activando. Vuelve a intentarlo en unas horas.' : (cuerpo.error ?? 'No se pudo iniciar el pago.'));
  } catch (e) {
    error.textContent = e.message.startsWith('Failed') ? 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' : e.message;
    boton.removeAttribute('aria-disabled');
    boton.textContent = textoOriginal;
  }
}

// "Tu número del mes" por email: una lista propia para volver a escribirle sin anuncios.
function formularioSuscripcion(id) {
  const error = el('p', { class: 'error', role: 'alert' });
  const email = el('input', { type: 'email', id: 'email', name: 'email', autocomplete: 'email', required: true, placeholder: 'tu@email.com' });
  const permiso = el('input', { type: 'checkbox', id: 'permiso', name: 'permiso', required: true });
  const seccion = el('section', { class: 'suscripcion' });
  const formulario = el('form', {
    class: 'formulario', novalidate: true,
    onsubmit: async (evento) => {
      evento.preventDefault();
      error.textContent = '';
      if (!email.value.includes('@')) { error.textContent = 'Escribe tu email.'; return; }
      if (!permiso.checked) { error.textContent = 'Marca la casilla para que podamos escribirte.'; return; }
      try {
        const respuesta = await fetch('api/suscribir', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: email.value, consentimiento: true, vida: id, deseo: respuestas.deseo, nombre: nombreSaludo() }),
        });
        if (respuesta.status === 503) { seccion.remove(); return; }
        const cuerpo = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(cuerpo.error ?? 'No se pudo guardar');
        registrar('suscripcion', { quiz: quiz.id, resultado: id });
        seccion.replaceChildren(el('h2', {}, 'Listo, ya estás dentro'), el('p', {}, 'Cada mes te escribiremos con la energía de tu número. Revisa tu bandeja de entrada (y la de promociones).'));
      } catch (e) {
        error.textContent = e.message;
      }
    },
  },
  el('label', { for: 'email', class: 'etiqueta-campo' }, 'Tu email'),
  email,
  el('label', { class: 'casilla', for: 'permiso' }, permiso, el('span', {}, 'Quiero recibir mi número del mes. Puedo darme de baja cuando quiera. ', el('a', { href: 'privacidad.html' }, 'Privacidad'))),
  error,
  el('button', { class: 'boton boton-secundario', type: 'submit' }, icono('envelope-simple'), 'Recibir mi número del mes'));
  seccion.append(
    el('h2', {}, 'Tu número del mes, gratis en tu email'),
    el('p', { class: 'ayuda' }, 'Cada mes, un mensaje corto con la energía de tu mes personal y un gesto para aprovecharlo.'),
    formulario,
  );
  return seccion;
}

// Barra fija en el móvil: aparece mientras se lee la lectura y se esconde al llegar a la oferta.
function barraCompra() {
  document.querySelector('.barra-compra')?.remove();
  const oferta = document.getElementById('oferta');
  if (!oferta || !('IntersectionObserver' in window)) return;
  const minimo = Math.min(...(catalogo?.productos ?? []).map((p) => p.precio));
  const barra = el('div', { class: 'barra-compra', hidden: true },
    el('p', {}, el('strong', {}, 'Tu informe completo'), el('span', {}, `desde ${formatearPrecio(minimo, catalogo?.simbolo)}`)),
    el('button', {
      class: 'boton', type: 'button',
      onclick: () => { registrar('barra_compra_clic'); oferta.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    }, 'Ver opciones'),
  );
  document.body.append(barra);
  let lecturaVista = false;
  let ofertaVisible = false;
  const actualizar = () => { barra.hidden = !lecturaVista || ofertaVisible; };
  new IntersectionObserver(([e]) => { ofertaVisible = e.isIntersecting || e.boundingClientRect.top < 0; actualizar(); }).observe(oferta);
  const titular = document.querySelector('.lectura-bloque');
  if (titular) new IntersectionObserver(([e]) => { if (e.isIntersecting) { lecturaVista = true; actualizar(); } }).observe(titular);
}

// Si vuelve del pago sin completarlo, recupera su resultado en lugar de empezar de cero.
const CLAVE_SESION = 'ultimo-resultado';
function guardarSesion() {
  try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ quiz: quiz.id, respuestas, lectura: ultimaLectura })); } catch { /* sin almacenamiento */ }
}
function recuperarSesion() {
  try {
    const datos = JSON.parse(sessionStorage.getItem(CLAVE_SESION));
    if (datos?.quiz !== quiz.id || !datos.respuestas?.fecha) return false;
    Object.assign(respuestas, datos.respuestas);
    ultimaLectura = datos.lectura ?? null;
    return true;
  } catch {
    return false;
  }
}

// Texto para compartir con el arquetipo combinado: es más personal y despierta más curiosidad.
function textoCompartir(id) {
  const { carta } = datosCarta();
  return `Me salió ${arquetipoCombinado(quiz, carta)} (Número de Vida ${id}) y me describe demasiado bien. ¿Y a ti qué te sale? Es gratis:`;
}

function botonCopiar(id, url) {
  const boton = el('button', {
    class: 'enlace', type: 'button',
    onclick: async () => {
      registrar('compartir', { quiz: quiz.id, resultado: id, canal: 'copiar' });
      try {
        await navigator.clipboard.writeText(`${textoCompartir(id)} ${url}`);
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
  ultimaLectura = null;
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
    catalogo = await cargarJSON('productos.json').catch(() => null);
    aplicarMarca();
    iniciarAnalitica(sitio.analitica);
    if (params.get('compra') === 'cancelada' && recuperarSesion()) {
      registrar('compra_cancelada', { quiz: quiz.id });
      pantallaResultado();
      return;
    }
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
