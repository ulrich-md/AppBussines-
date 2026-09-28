# Plan de acción — Claude Code

Claude Code lo hace **todo lo que se puede hacer desde el ordenador** en este repositorio: web, textos, informes en PDF, guiones de TikTok e imágenes.
Tú te encargas de lo que requiere tus cuentas o tu voz (ver "Lo que haces tú" al final).

## Fase 1 — Motor de cuestionarios + "Tu Número de Vida" (días 1–4)

Un solo **motor** sirve para todos los cuestionarios. Cada cuestionario nuevo es un archivo de configuración con sus preguntas, cálculo, resultados y enlaces, sin reprogramar nada.

- [ ] Web estática (HTML, CSS y JS sin framework), pensada para el móvil. Una pregunta por pantalla, con una barra de progreso.
- [ ] Letra grande (18px o más), mucho contraste y botones grandes. El público tiene más de 30 años.
- [ ] Dos tipos de cálculo:
  - **fórmula:** el Número de Vida, que suma los dígitos de la fecha y conserva 11, 22 y 33
  - **puntuación por respuestas:** para los tests de heridas y de diosas
- [ ] Pruebas de cálculo para cada resultado posible.
- [ ] Pantalla de resultado:
  - resultado gratis personalizado (nombre, texto del resultado y párrafo según el área elegida)
  - vista previa de "lo que incluye tu informe completo", con el precio visible
  - botón de compra que lleva al producto de ese resultado
- [ ] Botón **"Compartir por WhatsApp"** y un enlace para compartir con una imagen distinta por resultado.
- [ ] Aviso de entretenimiento. No se guarda ningún dato: todo se calcula en el navegador.
- [ ] Medición sin cookies: empiezan, terminan, clic en comprar, clic en compartir.
- [ ] Publicación en Vercel o GitHub Pages con una URL pública.

**Hecho cuando:** "Tu Número de Vida" funciona de principio a fin en iPhone y Android, las pruebas pasan y cada resultado lleva a su producto.

## Fase 2 — Contenido del primer cuestionario (días 1–5, a la vez que la Fase 1)

- [ ] Propuesta de **10 nombres de marca** con biografía, colores y tipografías. **Tú eliges.**
- [ ] Textos de los 12 resultados: adelanto, 4 áreas (amor, dinero, paz, familia) y frases según el ánimo.
- [ ] **12 informes en PDF** (unas 15 páginas cada uno). Se escriben en Markdown y se convierten a PDF con una plantilla HTML y Chromium, que ya está instalado. Lo primero es **el informe del número 1, para que lo apruebes.**
- [ ] Textos de la tienda: título, descripción, preguntas frecuentes, garantía y aviso legal, más la portada.
- [ ] **30 guiones de TikTok** para empezar a publicar el día 1, con gancho, texto en pantalla, lo que dices con tu voz, llamada a la acción, hashtags y **prompt para la imagen IA**.

## Fase 3 — Generador de imágenes para TikTok (semana 2)

- [ ] Un script que genera tarjetas y carruseles verticales de 1080×1920 con la marca, a partir de fondos hechos con IA y de los textos del repositorio.
- [ ] Imágenes de fondo generadas con IA (con la herramienta de imágenes conectada o con prompts para que las generes tú).

## Fase 4 — Segundo cuestionario: "¿Qué herida emocional arrastras?" (semana 2)

- [ ] Configuración: 10–12 preguntas con puntuación por respuestas y 5 resultados.
- [ ] 5 informes en PDF y textos de la tienda.
- [ ] Aviso: "No es un diagnóstico. Si estás pasando un momento difícil, busca apoyo profesional."
- [ ] 15 guiones de TikTok para probar si interesa.

## Fase 5 — Informe personalizado automático (semana 3–4, solo si ya hay ventas)

- [ ] Pago con Stripe o Lemon Squeezy. Al pagar, una función en Vercel genera un PDF **con el nombre y la fecha** de la persona y se lo envía por email.
- [ ] Así se puede cobrar 12–15 USD con 1 producto por cuestionario, en lugar de 12.

## Fase 6 — Más cuestionarios según lo que venda

- [ ] "¿Qué diosa vive en ti?" (arquetipos con imágenes IA).
- [ ] Compatibilidad de pareja (extra para quien ya compró).
- [ ] "Tu Año Personal 2027" (a mediados de noviembre, con rituales de Año Nuevo).

## Revisión semanal

Cada lunes abres una sesión, pegas tus estadísticas de TikTok, las del cuestionario y tus ventas. Claude Code:
1. analiza qué funcionó y dónde se pierde la gente
2. escribe los guiones de la semana siguiente
3. ajusta los textos o el precio en la web

## Fuera de alcance por ahora

- App móvil, cuentas de usuario, suscripciones y chat con IA.

## Lo que haces tú

1. Elegir la marca.
2. Crear la cuenta de TikTok como **cuenta de empresa** y publicar desde el día 1, con tu voz.
3. Abrir la tienda (Hotmart, Gumroad o Lemon Squeezy), subir los PDF y pasarme los enlaces de los productos.
4. Crear o conectar una cuenta de Vercel (o usar GitHub Pages) para publicar la web.
5. Pegar tus estadísticas cada lunes.
