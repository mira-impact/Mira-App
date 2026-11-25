// npm run fontes
// Testa cada fonte de fontes/empresas.txt: o robots.txt deixa? tem vagas em JobPosting? quantas parecem de entrada?
// Gera fontes/relatorio.md (para você ler) e fontes/aprovadas.json (o que a coleta diária da MIRA vai visitar).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { rastrearFonte } from '../lib/coleta/rastrear';
import { pareceEntrada } from '../lib/coleta/jobposting';
import { ehGupy } from '../lib/coleta/gupy';

const PASTA = join(process.cwd(), 'fontes');
const linhas = readFileSync(join(PASTA, 'empresas.txt'), 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
if (!linhas.length) { console.log('Nenhuma fonte em fontes/empresas.txt. Coloque uma por linha:  Nome | https://...'); process.exit(0); }

const SITUACAO: Record<string, string> = {
  'ok': '✅ Serve', 'bloqueado-robots': '⛔ O site não permite robôs (robots.txt)', 'fora-do-ar': '⚠️ Não abriu',
  'sem-jobposting': '❌ Achei vagas, mas sem o formato JobPosting', 'sem-links': '❓ Não achei links de vagas (cole o endereço de UMA vaga para testar)',
};
type Linha = { nome: string; url: string; situacao: string; vagas: number; entrada: number; exemplos: string[]; links: string[]; diag?: string; metodo: string };
const resultado: Linha[] = [];

for (const l of linhas) {
  const [nomeBruto, urlBruta] = l.includes('|') ? l.split('|').map(x => x.trim()) : ['', l];
  let url: string;
  try { url = new URL(urlBruta).toString(); } catch { console.log(`✗ Endereço inválido: ${l}`); continue; }
  const nome = nomeBruto || new URL(url).host;
  process.stdout.write(`→ ${nome} … `);
  // Gupy: a coleta diária visita a página inicial da empresa (a lista de vagas), não uma vaga que vai fechar
  const raiz = ehGupy(url) ? new URL(url).origin + '/' : url;
  let r = await rastrearFonte(raiz, { maxPaginas: 12, empresa: nomeBruto || undefined });
  if (raiz !== url && !r.vagas.length) { r = await rastrearFonte(url, { maxPaginas: 12, empresa: nomeBruto || undefined }); }
  else url = raiz;
  const metodo = [...new Set(r.vagas.map(v => v.metodo))].join('+');
  const entrada = r.vagas.filter(pareceEntrada);
  let diag: string | undefined;
  if (r.diagnostico) {
    const d = r.diagnostico, arq = `diagnostico/${nome.replace(/[^\w-]+/g, '_')}.html`;
    mkdirSync(join(PASTA, 'diagnostico'), { recursive: true });
    writeFileSync(join(PASTA, arq), d.html);
    diag = `página ${d.url} · ${Math.round(d.bytes / 1024)} KB · JSON-LD: ${d.jsonLd.join(', ') || 'nenhum'} · microdados: ${d.microdados.join(', ') || 'nenhum'} · __NEXT_DATA__: ${d.nextData ? `sim (${d.nextChaves.join('; ')})` : 'não'} · Next.js: ${d.scriptsNext ? 'sim' : 'não'}${d.rsc ? ' (dados em streaming)' : ''} · cópia: fontes/${arq}`;
  }
  resultado.push({ nome, url, metodo, situacao: r.situacao, vagas: r.vagas.length, entrada: entrada.length, exemplos: (entrada.length ? entrada : r.vagas).slice(0, 3).map(v => v.titulo), links: r.amostraLinks, diag });
  console.log(`${SITUACAO[r.situacao]}${metodo === 'gupy' ? ' (dados internos da Gupy)' : ''} · ${r.vagas.length} vagas lidas, ${entrada.length} podem servir (${r.paginasAbertas} páginas abertas)`);
}

const md = [
  `# Fontes de vagas · teste de ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, '',
  '| Empresa | Resultado | Como leu | Vagas lidas | Podem servir | Exemplos |', '| --- | --- | --- | --- | --- | --- |',
  ...resultado.map(r => `| [${r.nome}](${r.url}) | ${SITUACAO[r.situacao]} | ${({ jsonld: 'JobPosting (padrão)', microdados: 'JobPosting em microdados (padrão)', gupy: 'dados internos da Gupy' } as Record<string, string>)[r.metodo] || r.metodo || '—'} | ${r.vagas} | ${r.entrada} | ${r.exemplos.join('; ') || '—'} |`), '',
  'Vagas lidas = só as abertas neste teste (até 12 páginas por empresa). A coleta diária lê mais, aos poucos.',
  '"Podem servir" = passaram no filtro rápido (sem cargos de liderança nem exigência de experiência). Na coleta diária, o Gemini decide de vez.',
  ...(resultado.some(r => r.metodo === 'gupy') ? ['', '**Atenção:** a Gupy não publica no formato padrão. As vagas dela são lidas dos dados internos da página, que podem mudar sem aviso. Rode este teste de novo de tempos em tempos.'] : []),
  ...resultado.filter(r => r.situacao === 'sem-jobposting').map(r => `\n**${r.nome}**: links encontrados, sem JobPosting. Ex.: ${r.links.slice(0, 2).join(' , ')}`),
  ...(resultado.some(r => r.diag) ? ['', '## Diagnóstico (mande esta parte para quem cuida do código)', '', ...resultado.filter(r => r.diag).map(r => `- **${r.nome}**: ${r.diag}`)] : []),
].join('\n');
writeFileSync(join(PASTA, 'relatorio.md'), md + '\n');

const aprovadas = resultado.filter(r => r.situacao === 'ok').map(r => ({ nome: r.nome, url: r.url, metodo: r.metodo }));
writeFileSync(join(PASTA, 'aprovadas.json'), JSON.stringify(aprovadas, null, 1) + '\n');
console.log(`\n${aprovadas.length} de ${resultado.length} fontes servem. Relatório: fontes/relatorio.md · Lista para a MIRA: fontes/aprovadas.json`);
console.log('Revise a lista antes de publicar: só entram fontes que você aceita usar.');
