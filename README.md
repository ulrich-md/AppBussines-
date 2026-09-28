# Cuestionarios de numerología y autoconocimiento

Negocio digital para mujeres hispanohablantes de 30 a 55 años.
Cuestionarios web gratis con un resultado básico y un informe completo en PDF de pago único. Se promociona solo con TikTok orgánico.

## Documentos

- [`docs/estrategia.md`](docs/estrategia.md): modelo de negocio, público, catálogo de cuestionarios, reglas y métricas.
- [`docs/plan-claude-code.md`](docs/plan-claude-code.md): plan de acción y estado de cada tarea.
- [`docs/marca.md`](docs/marca.md): 10 propuestas de marca (pendiente de elegir).
- [`docs/tienda.md`](docs/tienda.md): textos para la ficha de la tienda.
- [`contenido/tiktok-guiones.md`](contenido/tiktok-guiones.md): 30 guiones para las 2 primeras semanas.

## Estructura

```
web/                    Sitio estático (lo que se publica)
  index.html            Cuestionario (usa ?q=<id> para elegir otro)
  site.json             Marca, colores y analítica
  quizzes/<id>.json     Preguntas, cálculo, textos y enlaces de compra de cada cuestionario
  js/engine.js          Lógica de cálculo (sin DOM, probada en Node)
  js/app.js             Interfaz
  r/<id>/<resultado>.html   Páginas para compartir (generadas)
  og/<id>/*.png         Imágenes de vista previa (generadas)
scripts/build.mjs       Valida cuestionarios y genera páginas e imágenes para compartir
scripts/pdf.mjs         Informes Markdown → PDF + portadas de tienda
informes/               Plantilla de los informes (el contenido de pago no se sube: el repo es público)
tests/                  Pruebas del motor y de principio a fin en móviles emulados
```

## Comandos

```bash
npm install
npm test                          # pruebas del motor de cálculo
npm run test:e2e                  # recorrido completo en iPhone y Android emulados
npm run build                     # valida y regenera páginas e imágenes para compartir
npm run pdf -- numero-de-vida 1   # genera informes/pdf/numero-de-vida-1.pdf y su portada
npm run dev                       # sirve web/ en http://localhost:3000
```

## Cómo añadir un cuestionario nuevo

1. Crea `web/quizzes/<id>.json` siguiendo el formato de `numero-de-vida.json`. Usa `"calculo": { "tipo": "puntuacion" }` y pon `puntos` en cada opción para los tests por respuestas.
2. `npm run build` (valida que no falte ningún texto) y `npm test`.
3. Se accede con `/?q=<id>`.
