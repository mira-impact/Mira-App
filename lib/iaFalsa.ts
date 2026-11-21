// IA FALSA, só para desenvolver sem chave: ative com MIRA_IA_FALSA=1 no .env.local.
// Usa palavras-chave simples. Nunca use em produção.
const SINAIS: Record<string, string[]> = {
  atendimento: ['atend', 'client', 'fregues'], caixa: ['troco', 'caixa', 'maquininha'], fechamento: ['fecho', 'confiro', 'bateu'],
  reposicao: ['repor', 'prateleira'], organizacao: ['organiz'], equipe: ['equipe', 'revez', 'dividi', 'barraca'],
  responsabilidade: ['todo dia', 'às 8h', 'todo sábado'], cuidado: ['cuido', 'irmão', 'irma'], vendas: ['vendo', 'vendia', 'revend'],
  informatica: ['computador', 'planilha', 'excel'], problemas: ['resolvi', 'faltou', 'dei um jeito'],
};
const frases = (t: string) => t.split(/(?<=[.!?\n])\s*/).map(x => x.trim()).filter(Boolean);
const curto = (f: string, k: string) => { const i = f.toLowerCase().indexOf(k); const ini = f.lastIndexOf(' ', Math.max(0, i - 20)) + 1; return f.slice(ini, ini + 60).replace(/[,.;!?]?\s*\S*$/, '').trim() || f.slice(0, 40); };
const QUER = /(queria|quero|tenho vontade|gostaria|sonho)/i;

export function lerFalso(relato: string) {
  const F = frases(relato), provas: any[] = [], vontades: any[] = [];
  for (const f of F) {
    if (QUER.test(f)) { vontades.push({ trecho: f.replace(/[.!?]$/, ''), tipo: /trabalhar/i.test(f) ? 'trabalhar' : 'aprender', comp: /excel|computador|inform/i.test(f) ? 'informatica' : '', area: /atendimento/i.test(f) ? 'Atendimento e vendas' : '' }); continue; }
    for (const [c, ks] of Object.entries(SINAIS)) { const k = ks.find(k => f.toLowerCase().includes(k)); if (k && !provas.some(p => p.comp === c)) provas.push({ comp: c, trechos: [curto(f, k)], linha: '' }); }
  }
  return { provas, vontades, barradas: provas.some(p => p.comp === 'fechamento') ? [{ nome: 'Gestão financeira', trecho: '', motivo: 'Conferir o caixa não é o mesmo que gerir as finanças.' }] : [], experiencias: [], perguntas: [] };
}
export function respostaFalsa(resposta: string, comp: string) {
  const f = frases(resposta)[0] || resposta, ks = SINAIS[comp] || [];
  const k = ks.find(k => resposta.toLowerCase().includes(k));
  return k ? { temProva: true, trechos: [curto(resposta, k)], linha: '' } : { temProva: false, trechos: [], linha: '', f };
}
export const treinoFalso = (resposta: string, comps: string[]) => ({ usou: comps.filter(c => (SINAIS[c] || []).some(k => resposta.toLowerCase().includes(k))) });
export const portaFalsa = () => ({ sabe: false, resposta: '', regra: '' });
