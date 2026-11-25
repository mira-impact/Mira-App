'use client';
// Busca as vagas coletadas (/api/vagas) uma vez por abertura do app e troca a lista em uso.
import { definirVagas, type VagaLista } from './dados';
import { setUI } from './store';

let pedido: Promise<void> | null = null;
export function carregarVagas() {
  return (pedido ??= (async () => {
    try {
      const r = await fetch('/api/vagas');
      const j = await r.json();
      const vagas = (Array.isArray(j?.vagas) ? j.vagas : []).filter((v: VagaLista) => v?.id && v?.titulo && Array.isArray(v.obrig) && Array.isArray(v.desej));
      if (vagas.length) definirVagas(vagas);
    } catch { /* sem internet ou sem banco: fica com data/vagas.json */ }
    setUI({ vagasCarregadas: true, vagasVersao: Date.now() });
  })());
}
