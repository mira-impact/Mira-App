# MIRA

A MIRA traduz o que jovens já fazem no dia a dia para a língua das vagas de aprendiz, estágio e primeiro emprego, e mostra o caminho grátis até elas.

Feito em **Next.js 16 + React 19**, com **Google Gemini** como IA, para publicar na **Vercel**.

## Rodar no seu computador

```bash
npm install
cp .env.example .env.local      # coloque sua GEMINI_API_KEY
npm run dev                     # http://localhost:3000
```

Ainda sem chave? Ponha `MIRA_IA_FALSA=1` no `.env.local`. A IA passa a ser simulada por palavra-chave, o que basta para testar as telas.

```bash
npm test                        # testes do verificador de trechos
npm run build                   # o mesmo build que a Vercel faz
```

## Publicar na Vercel

1. Suba a pasta num repositório do GitHub.
2. Na Vercel, clique em **Add New → Project** e importe o repositório. Ela reconhece o Next.js sozinha.
3. Em **Settings → Environment Variables**, cadastre `GEMINI_API_KEY` (e, se quiser, `GEMINI_MODEL`).
4. Clique em Deploy. Cada `git push` publica de novo.

## Como funciona

```
celular (React)                      servidor (rotas /api na Vercel)          Google Gemini
─────────────────                    ───────────────────────────────          ─────────────
história ──────────────────────────▶ /api/ler: apaga CPF/telefone/e-mail ──▶  lê e devolve JSON
                                     verificador: cada trecho precisa      ◀──
provas, vontades, perguntas ◀─────── existir LETRA POR LETRA na história
(guardadas só no celular)            (o que não existe é descartado)
```

- **`/api/ler`** lê a história e devolve provas, vontades ("queria aprender…"), exageros barrados, contextos para o currículo e até 2 perguntas rápidas.
- **`/api/resposta`** confere a resposta de uma pergunta rápida e devolve no máximo uma prova.
- **`/api/porta`** é o "Pergunte à MIRA". A IA responde **só** com a ficha da porta, que o servidor lê de `data/portas.json`. Se a ficha não tiver a resposta, ela diz que não sabe.
- **`/api/transcrever`** recebe o áudio gravado (até 5 min), o Gemini transcreve e o texto volta para a caixa, onde a pessoa confere antes de mandar ler. O áudio não é guardado.
- **`/api/treino`** mostra quais provas confirmadas a pessoa usou na resposta de entrevista. Não dá nota.

O "um programa conferiu cada frase" é real: está em `lib/verificar.ts`, com testes em `test/`. A IA não consegue criar uma prova com um trecho que a pessoa não escreveu.

**Privacidade.** O app segue o combinado da tela de abertura:
- Nenhuma rota grava a história e os logs não a registram.
- O estado fica no `localStorage` do celular.
- A história inteira é apagada do celular assim que a leitura dá certo. Ficam só os trechos das provas.
- "Apagar tudo", na tela "Você", limpa o celular.

## Onde mexer

| Quero… | Arquivo |
|---|---|
| Pôr vagas reais | cole anúncios em `vagas-brutas/*.txt` e rode `GEMINI_API_KEY=... npm run vagas`. Depois revise `data/vagas.json` e apague as vagas com `"exemplo": true` |
| Mudar portas (cursos, Etec, prazos) | `data/portas.json`. `conclui` diz qual passo, quando feito, entra no mapa |
| Nova competência | `lib/competencias.ts` (nome, dica para a IA, pergunta padrão) e use a chave nas vagas |
| Mudar o que a IA faz | o texto `SYSTEM` em `app/api/*/route.ts` |
| Regras (mapa, "Você pode", sugestões, currículo) | `lib/regras.ts` |
| Telas | `components/telas/*.tsx` (mesmo visual do protótipo v9, em `app/globals.css`) |

O mapa é calculado das vagas: ensino médio, as 5 competências mais pedidas em `data/vagas.json`, curso técnico e experiência registrada.

## Antes de abrir para jovens de verdade

- [ ] **Chave do Gemini em projeto com faturamento.** No nível gratuito, o Google pode usar os dados para treinar modelos.
- [ ] **Vagas reais** em `data/vagas.json`. As 7 atuais são de exemplo.
- [ ] **Datas das portas.** Confira as datas de `data/portas.json`; o prazo da Etec (03/11) já passou.
- [ ] **Limite de pedidos.** O limite por IP é por instância. Se o tráfego crescer, ative o rate limiting do Vercel Firewall.
- [ ] **Termos e política de privacidade.** Precisam ser revisados por alguém do jurídico (LGPD).
- [ ] **Caixa "Pode usar minhas confirmações nos testes".** Hoje ela só guarda a escolha, nada é enviado. Se quiser analytics, implemente respeitando essa caixa.

## Instalar como app (Android, sem APK)

A MIRA é um app instalável pelo navegador, também chamado de PWA. Depois de publicada na Vercel:
1. No celular Android, abra o endereço da MIRA no **Chrome**.
2. Toque em **"Instalar a MIRA no celular"**, que aparece na abertura e no Início, ou no menu ⋮ → **Instalar app**.
3. A MIRA ganha ícone na tela inicial e abre em tela cheia.

No iPhone, abra no Safari → Compartilhar → **Adicionar à Tela de Início**.

Arquivos envolvidos: `app/manifest.ts` (nome, cores e ícones), `public/icones/`, `public/sw.js` (abre o app sem internet e nunca guarda nada de `/api`) e `lib/instalar.ts`. O service worker não é registrado em `localhost`, para não atrapalhar o desenvolvimento.
