// Parâmetros do experimento. Mude aqui, não no meio do código.

export const LIMIAR_ACEITA = 0.7;   // Jev >= isto: a competência é aceita
export const LIMIAR_DUVIDA = 0.4;   // entre isto e LIMIAR_ACEITA: a MIRA faria uma pergunta rápida ao jovem

// Preços em US$ por 1 milhão de tokens (confira antes de apresentar; mudam com frequência).
// Jev: US$ 0,042 por milhão de tokens de entrada, saída grátis (TypeSafe, set/2026).
// Gemini 3.6 Flash: preço promocional US$ 0,75 / US$ 3,75 até 31/12/2026; depois US$ 1,50 / US$ 7,50.
// O raciocínio ("thinking") do Gemini é cobrado como saída.
export const PRECO = {
  jev: { entrada: 0.042, saida: 0 },
  gemini: { entrada: 0.75, saida: 3.75 },
  geminiPadrao2027: { entrada: 1.5, saida: 7.5 },
};

export const DOLAR_EM_REAIS = 5.4; // só para mostrar em R$ no relatório

// Pausa entre chamadas (ms). Aumente se o plano gratuito do Gemini devolver erro 429.
export const PAUSA_MS = Number(process.env.EXPERIMENTO_PAUSA_MS || 300);
