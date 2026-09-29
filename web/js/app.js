// Interfaz del cuestionario: una pregunta por pantalla, lectura personalizada y botón de compra.
// Toda la lógica de cálculo vive en engine.js; los textos, en quizzes/<id>.json y site.json.
import {
  arquetipoCombinado, calcularResultado, cartaNumerologica, componerResultado, esFechaValida, interpolar, limpiarNombre, mesClave,
  NOMBRES_MES, opcionTexto, ponerNombre, primerNombre, proximosMeses, rangoEdad,
} from './engine.js';
import { iniciarAnalitica, registrar } from './analytics.js';
import { almacen, el, icono } from './ui.js';
import { monedaEstimada, precioEn, textoPrecio } from './precios.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const origen = (params.get('ref') || params.get('utm_source') || 'directo').slice(0, 40);

let sitio;
let quiz;
let catalogo;
let testimonios = [];
// Pesos en México, dólares en el resto: primero se estima por la zona horaria y luego manda el servidor.
let moneda = monedaEstimada();
const precioTexto = (articulo) => textoPrecio(precioEn(articulo, moneda), catalogo, moneda);
let ultimaLectura = null;
let volvioDelPago = false;
let descuentoRecuperacion = null;
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
  const empezar = (lugar) => () => { registrar('quiz_inicio', { quiz: quiz.id, origen, lugar }); irAPaso(0); };
  // Una sola etiqueta para la misma intención en toda la página (arriba y al final).
  const botonEmpezar = (lugar) => el('button', { class: 'boton', type: 'button', onclick: empezar(lugar) },
    quiz.boton_empezar ?? 'Empezar', icono('arrow-right'));
  const portada = quiz.portada ?? {};
  mostrar(
    // Hero: imagen a sangre, texto alineado a la izquierda y un solo botón.
    el('section', { class: 'inicio pantalla' },
      el('img', {
        class: 'inicio-imagen',
        src: 'img/portada-896.webp',
        srcset: 'img/portada-640.webp 640w, img/portada-896.webp 896w',
        sizes: '(min-width: 900px) 55vw, 100vw',
        width: 896, height: 1120,
        alt: portada.imagen_alt ?? '',
        fetchpriority: 'high',
      }),
      el('div', { class: 'inicio-texto' },
        el('h1', {}, portada.titulo ?? quiz.titulo),
        el('p', { class: 'subtitulo' }, portada.subtitulo ?? quiz.subtitulo),
        botonEmpezar('portada'),
        tiendaEnPortada(),
      ),
    ),
    // Confianza: franja propia justo debajo del hero (no dentro).
    el('section', { class: 'franja-confianza revelar', 'aria-label': 'Por qué es seguro' },
      el('ul', {}, (portada.confianza ?? ['Gratis', 'Sin registro']).map((t) => el('li', {}, icono('check'), el('span', {}, t))))),
    portada.pasos && el('section', { class: 'inicio-seccion revelar', 'aria-labelledby': 'titulo-pasos' },
      el('h2', { id: 'titulo-pasos' }, portada.titulo_pasos ?? 'Así funciona'),
      el('ol', { class: 'pasos', tabindex: 0, 'aria-label': 'Pasos' }, portada.pasos.map((p, i) => el('li', {},
        p.imagen && el('img', { class: 'paso-imagen', src: p.imagen, alt: p.imagen_alt ?? '', width: 640, height: 480, loading: 'lazy', decoding: 'async' }),
        el('div', { class: 'paso-texto' },
          el('span', { class: 'paso-numero', 'aria-hidden': 'true' }, i + 1),
          el('h3', {}, p.titulo),
          el('p', {}, p.texto)),
      ))),
    ),
    portada.ejemplo && ejemploResultado(portada.ejemplo),
    seccionTienda(),
    seccionTestimonios(),
    portada.pasos && el('section', { class: 'inicio-final revelar' },
      el('h2', {}, portada.titulo_final ?? 'Descubre tu número'),
      portada.texto_final && el('p', {}, portada.texto_final),
      botonEmpezar('final'),
    ),
  );
  app.classList.add('ancho');
  revelarAlBajar();
}

