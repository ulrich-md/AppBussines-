# Sistema de diseño

Aplicamos las skills instaladas en `.claude/skills/`:
- **taste-skill** (`design-taste-frontend`, de Leonxlnx/taste-skill)
- **ui-ux-pro-max** (de nextlevelbuilder/ui-ux-pro-max-skill)

Este documento es la referencia para cualquier pantalla, imagen o PDF nuevo.

## Lectura del encargo (taste-skill §0.B)

> Lo entendemos así: una **web de cuestionario pensada para el móvil**, dirigida a **mujeres hispanohablantes de 45 a 65 años** interesadas en la numerología. El lenguaje visual es **cálido y sereno (crema, ciruela y luz dorada)**, con **HTML/CSS propio** (sin framework), **tipografías alojadas en el sitio** e **iconos de Phosphor**. La referencia que gusta a la dueña es dianaborda.com/consulta.

- **Modo:** rediseño completo de lo visual. Se conservan el contenido, las URL y los eventos de analítica (taste-skill §11).
- **Diales:** `DESIGN_VARIANCE 5 · MOTION_INTENSITY 5 · VISUAL_DENSITY 3`. Es un producto de consumo tranquilo, con prioridad en la accesibilidad para mayores de 30. Los mismos valores se pasaron al generador de ui-ux-pro-max (`--variance 5 --motion 5 --density 3`).
- **Límite de alcance:** taste-skill no cubre los formularios de varios pasos (§13). Sus reglas se aplican a la portada y al resultado. Las preguntas siguen las pautas de UX de ui-ux-pro-max: pantallas táctiles, formularios y accesibilidad.
- **Base técnica:** taste-skill propone React, Tailwind y Motion por defecto. No se adoptan porque el proyecto ya existe como HTML estático y cambiar de base técnica no aporta nada al usuario final (§11.C: preservar).

## Color: crema cálido, un acento ciruela y dorado para detalles

Revisión de septiembre de 2026, pensada para un público de 45 a 65 años. Se basa en tres fuentes:
- un agente de investigación que analizó dianaborda.com y las pautas de NN/g y WCAG para personas mayores;
- una auditoría de UX hecha con ui-ux-pro-max;
- la recomendación `--design-system` de ui-ux-pro-max: morado con dorado cálido para "spiritual numerology women 45-65".

| Variable | Valor | Uso | Contraste |
|---|---|---|---|
| `--fondo` | `#FBF6EF` | Fondo de página (crema) | — |
| `--superficie` | `#FFFFFF` | Tarjetas, opciones, campos | — |
| `--superficie-2` | `#F5E9EF` | Barra de progreso, esqueleto | — |
| `--texto` | `#2A1E28` | Texto principal | 14,9:1 (AAA) |
| `--texto-suave` | `#5C4B57` | Texto secundario | 7,5:1 (AAA) |
| `--acento` | `#8A2D5E` | Único acento: botones, enlaces, títulos de sección | Blanco sobre botón 8,0:1 (AAA) |
| `--acento-hover` | `#72234D` | Botón al pasar o pulsar | 10,2:1 |
| `--acento-suave` | `#F5E9EF` | Opción elegida, mes clave | — |
| `--dorado` | `#8A5A14` | Solo detalles: estrellas, sello de compra verificada | 5,5:1 |
| `--borde` | `#E8DCD0` | Separadores (decorativo) | — |
| `--borde-control` | `#8F7D88` | Contorno de campos, opciones y planes | 3,6:1 (WCAG 1.4.11) |

- **Por qué se abandona el azul cobalto:**
  - Con la edad, el cristalino amarillea y se distinguen peor los azules y los violetas pálidos. Los tonos cálidos se ven mejor.
  - El cobalto sobre neutros fríos, con cielos nocturnos, transmitía "app tecnológica".
  - La referencia (Diana Borda) evolucionó de un lavanda frío a un ciruela-magenta cálido.
- **taste-skill** prohíbe por defecto el morado y el crema con dorado. Aquí se justifica por el género (numerología) y por el público. Se evita el cliché con estas decisiones:
  - ciruela oscuro en lugar de violeta neón;
  - el dorado solo en detalles, nunca en botones;
  - sin degradados ni brillos.
- **Solo modo claro.** Para este público, el modo oscuro automático hacía la página más fría y difícil de leer.
- **El color de cada número** (rojo para el 1, verde para el 4…) sigue siendo contenido: solo aparece en el aro del número y en "tu color de poder".

## Tipografía

