# Plan de acción — Claude Code (parte técnica)

Claude Code se encarga del código en este repositorio: la web, las herramientas y la publicación.
Los textos y el contenido los hace Claude Cowork (ver `brief-claude-cowork.md`).

## Fase 1 — Cuestionario "Tu Número de Vida" (días 1–5)

**Qué es:** un cuestionario de 60 segundos, en español y pensado para el móvil. Una pregunta por pantalla, con una barra de progreso. Al final muestra un resultado personalizado y el botón para comprar la guía.

Requisitos:
- [ ] HTML, CSS y JS estáticos, sin framework. Carga rápida en móviles de gama media con conexión 4G lenta.
- [ ] Letra grande (texto base de 18px o más), mucho contraste y botones grandes que se tocan con el pulgar. El público tiene más de 30 años.
- [ ] Preguntas: fecha de nacimiento → área de interés → ánimo → números repetidos → nombre. Detalle en `estrategia.md`, apartado 3.
- [ ] Cálculo del Número de Vida:
  - Se suman todos los dígitos de la fecha completa y se reduce el resultado.
  - Si durante la reducción aparece 11, 22 o 33, se detiene ahí (son números maestros).
  - Ejemplo: 14/03/1985 → 1+4+0+3+1+9+8+5 = 31 → 3+1 = **4**.
  - Con pruebas para cada resultado posible (1–9, 11, 22, 33).
- [ ] Resultado:
  - "[Nombre], tu Número de Vida es el [N]: [Arquetipo]"
  - el adelanto del número
  - un párrafo según el área elegida
  - una frase según el ánimo
  - botón **"Quiero mi guía completa"** que lleva a la tienda de ese número
- [ ] Botón **"Compartir por WhatsApp"** con un texto ya escrito.
- [ ] No se guarda ningún dato. Todo se calcula en el navegador.
- [ ] Aviso visible: "Contenido de entretenimiento y autoconocimiento."
- [ ] Textos y enlaces en un solo archivo de datos (`web/data/resultados.json`) con el formato del brief de Cowork. Así se cambian sin tocar el código.
- [ ] Imagen para compartir (Open Graph) general y una por número.
- [ ] Medición sin cookies (Vercel Web Analytics): empiezan, terminan, clic en comprar, clic en compartir.
- [ ] Publicación en Vercel o GitHub Pages con una URL pública.

**Qué necesito de ti o de Cowork:**
- el nombre de la marca
- el archivo `resultados.json`
- los 12 enlaces de la tienda

Hasta tenerlos, uso textos y enlaces de prueba para que la web esté lista antes.

**Hecho cuando:** está publicada, funciona en iPhone y Android, las pruebas de cálculo pasan y el botón de comprar lleva a la tienda del número correcto.

## Fase 2 — Generador de imágenes para TikTok (semana 2)

- [ ] Un script que toma una imagen de fondo (hecha con IA) y un texto, y genera tarjetas verticales de 1080×1920 con la tipografía y los colores de la marca.
- [ ] Sirve para hacer carruseles ("los 12 Números de Vida", "qué significa 111, 222, 333…") sin diseñar cada imagen a mano.
- [ ] Entrada: una carpeta de fondos y un CSV o JSON con los textos (lo prepara Cowork). Salida: los PNG listos para subir.

## Fase 3 — Compatibilidad de pareja (semana 3)

- [ ] Modo "pareja" en el cuestionario: dos fechas, dos números, un resumen de compatibilidad y el botón al producto de pareja o al paquete.

## Fase 4 — Extra de temporada 2027 (mediados de noviembre)

- [ ] Pregunta extra o calculadora del Año Personal 2027 (día + mes + 2027, reducido del 1 al 9) con el color y el ritual del 31 de diciembre, y el botón a la guía 2027.

## Fuera de alcance por ahora

- App móvil, cuentas de usuario, suscripciones, chat con IA, bot de WhatsApp y recogida de emails. Solo se retoman si el negocio ya vende.
