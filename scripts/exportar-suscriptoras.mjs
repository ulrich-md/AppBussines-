// Exporta los emails suscritos a "tu número del mes" a un CSV (para Brevo, Mailchimp, Resend…).
// Uso: BLOB_READ_WRITE_TOKEN=... node scripts/exportar-suscriptoras.mjs > suscriptoras.csv
import { list, get } from '@vercel/blob';

const acceso = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';
const filas = ['email,nombre,numero_de_vida,deseo,fecha'];
let cursor;
do {
  const pagina = await list({ prefix: 'suscriptoras/', cursor, limit: 1000 });
  for (const blob of pagina.blobs) {
    const resultado = await get(blob.pathname, { access: acceso });
    if (!resultado || resultado.statusCode !== 200) continue;
    const s = await new Response(resultado.stream).json();
    const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    filas.push([s.email, s.nombre, s.vida, s.deseo, s.fecha].map(celda).join(','));
  }
  cursor = pagina.cursor;
} while (cursor);
console.log(filas.join('\n'));
