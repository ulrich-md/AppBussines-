# Cuestionarios de numerología y autoconocimiento

Negocio digital para mujeres hispanohablantes de 30 a 55 años.
Cuestionario gratis de 11 preguntas → carta numerológica completa (Vida, Alma, Expresión, Personalidad, Cumpleaños, ciclos) → lectura gratis escrita con IA → informe de pago escrito con IA para cada compradora (3 planes + mejoras). Se promociona con TikTok orgánico.

## Documentos

- [`docs/puesta-en-marcha.md`](docs/puesta-en-marcha.md): **empieza aquí.** Claves de Vercel, Stripe, Gemini y Blob, compra de prueba y lista de comprobación.
- [`docs/monetizacion.md`](docs/monetizacion.md): cómo gana dinero (embudo, planes, mejoras, lista de email), qué medir y próximos experimentos.
- [`docs/estrategia.md`](docs/estrategia.md): modelo de negocio, público, catálogo de cuestionarios, reglas y métricas.
- [`docs/plan-claude-code.md`](docs/plan-claude-code.md): plan de acción y estado de cada tarea.
- [`docs/diseno.md`](docs/diseno.md): sistema de diseño (colores, tipografía, iconos, imágenes, movimiento y reglas).
- [`docs/marca.md`](docs/marca.md): 10 propuestas de marca (pendiente de elegir).
- [`docs/tienda.md`](docs/tienda.md): textos para una tienda externa (Hotmart o Gumroad), como alternativa a Stripe.
- [`contenido/tiktok-guiones.md`](contenido/tiktok-guiones.md): 40 guiones (los 31-40 usan el alma y el arquetipo combinado).

## Estructura

```
web/                    Sitio estático (lo que se publica)
  index.html            Cuestionario (usa ?q=<id> para elegir otro)
  site.json             Marca, colores y analítica
  quizzes/<id>.json     Preguntas, cálculo, textos y enlaces de compra de cada cuestionario
  productos.json        Planes, precios y mejoras (el precio sale siempre de aquí)
  informe.html          Página del informe de pago (descargable en PDF)
  terminos.html, privacidad.html
  api/lectura.js        Lectura gratis con Gemini
  api/checkout.js       Pago con Stripe (y mejoras pagando la diferencia)
  api/informe.js        Informe de pago: verifica la compra, lo genera con Gemini y lo guarda en Vercel Blob
  api/suscribir.js      Lista de email "tu número del mes"
  js/engine.js          Numerología (sin DOM, probada en Node)
  js/app.js             Cuestionario, resultado y oferta
  js/informe.js         Página del informe
  r/<id>/<resultado>.html   Páginas para compartir (generadas)
  og/<id>/*.jpg         Imágenes de vista previa (generadas)
  img/arquetipos, img/almas   24 imágenes hechas con Higgsfield (12 de Vida, 12 del Alma)
scripts/build.mjs       Valida cuestionarios y genera páginas e imágenes para compartir
scripts/pdf.mjs         Informes Markdown → PDF (versión estática, alternativa)
scripts/exportar-suscriptoras.mjs   Exporta la lista de email a CSV
informes/               Plantilla de los informes (el contenido de pago no se sube: el repo es público)
tests/                  Pruebas del motor y de principio a fin en móviles emulados
.claude/skills/         Skills de diseño instaladas (taste-skill y ui-ux-pro-max, licencia MIT)
```

## Comandos

```bash
npm install
npm test                          # numerología, IA, pagos e informe (con Stripe y Gemini simulados)
npm run test:e2e                  # cuestionario, oferta, pago, informe y páginas legales en iPhone y Android emulados
npm run build                     # valida y regenera páginas e imágenes para compartir
npm run pdf -- numero-de-vida 1   # genera informes/pdf/numero-de-vida-1.pdf y su portada
npm run dev                       # sirve web/ en http://localhost:3000
npm run capturas                  # capturas de todas las pantallas en iPhone SE, iPhone 13 y Android 360px (claro y oscuro)
npm run ejemplos                  # regenera las páginas de ejemplo del informe que se muestran en la oferta
```

## Cómo añadir un cuestionario nuevo

1. Crea `web/quizzes/<id>.json` siguiendo el formato de `numero-de-vida.json`. Usa `"calculo": { "tipo": "puntuacion" }` y pon `puntos` en cada opción para los tests por respuestas.
2. `npm run build` (valida que no falte ningún texto) y `npm test`.
3. Se accede con `/?q=<id>`.
