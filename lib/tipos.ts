export type Parte = [string, boolean]; // [texto, grifado]

export type Prova = {
  comp: string;        // chave em COMP
  nome: string;
  trechos: string[];   // pedaços literais do que a pessoa escreveu
  partes: Parte[];     // a frase com os trechos grifados, para mostrar
  linha: string;       // como entra no currículo
  origem: 'historia' | 'pergunta';
};
export type Vontade = { disse: string; tipo: 'aprender' | 'trabalhar' | 'gosto'; comp?: string; area?: string };
export type Barrada = { nome: string; motivo: string; trecho?: string };
export type PerguntaRapida = { comp: string; q: string };
export type Leitura = { provas: Prova[]; vontades: Vontade[]; barradas: Barrada[]; perguntas: PerguntaRapida[]; experiencias: string[] };

export type Vaga = {
  id: string; titulo: string; tipo: 'Aprendiz' | 'Estágio' | 'Primeiro emprego'; area: string;
  onde: string; turno: 'manhã' | 'tarde' | 'noite' | 'integral'; lidaEm: string;
  obrig: string[]; desej: string[]; selecao: string[]; pergunta: string; objetivo: string; url?: string;
  origem?: 'curadoria' | 'coleta'; // coleta = lida automaticamente de uma página de vaga
  empresa?: string; validaAte?: string;
};

export type Regra = { id: string; txt: string; c?: string; fato?: string; rot?: string };
export type PerguntaPorta = { q: string; r: string; regra: string };
export type Porta = {
  id: string; t: string; art?: 'a' | 'o'; tipo: 'Estudo' | 'Cursos' | 'Desafios' | 'Eventos'; sub?: string;
  areas?: string[]; org?: string; real?: boolean; leva?: string; custo: string; fmt: string; quando: string;
  cert?: boolean; certTxt?: string; site?: string; fonte?: string; conf?: string; status?: string; statusCurto?: string;
  prazo?: { data: string; txt: string; curto: string } | null;
  req?: string; abre?: string; sel?: string; obj?: string; lei?: string;
  ganho: string; passos: string[]; regras?: Regra[]; proximos: string[];
  conclui?: { passo: string; req: string }; // o passo que, feito, coloca "req" no mapa
  perguntas?: PerguntaPorta[];
};

export type Origem = { tipo: 'porta' | 'vaga' | 'sugestao'; id: string };
export type Passo = { id: string; origem: Origem; acao: string; quando: string; lembrete: boolean; feito: boolean; feitoEm?: string; conclui?: string };
