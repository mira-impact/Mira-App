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


## Conta opcional (Supabase)

Quem quiser cria uma conta só com e-mail, sem senha: a MIRA manda um link e um código de 6 números. Com conta, o progresso é guardado e volta em outro celular. Sem conta, nada muda: tudo fica no celular.

**O que fica guardado** (`lib/nuvem.ts → paraNuvem`, com teste em `test/nuvem.test.ts`): e-mail, provas confirmadas (com o trecho curto), contexto do currículo, plano, vagas e portas salvas, candidaturas e respostas de "Sobre você".
**O que nunca fica guardado:** a história inteira, o áudio, vontades, provas recusadas e o motivo, e as respostas do treino.

### Configurar (uns 20 minutos)

1. **Criar o projeto.** Em supabase.com → New project. Escolha a região **South America (São Paulo)**, se estiver disponível.
2. **Criar a tabela.** SQL Editor → New query → cole todo o `supabase/schema.sql` → Run. Isso cria a tabela, as regras para cada pessoa ver só os próprios dados e a função "Apagar minha conta".
3. **Endereços do site.** Authentication → URL Configuration:
   - Site URL: o endereço da MIRA na Vercel (ex.: `https://mira-alpha-one.vercel.app`)
   - Redirect URLs: o mesmo endereço e também `http://localhost:3000`
4. **E-mail com código.** Authentication → Emails → Templates: cole `supabase/email-codigo.html` nos modelos **Magic link** e **Confirm signup**. O código ajuda quando o link abre num navegador diferente do app (comum no iPhone com o app instalado).
5. **Chaves.** Project Settings → API Keys: copie a URL do projeto e a chave **publishable** (ou "anon"). Coloque no `.env.local`, e na Vercel:
   ```
   npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
   npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
   npx vercel --prod
   ```
   É obrigatório publicar de novo: essas variáveis entram no site na hora do build.
6. **Envio de e-mail para os jovens.** O envio padrão do Supabase só manda para membros da sua organização no Supabase. Isso serve para você testar com o seu e-mail, mas não para os jovens. Antes de abrir, configure um SMTP próprio em Authentication → Emails → SMTP Settings (Resend, Brevo ou o e-mail da instituição). Para mandar para qualquer pessoa, esses serviços pedem um domínio próprio verificado.

### Testar

1. Abra a MIRA, termine o fluxo e toque em "Guardar meu progresso" (no Início ou em "Você").
2. Use o seu e-mail, entre pelo link ou pelo código e veja "Tudo salvo na sua conta" em "Você".
3. Em outro navegador (ou janela anônima), toque em "Já tenho conta: entrar" na abertura: o mapa, as provas e o plano têm que aparecer.
4. Em Supabase → Table Editor → `estado_mira`, confira que a coluna `dados` não tem a história.
5. Em "Você" → "Apagar minha conta": a linha some da tabela e o usuário some de Authentication → Users.

### Limites do plano gratuito

- Projetos gratuitos são pausados depois de 7 dias com pouca atividade e não têm backup diário.
- Para uso real com jovens, avalie o plano Pro.
- A política de privacidade (tela "Privacidade") é um rascunho com campos entre [colchetes] e precisa de revisão jurídica.

## Vagas reais de páginas de carreira (JobPosting)

A MIRA lê vagas que empresas publicam no formato padrão **JobPosting**, o mesmo que o Google usa para mostrar vagas na busca. Ela não raspa portais.

**Regras do robô:**
- obedece o `robots.txt` de cada site;
- se identifica como `MIRA-bot/1.0`;
- espera pelo menos 1 segundo entre pedidos ao mesmo site;
- abre no máximo 15 páginas por site por dia;
- guarda só a ficha da vaga e o link, nunca dados de pessoas.

### 1. Escolher as fontes (no seu computador)

1. Em `fontes/empresas.txt`, coloque uma empresa por linha: `Nome | endereço`. O endereço pode ser a página de carreiras ou o de **uma** vaga.
2. Rode `npm run fontes`.
3. Leia `fontes/relatorio.md`. Para cada empresa, ele diz uma destas situações:
   - ✅ Serve
   - ⛔ O robots.txt não permite
   - ⚠️ Não abriu
   - ❌ Sem JobPosting
   - ❓ Não achei links de vagas
4. As empresas que servem vão para `fontes/aprovadas.json`. Revise, apague as que não quiser usar e faça commit e deploy. A coleta diária usa essa lista.

### 2. Ligar a coleta diária (uma vez)

1. No Supabase, em SQL Editor, rode `supabase/vagas.sql`.
2. Na Vercel, cadastre as variáveis de ambiente (veja `.env.example`):
   - `SUPABASE_SECRET_KEY`: em Supabase → Project Settings → API Keys → **Secret key**. Só o servidor usa.
   - `CRON_SECRET`: uma senha longa inventada por você.
   - `MIRA_CONTATO_URL`: o endereço da MIRA.
3. Rode `npx vercel --prod`. O `vercel.json` agenda a coleta para todo dia por volta das 6h (horário de Brasília). No plano gratuito, ela pode rodar em qualquer minuto daquela hora.
4. Para testar na hora, sem esperar o dia seguinte:
   ```
   curl -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-ENDERECO.vercel.app/api/vagas/atualizar
   ```
   A resposta mostra quantas vagas foram lidas, publicadas e descartadas.

### Como funciona por dentro

| Arquivo | O que faz |
|---|---|
| `lib/coleta/robots.ts` | Lê as regras do robots.txt |
| `lib/coleta/jobposting.ts` | Tira as vagas do HTML (JSON-LD), acha links de vagas e lê sitemaps |
| `lib/coleta/rastrear.ts` | Visita uma fonte com as regras acima |
| `lib/extrairVaga.ts` | O Gemini confirma se a vaga é de entrada e preenche a ficha nas 17 competências |
| `app/api/vagas/atualizar` | A coleta diária. Lê até 15 vagas novas por dia com a IA (`COLETA_MAX_IA`) e apaga vagas vencidas ou lidas há mais de 30 dias |
| `app/api/vagas` | Entrega as vagas publicadas para o app, com cache de 1 hora |

**No app:**
- Com 5 ou mais vagas coletadas, as vagas de exemplo saem da lista. As da curadoria (`data/vagas.json` sem `"exemplo": true`) continuam.
- O mapa e as contagens se refazem com a lista nova.
- Vagas coletadas aparecem com o aviso "Lida automaticamente · confira no anúncio".

**Limites:**
- Sites que só mostram as vagas depois de rodar JavaScript, e que não têm sitemap, não são lidos.
- O plano Hobby da Vercel é para uso pessoal, não comercial.
- Antes de usar com o nome de uma instituição, passe pelo jurídico. Cada site tem seus termos de uso.
