# Experimento: Gemini x Jev na identificação de competências da MIRA

## A pergunta

Na MIRA, a IA só faz uma coisa: ler a história do jovem e dizer quais das 17 competências do catálogo ele **já fez**. O resto (comparar com vagas, montar o mapa) é regra em código. Então a comparação justa é essa: **quem identifica melhor as competências numa história, o Gemini (como a MIRA usa hoje) ou o Jev?** E, como terceira opção, **os dois juntos**.

O caminho de NLP treinado (classificar à mão até ter base para treinar um modelo) ficou fora: não temos volume de dados rotulados hoje, e o objetivo aqui é decidir com o que existe.

## Os três sistemas comparados

| Sistema | Como funciona |
|---|---|
| **Gemini (hoje)** | Mesmo prompt e mesmo schema da rota `app/api/ler`. Depois passa pelo verificador da MIRA (`lib/verificar.ts`), que descarta qualquer prova cuja frase não esteja, letra por letra, na história. |
| **Jev** | Um único pedido com 17 perguntas sim/não (uma por competência), geradas do próprio catálogo (`lib/competencias.ts`). Ex.: *"A pessoa já fez Atendimento ao público? Não conta se ela só quer fazer…"*. Aceita a competência se a probabilidade for ≥ 0,7. |
| **Combinado** | O Jev decide rápido e barato o que existe. O Gemini só procura a frase que comprova o que o Jev aprovou (sem frase, a competência cai). Quando o Jev fica entre 0,4 e 0,7, a MIRA faria uma pergunta rápida ao jovem em vez de decidir. |

## O gabarito

`dados/historias.json`: 40 histórias **inventadas**, no jeito de falar dos jovens, com as competências marcadas à mão. Inclui casos difíceis de propósito:

- vontade em vez de fato ("queria aprender Excel"), autoavaliação ("sou organizada"), curso sem prática;
- quem fez foi outra pessoa (a mãe frita o pastel, a tia vendeu o geladinho);
- falsos amigos ("caixa de som" não é operação de caixa; contar a oferta da igreja não é fechar caixa; rede social pessoal não é informática);
- negações, português bem informal (gíria e abreviação), e uma tentativa de manipular a IA.

Cada história tem também uma lista de competências **discutíveis**: pares em que duas pessoas razoáveis poderiam discordar. Eles ficam fora da nota, para não premiar nem punir nenhum sistema por uma decisão de gabarito.

**Revise o gabarito antes de rodar.** Se discordar de alguma marcação, mude no JSON: o relatório é tão bom quanto o gabarito.

## O que é medido

1. **Precisão, cobertura (recall) e F1** de cada sistema, com intervalo de confiança por bootstrap (com 40 histórias, diferenças pequenas podem ser acaso).
2. **Calibração do Jev**: quando ele diz 0,8, acerta cerca de 80% das vezes? Diagrama de calibração, ECE e Brier, e uma tabela de "e se o limiar fosse outro".
3. **Alucinação do Gemini**: quantas sugestões o verificador barrou, e quantos exageros passaram (frase existe, mas não prova).
4. **Custo e tempo por história** (e por 1.000 histórias).
5. **Desempenho em português informal** e em cada tipo de caso difícil.

## Passo a passo para rodar (no seu computador, Windows)

### 1. Pré-requisitos
- Node.js 20.12 ou mais novo (`node -v` no terminal). Se não tiver: https://nodejs.org (versão LTS).
- O repositório já está em `3º TECH AD\MIRA` com a pasta `experimento`.

### 2. Criar a chave do AI Gateway da Vercel (serve para Jev e Gemini)
A TypeSafe pausou novos cadastros diretos, então o caminho é o AI Gateway da Vercel. O Jev custa o mesmo por lá, e a Vercel dá US$ 5 de crédito grátis por mês, muito mais do que este experimento gasta.

1. Entre em https://vercel.com e faça login (pode ser com a conta do GitHub).
2. No painel, abra **AI Gateway** no menu do time.
3. Vá em **API Keys** → **Create key**. Dê um nome (ex.: `mira-experimento`) e copie a chave. Ela só aparece uma vez.
4. Se pedir cartão para liberar os créditos, cadastre: o experimento inteiro custa centavos de dólar.

