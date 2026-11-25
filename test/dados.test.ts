import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VAGAS, MAPA, CONTAGEM, definirVagas, type VagaLista } from '../lib/dados';

const vaga = (i: number, desej: string[]): VagaLista => ({ id: 'c-' + i, titulo: 'Aprendiz ' + i, tipo: 'Aprendiz', area: 'Administrativo', onde: 'Escritório · Centro', turno: 'manhã', lidaEm: '2026-11-20', obrig: ['em'], desej, selecao: [], pergunta: '?', objetivo: 'x', url: 'https://ex.com/vagas/' + i, origem: 'coleta' });

test('com 5+ vagas do banco, as de exemplo saem e o mapa se refaz', () => {
  const exemplos = VAGAS.filter(v => v.exemplo).length;
  assert.ok(exemplos > 0);
  definirVagas([1, 2, 3, 4, 5, 6].map(i => vaga(i, ['cuidado', 'alimentos'])));
  assert.equal(VAGAS.filter(v => v.exemplo).length, 0);
  assert.equal(VAGAS.length, 6);
  assert.equal(CONTAGEM.cuidado, 6);
  assert.equal(MAPA.length, 8);
  assert.ok(MAPA.some(m => m.k === 'cuidado'), 'competência mais pedida entra no mapa');
});
test('com poucas vagas do banco, os exemplos continuam', () => {
  definirVagas([vaga(9, ['vendas'])]);
  assert.ok(VAGAS.some(v => v.exemplo));
  assert.ok(VAGAS.some(v => v.id === 'c-9'));
});
