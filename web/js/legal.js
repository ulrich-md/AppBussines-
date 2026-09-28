// Rellena la marca y el email de contacto en las páginas legales desde site.json.
fetch('site.json').then((r) => r.json()).then((sitio) => {
  document.querySelectorAll('[data-marca]').forEach((n) => (n.textContent = sitio.marca));
  document.querySelectorAll('[data-contacto]').forEach((n) => {
    if (!sitio.contacto) return;
    const enlace = document.createElement('a');
    enlace.href = `mailto:${sitio.contacto}`;
    enlace.textContent = sitio.contacto;
    n.replaceChildren(enlace);
  });
}).catch(() => {});
