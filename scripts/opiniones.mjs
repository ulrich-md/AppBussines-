// Revisa las opiniones de compradoras y aprueba las que quieras publicar.
//   BLOB_READ_WRITE_TOKEN=... node scripts/opiniones.mjs            → lista las opiniones recibidas
//   BLOB_READ_WRITE_TOKEN=... node scripts/opiniones.mjs aprobar <id> [<id>…]
//        → las añade a web/testimonios.json (solo si la persona autorizó publicarla)
// Después: git commit + despliegue. Nunca se publica una opinión sin permiso ni se edita su contenido.
import { readFileSync, writeFileSync } from 'node:fs';
import { list, get } from '@vercel/blob';

const RUTA = new URL('../web/testimonios.json', import.meta.url);
const acceso = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';
const [accion, ...ids] = process.argv.slice(2);

const opiniones = [];
let cursor;
do {
  const pagina = await list({ prefix: 'opiniones/', cursor, limit: 1000 });
  for (const blob of pagina.blobs) {
    const r = await get(blob.pathname, { access: acceso });
    if (r?.statusCode === 200) opiniones.push(await new Response(r.stream).json());
  }
  cursor = pagina.cursor;
} while (cursor);

if (accion !== 'aprobar') {
  for (const o of opiniones.sort((a, b) => b.fecha.localeCompare(a.fecha))) {
    console.log(`${o.id}  ${'★'.repeat(o.estrellas)}${'☆'.repeat(5 - o.estrellas)}  ${o.nombre || '(sin nombre)'}${o.pais ? `, ${o.pais}` : ''}  ${o.publicar ? 'PUEDE PUBLICARSE' : 'privada'}\n   "${o.texto}"\n`);
  }
  process.exit(0);
}

const actuales = JSON.parse(readFileSync(RUTA, 'utf8'));
for (const id of ids) {
  const o = opiniones.find((x) => x.id === id);
  if (!o) { console.error(`No existe la opinión ${id}`); continue; }
  if (!o.publicar) { console.error(`La opinión ${id} no autorizó su publicación: no se añade.`); continue; }
  if (actuales.opiniones.some((x) => x.id === id)) continue;
  actuales.opiniones.push({ id: o.id, estrellas: o.estrellas, texto: o.texto, nombre: o.nombre, pais: o.pais, numero: o.numero, fecha: o.fecha.slice(0, 10), verificada: true });
  console.log(`✓ aprobada ${id}`);
}
writeFileSync(RUTA, `${JSON.stringify(actuales, null, 2)}\n`);