- **Lora** para títulos (cálida y legible) y **Nunito Sans** para texto.
  - Nunito Sans sustituye a Raleway, que tenía cifras de estilo antiguo y trazos finos, un mal encaje para una web de números y para un público mayor.
- Alojadas en `web/fonts/` (licencia OFL). Sin enlaces a Google Fonts.
- Cifras siempre "lining" (`font-variant-numeric: lining-nums`).
- Tamaños:
  - texto base de 18px con interlineado 1,6;
  - textos secundarios de 0,9rem como mínimo;
  - pie de página de 1rem.
- Títulos con `text-wrap: balance`.
- El ejemplo del campo nombre va en cursiva, con peso normal y en gris, para que no parezca un nombre ya escrito.

## Formas y espaciado

- **Radios (regla documentada):**
  - controles (botones, opciones, campos): 14px
  - contenedores (imágenes, informe, afirmación): 20px
  - etiquetas: píldora
  - el número: círculo
- **Tarjetas** solo donde hay jerarquía real: el bloque del informe de pago. Las secciones de la lectura se separan con espacio y una línea fina (taste-skill §4.4).
- Zonas táctiles de 44px o más. Botones de 58px de alto. Opciones de 64px (ui-ux-pro-max: prioridad 2).

## Iconos e imágenes

- **Iconos:** Phosphor (peso "regular"), en el sprite `web/img/iconos.svg` que genera `npm run build`. **Sin emojis** en la interfaz (taste-skill §3.D, ui-ux-pro-max: prioridad 4).
- **Imágenes generadas con Higgsfield** (taste-skill §4.8), todas de la misma familia visual: fotografía cálida al atardecer, a la luz de las velas o con luz dorada, en tonos crema, rosa y ciruela. Sin texto. Las mujeres que aparecen son maduras y latinas, y el pie indica que las imágenes son de IA.
  - `img/portada-*.webp`: portada (mujer de unos 55 años escribiendo junto a la ventana).
  - `img/pasos/<n>.webp`: los 3 pasos de "Así funciona".
  - `img/almas/<n>.webp`: una imagen por Número del Alma, en el bloque "Tu mundo interior".
  - `img/arquetipos/<n>-*.webp`: una imagen por arquetipo. Se usa en el resultado, en la página para compartir, en la vista previa de WhatsApp y en la portada del informe.
- Formato WebP a 640 y 896px de ancho (unos 20 a 90 KB cada una). Todas con `width` y `height` para que la página no salte al cargar, y con texto alternativo descriptivo.

## Movimiento (reducido para este público)

| Animación | Qué comunica |
|---|---|
| Entrada de pantalla (10px y opacidad, 400ms) | Cambio de paso |
| Aparición del número (escala, 600ms) | El momento de la revelación |
| Esqueleto con brillo | Que la lectura se está escribiendo |
| Marca de elegida y pausa de 450ms antes de pasar de pregunta | Que el toque se registró (y da tiempo a corregir) |

- Se quitaron las animaciones escalonadas de opciones y bloques (ui-ux-pro-max: "Excessive Motion").
- Todo se desactiva con `prefers-reduced-motion`.

## Portada (landing corta bajo el botón)

El botón sigue visible sin hacer scroll: el tráfico de TikTok no debe encontrar pasos extra. Debajo, en este orden:
1. Línea de confianza: gratis, sin registro, tu nombre y tu fecha no salen de tu teléfono.
2. "Así funciona" en 3 pasos con imagen.
3. "Lo que vas a recibir": un resultado real (el del Número 6), marcado como ejemplo.
4. Opiniones: **solo reales**, de compradoras verificadas y con permiso (`web/testimonios.json`, se añaden con `scripts/opiniones.mjs`). Si no hay ninguna, la sección no aparece.
5. Botón final.

Todo el texto de la portada está en `quizzes/<id>.json` → `portada`.

## Texto

- **Cero guiones largos** (— y –) en todo el texto visible (taste-skill §9.G). Las pruebas lo comprueban y la lectura de la IA se limpia automáticamente.
- Primera pantalla de la portada con título, subtítulo, un botón y la línea de confianza (taste-skill §4.7).
- Un solo botón por intención: "Descubrir mi número", "Quiero mi informe", "Enviar por WhatsApp" y el enlace "Copiar enlace".

## Verificación automática

`npm run test:e2e` recorre el cuestionario en iPhone y Android emulados y comprueba:
- que no haya emojis ni guiones largos visibles
- que cada opción tenga su icono SVG
- que las imágenes carguen y respeten su proporción
- que no haya desbordamiento horizontal

Guarda capturas en `tests/capturas/`.
