// Página del informe de pago: lo pide al servidor (que lo genera la primera vez), lo guarda en el
// teléfono para volver a abrirlo sin esperar y permite descargarlo en PDF (imprimir → Guardar como PDF).
import { almacen, el, formatearPrecio, icono } from './ui.js';
import { esFechaValida, numeroDeVida } from './engine.js';
import { iniciarAnalitica, registrar } from './analytics.js';

const raiz = document.getElementById('informe');
const idSesion = new URLSearchParams(location.search).get('s') ?? '';
const CLAVE_CACHE = `informe:${idSesion}`;
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MENSAJES = [
  'Confirmando tu compra…',
  'Leyendo tu carta numerológica completa…',
  'Escribiendo tu perfil y tus dones…',
  'Escribiendo sobre el amor, el dinero y tu familia…',
  'Preparando tus ciclos y tu ritual personal…',
  'Dando los últimos toques a tu informe…',
];

const mayuscula = (t = '') => t.charAt(0).toLocaleUpperCase('es') + t.slice(1);
let catalogo = null;

function mostrar(...nodos) {
  raiz.replaceChildren(...nodos.flat().filter(Boolean));
}

function pantallaEspera() {
  const estado = el('p', { class: 'estado-carga', role: 'status' }, MENSAJES[0]);
  mostrar(
    el('h1', {}, 'Tu informe se está escribiendo'),
    el('p', { class: 'ayuda' }, 'Lo estamos escribiendo solo para ti a partir de tu carta y tus respuestas. Tarda alrededor de un minuto, no cierres esta página.'),
    estado,
    Array.from({ length: 4 }, () => el('div', { class: 'esqueleto', 'aria-hidden': 'true' }, el('span'), el('span'), el('span'), el('span'))),
  );
  let i = 0;
  const intervalo = setInterval(() => { i = Math.min(i + 1, MENSAJES.length - 1); estado.textContent = MENSAJES[i]; }, 7000);
  return () => clearInterval(intervalo);
}

function pantallaMensaje(titulo, texto, accion) {
  mostrar(el('section', { class: 'pantalla' }, el('h1', {}, titulo), el('p', {}, texto), accion));
}

async function pedir(ruta) {
  const respuesta = await fetch(ruta, { cache: 'no-store' });
  const cuerpo = await respuesta.json().catch(() => ({}));
  return { estado: respuesta.status, cuerpo };
}

async function cargar(intento = 1) {
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(idSesion)) {
    pantallaMensaje('Enlace no válido', 'Revisa que el enlace de tu informe esté completo. Lo encontrarás en el correo de tu compra.');
    return;
  }
  const guardado = almacen.leer(CLAVE_CACHE);
  if (guardado?.informe) {
    pintar(guardado);
    return;
  }
  const parar = pantallaEspera();
  try {
    const { estado, cuerpo } = await pedir(`api/informe?s=${encodeURIComponent(idSesion)}`);
    parar();
    if (estado === 200 && cuerpo.informe) {
      almacen.guardar(CLAVE_CACHE, cuerpo);
      registrar('informe_visto', { producto: cuerpo.producto?.id, vida: cuerpo.vida });
      pintar(cuerpo);
    } else if (estado === 202) {
      pantallaMensaje('Tu pago está pendiente',
        'Si pagaste en efectivo o por transferencia, tu informe aparecerá aquí en cuanto se confirme el pago. Esta página se actualiza sola.',
        el('button', { class: 'boton', type: 'button', onclick: () => cargar() }, 'Comprobar ahora'));
      setTimeout(() => cargar(), 30000);
    } else if (estado === 502 && intento < 3) {
      setTimeout(() => cargar(intento + 1), 4000);
      pantallaEspera();
    } else {
      pantallaMensaje('No pudimos abrir tu informe', cuerpo.error ?? 'Inténtalo de nuevo en unos minutos.',
        el('button', { class: 'boton', type: 'button', onclick: () => cargar() }, 'Reintentar'));
    }
  } catch {
    parar();
    pantallaMensaje('Sin conexión', 'Revisa tu conexión a internet y vuelve a intentarlo.',
      el('button', { class: 'boton', type: 'button', onclick: () => cargar() }, 'Reintentar'));
  }
}

