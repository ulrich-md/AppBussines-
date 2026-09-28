# Plan de acción — Claude Code (parte técnica)

Claude Code se encarga del código en este repositorio: la web, las herramientas y la publicación.
Los textos y el contenido los hace Claude Cowork (ver `brief-claude-cowork.md`).

## Fase 1 — Calculadora web "Tu Número 2027" (semanas 1–2)

**Qué es:** una página de una sola pantalla, en español, pensada para el móvil. La persona pone su día y mes de nacimiento, ve su Año Personal 2027 con un adelanto gratis y un botón para comprar su guía.

Requisitos:
- [ ] HTML, CSS y JS estáticos, sin framework. Carga rápida en móviles de gama media con conexión 4G lenta.
- [ ] Letra grande (texto base de 18px o más), mucho contraste y botones grandes. El público tiene más de 30 años.
- [ ] Cálculo: suma de los dígitos del día + mes + 2027, reducida a un número del 1 al 9. Ejemplo: 14/03 → 1+4+0+3+2+0+2+7 = 19 → 1+9 = 10 → 1+0 = **1**.
- [ ] Mostrar el resultado:
  - título del número
  - adelanto gratis (60–80 palabras)
  - "tu color para el 31 de diciembre"
  - botón **"Quiero mi guía completa"** que lleva a la tienda de ese número
- [ ] Botón **"Compartir por WhatsApp"** con un texto ya escrito. Es el canal principal de este público.
- [ ] No se guarda ningún dato. La fecha se calcula en el navegador.
- [ ] Aviso visible: "Contenido de entretenimiento y autoconocimiento."
- [ ] Textos y enlaces en un solo archivo de datos (`web/data/numeros.json`), para cambiarlos sin tocar el código.
- [ ] Imagen para compartir (Open Graph) general y una por número.
- [ ] Medición sin cookies (Vercel Web Analytics): visitas, cálculos y clics en comprar y compartir.

**Qué necesito de ti o de Cowork:**
- el nombre de la marca
- el archivo `teasers.json` con los adelantos (formato en el brief de Cowork)
- los 9 enlaces de la tienda

Hasta tenerlos, uso textos y enlaces de prueba.

**Hecho cuando:** está publicada en una URL pública, funciona en iPhone y Android, y el cálculo da el resultado correcto en los casos de prueba.

## Fase 2 — Generador de imágenes para TikTok (semana 3)

- [ ] Un script que toma una imagen de fondo (hecha con IA) y un texto, y genera tarjetas verticales de 1080×1920 con la tipografía y los colores de la marca.
- [ ] Sirve para hacer carruseles de 9 imágenes, una por número, sin diseñar cada una a mano.
- [ ] Entrada: una carpeta de fondos y un CSV o JSON con los textos (lo prepara Cowork). Salida: los PNG listos para subir.

## Fase 3 — Temporada de diciembre (finales de noviembre)

- [ ] Sección "Tu ritual de Año Nuevo según tu número" en la calculadora.
- [ ] Opción de pareja: dos fechas, dos números y la compatibilidad, con botón al Pack Pareja.

## Fase 4 — "Tu Número de Vida" (enero 2027)

- [ ] Segunda calculadora con la fecha completa y los números maestros 11, 22 y 33, más el botón al nuevo producto.
- [ ] Revisar los datos de medición y ajustar textos y botones según lo que convirtió mejor.

## Fuera de alcance por ahora

- App móvil, cuentas de usuario, suscripciones, chat con IA y bot de WhatsApp. Solo se retoman si el negocio ya vende.
