// Llamada genérica a Gemini con salida JSON estructurada, cadena de modelos de respaldo y límites de
// tiempo. La usan la lectura gratis (_lectura.js) y el informe de pago (_informe.js).

export const MODELOS_POR_DEFECTO = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];

export function modelosConfigurados() {
  return process.env.GEMINI_MODEL
    ? process.env.GEMINI_MODEL.split(',').map((m) => m.trim()).filter(Boolean)
    : MODELOS_POR_DEFECTO;
}

// Texto limpio: sin HTML, sin guiones largos (regla de estilo de la marca) y sin espacios de más.
export function limpiarTexto(valor, maximo = 2000) {
  if (typeof valor !== 'string') return '';
  return valor
    .replace(/<[^>]*>/g, '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^,\s*/, '')
    .trim()
    .slice(0, maximo);
}

// Limpia en profundidad un objeto devuelto por la IA (textos, listas y objetos anidados).
export function limpiarProfundo(valor, maximo = 2000) {
  if (typeof valor === 'string') return limpiarTexto(valor, maximo);
  if (Array.isArray(valor)) return valor.slice(0, 20).map((v) => limpiarProfundo(v, maximo));
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, limpiarProfundo(v, maximo)]));
  }
  return valor;
}

function parsear(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    const error = new Error('La IA no devolvió JSON válido');
    error.reintentable = true;
    throw error;
  }
}

async function llamarModelo({ sistema, usuario }, opciones) {
  const { apiKey, modelo, esquema, tiempoMaximoMs, fetchImpl, nivelRazonamiento = 'minimal', temperatura = 1 } = opciones;
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), tiempoMaximoMs);
  try {
    const respuesta = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
      {
        method: 'POST',
        signal: controlador.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sistema }] },
          contents: [{ role: 'user', parts: [{ text: usuario }] }],
          generationConfig: {
            temperature: temperatura,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: esquema,
            // Sin apenas razonamiento: el texto es creativo, no analítico, y así responde mucho más rápido.
            thinkingConfig: { thinkingLevel: nivelRazonamiento },
          },
        }),
      },
    );
    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '');
      // Algunos modelos no aceptan el nivel de razonamiento "minimal": se repite con "low".
      if (respuesta.status === 400 && nivelRazonamiento !== 'low' && /thinking level/i.test(detalle)) {
        clearTimeout(temporizador);
        return llamarModelo({ sistema, usuario }, { ...opciones, nivelRazonamiento: 'low' });
      }
      const error = new Error(`${modelo} respondió ${respuesta.status}: ${detalle.slice(0, 200)}`);
      error.codigo = codigoGemini(respuesta.status, detalle);
      // Clave inválida o sin permisos: no tiene sentido probar otros modelos.
      error.reintentable = ![401, 403].includes(respuesta.status);
      throw error;
    }
    const json = await respuesta.json();
    const partes = json?.candidates?.[0]?.content?.parts ?? [];
    return parsear(partes.filter((p) => !p.thought).map((p) => p.text ?? '').join(''));
  } catch (error) {
    if (error.name === 'AbortError') {
      error.reintentable = true;
      error.codigo = 'tiempo_agotado';
    }
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}

// Prueba los modelos en orden hasta que uno devuelva un JSON que pase `normalizar`.
export async function generarJSON(prompt, { apiKey, modelos, esquema, normalizar, tiempoTotalMs = 36000, tiempoPorModeloMs = 22000, fetchImpl = fetch }) {
  const inicio = Date.now();
  let ultimoError;
  const codigos = [];
  for (const modelo of modelos) {
    const restante = tiempoTotalMs - (Date.now() - inicio);
    if (restante < 3000) break;
    try {
      const datos = await llamarModelo(prompt, { apiKey, modelo, esquema, tiempoMaximoMs: Math.min(tiempoPorModeloMs, restante), fetchImpl });
      try {
        return { datos: normalizar(datos), modelo };
      } catch (error) {
        error.reintentable = true;
        throw error;
      }
    } catch (error) {
      ultimoError = error;
      codigos.push(`${modelo}:${error.codigo ?? 'respuesta_no_valida'}`);
      console.warn(`Fallo con ${modelo}: ${error.message}`);
      if (!error.reintentable) break;
    }
  }
  const error = ultimoError ?? new Error('Sin tiempo para generar el texto');
  // Resumen corto por modelo (p. ej. "gemini-3.5-flash:400_API_KEY_INVALID"): sin datos secretos.
  error.codigo = codigos.join(' ').slice(0, 300) || 'sin_tiempo';
  throw error;
}

// Código corto a partir de la respuesta de error de Gemini (estado HTTP + motivo), sin datos secretos.
function codigoGemini(estado, detalle) {
  try {
    const { error } = JSON.parse(detalle);
    const motivo = error?.details?.find((d) => d.reason)?.reason ?? error?.status;
    return `${estado}_${String(motivo ?? '').replace(/[^A-Z0-9_]/gi, '').slice(0, 40)}`;
  } catch {
    return String(estado);
  }
}