// ---------- Presentación ----------

const seccion = (id, titulo, ...contenido) => el('section', { class: 'informe-seccion', id }, el('h2', {}, titulo), ...contenido);
const parrafo = (texto) => texto && el('p', {}, texto);
const lista = (items, clase = 'informe-lista') => items?.length && el('ul', { class: clase }, items.map((t) => el('li', {}, t)));

// "Comunicación: sabes…" → nombre del don en negrita.
function itemConTitulo(texto) {
  const i = texto.indexOf(':');
  if (i > 0 && i < 40) return el('li', {}, el('strong', {}, texto.slice(0, i + 1)), texto.slice(i + 1));
  return el('li', {}, texto);
}

function pintar(datos) {
  const { informe: inf, producto } = datos;
  document.title = `El informe de ${datos.nombre || 'tu Número de Vida'}`;
  document.documentElement.style.setProperty('--color-resultado', datos.color_hex ?? 'var(--acento)');
  const tiene = (s) => producto?.secciones?.includes(s) && (s === 'pareja' || inf[s]);

  const indice = [
    ['bienvenida', 'Bienvenida'],
    ['perfil', 'Tu perfil'],
    ['amor', 'Amor'],
    ['dinero', 'Dinero y vocación'],
    ['familia', 'Familia'],
    tiene('ciclos') && ['ciclos', 'Tus ciclos y tus 12 meses'],
    ['espiritual', 'Tu lado espiritual'],
    tiene('plan') && ['plan', 'Tu plan de 4 semanas'],
    tiene('pareja') && ['pareja', 'Compatibilidad'],
    ['despedida', 'Para terminar'],
  ].filter(Boolean);

  mostrar(
    datos.imagen && el('img', {
      class: 'resultado-imagen', src: `${datos.imagen}-896.webp`, width: 896, height: 1120,
      srcset: `${datos.imagen}-640.webp 640w, ${datos.imagen}-896.webp 896w`, sizes: '(min-width: 640px) 560px, 100vw',
      alt: datos.imagen_alt ?? '',
    }),
    el('section', { class: 'resultado-cabecera' },
      el('div', { class: 'numero', 'aria-hidden': 'true' }, datos.vida),
      el('div', {},
        el('p', { class: 'saludo' }, datos.nombre ? `El informe personal de ${datos.nombre}` : 'Tu informe personal'),
        el('h1', {}, datos.arquetipo),
        datos.maestro && el('span', { class: 'sello' }, 'Número maestro'),
        el('p', { class: 'color-poder' }, el('i', { 'aria-hidden': 'true' }), `Tu color de poder: ${datos.color}`),
      ),
      carta(datos),
    ),
    acciones(),
    ofertaMejora(datos),
    el('nav', { class: 'indice', 'aria-label': 'Índice del informe' },
      el('h2', {}, 'En tu informe'),
      el('ol', {}, indice.map(([id, texto]) => el('li', {}, el('a', { href: `#${id}` }, texto)))),
    ),

    seccion('bienvenida', 'Una carta para ti', parrafo(inf.perfil.introduccion)),
    seccion('perfil', 'Tu perfil',
      el('h3', {}, 'Tu esencia'), parrafo(inf.perfil.esencia),
      el('h3', {}, 'Tus dones'), el('ul', { class: 'informe-lista' }, inf.perfil.dones.map(itemConTitulo)),
      el('h3', {}, 'Tus sombras (y cómo transformarlas)'), el('ul', { class: 'informe-lista' }, inf.perfil.sombras.map(itemConTitulo)),
      el('h3', {}, datos.carta.alma ? `Tu mundo interior: Número del Alma ${datos.carta.alma}` : 'Tu mundo interior'), parrafo(inf.perfil.alma),
      el('h3', {}, datos.carta.expresion ? `Tus talentos: Número de Expresión ${datos.carta.expresion}` : 'Tus talentos'), parrafo(inf.perfil.expresion),
      el('h3', {}, `Tu don de cumpleaños: el ${datos.carta.cumpleanos}`), parrafo(inf.perfil.cumpleanos),
    ),
    seccion('amor', 'Amor y pareja',
      parrafo(inf.areas.amor),
      el('h3', {}, 'Con quién fluyes'), parrafo(inf.areas.fluyes),
      el('h3', {}, 'Con quién aprendes'), parrafo(inf.areas.aprendes),
    ),
    seccion('dinero', 'Dinero y vocación', parrafo(inf.areas.dinero)),
    seccion('familia', 'Familia y relaciones', parrafo(inf.areas.familia)),
    tiene('ciclos') && seccionCiclos(datos),
    seccion('espiritual', 'Tu lado espiritual',
      parrafo(inf.espiritual.senales),
      el('div', { class: 'ritual' },
        el('h3', {}, `Tu ritual: ${inf.espiritual.ritual_titulo}`),
        el('p', { class: 'ritual-etiqueta' }, 'Necesitas'), lista(inf.espiritual.ritual_materiales),
        el('p', { class: 'ritual-etiqueta' }, 'Paso a paso'), el('ol', { class: 'informe-lista' }, inf.espiritual.ritual_pasos.map((p) => el('li', {}, p))),
        el('p', { class: 'nota-ia' }, 'Es un ejercicio simbólico de intención. Si usas velas, no las dejes nunca encendidas sin vigilancia.'),
      ),
      el('h3', {}, 'Tus 12 afirmaciones'),
      el('ol', { class: 'afirmaciones' }, inf.espiritual.afirmaciones.map((a, i) =>
        el('li', {}, el('span', { class: 'afirmacion-mes' }, mayuscula(datos.meses?.[i]?.nombre ?? `Mes ${i + 1}`)), a))),
    ),
    tiene('plan') && seccion('plan', 'Tu plan de 4 semanas',
      el('div', { class: 'semanas' }, inf.plan.semanas.map((s, i) =>
        el('article', { class: 'semana' }, el('p', { class: 'semana-numero' }, `Semana ${i + 1}`), el('h3', {}, s.titulo), el('p', {}, s.practica)))),
    ),
    tiene('pareja') && seccionPareja(),
    seccion('despedida', 'Para terminar', parrafo(inf.espiritual.carta_final)),
    el('section', { class: 'regalo' },
      el('h2', {}, '¿A quién le regalarías esta lectura?'),
      el('p', {}, 'La lectura gratuita es un regalo bonito para tu mamá, tu hermana o tu mejor amiga. Envíales el cuestionario:'),
      el('a', {
        class: 'boton boton-secundario',
        href: `https://wa.me/?text=${encodeURIComponent(`Me hice mi lectura de numerología y me encantó. Haz la tuya gratis: ${new URL('./?ref=regalo', location.href).href}`)}`,
        target: '_blank', rel: 'noopener', onclick: () => registrar('compartir', { canal: 'whatsapp', origen: 'informe' }),
      }, icono('whatsapp-logo'), 'Enviar por WhatsApp'),
    ),
  );
}

