# Sistema de diseño

Aplicamos las skills instaladas en `.claude/skills/`:
- **taste-skill** (`design-taste-frontend`, de Leonxlnx/taste-skill)
- **ui-ux-pro-max** (de nextlevelbuilder/ui-ux-pro-max-skill)

Este documento es la referencia para cualquier pantalla, imagen o PDF nuevo.

## Lectura del encargo (taste-skill §0.B)

> Lo entendemos así: una **web de cuestionario pensada para el móvil**, dirigida a **mujeres hispanohablantes de 30 a 55 años** interesadas en la numerología. El lenguaje visual es **tranquilo y nocturno ("cielo de noche")**, con **HTML/CSS propio** (se mantiene la base técnica actual, sin framework), **tipografías alojadas en el sitio** e **iconos de Phosphor**.

- **Modo:** rediseño completo de lo visual. Se conservan el contenido, las URL y los eventos de analítica (taste-skill §11).
- **Diales:** `DESIGN_VARIANCE 5 · MOTION_INTENSITY 5 · VISUAL_DENSITY 3`. Es un producto de consumo tranquilo, con prioridad en la accesibilidad para mayores de 30. Los mismos valores se pasaron al generador de ui-ux-pro-max (`--variance 5 --motion 5 --density 3`).
- **Límite de alcance:** taste-skill no cubre los formularios de varios pasos (§13). Sus reglas se aplican a la portada y al resultado. Las preguntas siguen las pautas de UX de ui-ux-pro-max: pantallas táctiles, formularios y accesibilidad.
- **Base técnica:** taste-skill propone React, Tailwind y Motion por defecto. No se adoptan porque el proyecto ya existe como HTML estático y cambiar de base técnica no aporta nada al usuario final (§11.C: preservar).

## Color: un solo acento, neutros fríos

| Variable | Claro | Oscuro | Uso |
|---|---|---|---|
| `--fondo` | `#F3F4F9` | `#0B0F1E` | Fondo de página |
| `--superficie` | `#FCFCFE` | `#141A2E` | Opciones, campos, informe |
| `--superficie-2` | `#E8EBF4` | `#1D2440` | Barra de progreso, esqueleto, desactivado |
| `--texto` | `#141A2E` | `#ECEFF8` | Texto principal |
| `--texto-suave` | `#4A5270` | `#A9B0CC` | Texto secundario |
| `--acento` | `#2F48B8` | `#93A6FF` | Único color de acento: botones, títulos de sección, iconos |
| `--acento-suave` | `#E3E8FA` | `#222C57` | Fondo de iconos y opción elegida |
| `--borde` | `#D5DAE8` | `#2A3252` | Bordes y líneas finas |

- **Por qué no morado ni crema con dorado:** son los dos patrones "típicos de IA" que taste-skill prohíbe por defecto (§4.2: la regla del morado y la paleta prohibida para marcas de bienestar). El azul cobalto encaja con la imagen de cielo nocturno.
- **El color de cada número** (rojo para el 1, verde para el 4…) es **contenido**, no decoración: solo aparece en el aro del número y en la muestra "tu color de poder".
- **Contraste verificado (WCAG):** todos los pares pasan AA y la mayoría AAA. Por ejemplo: botón 7,5:1 en claro y 8,3:1 en oscuro; texto secundario 7,0:1 y 8,9:1.
- **Modo oscuro:** se activa automáticamente según la preferencia del sistema (`prefers-color-scheme`).

## Tipografía

- **Lora** para títulos y **Raleway** para texto. Es la combinación "wellness" que recomienda ui-ux-pro-max.
- Serif justificada según taste-skill §4.1: la numerología es una tradición antigua, con estética de manuscrito. Lora no está en la lista de prohibidas (Fraunces e Instrument Serif).
- Alojadas en `web/fonts/` (licencia OFL). Sin enlaces a Google Fonts.
- Cifras siempre "lining" (`font-variant-numeric: lining-nums`), porque las cifras antiguas de Raleway confunden en una web de números.
- Texto base de 18px con peso 500, interlineado 1,6. Títulos con `text-wrap: balance`.
- La cursiva (frase-resumen) usa interlineado 1,3 y margen inferior para no cortar letras como la "g" o la "p" (taste-skill §4.1).

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
- **Imágenes reales generadas con Higgsfield** (taste-skill §4.8), todas de la misma familia visual: fotografía artística nocturna en azul cobalto, figuras solo de espaldas y sin texto.
  - `img/portada-*.webp`: portada del cuestionario.
  - `img/arquetipos/<n>-*.webp`: **una imagen por arquetipo**. Se usa en el resultado, en la página para compartir, en la vista previa de WhatsApp y en la portada del informe y del PDF.
- Formato WebP a 640 y 896px de ancho (unos 20 a 90 KB cada una). Todas con `width` y `height` para que la página no salte al cargar, y con texto alternativo descriptivo.

## Movimiento (MOTION 5, con motivo)

| Animación | Qué comunica |
|---|---|
| Entrada de pantalla (10px y opacidad, 400ms) | Cambio de paso |
| Opciones escalonadas (40ms cada una) | Orden de lectura |
| Aparición del número (escala, 600ms) | El momento de la revelación |
| Esqueleto con brillo | Que la lectura se está escribiendo |
| `:active` con 1px hacia abajo | Respuesta al toque |

- Solo se animan `transform` y `opacity`. Todo se desactiva con `prefers-reduced-motion`.
- No hay listeners de scroll.

## Texto

- **Cero guiones largos** (— y –) en todo el texto visible (taste-skill §9.G). Las pruebas lo comprueban y la lectura de la IA se limpia automáticamente.
- Portada con 3 elementos: título, subtítulo de 16 palabras y un solo botón (taste-skill §4.7).
- Un solo botón por intención: "Descubrir mi número", "Quiero mi informe", "Enviar por WhatsApp" y el enlace "Copiar enlace".

## Verificación automática

`npm run test:e2e` recorre el cuestionario en iPhone y Android emulados, **en modo claro y oscuro**, y comprueba:
- que no haya emojis ni guiones largos visibles
- que cada opción tenga su icono SVG
- que las imágenes carguen y respeten su proporción
- que no haya desbordamiento horizontal

Guarda capturas en `tests/capturas/`.
