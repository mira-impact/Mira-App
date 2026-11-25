import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paraNuvem, mesclar } from '../lib/nuvem';
import { novo } from '../lib/store';
import type { Prova } from '../lib/tipos';

const prova = (comp: string): Prova => ({ comp, nome: comp, trechos: ['dou troco'], partes: [['dou troco', true]], linha: 'x', origem: 'historia' });

test('paraNuvem nunca leva história, vontades, motivos nem provas recusadas', () => {
  const s = novo();
  s.relato = 'MINHA HISTÓRIA INTEIRA';
  s.leitura = { provas: [prova('caixa'), prova('vendas'), prova('equipe')], vontades: [{ disse: 'queria aprender Excel', tipo: 'aprender' }], barradas: [], perguntas: [], experiencias: ['Comércio familiar'] };
  s.provas = { caixa: 'ok', vendas: 'no' };
  s.motivos = { vendas: { motivo: 'Exagerou', txt: 'segredo' } };
  const d = paraNuvem(s), txt = JSON.stringify(d);
  assert.deepEqual(d.provasConfirmadas.map(p => p.comp), ['caixa']);
  for (const proibido of ['MINHA HISTÓRIA', 'queria aprender', 'Exagerou', 'segredo', 'vendas', 'equipe']) assert.ok(!txt.includes(proibido), proibido);
});

test('celular novo recebe tudo da conta e pula a abertura', () => {
  const remoto = novo();
  remoto.concluiu = true; remoto.objetivos = ['Estágio']; remoto.sobre.turnos = ['Noite'];
  remoto.leitura = { provas: [prova('caixa')], vontades: [], barradas: [], perguntas: [], experiencias: [] };
  remoto.provas = { caixa: 'ok' };
  remoto.passos = [{ id: 'p1', origem: { tipo: 'porta', id: 'info' }, acao: 'a', quando: '2026-12-01T10:00:00-03:00', lembrete: true, feito: false }];
  const r = mesclar(novo(), paraNuvem(remoto));
  assert.equal(r.concluiu, true); assert.equal(r.tela, 'inicio');
  assert.equal(r.provas.caixa, 'ok'); assert.equal(r.passos.length, 1);
  assert.deepEqual(r.sobre.turnos, ['Noite']); assert.equal(r.consent.li, true);
});

test('junta os dois lados sem perder nada; feito vence', () => {
  const local = novo();
  local.concluiu = true; local.sobre.turnos = ['Manhã'];
  local.leitura = { provas: [prova('caixa')], vontades: [], barradas: [], perguntas: [{ comp: 'equipe', q: '?' }], experiencias: [] };
  local.provas = { caixa: 'no' };
  local.passos = [{ id: 'p1', origem: { tipo: 'porta', id: 'info' }, acao: 'a', quando: '2026-12-01T10:00:00-03:00', lembrete: true, feito: false }];
  local.salvas = ['caixa'];
  const remoto = { ...paraNuvem(novo()), concluiu: true, provasConfirmadas: [prova('caixa'), prova('equipe')], salvas: ['loja'],
    passos: [{ ...local.passos[0], feito: true }, { id: 'p2', origem: { tipo: 'vaga' as const, id: 'loja' }, acao: 'b', quando: '2026-12-02T10:00:00-03:00', lembrete: false, feito: true }] };
  const r = mesclar(local, remoto);
  assert.equal(r.provas.caixa, 'no', 'a decisão deste celular continua');
  assert.equal(r.provas.equipe, 'ok');
  assert.equal(r.leitura!.perguntas.length, 0, 'pergunta de algo que já tem prova some');
  assert.deepEqual(r.salvas.sort(), ['caixa', 'loja']);
  assert.equal(r.passos.length, 2); assert.equal(r.passos.find(x => x.id === 'p1')!.feito, true);
  assert.deepEqual(r.sobre.turnos, ['Manhã'], 'sobre você deste celular continua');
});

test('ignora dado da conta em formato desconhecido', () => {
  const l = novo();
  assert.equal(mesclar(l, { v: 2 } as never), l);
  assert.equal(mesclar(l, null), l);
});
