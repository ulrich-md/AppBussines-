// Analítica sin cookies. Proveedores admitidos (configurar en site.json → "analitica"):
//   - "umami":  Umami Cloud (plan gratuito). "id" = Website ID.
//   - "vercel": Vercel Web Analytics. Los eventos personalizados requieren plan Pro;
//               en el plan gratuito solo se miden visitas.
//   - "ninguno": no se envía nada (los eventos solo se ven en la consola en local).
let proveedor = 'ninguno';

export function iniciarAnalitica(config = {}) {
  proveedor = config.proveedor ?? 'ninguno';
  if (proveedor === 'umami' && config.id) {
    cargarScript('https://cloud.umami.is/script.js', { 'data-website-id': config.id, 'data-auto-track': 'true' });
  } else if (proveedor === 'vercel') {
    window.va = window.va || function (...args) { (window.vaq = window.vaq || []).push(args); };
    cargarScript('/_vercel/insights/script.js');
  }
}

export function registrar(evento, datos = {}) {
  try {
    if (proveedor === 'umami' && window.umami) window.umami.track(evento, datos);
    else if (proveedor === 'vercel' && window.va) window.va('event', { name: evento, data: datos });
    if (['localhost', '127.0.0.1'].includes(location.hostname)) console.info('[analítica]', evento, datos);
  } catch {
    // La analítica nunca debe romper el cuestionario.
  }
}

function cargarScript(src, atributos = {}) {
  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  for (const [clave, valor] of Object.entries(atributos)) script.setAttribute(clave, valor);
  document.head.append(script);
}
