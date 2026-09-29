// Página de descarga de la tienda: comprueba la compra y ofrece cada guía como archivo PDF.
import { el, icono } from './ui.js';
import { iniciarAnalitica, registrar } from './analytics.js';

const raiz = document.getElementById('descarga');
const idSesion = new URLSearchParams(location.search).get('s') ?? '';

function mostrar(...nodos) {
  raiz.replaceChildren(...nodos.flat().filter(Boolean));
}

async function descargar(guia, boton, aviso) {
  registrar('guia_descarga', { guia: guia.id });
  const original = [...boton.childNodes];
  boton.setAttribute('aria-disabled', 'true');
  boton.textContent = 'Preparando tu PDF…';
  aviso.textContent = 'La primera descarga puede tardar hasta un minuto.';
  try {
    const respuesta = await fetch(`api/descarga?s=${encodeURIComponent(idSesion)}&p=${encodeURIComponent(guia.id)}`, { cache: 'no-store' });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      throw new Error(cuerpo.error ?? 'No pudimos preparar tu guía. Inténtalo de nuevo.');
    }
    const archivo = URL.createObjectURL(await respuesta.blob());
    const enlace = el('a', { href: archivo, download: `${guia.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-')}.pdf` });
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(archivo), 60000);
    aviso.textContent = 'Listo: tu guía se ha descargado. Búscala en tus descargas o en la app Archivos.';
  } catch (e) {
    aviso.textContent = e.message.startsWith('Failed') ? 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' : e.message;
  } finally {
    boton.removeAttribute('aria-disabled');
    boton.replaceChildren(...original);
  }
}

async function cargar() {
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(idSesion)) {
    mostrar(el('h1', {}, 'Enlace no válido'), el('p', {}, 'Revisa que el enlace esté completo. Lo encontrarás en el correo de tu compra.'));
    return;
  }
  try {
    const respuesta = await fetch(`api/descarga?s=${encodeURIComponent(idSesion)}`, { cache: 'no-store' });
    const cuerpo = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 202) {
      mostrar(el('h1', {}, 'Tu pago está pendiente'),
        el('p', {}, 'Si pagaste en efectivo, tus guías aparecerán aquí en cuanto se confirme el pago. Esta página se actualiza sola.'));
      setTimeout(cargar, 30000);
      return;
    }
    if (!respuesta.ok) throw new Error(cuerpo.error ?? 'No pudimos abrir tu compra.');
    registrar('compra_tienda_vista', { compra: cuerpo.compra });
    mostrar(
      el('p', { class: 'bloqueado-etiqueta' }, icono('check'), 'Compra confirmada'),
      el('h1', {}, cuerpo.guias.length > 1 ? 'Tus guías están listas' : 'Tu guía está lista'),
      el('p', { class: 'ayuda' }, 'Descárgalas cuando quieras. Guarda el enlace de esta página: es tu acceso personal para volver a bajarlas.'),
      el('ul', { class: 'descargas' }, cuerpo.guias.map((guia) => {
        const aviso = el('p', { class: 'nota-ia', role: 'status' });
        const boton = el('button', { class: 'boton', type: 'button', onclick: () => descargar(guia, boton, aviso) }, icono('download-simple'), 'Descargar PDF');
        return el('li', { class: 'descarga' },
          el('img', { src: `${guia.imagen}-640.webp`, alt: guia.imagen_alt ?? '', width: 640, height: 640, loading: 'lazy' }),
          el('div', {}, el('h2', {}, guia.nombre), el('p', { class: 'producto-tipo' }, guia.tipo), boton, aviso));
      })),
      el('p', { class: 'nota-ia' }, '¿Algún problema con la descarga? Escríbenos y te ayudamos.'),
    );
  } catch (e) {
    mostrar(el('h1', {}, 'No pudimos abrir tu compra'), el('p', {}, e.message),
      el('button', { class: 'boton', type: 'button', onclick: cargar }, 'Reintentar'));
  }
}

fetch('site.json').then((r) => r.json()).then((sitio) => {
  document.querySelectorAll('[data-marca]').forEach((n) => (n.textContent = sitio.marca));
  iniciarAnalitica(sitio.analitica);
}).catch(() => {});
cargar();
