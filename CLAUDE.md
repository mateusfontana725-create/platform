# Estudos Fontana · guia de trabalho

Este arquivo é a instrução permanente para qualquer conversa com o Claude neste repositório.
Quando o usuário mandar uma matéria (PDF, texto ou vídeo), siga este roteiro, sem depender de nova explicação.

## O que é o projeto
Plataforma de estudos, em HTML puro, sem servidor. Cada matéria tem **Resumo** e **Quiz**.
Entrada: início (`index.html`), matéria (`materia.html?m=<id>`), quiz (`quiz.html?m=<id>`).
A matéria é cadastrada em um único lugar: `assets/materias.js`.

## Regras fixas
1. **Cadastro único.** Toda matéria nova entra em `assets/materias.js`. Não criar página de matéria à mão.
2. **Motor genérico.** `assets/quiz.js` e `assets/quiz.css` servem a todas as matérias. Não criar motor de quiz por matéria. Mudanças de visual valem para todas.
3. **Dados separados.** O banco de questões vai em `data/<id>.js`, no formato `window.QUIZ_DATA = {id, titulo, figuras, questoes}`.
4. **Cada questão tem:** `tipo` (`escolha` ou `texto`), `assunto`, `enunciado`, `resposta`, `dica`, `explicacao`, `emOutrasPalavras`. Em questões de escolha, `opcoes` e `correta` (índice). Em questões de texto, `aceitos` (lista de respostas aceitas).
5. **Textos das questões:**
   - `dica` ajuda a chegar à resposta, mas **não a entrega**.
   - `explicacao` é técnica e fundamentada no material enviado.
   - `emOutrasPalavras` é a mesma ideia, mais simples e informal.
   - **Nunca repetir as alternativas** nas explicações. Explicar o conceito e o motivo.
   - Priorizar o aprendizado, não a memorização.
6. **Figuras com seta:** a imagem vai em `data/img/<id>-<nome>.jpg`. O alvo é `{fig, s:[x,y], t:[x,y]}`, em que `s` é o início da seta e `t` a ponta, nas coordenadas da figura original. Peças muito próximas usam `vista:[x,y,w,h]` para dar zoom.
7. **Resumo:** HTML em `resumo/<id>.html`, usando o mesmo cabeçalho e a mesma trilha das outras páginas, e tabelas que empilham no celular. Se o material vier em PDF, o resumo é o próprio PDF em `resumo/<id>.pdf`.
8. **Offline (obrigatório a cada matéria com quiz).** Rodar `node tools/gerar-offline.js <id>`. Isso cria `offline/<id>-quiz.html`, um arquivo único que abre sem internet. Não editar esse arquivo à mão.
9. **Downloads.** Preencher `resumoPdf` (se houver PDF) e `quizOffline: "offline/<id>-quiz.html"` no registro da matéria.
10. **Telas.** Antes de publicar, rodar `node tools/testar-telas.js <id>` e `node tools/testar-telas.js <id> --offline`. Os dois precisam estar com "Tudo certo" ou com problemas explicados. O quiz precisa caber na tela sem rolagem em celular, tablet e computador.
11. **Português do Brasil** em todos os textos e nomes. Acentos corretos.

## Roteiro para uma matéria nova
1. Ler o material enviado. Listar os assuntos para as questões e os temas para o resumo.
2. Criar `resumo/<id>.html` (ou copiar o PDF para `resumo/<id>.pdf`). Incluir a matéria no registro com `resumo`, `resumoPdf` e `quiz`.
3. Criar `data/<id>.js` com as questões. Para figuras, colocar as imagens em `data/img/` e apontar `figuras` para elas.
4. Adicionar a entrada em `assets/materias.js`: `id`, `nome`, `sigla` (até 4 letras), `descricao` (uma linha), `cor` (hexadecimal), `resumo`, `resumoPdf`, `quiz`, `quizOffline`.
5. Gerar o offline: `node tools/gerar-offline.js <id>`.
6. Testar: `node tools/testar-telas.js <id>` e `node tools/testar-telas.js <id> --offline`. Requer `python3 -m http.server 8765` na pasta do projeto e `playwright` disponível.
7. Conferir o início: `index.html` lista a matéria, com os chips certos.
8. Commit em `main`, com a mensagem em português explicando o que entrou. Antes de enviar: `git pull --rebase origin main`, depois `git push origin HEAD:main`.
9. Ao final, responder de forma curta: o que entrou, quantas questões, o que ficou em branco (resumo ou quiz "em breve") e o link do arquivo offline.

## Estado atual
- **Salvamento Veicular:** resumo em HTML e PDF. Sem quiz.
- **EPR (Equipamento de Proteção Respiratória):** quiz com 50 questões e arquivo offline. Sem resumo.
- **Espaço Confinado e Silos:** resumo em PDF. Sem quiz.

## Pendências
- Batente do quiz de EPR: o usuário vai enviar um vídeo ou marcações de tempo. O trabalho vai para um branch, não para `main`.
- Quizzes antigos (SCI, Afogamento, SCIP, APH, Espaço Confinado e Silos) continuam no histórico do Git. Só migrar quando o usuário pedir.

## Arquivos de apoio
- `README.md`: visão geral da estrutura.
- `tools/gerar-offline.js`: gera o `.html` offline.
- `tools/testar-telas.js`: testa o quiz em vários tamanhos de tela.
