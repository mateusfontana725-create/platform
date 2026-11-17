# Estudos Fontana

Plataforma de estudos organizada por matéria. Cada matéria tem um **Resumo** e um **Quiz**.

## Estrutura

```
index.html                 início, com a lista de matérias
materia.html?m=<id>        página da matéria, com as opções Resumo e Quiz
quiz.html?m=<id>           motor de quiz (genérico, serve para qualquer matéria)
resumo/<nome>.html|.pdf    resumos
data/<id>.js               banco de questões da matéria (window.QUIZ_DATA)
data/img/                  imagens usadas nas questões
assets/materias.js         registro das matérias (fonte única)
assets/estudos.css         visual da plataforma (claro e escuro)
assets/quiz.css            visual do quiz
assets/quiz.js             lógica do quiz
```

## Adicionar uma matéria

1. Inclua um item em `assets/materias.js`, com `id`, `nome`, `sigla`, `descricao`, `cor`, e `resumo` e `quiz` (use `null` enquanto não existir).
2. Resumo: crie `resumo/<nome>.html` com o cabeçalho e a trilha das outras páginas, ou coloque um PDF em `resumo/`.
3. Quiz: crie `data/<id>.js` com `window.QUIZ_DATA = { id, titulo, figuras, questoes }`. Cada questão tem:
   - `tipo`: `"escolha"` (com `opcoes` e `correta`, o índice da resposta) ou `"texto"` (com `aceitos`, a lista de respostas aceitas)
   - `assunto`, `enunciado`, `resposta` (o texto mostrado como correta)
   - `dica` (ajuda sem entregar a resposta), `explicacao` (técnica) e `emOutrasPalavras` (mais simples)
   - `alvo` (opcional), para marcar uma figura com seta: `{ fig, s:[x,y], t:[x,y] }`, em que `s` é o início da seta e `t` a ponta
4. Não é preciso mexer no motor do quiz nem nas outras páginas.