> Já tem chave do Gemini (Google AI Studio) que a MIRA usa? Pode colocar também; aí o Gemini vai direto pelo Google, exatamente como no app. Sem ela, o Gemini passa pelo Gateway (mesmo modelo).

### 3. Colocar a chave no projeto
Na pasta `MIRA`, copie `experimento\env.exemplo` para a raiz com o nome `.env.local` e cole a chave em `AI_GATEWAY_API_KEY=`.

No PowerShell, de dentro da pasta MIRA:
```powershell
copy experimento\env.exemplo .env.local
notepad .env.local
```

### 4. Instalar e rodar
```powershell
npm install
npm run experimento:simular     # opcional: testa o fluxo sem gastar nada
npm run experimento:teste       # 3 histórias reais, para ver se as chaves funcionam
npm run experimento             # as 40 histórias (cerca de 3 a 6 minutos)
```

O resultado fica em `experimento\resultados\`: um `.json` com tudo o que cada IA respondeu e um `.html` com o relatório. Abra o `.html` no navegador.

Para refazer só o relatório (por exemplo, depois de corrigir o gabarito), sem chamar as IAs de novo:
```powershell
npx tsx experimento/analisar.ts experimento/resultados/execucao-AAAAMMDDHHMM.json
```

### Problemas comuns
- **"Faltam chaves no .env.local"**: o arquivo precisa estar na raiz da pasta MIRA (ao lado do `package.json`), com o nome exato `.env.local`.
- **Erro 401 / authentication_error**: a chave está errada ou com espaço sobrando.
- **Erro 402 / créditos**: falta ativar os créditos no AI Gateway.
- **Erro 429 com o Gemini direto do Google**: limite do plano gratuito. Coloque `EXPERIMENTO_PAUSA_MS=4000` no `.env.local`.

## Como decidir (critérios combinados antes de ver o resultado)

Para não escolher o vencedor depois de ver os números, estes são os critérios, em ordem:

1. **Precisão primeiro.** Na MIRA, uma competência falsa no currículo do jovem é pior que uma que faltou (que ainda pode virar pergunta rápida). Um sistema só "ganha" se a precisão dele for pelo menos igual à do Gemini de hoje.
2. **Depois, F1.** Entre os que passam no critério 1, o de maior F1. Se o intervalo de confiança da diferença cruzar zero, os dois empatam em qualidade.
3. **Empate em qualidade → custo e tempo decidem.**
4. **A frase continua obrigatória.** O Jev sozinho não devolve a frase que prova a competência, e a MIRA mostra essa frase para o jovem. Por isso, mesmo que o Jev vença em qualidade, ele entra no produto pelo modo combinado, não sozinho.
5. **A calibração define o papel da probabilidade.** Se o Jev for bem calibrado (ECE baixo), a faixa 0,4–0,7 vira as perguntas rápidas. Se não for, o limiar precisa ser ajustado com mais dados antes de usar.

## Cuidados

- Só histórias inventadas. Nenhum dado real de jovem passa por este experimento.
- As histórias ainda passam pelo `redigir()` da MIRA (tira CPF, telefone e e-mail) antes de ir para qualquer IA.
- Uma probabilidade do Jev é um filtro, não uma evidência sobre uma pessoa. No produto, a decisão final continua sendo mostrada ao jovem com a frase dele.
- Antes de usar o Jev com dados reais, vale passar pela pessoa responsável por privacidade (o Gateway permite ativar "Zero Data Retention" por pedido).
- 40 histórias dão um sinal, não uma prova. Se o resultado ficar apertado, o próximo passo é um segundo lote de histórias, escrito por outra pessoa, para confirmar.

## Arquivos

| Arquivo | O que é |
|---|---|
| `dados/historias.json` | As 40 histórias e o gabarito |
| `perguntas-jev.ts` | As 17 perguntas do Jev, geradas do catálogo |
| `provedores.ts` | Chamadas ao Gemini e ao Jev (tempo, tokens, custo) |
| `rodar.ts` | Roda os três sistemas e grava o resultado |
| `analisar.ts` | Calcula as métricas e gera o relatório HTML |
| `config.ts` | Limiares (0,7 e 0,4) e preços |