// Mejora a un plan superior pagando solo la diferencia (se reutilizan los datos de esta compra).
function ofertaMejora(datos) {
  const mejoras = (catalogo?.mejoras ?? []).filter((m) => m.desde === datos.producto?.id);
  if (!mejoras.length) return null;
  const error = el('p', { class: 'error', role: 'alert' });
  return el('aside', { class: 'mejora no-imprimir', 'aria-labelledby': 'titulo-mejora' },
    el('h2', { id: 'titulo-mejora' }, 'Completa tu informe'),
    mejoras.map((m) => {
      const boton = el('button', {
        class: 'boton', type: 'button',
        onclick: async () => {
          registrar('mejora_clic', { desde: m.desde, hacia: m.hacia });
          error.textContent = '';
          boton.setAttribute('aria-disabled', 'true');
          try {
            const respuesta = await fetch('api/checkout', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ producto: m.hacia, mejora_de: idSesion }),
            });
            const cuerpo = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok || !cuerpo.url) throw new Error(cuerpo.error ?? 'No se pudo iniciar el pago');
            location.href = cuerpo.url;
          } catch (e) {
            error.textContent = e.message;
            boton.removeAttribute('aria-disabled');
          }
        },
      }, `Añadir por ${formatearPrecio(m.precio, catalogo.simbolo)}`);
      return el('div', { class: 'mejora-opcion' }, el('h3', {}, m.nombre), el('p', {}, m.texto), boton);
    }),
    error,
    el('p', { class: 'nota-ia' }, 'Pagas solo la diferencia. Recibirás un informe nuevo y completo, sin repetir el cuestionario.'),
  );
}

