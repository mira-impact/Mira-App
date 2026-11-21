// Catálogo fixo de competências. A IA só pode devolver estas chaves; as vagas também usam estas chaves.
// Para criar uma nova: adicione aqui (nome + dica + pergunta) e use a chave em data/vagas.json.

export type Comp = { nome: string; dica: string; pergunta: string };

export const COMP: Record<string, Comp> = {
  atendimento: { nome: 'Atendimento ao público', dica: 'atender clientes, fregueses, pessoas num balcão, bar, loja, igreja, evento', pergunta: 'Você já atendeu alguém, em casa, num bico ou na escola? Conta como foi.' },
  caixa: { nome: 'Operação de caixa', dica: 'receber pagamento, dar troco, mexer com dinheiro ou maquininha', pergunta: 'Você já recebeu dinheiro ou deu troco para alguém? Onde?' },
  fechamento: { nome: 'Fechamento e conferência de caixa', dica: 'fechar o caixa, conferir se o dinheiro bateu com o que vendeu', pergunta: 'Já precisou conferir se uma conta ou um caixa bateu? Como fez?' },
  vendas: { nome: 'Vendas', dica: 'vender produtos, oferecer, convencer cliente, vender doces, rifa, revenda', pergunta: 'Já vendeu alguma coisa, como doce, rifa ou revenda? Como fazia?' },
  reposicao: { nome: 'Reposição de produtos', dica: 'repor prateleira, perceber o que acabou, arrumar mercadoria', pergunta: 'Já ajudou a arrumar ou repor mercadoria em algum lugar?' },
  estoque: { nome: 'Controle de estoque', dica: 'contar mercadoria, anotar entrada e saída, controlar o que tem', pergunta: 'Já contou ou anotou o que tinha guardado em algum lugar, como mercadoria ou material?' },
  organizacao: { nome: 'Organização', dica: 'organizar evento, festa, tarefas, agenda, material, espaço', pergunta: 'Já organizou alguma coisa, como uma festa, um evento ou as tarefas de casa?' },
  equipe: { nome: 'Trabalho em equipe', dica: 'dividir tarefas, revezar, fazer junto com outras pessoas, time, grupo', pergunta: 'Já aconteceu de você dividir tarefas com outras pessoas, num trabalho, festa ou time?' },
  problemas: { nome: 'Resolução de problemas', dica: 'resolver imprevisto, faltou algo e deu um jeito, consertar, achar solução', pergunta: 'Conta uma vez em que deu algo errado e você resolveu. O que você fez?' },
  responsabilidade: { nome: 'Responsabilidade com horário', dica: 'cumprir horário fixo, abrir algo em hora certa, levar alguém todo dia, compromisso recorrente', pergunta: 'Tem algo que você faz todo dia ou toda semana, sempre no mesmo horário?' },
  comunicacao: { nome: 'Comunicação', dica: 'apresentar trabalho, falar em público, explicar coisas, mediar conversa', pergunta: 'Já apresentou um trabalho, falou em público ou explicou algo para um grupo?' },
  cuidado: { nome: 'Cuidado com pessoas', dica: 'cuidar de criança, idoso, irmão, pessoa doente', pergunta: 'Você cuida de alguém, como irmão, avó ou criança da vizinhança? Como é a rotina?' },
  informatica: { nome: 'Informática básica', dica: 'usar computador, planilha, editor de texto, e-mail, formulário. Só usar redes sociais no celular NÃO conta', pergunta: 'Você usa computador para alguma coisa, como planilha, trabalho da escola ou e-mail?' },
  redes: { nome: 'Redes sociais para negócio', dica: 'postar para vender, cuidar do Instagram de um negócio, divulgar', pergunta: 'Já usou rede social para divulgar algo, como um negócio ou evento?' },
  limpeza: { nome: 'Limpeza e conservação', dica: 'limpar espaço de forma organizada, cuidar de um local', pergunta: 'Você cuida da limpeza de algum lugar com frequência?' },
  alimentos: { nome: 'Preparo de alimentos', dica: 'cozinhar, preparar marmita, doces para vender, ajudar em cozinha', pergunta: 'Você cozinha ou prepara alimentos, em casa ou para vender?' },
  lideranca: { nome: 'Liderança', dica: 'coordenar pessoas, ser representante de sala, capitão de time, puxar um grupo', pergunta: 'Já foi responsável por puxar um grupo, como representante de sala ou capitão de time?' },
};

// Requisitos que não vêm de prova: vêm de "Sobre você" ou do plano.
export const BASE: Record<string, string> = {
  idade: 'Ter até 24 anos',
  em: 'Ensino médio completo',
  manha: 'Disponibilidade de manhã',
  tarde: 'Disponibilidade à tarde',
  noite: 'Disponibilidade à noite',
  fimsemana: 'Disponibilidade no fim de semana',
  matricula: 'Estar matriculado(a) em curso técnico ou superior',
};

export const REQ: Record<string, string> = { ...BASE, ...Object.fromEntries(Object.entries(COMP).map(([k, v]) => [k, v.nome])) };
export const COMP_KEYS = Object.keys(COMP);

export const AREAS = ['Atendimento e vendas', 'Administrativo', 'Tecnologia', 'Logística e estoque', 'Comunicação e marketing', 'Saúde', 'Alimentação'];
