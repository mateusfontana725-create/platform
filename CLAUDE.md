# Estudos Fontana · guia de trabalho

Este arquivo é a instrução permanente para qualquer conversa com o Claude neste repositório.
Quando o usuário mandar uma matéria (PDF, texto ou vídeo), siga este roteiro, sem depender de nova explicação.

## O que é o projeto
Plataforma de estudos, em HTML puro, sem servidor. Cada matéria tem **Resumo** e **Quiz**.
Entrada: início (`index.html`), matéria (`materia.html?m=<id>`), quiz (`quiz.html?m=<id>`).
A matéria é cadastrada em um único lugar: `assets/materias.js`, sempre **no final** da lista. O início mostra as mais recentes primeiro (ordem inversa do registro) e tem busca por nome, sigla ou descrição.

## Regras fixas
1. **Cadastro único.** Toda matéria nova entra em `assets/materias.js`. Não criar página de matéria à mão.
2. **Motor genérico.** `assets/quiz.js` e `assets/quiz.css` servem a todas as matérias. Não criar motor de quiz por matéria. Mudanças de visual valem para todas. Questões sem figura usam enunciado em cima e alternativas embaixo (classe `sem-fig`). **As alternativas são sempre uma lista vertical (A, B, C, D, uma embaixo da outra)**, em qualquer tela; nunca em duas colunas. Depois de responder, a lista continua visível: a correta fica verde, a marcada errada fica vermelha e as outras ficam apagadas (somem sozinhas se faltar altura).
3. **Dados separados.** O banco de questões vai em `data/<id>.js`, no formato `window.QUIZ_DATA = {id, titulo, figuras, questoes}`.
4. **Cada questão tem:** `tipo`, `assunto`, `enunciado`, `resposta`, `dica`, `explicacao`, `emOutrasPalavras`. **Só criar questões objetivas** (`tipo: "escolha"`, com `opcoes` e `correta`, o índice). **Nunca criar questões de escrever** (`tipo: "texto"`): o usuário não quer digitar respostas. Se for útil, pode haver verdadeiro ou falso, como questão de escolha. (O motor ainda aceita `texto` por causa do quiz antigo de EPR, mas não usar em matérias novas.)
5. **Textos das questões:**
   - `dica` ajuda a chegar à resposta, mas **não a entrega**.
   - `explicacao` é técnica e fundamentada no material enviado.
   - `emOutrasPalavras` é a mesma ideia, mais simples e informal.
   - **Nunca repetir as alternativas** nas explicações. Explicar o conceito e o motivo.
   - Priorizar o aprendizado, não a memorização.
   - **Alternativas equilibradas (obrigatório).** A alternativa correta **não pode ser sempre a mais longa**. As quatro alternativas devem ter tamanho e nível de detalhe parecidos, e as erradas precisam ser plausíveis (mesmo vocabulário e mesmo tipo de afirmação). A correta deve ser a maior em no máximo 35% das questões, e em algumas deve ser a mais curta ou a do meio. Não deixe a correta com ressalvas e detalhes que as erradas não têm.
   - **Posição da correta distribuída.** Misturar A, B, C e D de forma equilibrada (cada letra entre 18% e 32%), sem a mesma letra 3 vezes seguidas no arquivo. Numa mesma questão, não repetir o padrão "a correta é a última".
   - Conferir com `node tools/checar-questoes.js <id>` antes de publicar. Se der ✗, reescreva as alternativas.
6. **Figuras com seta:** a imagem vai em `data/img/<id>-<nome>.jpg`. O alvo é `{fig, s:[x,y], t:[x,y]}`, em que `s` é o início da seta e `t` a ponta, nas coordenadas da figura original. Peças muito próximas usam `vista:[x,y,w,h]` para dar zoom.
7. **Resumo:** HTML em `resumo/<id>.html`, usando o mesmo cabeçalho e a mesma trilha das outras páginas. Usar pouca tabela (prefira listas e blocos curtos). **Cada seção termina com duas explicações:** uma "Explicação" técnica, baseada na lei ou no material, e outra "Em outras palavras", simples e informal. As duas ficam em cores diferentes (azul e laranja). Se o material vier em PDF, o resumo é o próprio PDF em `resumo/<id>.pdf`.
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
6. Testar: `node tools/checar-questoes.js <id>` (equilíbrio das alternativas), `node tools/testar-telas.js <id>` e `node tools/testar-telas.js <id> --offline`. Requer `python3 -m http.server 8765` na pasta do projeto e `playwright` disponível.
7. Conferir o início: `index.html` lista a matéria, com os chips certos.
8. Commit em `main`, com a mensagem em português explicando o que entrou. Antes de enviar: `git pull --rebase origin main`, depois `git push origin HEAD:main`.
9. Ao final, responder de forma curta: o que entrou, quantas questões, o que ficou em branco (resumo ou quiz "em breve") e o link do arquivo offline.

## Estado atual
- **Salvamento Veicular:** resumo em HTML e PDF. Sem quiz.
- **EPR (Equipamento de Proteção Respiratória):** quiz com 50 questões e arquivo offline. Sem resumo.
- **Espaço Confinado e Silos:** resumo em PDF. Sem quiz.
- **Direito Penal e Penal Militar:** resumo em HTML e PDF (`resumo/direito-penal.*`) e quiz com 107 questões, todas objetivas e **em nível "por cima"**: o usuário não faz prova de Direito e pediu só o essencial. O assunto "Artigos da prova" (40 questões) cobre a lista de artigos indicada pelo instrutor (CPM arts. 9, 12, 19, 20, 30, 33, 38, 39, 42, 43, 44, 45, 48, 49, 50, 55, 56, 57, 63, 149, 150, 163, 187, 195, 203, o 132 para a idade de extinção na deserção, prazos e caminho do IPM e cálculo da deserção); o resumo tem uma seção com essa lista logo após a seção 1. Esses artigos podem ser cobrados pelo número, mas sempre de forma simples. Foram retiradas as questões de história de teorias (causalismo, autores, escolas menores), números de artigos, penas em anos, prazos, cálculos de data e detalhes de leis extravagantes. Ao criar questões novas desta matéria, manter esse nível: conceito geral e situação prática, sem decoreba. Arquivo offline gerado. O resumo tem 28 seções; o PDF foi regerado com o Chromium (Playwright). A comparação sobre o erro de proibição no Código comum (seção 25) vem do infográfico e merece confirmação com o instrutor.
- **Direito Disciplinar:** cadastrada como "em breve", sem resumo e sem quiz. Aguardando o material.

## Pendências
- Batente do quiz de EPR: o usuário vai enviar um vídeo ou marcações de tempo. O trabalho vai para um branch, não para `main`.
- Quizzes antigos (SCI, Afogamento, SCIP, APH, Espaço Confinado e Silos) continuam no histórico do Git. Só migrar quando o usuário pedir.

## Visual
- Paleta definida em `assets/estudos.css` (variáveis em `:root`, com modo escuro): fundo neutro claro, cabeçalho grafite, cor principal petróleo, destaque âmbar. A cor de cada matéria (`cor`) aparece só em detalhes (selo, faixa do topo, ícones).

## Arquivos de apoio
- `README.md`: visão geral da estrutura.
- `tools/gerar-offline.js`: gera o `.html` offline.
- `tools/testar-telas.js`: testa o quiz em vários tamanhos de tela.
- `tools/checar-questoes.js`: confere o tamanho e a posição das alternativas corretas.
