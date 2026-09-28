# Puesta en marcha: de la web a las primeras ventas

Todo el código ya está listo. Lo que falta son **tus cuentas y tus claves**. Nunca se escriben en el código: van en Vercel → Project → Settings → **Environment Variables** (Production y Preview, marcadas como *Sensitive*).

## 1. Publicar la web (5 minutos)

1. En Vercel, importa el repositorio con **Root Directory = `web`** y el preset **Other**.
2. Cuando tengas la URL (o tu dominio), ponla en `web/site.json` → `url_base` y ejecuta `npm run build`. Así las vistas previas de WhatsApp muestran la imagen correcta.
3. En `web/site.json` pon también tu **email de atención** en `contacto`. Aparece en términos, privacidad y reembolsos, y Stripe lo exige.

## 2. Variables de entorno

| Variable | Obligatoria | Para qué |
|---|---|---|
| `GEMINI_API_KEY` | Sí | Lectura gratis e informe de pago. **Cambia la clave que compartiste en el chat.** |
| `STRIPE_SECRET_KEY` | Sí, para cobrar | Empieza con `sk_test_…` para probar y cambia a `sk_live_…` para vender. |
| `SITE_URL` | Recomendada | Tu dirección pública (p. ej. `https://tunumerosagrado.com`). Se usa en los enlaces de pago. |
| `BLOB_READ_WRITE_TOKEN` | Sí, para vender | Guarda cada informe (privado) para que la compradora pueda volver a abrirlo sin volver a pagar a la IA. También guarda la lista de emails. |
| `INFORME_SECRETO` | Recomendada | Cualquier texto largo y aleatorio. Protege las rutas de los informes guardados. |
| `RESEND_API_KEY` y `EMAIL_FROM` | Opcional | Envía por email el enlace del informe (p. ej. `EMAIL_FROM="Tu Número Sagrado <hola@tudominio.com>"`). |
| `GEMINI_MODEL` | Opcional | Modelos en orden de preferencia, separados por comas. Por defecto: `gemini-3.5-flash, gemini-3.8-flash, gemini-3.5-flash-lite`. |
| `CUPON_RECUPERACION` y `CUPON_RECUPERACION_TEXTO` | Opcional | Descuento real para quien cancela el pago y vuelve. Crea un cupón en Stripe (Products → Coupons, p. ej. 15% de descuento) y pon su **id** en `CUPON_RECUPERACION` y el texto que se muestra en `CUPON_RECUPERACION_TEXTO` (p. ej. `15%`). Sin estas variables, no se promete ningún descuento. |
| `BLOB_ACCESS` | Opcional | `private` por defecto. Solo cámbialo a `public` si tu almacén de Blob no admite acceso privado. |

**Vercel Blob:** en Vercel → Storage → Create → **Blob**, conéctalo al proyecto (se crea `BLOB_READ_WRITE_TOKEN`) y elige acceso **privado**.

Después de añadir o cambiar variables: **Redeploy**.

## 3. Stripe (cobrar)

1. Crea la cuenta en [stripe.com](https://stripe.com) con tu país y tus datos fiscales.
2. **Settings → Public details:** nombre de la marca, email y teléfono de atención, y la URL de `terminos.html` y `privacidad.html`.
3. **Settings → Payment methods:** activa tarjetas y los métodos locales que te ofrezca (en México, OXXO si lo quieres; los pagos en efectivo quedan "pendientes" hasta que se abonan y la página del informe lo explica sola).
4. **Settings → Adaptive Pricing:** actívalo para que cada persona vea el precio en su moneda local.
5. **Settings → Emails:** activa "Successful payments" para que cada compradora reciba su recibo.
6. **Prueba con claves `sk_test_…`:** haz el cuestionario, compra con la tarjeta `4242 4242 4242 4242` (fecha futura cualquiera, CVC cualquiera) y comprueba que el informe se genera y se puede descargar en PDF.
7. Cambia a `sk_live_…` y vuelve a desplegar.

**Reembolsos:** desde Stripe → Payments → la compra → *Refund*. La garantía de 7 días está en `productos.json` → `garantia_dias`.

## 4. Gemini (la IA)

- Tu clave actual es del **plan gratuito**: tiene límites bajos, errores de "alta demanda" frecuentes y Google puede usar los datos para mejorar sus productos. **Para vender, activa la facturación** en Google AI Studio / Google Cloud (proyecto `gen-lang-client-0977239778`).
- **Pon un presupuesto** con alertas en Google Cloud → Billing → Budgets.
- **Coste aproximado:**
  - Una lectura gratis es una llamada de unos 1.000 tokens de salida.
  - Un informe completo son 5 llamadas en paralelo, de unas 3.000 palabras en total.
  - Con modelos Flash, el coste de cada informe es una fracción muy pequeña de su precio. Revísalo en tu panel de facturación con las primeras ventas.

## 5. Comprobación final antes de anunciarlo en TikTok

- [ ] Cuestionario completo en tu móvil, en modo claro y oscuro.
- [ ] La lectura gratis se genera con IA (si ves el texto fijo, revisa `GEMINI_API_KEY` en Vercel → Logs).
- [ ] Compra de prueba de cada plan y una mejora desde el informe básico.
- [ ] Compatibilidad de pareja en el plan Informe + 12 meses + Pareja.
- [ ] Descargar en PDF desde el móvil (Compartir → Imprimir → Guardar como PDF).
- [ ] El email con el enlace llega (si configuraste Resend).
- [ ] `contacto` rellenado y términos y privacidad revisados.
- [ ] Un reembolso de prueba en Stripe.
