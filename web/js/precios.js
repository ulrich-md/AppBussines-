// Precios según el país: en México, en pesos (y se puede pagar en OXXO); en el resto, en dólares.
// Lo usan el navegador (para mostrar) y el servidor (para cobrar: allí manda la IP, nunca el navegador).
export const monedaPorPais = (pais) => (String(pais ?? '').toUpperCase() === 'MX' ? 'mxn' : 'usd');

// `precio` está en centavos de peso; `precio_usd`, en centavos de dólar.
export const precioEn = (articulo, moneda) => (moneda === 'mxn' ? articulo?.precio : articulo?.precio_usd ?? articulo?.precio) ?? 0;

// "$149 MXN" o "US$7.99" (sin decimales si el importe es redondo).
export function textoPrecio(centavos, catalogo, moneda) {
  const { simbolo = 'US$', sufijo = '' } = catalogo?.monedas?.[moneda] ?? {};
  const importe = centavos / 100;
  return `${simbolo}${Number.isInteger(importe) ? importe : importe.toFixed(2)}${sufijo}`;
}

// Mientras el servidor responde: estimación por la zona horaria del teléfono.
export function monedaEstimada() {
  try {
    const zona = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    return /^America\/(Mexico_City|Cancun|Merida|Monterrey|Matamoros|Chihuahua|Ciudad_Juarez|Ojinaga|Hermosillo|Mazatlan|Bahia_Banderas|Tijuana)$/.test(zona) ? 'mxn' : 'usd';
  } catch {
    return 'usd';
  }
}