// Las secciones aparecen suavemente al llegar a ellas (una sola vez; sin animación si se pide menos movimiento).
function revelarAlBajar() {
  const nodos = app.querySelectorAll('.revelar');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nodos.forEach((n) => n.classList.add('visible'));
    return;
  }
  const observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('visible');
      observador.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  nodos.forEach((n) => observador.observe(n));
}

// Tienda: guías digitales iguales para todas (PDF), con precio fijo en pesos y descarga inmediata.
// En el hero, debajo del test: las guías en una fila deslizable. Cada una lleva a su ficha en la tienda.
function tiendaEnPortada() {
  const tienda = catalogo?.tienda;
  if (!tienda?.length) return null;
  const articulos = catalogo.pack ? [...tienda, { ...catalogo.pack, id: 'pack' }] : tienda;
  const ir = (id) => (evento) => {
    evento.preventDefault();
    registrar('tienda_portada_clic', { producto: id, origen });
    const destino = document.getElementById(`producto-${id}`);
    if (!destino) return;
    const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    destino.closest('.revelar')?.classList.add('visible');
    destino.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'center' });
    destino.classList.remove('resaltado');
    void destino.offsetWidth;
    destino.classList.add('resaltado');
  };
  return el('nav', { class: 'portada-tienda', 'aria-label': 'Guías de la tienda' },
    el('p', { class: 'portada-tienda-titulo' }, el('span', {}, 'También en la tienda'),
      el('a', { href: '#tienda', onclick: (e) => { e.preventDefault(); document.getElementById('tienda')?.scrollIntoView({ behavior: 'smooth' }); } }, 'Ver todas', icono('arrow-right'))),
    el('ul', {}, articulos.map((t) => el('li', {},
      el('a', { href: `#producto-${t.id}`, onclick: ir(t.id), 'aria-label': `${t.nombre}, ${precioTexto(t)}` },
        el('img', { src: `${t.imagen}-640.webp`, alt: '', width: 52, height: 52, loading: 'lazy', decoding: 'async' }),
        el('span', { class: 'portada-tienda-nombre' }, t.nombre_corto ?? t.nombre),
        el('span', { class: 'portada-tienda-precio' }, precioTexto(t)),
      )))),
  );
}

function seccionTienda() {
  const tienda = catalogo?.tienda;
  if (!tienda?.length) return null;
  const error = el('p', { class: 'error error-producto', role: 'alert' });
  const boton = (id, texto, clase) => {
    const b = el('button', { class: clase, type: 'button', onclick: () => comprarTienda(id, b, error) }, texto);
    return b;
  };
  const pack = catalogo.pack;
  const suma = pack ? tienda.filter((t) => pack.productos.includes(t.id)).reduce((s, t) => s + precioEn(t, moneda), 0) : 0;
  const precioPack = pack ? precioEn(pack, moneda) : 0;
  const precio = (centavos) => textoPrecio(centavos, catalogo, moneda);
  return el('section', { class: 'productos revelar', id: 'tienda', 'aria-labelledby': 'titulo-tienda' },
    el('h2', { id: 'titulo-tienda', class: 'productos-titulo' }, 'Guías y rituales'),
    el('p', { class: 'productos-intro' }, 'Guías digitales para leer en tu celular o imprimir. Pago único y descarga al momento.'),
    el('ul', { class: 'productos-lista' }, tienda.map((t) => el('li', {},
      el('article', { class: 'producto', id: `producto-${t.id}` },
        el('img', { src: `${t.imagen}-640.webp`, alt: t.imagen_alt ?? '', width: 640, height: 640, loading: 'lazy', decoding: 'async' }),
        el('h3', {}, t.nombre),
        el('p', { class: 'producto-tipo' }, t.tipo),
        el('p', { class: 'producto-detalle' }, t.incluye?.[0] ?? ''),
        el('p', { class: 'producto-precio' }, precioTexto(t)),
        boton(t.id, 'Comprar', 'boton boton-contorno'),
      )))),
    pack && el('article', { class: 'productos-pack', id: 'producto-pack' },
      el('img', { src: `${pack.imagen}-640.webp`, alt: pack.imagen_alt ?? '', width: 640, height: 640, loading: 'lazy', decoding: 'async' }),
      el('div', {},
        el('h3', {}, pack.nombre),
        el('p', {}, pack.resumen),
        el('p', { class: 'pack-precio' }, el('strong', {}, precio(precioPack)), suma > precioPack && el('s', {}, precio(suma)),
          suma > precioPack && el('span', {}, `Ahorras ${precio(suma - precioPack)}`)),
        boton('pack', 'Quiero las 6 guías', 'boton'),
      )),
    error,
    el('p', { class: 'productos-nota' }, moneda === 'mxn'
      ? 'Paga con tarjeta o en efectivo en OXXO. Recibes tus guías en PDF al momento (con OXXO, en cuanto se confirme tu pago).'
      : 'Pago seguro con tarjeta. Recibes tus guías en PDF al momento.'),
  );
}

