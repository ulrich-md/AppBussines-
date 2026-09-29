// Elige el proveedor de IA. Con ANTHROPIC_API_KEY se usa Claude (CLAUDE_MODEL, por defecto Haiku 4.5);
// si Claude falla por algo temporal y también hay GEMINI_API_KEY, se reintenta con Gemini dentro del
// mismo tiempo total. Sin clave de Claude, todo funciona como antes, solo con Gemini.
import { generarConClaude } from './_claude.js';
import { generarJSON as generarConGemini, modelosConfigurados } from './_gemini.js';
import { limpiarVariable } from './_config.js';

export const claveClaude = () => limpiarVariable(process.env.ANTHROPIC_API_KEY);
export const claveGemini = () => limpiarVariable(process.env.GEMINI_API_KEY);
export const hayIA = () => Boolean(claveClaude() || claveGemini());

// `apiKey` y `modelos` son los de Gemini (se mantienen por compatibilidad con los llamadores).
export async function generarJSON(prompt, opciones) {
  const { apiKey = claveGemini(), modelos = modelosConfigurados(), claudeKey = claveClaude(), esquema, normalizar, tiempoTotalMs = 36000, tiempoPorModeloMs = 22000, fetchImpl } = opciones;
  const inicio = Date.now();
  let errorClaude;
  if (claudeKey) {
    try {
      // Si no hay Gemini de respaldo, Claude puede usar todo el tiempo disponible.
      const tiempoMaximoMs = apiKey ? Math.min(tiempoPorModeloMs, tiempoTotalMs - 3000) : tiempoTotalMs;
      return await generarConClaude(prompt, { apiKey: claudeKey, esquema, normalizar, tiempoMaximoMs, fetchImpl });
    } catch (error) {
      console.warn(`Fallo con Claude: ${error.message}`);
      errorClaude = error;
      if (!apiKey) {
        // Sin Gemini de respaldo no hay a quién más pedirlo.
        error.codigo = `claude:${error.codigo}`;
        throw error;
      }
    }
  }
  try {
    return await generarConGemini(prompt, { ...opciones, apiKey, modelos, tiempoTotalMs: tiempoTotalMs - (Date.now() - inicio) });
  } catch (error) {
    if (errorClaude) error.codigo = `claude:${errorClaude.codigo} ${error.codigo ?? ''}`.trim();
    throw error;
  }
}
