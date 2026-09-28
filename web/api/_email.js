// Envío opcional del enlace del informe por email (Resend). Solo si están configurados
// RESEND_API_KEY y EMAIL_FROM (p. ej. "Tu Número Sagrado <hola@tudominio.com>").
export async function enviarEnlaceInforme({ para, nombre, enlace, marca, fetchImpl = fetch }) {
  const clave = process.env.RESEND_API_KEY;
  const remitente = process.env.EMAIL_FROM;
  if (!clave || !remitente || !para) return false;
  const saludo = nombre ? `Hola, ${nombre}:` : 'Hola:';
  const respuesta = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: remitente,
      to: [para],
      subject: 'Tu informe numerológico está listo',
      text: `${saludo}\n\nGracias por tu compra. Tu informe personal ya está listo y puedes abrirlo (y descargarlo en PDF) cuando quieras en este enlace:\n\n${enlace}\n\nGuarda este correo para volver a tu informe.\n\nCon cariño,\n${marca}\n\nContenido de entretenimiento y autoconocimiento.`,
    }),
  });
  if (!respuesta.ok) console.warn('No se pudo enviar el email:', respuesta.status);
  return respuesta.ok;
}
