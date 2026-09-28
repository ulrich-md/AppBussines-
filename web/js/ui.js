// Utilidades de interfaz compartidas por el cuestionario y la página del informe.
export const SPRITE = 'img/iconos.svg';

// Crea elementos sin usar innerHTML, para que ningún texto se interprete como HTML.
export function el(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave.startsWith('on')) nodo.addEventListener(clave.slice(2), valor);
    else if (clave === 'class') nodo.className = valor;
    else if (clave === 'style') {
      for (const [prop, v] of Object.entries(valor)) {
        if (prop.startsWith('--')) nodo.style.setProperty(prop, v);
        else nodo.style[prop] = v;
      }
    } else nodo.setAttribute(clave, valor === true ? '' : valor);
  }
  for (const hijo of hijos.flat()) {
    if (hijo === undefined || hijo === null || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
}

// Icono de Phosphor (sprite generado por scripts/build.mjs). Siempre decorativo: el texto va al lado.
export function icono(nombre) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icono');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `${SPRITE}#${nombre}`);
  svg.append(uso);
  return svg;
}

export function formatearPrecio(centavos, simbolo = 'US$') {
  return `${simbolo}${(centavos / 100).toFixed(2)}`;
}

// localStorage puede no existir o fallar (modo privado): nunca debe romper la página.
export const almacen = {
  leer(clave) {
    try { return JSON.parse(localStorage.getItem(clave)); } catch { return null; }
  },
  guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
  },
};