async function comprarTienda(id, boton, error) {
  registrar('tienda_comprar_clic', { producto: id, origen });
  error.textContent = '';
  const original = [...boton.childNodes];
  boton.setAttribute('aria-disabled', 'true');
  boton.textContent = 'Un momento…';
  try {
    const respuesta = await fetch('api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tienda: id }) });
    const cuerpo = await respuesta.json().catch(() => ({}));
    if (respuesta.ok && cuerpo.url) { location.href = cuerpo.url; return; }
    throw new Error(respuesta.status === 503 ? 'Los pagos se están activando. Vuelve a intentarlo en unas horas.' : (cuerpo.error ?? 'No se pudo iniciar el pago.'));
  } catch (e) {
    error.textContent = e.message.startsWith('Failed') ? 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' : e.message;
    boton.removeAttribute('aria-disabled');
    boton.replaceChildren(...original);
  }
}

// Ejemplo de lo que se recibe (un resultado real del cuestionario, con datos inventados y así indicado).
function ejemploResultado(ejemplo) {
  const resultado = quiz.resultados[ejemplo.numero];
  if (!resultado) return null;
  return el('section', { class: 'inicio-seccion revelar', 'aria-labelledby': 'titulo-ejemplo' },
    el('h2', { id: 'titulo-ejemplo' }, ejemplo.titulo ?? 'Lo que vas a recibir'),
    el('article', { class: 'ejemplo-resultado' },
      el('img', { src: `${resultado.imagen}-640.webp`, alt: resultado.imagen_alt ?? '', width: 640, height: 800, loading: 'lazy', decoding: 'async' }),
      el('div', {},
        el('p', { class: 'ejemplo-etiqueta' }, ejemplo.etiqueta ?? 'Ejemplo de resultado'),
        el('p', { class: 'ejemplo-numero' }, el('span', { class: 'numero numero-mini' }, ejemplo.numero), resultado.titulo),
        el('p', {}, ejemplo.texto ?? resultado.teaser),
        ejemplo.nota && el('p', { class: 'nota-ia' }, ejemplo.nota),
      ),
    ),
  );
}

// Opiniones reales (web/testimonios.json). Si no hay ninguna aprobada, no se muestra la sección.
function seccionTestimonios() {
  if (!testimonios.length) return null;
  return el('section', { class: 'inicio-seccion testimonios revelar', 'aria-labelledby': 'titulo-testimonios' },
    el('h2', { id: 'titulo-testimonios' }, 'Lo que dicen quienes ya tienen su informe'),
    el('ul', {}, testimonios.slice(-3).reverse().map((o) => el('li', {},
      el('figure', {},
        el('p', { class: 'estrellas-fijas', role: 'img', 'aria-label': `${o.estrellas} de 5 estrellas` }, '★'.repeat(o.estrellas), el('span', { class: 'estrella-vacia' }, '★'.repeat(5 - o.estrellas))),
        el('blockquote', {}, el('p', {}, o.texto)),
        el('figcaption', {}, [o.nombre, o.pais].filter(Boolean).join(', ') || 'Compradora', el('span', { class: 'verificada' }, icono('seal-check'), 'Compra verificada')),
      )))),
  );
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
            // Un doble toque programa dos avances: solo cuenta el primero, para no saltarse una pregunta.
            const desde = paso;
            setTimeout(() => { if (paso === desde) siguiente(); }, 450);
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
    selector('anio', 'Año', Array.from({ length: anioActual - 18 - 1929 }, (_, i) => [anioActual - 18 - i, anioActual - 18 - i]), previa.anio),
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
  mostrar(imagenArquetipo(resultado, 'resultado-imagen'), cabeceraResultado(id, resultado), bloqueCompartir(id), zonaLectura, zonaFinal);

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

// Compartir, justo debajo del resultado: es cuando más ganas hay de enseñarlo (y trae visitas gratis).
function bloqueCompartir(id) {
  const url = new URL(`r/${quiz.id}/${id}.html`, location.href).href;
  return el('section', { class: 'compartir compartir-arriba', 'aria-labelledby': 'titulo-compartir' },
    el('p', { id: 'titulo-compartir', class: 'compartir-titulo' }, '¿Te describe? Compártelo con tus amigas'),
    el('div', { class: 'acciones' },
      el('a', {
        class: 'boton boton-secundario',
        href: `https://wa.me/?text=${encodeURIComponent(`${textoCompartir(id)} ${url}`)}`,
        target: '_blank', rel: 'noopener',
        onclick: () => registrar('compartir', { quiz: quiz.id, resultado: id, canal: 'whatsapp', lugar: 'arriba' }),
      }, icono('whatsapp-logo'), 'Enviar por WhatsApp'),
      botonCopiar(id, url),
    ),
  );
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
  return [
    el('dl', { class: 'carta', 'aria-label': 'Tu carta numerológica' },
      celdas.map(([etiqueta, valor]) => el('div', {}, el('dt', {}, etiqueta), el('dd', {}, valor))),
    ),
    el('details', { class: 'glosario' },
      el('summary', {}, '¿Qué significa cada número?', icono('caret-down')),
      el('dl', {},
        GLOSARIO.filter(([nombre]) => celdas.some(([etiqueta]) => etiqueta.startsWith(nombre)))
          .map(([nombre, texto]) => el('div', {}, el('dt', {}, nombre), el('dd', {}, texto))),
      ),
    ),
  ];
}

// Explicación sencilla de cada número de la carta (sin jerga).
const GLOSARIO = [
  ['Vida', 'Sale de tu fecha de nacimiento completa. Habla de tu camino y de lo que viniste a aprender.'],
  ['Alma', 'Sale de las vocales de tu nombre. Habla de lo que deseas en lo más profundo.'],
  ['Expresión', 'Sale de todas las letras de tu nombre. Habla de tus talentos y de cómo te muestras.'],
  ['Cumpleaños', 'Es el día en que naciste. Habla de un don especial que te acompaña.'],
  ['Año', 'Tu Año Personal: la energía que te acompaña este año, del 1 (empezar) al 9 (cerrar ciclos).'],
];

function pintarLectura(zonaLectura, zonaFinal, compuesto, lectura) {
  const { id, resultado } = compuesto;
  const nombre = nombreSaludo();
  const bloques = lectura ? bloquesDeLectura(lectura) : bloquesFijos(compuesto);
  ultimaLectura = lectura;
  registrar('quiz_completado', { quiz: quiz.id, resultado: id, origen, ia: Boolean(lectura) });

  // Arriba solo lo que más engancha (esencia y momento); el resto de la lectura gratis va después
  // de la oferta, para que el informe aparezca en las primeras pantallas del móvil.
  const primeros = bloques.filter((b) => BLOQUES_PRINCIPALES.includes(b.campo));
  const principales = primeros.length ? primeros : bloques.slice(0, 2);
  const resto = bloques.filter((b) => !principales.includes(b));
  const pintarBloque = (b) => el('section', { class: 'lectura-bloque' },
    el('h2', {}, b.titulo),
    b.imagen && el('img', { class: 'bloque-imagen', src: b.imagen, alt: b.alt ?? '', width: 800, height: 600, loading: 'lazy', decoding: 'async' }),
    el('p', {}, b.texto));

  zonaLectura.setAttribute('aria-busy', 'false');
  zonaLectura.replaceChildren(
    lectura?.titular && el('p', { class: 'titular' }, ponerNombre(lectura.titular, nombre, '')),
    ...principales.map(pintarBloque),
    tarjetaMesClave(lectura),
    informeBloqueado(resultado),
  );

  zonaFinal.replaceChildren(
    ofertaPlanes(id, resultado),
    resto.length && el('section', { class: 'lectura-resto', 'aria-labelledby': 'titulo-resto' },
      el('h2', { id: 'titulo-resto', class: 'lectura-resto-titulo' }, 'Sigue tu lectura gratis'),
      ...resto.map(pintarBloque),
      lectura?.frase && el('aside', { class: 'afirmacion' },
        el('p', { class: 'afirmacion-etiqueta' }, 'Tu frase para repetir'),
        el('p', { class: 'afirmacion-texto' }, ponerNombre(lectura.frase, nombre, '')),
      ),
      lectura && quiz.ia.nota && el('p', { class: 'nota-ia' }, quiz.ia.nota),
    ),
    el('p', { class: 'reiniciar' },
      el('button', { class: 'enlace', type: 'button', onclick: reiniciar }, icono('arrow-counter-clockwise'), 'Hacer el cuestionario otra vez')),
    formularioSuscripcion(id),
  );
  barraCompra();
}

const BLOQUES_PRINCIPALES = ['esencia', 'momento'];

// Vista previa del informe completo: títulos reales de lo que contiene, con el texto difuminado.
// Todo lo que se muestra aquí está de verdad en el informe (plan Informe + 12 meses o superior).
function informeBloqueado(resultado) {
  const { carta, mesClave: mes } = datosCarta();
  const deseo = opcionTexto(quiz, 'deseo', respuestas.deseo);
  const titulos = [
    `Tus dones y tus sombras como ${resultado.titulo}`,
    mes ? `Qué hacer en ${NOMBRES_MES[mes.mes - 1]} de ${mes.anio}, tu mes clave para ${deseo}` : 'Tus próximos 12 meses, uno a uno',
    carta.alma ? `Qué desea tu alma (Número del Alma ${carta.alma}) y cómo escucharla` : 'Tu ritual personal y 12 afirmaciones',
  ];
  return el('section', { class: 'informe-bloqueado', 'aria-labelledby': 'titulo-bloqueado' },
    el('p', { class: 'bloqueado-etiqueta' }, icono('lock-simple'), 'Tu informe completo continúa'),
    el('h2', { id: 'titulo-bloqueado' }, 'Esto es lo que tu carta dice después'),
    el('ol', { class: 'bloqueado-lista' }, titulos.map((t) => el('li', {},
      el('h3', {}, t),
      el('div', { class: 'bloqueado-texto', 'aria-hidden': 'true' }, el('span'), el('span'), el('span'))))),
    el('button', {
      class: 'boton boton-desbloquear', type: 'button',
      onclick: () => {
        registrar('desbloquear_clic', { quiz: quiz.id });
        (document.querySelector('.planes') ?? document.getElementById('oferta'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    }, icono('lock-simple'), 'Desbloquear mi informe completo'),
    el('p', { class: 'bloqueado-nota' }, 'Pago único, sin suscripción. Lo recibes al momento.'),
  );
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
      const bloque = { campo: b.campo, titulo: interpolar(b.titulo, { opcion }), texto: ponerNombre(lectura[b.campo], nombre, porDefecto) };
      if (b.campo === 'interior' && alma) Object.assign(bloque, { titulo: `Tu mundo interior: alma de ${alma.nombre}`, imagen: alma.imagen, alt: alma.imagen_alt });
      return bloque;
    });
}

// ---------- Oferta: informe completo personalizado ----------

// Portada del informe con su nombre y su arquetipo: una vista previa real de lo que recibirá.
function portadaViva(id, resultado) {
  const { carta } = datosCarta();
  const nombre = nombreSaludo();
  // URL absoluta: una url() relativa dentro de una variable CSS se resolvería desde la carpeta css/.
  const imagen = new URL(`${resultado.imagen}-640.webp`, location.href).href;
  return el('div', { class: 'portada-viva', style: { '--imagen': `url("${imagen}")` }, 'aria-hidden': 'true' },
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
  const precioDe = (pid) => precioTexto(productos.find((p) => p.id === pid));
  const error = el('p', { class: 'error', role: 'alert' });
  const boton = el('button', { class: 'boton boton-compra', type: 'button', onclick: () => comprar(elegido, id, resultado, boton, error) });
  const textoBoton = (pid) => boton.replaceChildren(el('span', {}, 'Quiero mi informe'), el('span', { class: 'boton-sub' }, `${precioDe(pid)} · pago único`));
  textoBoton(elegido);

  const planes = el('fieldset', { class: 'planes' },
    el('legend', {}, 'Elige tu informe'),
    productos.map((p) => el('label', { class: `plan${p.recomendado ? ' plan-recomendado' : ''}` },
      el('input', {
        type: 'radio', name: 'plan', value: p.id, checked: p.id === elegido,
        onchange: () => { elegido = p.id; textoBoton(p.id); registrar('plan_elegido', { plan: p.id }); },
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
    volvioDelPago && el('p', { class: 'aviso-vuelta', role: 'status' },
      descuentoRecuperacion
        ? `Tu lectura sigue aquí. Si quieres tu informe, en este pago tienes un ${descuentoRecuperacion} de descuento, aplicado automáticamente.`
        : 'Tu lectura sigue aquí. Si tuviste alguna duda con el pago, revisa las preguntas frecuentes de abajo.'),
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
      el('li', {}, icono('credit-card'), el('span', {}, moneda === 'mxn'
        ? 'Pagas una sola vez con tarjeta o en efectivo en OXXO, en una página de pago segura. Sin cobros mensuales'
        : 'Pagas una sola vez con tarjeta (Visa, Mastercard y más), en una página de pago segura. Sin cobros mensuales')),
      el('li', {}, icono('download-simple'), el('span', {}, 'Lo recibes al momento, por email y para descargar en PDF')),
      sitio.contacto && el('li', {}, icono('envelope-simple'), el('span', {}, `¿Dudas? Escríbenos a ${sitio.contacto}`)),
    ),
    seccionTestimonios(),
    lineaDeMeses(),
    ejemplosInforme(),
    preguntasFrecuentes(garantia),
  );
}

// Sus próximos 12 meses con su número personal (cálculo real y gratuito). El significado de cada mes,
// y qué hacer en cada uno, es parte del informe.
function lineaDeMeses() {
  const meses = proximosMeses(respuestas.fecha);
  const clave = mesClave(respuestas.fecha, respuestas.deseo);
  const esClave = (m) => clave && m.mes === clave.mes && m.anio === clave.anio;
  return el('div', { class: 'linea-meses' },
    el('p', { class: 'oferta-etiqueta' }, 'Tus próximos 12 meses'),
    el('ol', { class: 'meses-mini' }, meses.map((m) => el('li', { class: esClave(m) ? 'es-clave' : '' },
      el('span', { class: 'mes-nombre' }, NOMBRES_MES[m.mes - 1]),
      el('span', { class: 'mes-num' }, m.numero),
      esClave(m) && el('span', { class: 'visualmente-oculto' }, ' (tu mes clave)'),
    ))),
    el('p', { class: 'meses-candado' }, icono('lock-simple'), el('span', {}, 'Qué significa cada mes para ti y qué hacer en cada uno está en tu informe (plan Informe + 12 meses).')),
  );
}

// Páginas reales de un informe de ejemplo (de otra persona): para ver lo que se compra antes de pagar.
function ejemplosInforme() {
  const ejemplos = [
    ['img/ejemplo/perfil.webp', 'Ejemplo: tus dones y tus sombras'],
    ['img/ejemplo/meses.webp', 'Ejemplo: tus 12 meses, uno a uno'],
    ['img/ejemplo/ritual.webp', 'Ejemplo: tu ritual personal'],
  ];
  return el('div', { class: 'ejemplos' },
    el('p', { class: 'oferta-etiqueta' }, 'Así es un informe por dentro'),
    el('div', { class: 'ejemplos-carrusel', tabindex: 0, 'aria-label': 'Páginas de ejemplo de un informe' },
      ejemplos.map(([src, texto]) => el('figure', {},
        el('a', {
          href: src, target: '_blank', rel: 'noopener',
          onclick: (evento) => { registrar('ejemplo_visto', { ejemplo: src }); verEnGrande(evento, src, texto); },
        },
        el('img', { src, alt: `${texto}. Página de un informe de ejemplo.`, width: 600, height: 900, loading: 'lazy', decoding: 'async' }),
        el('span', { class: 'ejemplo-lupa' }, icono('magnifying-glass-plus'), 'Ver en grande')),
        el('figcaption', {}, texto)))),
    el('p', { class: 'nota-ia' }, 'Páginas reales del informe de otra persona. El tuyo se escribe con tu carta y tus respuestas.'),
  );
}

// Visor a pantalla completa para leer las páginas de ejemplo sin salir de la oferta.
function verEnGrande(evento, src, texto) {
  if (typeof HTMLDialogElement !== 'function') return;
  evento.preventDefault();
  const visor = el('dialog', { class: 'visor', 'aria-label': texto, onclose: () => visor.remove() },
    el('form', { method: 'dialog' },
      el('button', { class: 'boton visor-cerrar', type: 'submit' }, icono('x'), 'Cerrar')),
    el('img', { src, alt: `${texto}. Página de un informe de ejemplo.`, width: 600, height: 900 }));
  visor.addEventListener('click', (e) => { if (e.target === visor) visor.close(); });
  document.body.append(visor);
  visor.showModal();
}

function preguntasFrecuentes(garantia) {
  const preguntas = [
    ['¿Es igual para todas?', 'No. Se escribe en el momento para ti, con tu carta completa (Vida, Alma, Expresión, Personalidad, Cumpleaños y tus ciclos) y con tus respuestas. No hay dos informes iguales.'],
    ['¿Cuándo lo recibo?', 'Justo después del pago. Tarda alrededor de un minuto en escribirse y además te enviamos el enlace por email para que puedas volver cuando quieras.'],
    ['¿Es una suscripción?', 'No. Pagas una sola vez y el informe es tuyo para siempre.'],
    ['¿Y si no me gusta?', `Tienes ${garantia} días de garantía. Escríbenos y te devolvemos el dinero.`],
    ['¿Qué datos guardan?', 'Para escribir tu informe guardamos junto a tu compra tu nombre de pila, tus números y tus respuestas. Nunca tu fecha de nacimiento completa.'],
    moneda === 'mxn'
      ? ['¿Cómo puedo pagar?', 'Con tarjeta de crédito o débito (Visa, Mastercard, American Express) o en efectivo en cualquier OXXO. Si eliges OXXO, recibes una ficha con código de barras y tienes 3 días para pagarla; tu informe se abre en cuanto se confirma el pago (normalmente al día hábil siguiente). El pago lo procesa Stripe: nosotros nunca vemos los datos de tu tarjeta.']
      : ['¿Cómo puedo pagar?', 'Con tarjeta de crédito o débito (Visa, Mastercard, American Express) y, según tu país, otros métodos locales que verás al pagar. El pago lo procesa Stripe, una empresa de pagos segura: nosotros nunca vemos los datos de tu tarjeta.'],
    moneda === 'mxn'
      ? ['¿En qué moneda pago?', 'En pesos mexicanos. El precio que ves es el precio final.']
      : ['¿En qué moneda pago?', 'El precio está en dólares estadounidenses. En la página de pago ves el importe final antes de confirmar y, si tu tarjeta es de otra moneda, tu banco hace el cambio.'],
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
  const contenidoOriginal = [...boton.childNodes];
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
        recuperacion: Boolean(descuentoRecuperacion),
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
    boton.replaceChildren(...contenidoOriginal);
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
  const minimo = Math.min(...(catalogo?.productos ?? []).map((p) => precioEn(p, moneda)));
  const barra = el('div', { class: 'barra-compra', hidden: true },
    el('p', {}, el('strong', {}, 'Tu informe completo'), el('span', {}, `desde ${textoPrecio(minimo, catalogo, moneda)}`)),
    el('button', {
      class: 'boton', type: 'button',
      onclick: () => { registrar('barra_compra_clic'); (document.querySelector('.planes') ?? oferta).scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    }, 'Ver mi informe'),
  );
  document.body.append(barra);
  // Visible desde el principio del resultado; se esconde solo mientras se ve la oferta o el bloque de
  // "Desbloquear mi informe", que ya tienen su propio botón. Vuelve a aparecer debajo de la oferta.
  const visibles = new Set();
  const actualizar = () => { barra.hidden = visibles.size > 0; };
  const observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (e.isIntersecting) visibles.add(e.target);
      else visibles.delete(e.target);
    }
    actualizar();
  });
  observador.observe(oferta);
  const bloqueado = document.querySelector('.informe-bloqueado');
  if (bloqueado) observador.observe(bloqueado);
  actualizar();
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

// Moneda y cupón de recuperación según el servidor (máximo 2 segundos de espera; si no, la estimación).
function pedirPagos() {
  const limite = new Promise((ok) => setTimeout(() => ok(null), 2000));
  const peticion = fetch('api/checkout').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return Promise.race([peticion, limite]);
}

async function iniciar() {
  try {
    const pagos = pedirPagos();
    sitio = await cargarJSON('site.json');
    const pedido = params.get('q');
    const id = pedido && /^[a-z0-9-]{1,60}$/.test(pedido) ? pedido : sitio.quiz_principal;
    quiz = await cargarJSON(`quizzes/${id}.json`);
    catalogo = await cargarJSON('productos.json').catch(() => null);
    // Solo opiniones reales de compradoras verificadas (ver scripts/opiniones.mjs). Vacío = no se muestra nada.
    testimonios = (await cargarJSON('testimonios.json').catch(() => null))?.opiniones?.filter((o) => o.verificada && o.texto) ?? [];
    const infoPagos = await pagos;
    if (infoPagos?.moneda) moneda = infoPagos.moneda;
    aplicarMarca();
    iniciarAnalitica(sitio.analitica);
    if (params.get('compra') === 'cancelada' && recuperarSesion()) {
      registrar('compra_cancelada', { quiz: quiz.id });
      volvioDelPago = true;
      descuentoRecuperacion = infoPagos?.recuperacion ?? null;
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
