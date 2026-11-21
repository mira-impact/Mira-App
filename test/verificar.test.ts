import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acharTrecho, validarLeitura, redigir, partesDe } from '../lib/verificar';

const H = 'Todo sábado eu fico no mercadinho do meu tio. Abro o caixa às 8h, atendo o pessoal, dou troco, e no fim do dia fecho o caixa e confiro se bateu com o que vendeu. Queria aprender Excel.';

test('acha trecho exato e sem acento/maiúscula', () => {
  assert.equal(acharTrecho(H, 'dou troco')?.txt, 'dou troco');
  assert.equal(acharTrecho(H, 'TODO SABADO eu fico')?.txt, 'Todo sábado eu fico');
  assert.equal(acharTrecho(H, '“atendo o pessoal,”')?.txt, 'atendo o pessoal');
});
test('recusa trecho inventado', () => {
  assert.equal(acharTrecho(H, 'gerencio o financeiro'), null);
  assert.equal(acharTrecho(H, 'dou o troco'), null);
});
test('validarLeitura barra prova sem trecho real e competência inválida', () => {
  const L = validarLeitura({
    provas: [
      { comp: 'caixa', trechos: ['dou troco'], linha: 'Operação de caixa e troco' },
      { comp: 'lideranca', trechos: ['liderei a equipe'], linha: 'x' },
      { comp: 'inventada', trechos: ['dou troco'], linha: 'x' },
      { comp: 'caixa', trechos: ['Abro o caixa às 8h'], linha: 'dup' },
    ],
    vontades: [{ trecho: 'Queria aprender Excel', tipo: 'aprender', comp: 'informatica' }, { trecho: 'quero ser médico', tipo: 'trabalhar' }],
    barradas: [{ nome: 'Gestão financeira', trecho: 'confiro se bateu com o que vendeu', motivo: '“confiro se bateu” não sustenta isso.' }],
    experiencias: ['Comércio familiar (mercado de bairro), aos sábados, informal'],
    perguntas: [{ comp: 'caixa', q: 'pergunta sobre algo que já tem prova' }],
  }, H, ['equipe', 'organizacao']);
  assert.deepEqual(L.provas.map(p => p.comp), ['caixa']);
  assert.equal(L.vontades.length, 1);
  assert.equal(L.vontades[0].comp, 'informatica');
  assert.deepEqual(L.perguntas.map(p => p.comp), ['equipe', 'organizacao']);
  assert.ok(L.provas[0].partes.some(([t, m]) => m && t === 'dou troco'));
});
test('partes juntam frases diferentes com reticências', () => {
  const a = acharTrecho(H, 'Todo sábado')!, b = acharTrecho(H, 'dou troco')!;
  const P = partesDe(H, [a, b]);
  assert.ok(P.some(([t]) => t === ' … '));
});
test('redige CPF, telefone e e-mail', () => {
  const r = redigir('meu cpf 123.456.789-09, zap (11) 91234-5678, mail a@b.com');
  assert.ok(!/123|91234|a@b/.test(r), r);
});
