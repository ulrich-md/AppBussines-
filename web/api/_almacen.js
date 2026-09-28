// Guarda los informes ya generados para no volver a pagar a la IA en cada visita.
// Con Vercel Blob se guardan de forma privada; sin él, solo en la memoria de la instancia
// (sirve para desarrollo, pero en producción conviene activar Blob).
// Vercel conecta el almacén de dos formas: BLOB_STORE_ID (con el token OIDC automático de Vercel,
// la forma actual) o BLOB_READ_WRITE_TOKEN (la forma clásica). @vercel/blob acepta las dos.
import { createHash } from 'node:crypto';

const memoria = new Map();
// Sin Vercel Blob (o en las pruebas) se usa la memoria de la instancia.
export const hayBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const enMemoria = () => !hayBlob() || process.env.BLOB_READ_WRITE_TOKEN === 'memoria-pruebas';

// La ruta no se puede deducir del identificador de compra sin conocer el secreto.
export function rutaInforme(idSesion, extra = '') {
  const secreto = process.env.INFORME_SECRETO || process.env.STRIPE_SECRET_KEY || 'desarrollo';
  const hash = createHash('sha256').update(`${idSesion}:${secreto}`).digest('hex').slice(0, 40);
  return `informes/${hash}${extra}.json`;
}

const acceso = () => (process.env.BLOB_ACCESS === 'public' ? 'public' : 'private');

export async function leer(ruta) {
  if (enMemoria()) return memoria.get(ruta) ?? null;
  const { get } = await import('@vercel/blob');
  try {
    const resultado = await get(ruta, { access: acceso(), useCache: false });
    if (!resultado || resultado.statusCode !== 200) return null;
    return await new Response(resultado.stream).json();
  } catch (error) {
    if (error?.name === 'BlobNotFoundError') return null;
    throw error;
  }
}

export async function guardar(ruta, datos) {
  if (enMemoria()) {
    memoria.set(ruta, datos);
    return;
  }
  const { put } = await import('@vercel/blob');
  await put(ruta, JSON.stringify(datos), {
    access: acceso(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}
