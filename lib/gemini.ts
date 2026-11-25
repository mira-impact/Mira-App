// Só roda no servidor (rotas /api). A chave nunca vai para o navegador.
import { GoogleGenAI, ApiError, type PartUnion } from '@google/genai';

let cliente: GoogleGenAI | null = null;
function ai() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada');
  return (cliente ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
}

const MODELOS = () => [process.env.GEMINI_MODEL || 'gemini-3.6-flash', process.env.GEMINI_MODEL_RESERVA || 'gemini-2.5-flash'].filter((m, i, L) => L.indexOf(m) === i);

/** Pede JSON no formato do schema. Se o modelo principal não existir/estiver fora, tenta o reserva. */
export async function gerarJSON<T = unknown>(o: { system: string; prompt: string | PartUnion[]; schema: object; temperatura?: number; timeoutMs?: number; falsa?: () => unknown }): Promise<T> {
  if (process.env.MIRA_IA_FALSA === '1' && process.env.NODE_ENV !== 'production' && o.falsa) return o.falsa() as T;
  let ultimo: unknown;
  for (const model of MODELOS()) {
    try {
      const r = await ai().models.generateContent({
        model,
        contents: o.prompt,
        config: {
          systemInstruction: o.system,
          responseMimeType: 'application/json',
          responseJsonSchema: o.schema,
          temperature: o.temperatura ?? 0.2,
          abortSignal: AbortSignal.timeout(o.timeoutMs ?? 40000),
        },
      });
      return JSON.parse(r.text ?? '') as T;
    } catch (e) {
      ultimo = e;
      const st = e instanceof ApiError ? e.status : 0;
      if (![404, 429, 500, 503].includes(st)) throw e; // erro de pedido: não adianta trocar de modelo
    }
  }
  throw ultimo;
}