function carta(datos) {
  const c = datos.carta;
  const anio = new Date().getFullYear();
  const celdas = [['Vida', c.vida], ['Alma', c.alma], ['Expresión', c.expresion], ['Personalidad', c.personalidad], ['Cumpleaños', c.cumpleanos], [`Año ${anio}`, c.anio_personal]]
    .filter(([, v]) => v);
  return el('dl', { class: 'carta', 'aria-label': 'Tu carta numerológica' }, celdas.map(([k, v]) => el('div', {}, el('dt', {}, k), el('dd', {}, v))));
}

function acciones() {
  const copiar = el('button', {
    class: 'enlace', type: 'button',
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        copiar.lastChild.textContent = 'Enlace copiado';
      } catch {
        copiar.lastChild.textContent = location.href;
      }
    },
  }, icono('link'), el('span', {}, 'Copiar el enlace de mi informe'));
  return el('div', { class: 'informe-acciones' },
    el('button', {
      class: 'boton', type: 'button',
      onclick: () => { registrar('informe_pdf'); window.print(); },
    }, icono('download-simple'), 'Descargar en PDF'),
    copiar,
    el('p', { class: 'nota-ia' }, 'Para descargarlo: pulsa el botón y elige "Guardar como PDF". Guarda también el enlace: es tu acceso personal.'),
  );
}

function seccionCiclos(datos) {
  const inf = datos.informe.ciclos;
  const anio = new Date().getFullYear();
  const mesClave = datos.mes_clave;
  return seccion('ciclos', 'Tus ciclos',
    el('h3', {}, `Tu año ${anio}: Año Personal ${datos.carta.anio_personal}`), parrafo(inf.anio_actual),
    el('h3', {}, `Tu año ${anio + 1}: Año Personal ${datos.carta.anio_personal_siguiente}`), parrafo(inf.anio_siguiente),
    mesClave && el('aside', { class: 'mes-clave' },
      el('p', { class: 'mes-clave-etiqueta' }, `Tu mes clave para ${datos.deseo}`),
      el('p', { class: 'mes-clave-fecha' }, `${MESES[mesClave.mes - 1]} de ${mesClave.anio}`),
      el('p', {}, inf.mes_clave),
    ),
    el('h3', {}, 'Tus próximos 12 meses'),
    el('div', { class: 'meses' }, inf.meses.map((texto, i) => {
      const m = datos.meses?.[i];
      return el('article', { class: 'mes' },
        el('p', { class: 'mes-cabecera' }, el('span', {}, m ? `${mayuscula(m.nombre)} ${m.anio}` : `Mes ${i + 1}`), m && el('span', { class: 'mes-numero' }, m.numero)),
        el('p', {}, texto));
    })),
  );
}

