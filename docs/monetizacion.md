# Cómo gana dinero el negocio (y por qué la gente compra)

## Qué dice la investigación

- **Los informes de numerología más vendidos usan la carta completa:** Número de Vida, Alma, Expresión, Personalidad, Cumpleaños y Año Personal. numerologist.com vende informes de 29,99 USD, una previsión anual de 39,99 USD y un "deluxe" de 77 USD, siempre con un resumen gratis delante.
- **Los cuestionarios con resultado personalizado convierten mucho mejor que el contenido estático.** El modelo habitual es un resumen gratis y el informe detallado de pago.
- **Móvil:** convierte la mitad que el ordenador, y la mayoría de los abandonos se deben a fricción. Las palancas que funcionan son un botón de compra siempre visible, pocas pantallas, señales de confianza cerca del pago y cero sorpresas en el precio.
- **Latinoamérica:** hacen falta la moneda local y métodos locales. Stripe Adaptive Pricing muestra el precio en la moneda de cada persona, y en México OXXO supone más del 30% de las transacciones.

## El embudo

```
TikTok (gratis) → Cuestionario de 11 preguntas → Lectura gratis con IA (muy personal)
   → Oferta con 3 planes → Pago en Stripe → Informe escrito para ella → Mejora de plan → Regalo / email mensual
```

## Palancas implementadas (y el motivo de cada una)

| Palanca | Dónde | Por qué vende |
|---|---|---|
| **Carta completa** calculada en el teléfono (Vida, Alma, Expresión, Personalidad, Cumpleaños, Año y Mes Personal) | Cuestionario | Se siente "hecho para mí". Es lo que venden los líderes del sector. |
| **144 arquetipos combinados** ("La Constructora con alma de sanadora") + 24 imágenes (12 de Vida y 12 del Alma) | Resultado, informe, WhatsApp | Identidad propia. Es muy compartible, y compartir trae más visitas gratis. |
| **Lectura gratis con IA** que usa sus números y sus 9 respuestas | Resultado | Da valor real antes de pedir dinero. Genera confianza. |
| **Mes clave** ("Tu mes clave para el amor: mayo de 2027") | Resultado | Deja una pregunta abierta y honesta: el qué hacer ese mes está en el informe. |
| **Portada con su nombre** ("El informe de María") | Oferta | Ve lo que va a recibir antes de pagar. |
| **"En tu informe descubrirás"** escrito con sus datos | Oferta | Beneficios concretos, no una lista genérica. |
| **3 planes** (9,99 / 14,99 / 19,99 USD) con el del medio recomendado y preseleccionado | Oferta | Subir de precio sube el ticket medio. El plan intermedio es la opción natural. |
| **Garantía de 7 días, pago único y entrega al momento** | Oferta | Quita los miedos habituales. |
| **Sus 12 meses con su número real** (mes clave destacado) y el significado bloqueado | Oferta | Ve algo concreto y suyo que el informe completa. Es la forma más honesta de generar curiosidad. |
| **"Así es un informe por dentro"**: 3 páginas reales de un informe de ejemplo | Oferta | Ve la calidad antes de pagar. Quita el miedo a "¿será genérico?". |
| **Botón "Descubrir qué hacer en [mes]"** dentro de la tarjeta del mes clave | Resultado | Lleva a los planes justo cuando la curiosidad está más alta. |
| **Botón de compra en dos líneas** (acción + "precio · pago único") | Oferta | El precio y la ausencia de suscripción quedan claros en el mismo toque. |
| **Aviso al volver del pago** (y un cupón real, si lo configuras) | Oferta | Recupera ventas de quien dudó en el último paso. |
| **Preguntas frecuentes** (¿es igual para todas?, ¿es suscripción?, ¿qué datos guardan?) | Oferta | Responde las objeciones justo donde aparecen. |
| **Barra de compra fija** en el móvil | Resultado | El botón está siempre a mano sin volver a subir. |
| **Recuperación si cancela el pago** | Vuelta desde Stripe | Vuelve a su resultado, no a empezar de cero. |
| **Informe escrito por IA para cada compradora** (unas 3.000 palabras, 12 meses, ritual, plan, compatibilidad) | Informe | Vale mucho más que un PDF igual para todas y genera menos reembolsos. |
| **Mejora pagando la diferencia** (5,99 / 10,99 USD) | Informe básico | Una segunda venta a quien ya confió. |
| **Compatibilidad** con hasta 5 personas | Pack Completo | Da razones para volver y hablar del informe con otros. |
| **Regalo por WhatsApp** y **email "tu número del mes"** | Informe y resultado | Crea una lista propia para volver a vender sin anuncios (p. ej. la guía 2027 en noviembre). |

## Reglas que NO se rompen (y que también protegen las ventas)

- **Nada de suscripciones escondidas, temporizadores falsos ni "solo quedan 3".** Son el origen de las quejas y los contracargos de Nebula o myIQ, y pueden llevar al cierre de la cuenta de Stripe.
- **Nada de testimonios ni cifras inventadas.** Cuando tengas opiniones reales (con permiso), se pueden añadir.
- **Precio claro antes de pagar**, garantía real y reembolsos fáciles.
- **Entretenimiento y autoconocimiento**, sin promesas ni consejos médicos o financieros.

## Qué medir cada semana (eventos de analítica ya enviados)

| Paso del embudo | Evento |
|---|---|
| Empiezan el cuestionario | `quiz_inicio` |
| Abandono por pregunta | `quiz_paso` (con el id de la pregunta) |
| Terminan | `quiz_completado` (`ia: true/false`) |
| La IA falló | `lectura_ia` (`estado: fallo`) |
| Miran planes | `plan_elegido`, `barra_compra_clic`, `mes_clave_clic`, `ejemplo_visto` |
| Intentan pagar | `comprar_clic` (con `producto`) |
| Cancelan en Stripe | `compra_cancelada` |
| Compran | Ventas en el panel de Stripe (la fuente de verdad) |
| Mejoran de plan | `mejora_clic` y ventas "Mejora a…" en Stripe |
| Comparten | `compartir` |
| Se suscriben | `suscripcion` |

Para activar la analítica, pon `"analitica": { "proveedor": "umami", "id": "…" }` en `web/site.json` (Umami Cloud tiene plan gratuito y no usa cookies).

## Próximos experimentos (en este orden)

1. **Precio:** probar 12,99 / 17,99 / 24,99 USD. Los informes equivalentes se venden a 29,99 USD o más.
2. **Guía 2027 de temporada** (mediados de noviembre) como cuarto producto y como mejora.
3. **Email mensual:** exporta la lista (`scripts/exportar-suscriptoras.mjs`) y envía "tu número del mes" con enlace a la mejora de 12 meses.
4. **Opiniones reales:** pide opinión a las primeras compradoras (con permiso) y muéstralas en la oferta.
5. **Segundo cuestionario** (heridas emocionales o diosas), reutilizando el mismo motor.
