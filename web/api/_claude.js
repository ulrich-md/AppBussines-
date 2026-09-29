// Llamada a Claude (Anthropic) con salida JSON estructurada. La usa _ia.js como proveedor principal
// cuando existe ANTHROPIC_API_KEY. El modelo se elige con CLAUDE_MODEL (por defecto, Claude Haiku 4.5).
import Anthropic from '@anthropic-ai/sdk';

export const MODELO_CLAUDE_POR_DEFECTO = 'claude-haiku-4-5';
export const modeloClaude = () => (process.env.CLAUDE_MODEL ?? '').trim() || MODELO_CLAUDE_POR_DEFECTO;

// Los esquemas del proyecto usan el formato de Gemini (tipos en mayúsculas y propertyOrdering).
// Claude usa JSON Schema: tipos en minúsculas, todos los campos obligatorios y sin propiedades extra.
export function aJsonSchema(esquema) {
  if (!esquema || typeof esquema !== 'object') return esquema;
  const salida = { type: String(esquema.type).toLowerCase() };
  if (esquema.description) salida.description = esquema.description;
  if (esquema.enum) salida.enum = esquema.enum;
  if (salida.type === 'object') {
    salida.properties = Object.fromEntries(Object.entries(esquema.properties ?? {}).map(([k, v]) => [k, aJsonSchema(v)]));
    salida.required = Object.keys(salida.properties);
    salida.additionalProperties = false;
  }
  if (salida.type === 'array') salida.items = aJsonSchema(esquema.items ?? { type: 'STRING' });
  return salida;
}

function errorConCodigo(mensaje, codigo, reintentable) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  error.reintentable = reintentable;
  return error;
}

export async function generarConClaude({ sistema, usuario }, { apiKey, modelo = modeloClaude(), esquema, normalizar, tiempoMaximoMs = 30000, fetchImpl }) {
  const cliente = new Anthropic({ apiKey, maxRetries: 1, timeout: tiempoMaximoMs, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  let respuesta;
  try {
    respuesta = await cliente.messages.create({
      model: modelo,
      max_tokens: 8192,
      system: sistema,
      messages: [{ role: 'user', content: usuario }],
      output_config: { format: { type: 'json_schema', schema: aJsonSchema(esquema) } },
    });
  } catch (error) {
    if (error instanceof Anthropic.APIConnectionTimeoutError) throw errorConCodigo(error.message, 'tiempo_agotado', true);
    if (error instanceof Anthropic.APIError) {
      const tipo = error.error?.error?.type ?? error.status ?? 'error';
      // 401/403: clave inválida o sin permisos; 400: petición no válida. El resto (429, 529, 5xx) es temporal.
      throw errorConCodigo(error.message, `${error.status ?? 'red'}_${tipo}`, ![400, 401, 403, 404].includes(error.status));
    }
    throw errorConCodigo(error.message, 'red', true);
  }
  if (respuesta.stop_reason === 'max_tokens') throw errorConCodigo('Respuesta cortada por longitud', 'max_tokens', true);
  if (respuesta.stop_reason === 'refusal') throw errorConCodigo('Claude rechazó la petición', 'refusal', true);
  const texto = respuesta.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw errorConCodigo('Claude no devolvió JSON válido', 'json_no_valido', true);
  }
  try {
    return { datos: normalizar(datos), modelo };
  } catch (error) {
    throw errorConCodigo(error.message, 'respuesta_no_valida', true);
  }
}