// Compatibilidad: la persona escribe la fecha de la otra persona; solo se envía su Número de Vida.
function seccionPareja() {
  const zona = el('div', { class: 'pareja-resultados' });
  const guardadas = almacen.leer(`${CLAVE_CACHE}:parejas`) ?? [];
  guardadas.forEach((p) => zona.append(tarjetaPareja(p)));
  const error = el('p', { class: 'error', role: 'alert' });
  const boton = el('button', { class: 'boton', type: 'submit' }, 'Ver nuestra compatibilidad');
  const selector = (id, etiqueta, opciones) => el('div', { class: 'campo' },
    el('label', { for: id }, etiqueta),
    el('select', { id, name: id }, el('option', { value: '' }, etiqueta), opciones.map(([v, t]) => el('option', { value: v }, t))));
  const anioActual = new Date().getFullYear();
  const formulario = el('form', {
    class: 'formulario no-imprimir', novalidate: true,
    onsubmit: async (evento) => {
      evento.preventDefault();
      const d = new FormData(formulario);
      const fecha = { dia: Number(d.get('p-dia')), mes: Number(d.get('p-mes')), anio: Number(d.get('p-anio')) };
      if (!esFechaValida(fecha)) { error.textContent = 'Elige una fecha de nacimiento válida.'; return; }
      error.textContent = '';
      boton.setAttribute('aria-disabled', 'true');
      boton.textContent = 'Escribiendo su compatibilidad…';
      try {
        const { estado, cuerpo } = await pedir(`api/informe?s=${encodeURIComponent(idSesion)}&pareja=${numeroDeVida(fecha)}`);
        if (estado !== 200) throw new Error(cuerpo.error ?? 'No se pudo generar');
        const nuevas = [cuerpo.pareja, ...guardadas.filter((p) => p.numero !== cuerpo.pareja.numero)];
        almacen.guardar(`${CLAVE_CACHE}:parejas`, nuevas);
        zona.prepend(tarjetaPareja(cuerpo.pareja));
        registrar('pareja_generada');
      } catch (e) {
        error.textContent = e.message;
      } finally {
        boton.removeAttribute('aria-disabled');
        boton.textContent = 'Ver nuestra compatibilidad';
      }
    },
  },
  el('p', {}, 'Escribe la fecha de nacimiento de tu pareja (o de quien tú quieras). Solo usamos su Número de Vida.'),
  el('div', { class: 'campos-fecha' },
    selector('p-dia', 'Día', Array.from({ length: 31 }, (_, i) => [i + 1, i + 1])),
    selector('p-mes', 'Mes', MESES.map((m, i) => [i + 1, m])),
    selector('p-anio', 'Año', Array.from({ length: anioActual - 1919 }, (_, i) => [anioActual - i, anioActual - i]))),
  error, boton);
  return seccion('pareja', 'Compatibilidad', formulario, zona);
}

function tarjetaPareja(p) {
  return el('article', { class: 'pareja' },
    el('h3', {}, `Tú y un ${p.numero}: ${p.titulo}`),
    parrafo(p.resumen),
    el('p', { class: 'ritual-etiqueta' }, 'Lo que los une'), lista(p.fortalezas),
    el('p', { class: 'ritual-etiqueta' }, 'Lo que los reta'), lista(p.retos),
    el('p', { class: 'ritual-etiqueta' }, 'Para cuidar el vínculo'), parrafo(p.consejo),
  );
}

const catalogoListo = fetch('productos.json').then((r) => r.json()).then((c) => { catalogo = c; }).catch(() => {});
fetch('site.json').then((r) => r.json()).then((sitio) => {
  document.querySelectorAll('[data-marca]').forEach((n) => (n.textContent = sitio.marca));
  iniciarAnalitica(sitio.analitica);
}).catch(() => {});
catalogoListo.finally(() => cargar());
