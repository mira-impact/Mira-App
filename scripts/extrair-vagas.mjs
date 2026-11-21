#!/usr/bin/env node
// Lê anúncios de vaga colados em vagas-brutas/*.txt e acrescenta em data/vagas.json.
// Uso:  GEMINI_API_KEY=... npm run vagas            (processa só arquivos novos)
//       GEMINI_API_KEY=... npm run vagas -- --tudo  (reprocessa todos)
// Cada .txt = um anúncio. Na 1ª linha, opcional:  URL: https://...   e/ou   LIDA: 2026-11-17
// Revise o JSON gerado antes de publicar: a IA ajuda, mas quem confere é você.
import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const PASTA = join(RAIZ, 'vagas-brutas'), SAIDA = join(RAIZ, 'data/vagas.json');
const CHAVES = ['atendimento','caixa','fechamento','vendas','reposicao','estoque','organizacao','equipe','problemas','responsabilidade','comunicacao','cuidado','informatica','redes','limpeza','alimentos','lideranca'];
const BASE = ['idade','em','manha','tarde','noite','fimsemana','matricula'];
const AREAS = ['Atendimento e vendas','Administrativo','Tecnologia','Logística e estoque','Comunicação e marketing','Saúde','Alimentação'];

if (!process.env.GEMINI_API_KEY) { console.error('Defina GEMINI_API_KEY.'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelo = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const SCHEMA = { type: 'object', properties: {
  titulo: { type: 'string', description: 'Formato "Jovem Aprendiz · Cargo" ou "Estágio · Área" ou "Cargo · primeiro emprego"' },
  tipo: { type: 'string', enum: ['Aprendiz', 'Estágio', 'Primeiro emprego'] },
  area: { type: 'string', enum: AREAS },
  onde: { type: 'string', description: 'Tipo de empresa · região, ex.: "Supermercado · Zona Leste". Sem nome da empresa se não for público.' },
  turno: { type: 'string', enum: ['manhã', 'tarde', 'noite', 'integral'] },
  obrig: { type: 'array', items: { type: 'string', enum: [...BASE, ...CHAVES] } },
  desej: { type: 'array', items: { type: 'string', enum: CHAVES } },
  selecao: { type: 'array', items: { type: 'string' } },
  pergunta: { type: 'string', description: 'Uma pergunta provável de entrevista para esta vaga, em tom simples.' },
  objetivo: { type: 'string', description: 'Linha de objetivo para o currículo, ex.: "Jovem Aprendiz – Operador(a) de Caixa"' },
}, required: ['titulo','tipo','area','onde','turno','obrig','desej','selecao','pergunta','objetivo'] };

const SYSTEM = `Extraia os dados de um anúncio de vaga de entrada no Brasil para JSON.
Requisitos OBRIGATÓRIOS (obrig) usam: idade (limite de idade de aprendiz), em (ensino médio completo), manha/tarde/noite/fimsemana (turno exigido), matricula (estar matriculado em curso técnico/superior, típico de estágio), e competências.
DESEJÁVEIS (desej) só competências. Competências válidas: ${CHAVES.join(', ')}. "informatica" = pacote Office/Excel/computador.
Não invente requisito que o anúncio não diz. "selecao" = etapas do processo seletivo, se o anúncio disser (ex.: "Inscrição online", "Dinâmica em grupo", "Entrevista").`;

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const atuais = existsSync(SAIDA) ? JSON.parse(readFileSync(SAIDA, 'utf8')) : [];
const tudo = process.argv.includes('--tudo');
const arquivos = existsSync(PASTA) ? readdirSync(PASTA).filter(f => f.endsWith('.txt')) : [];
if (!arquivos.length) { console.log('Nenhum .txt em vagas-brutas/.'); process.exit(0); }

let novas = 0;
for (const f of arquivos) {
  const fonte = basename(f, '.txt');
  if (!tudo && atuais.some(v => v.fonte === fonte)) continue;
  const bruto = readFileSync(join(PASTA, f), 'utf8');
  const url = (bruto.match(/^URL:\s*(\S+)/m) || [])[1], lida = (bruto.match(/^LIDA:\s*(\d{4}-\d{2}-\d{2})/m) || [])[1];
  const texto = bruto.replace(/^(URL|LIDA):.*$/gm, '').trim().slice(0, 12000);
  try {
    const r = await ai.models.generateContent({ model: modelo, contents: `<anuncio>\n${texto}\n</anuncio>`, config: { systemInstruction: SYSTEM, responseMimeType: 'application/json', responseJsonSchema: SCHEMA, temperature: 0 } });
    const v = JSON.parse(r.text);
    v.obrig = [...new Set(v.obrig.filter(x => [...BASE, ...CHAVES].includes(x)))];
    v.desej = [...new Set(v.desej.filter(x => CHAVES.includes(x) && !v.obrig.includes(x)))];
    const vaga = { id: slug(fonte), ...v, lidaEm: lida || new Date().toISOString().slice(0, 10), ...(url ? { url } : {}), fonte };
    const i = atuais.findIndex(x => x.id === vaga.id);
    if (i >= 0) atuais[i] = vaga; else atuais.push(vaga);
    novas++; console.log('✓', f, '→', vaga.titulo, '| obrig:', vaga.obrig.join(','), '| desej:', vaga.desej.join(','));
  } catch (e) { console.error('✗', f, e.message); }
}
writeFileSync(SAIDA, JSON.stringify(atuais, null, 1) + '\n');
console.log(`\n${novas} vaga(s) gravada(s) em data/vagas.json. Para tirar as vagas de exemplo, apague as que têm "exemplo": true.`);
