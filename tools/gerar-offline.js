/*
 * Gera o quiz de uma matéria como UM único arquivo .html, para baixar e usar offline.
 * Uso:  node tools/gerar-offline.js [id-da-materia]     (sem argumento, gera de todas que têm quiz)
 * Saída: offline/<id>-quiz.html  (CSS, motor, questões e imagens embutidos; só este arquivo, não a plataforma)
 * Rode de novo sempre que mudar o motor (assets/quiz.js, *.css) ou o banco (data/<id>.js).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const raiz = path.resolve(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(ler('assets/materias.js'), ctx);
const materias = ctx.window.MATERIAS;
const alvo = process.argv[2];
const lista = materias.filter((m) => m.quiz && (!alvo || m.id === alvo));
if (!lista.length) { console.error('Nenhuma matéria com quiz' + (alvo ? ' para o id "' + alvo + '"' : '') + '.'); process.exit(1); }

const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif' };
const seguro = (t) => t.replace(/<\/script/gi, '<\\/script');
fs.mkdirSync(path.join(raiz, 'offline'), { recursive: true });

for (const m of lista) {
  let dados = ler(m.quiz);
  // imagens referenciadas por caminho viram data URI
  dados = dados.replace(/(["'])((?:\.\/)?data\/img\/[^"']+)\1/g, (_, q, arq) => {
    const f = path.join(raiz, arq);
    if (!fs.existsSync(f)) throw new Error('Imagem não encontrada: ' + arq);
    return q + 'data:' + (mime[path.extname(f).toLowerCase()] || 'application/octet-stream') + ';base64,' + fs.readFileSync(f).toString('base64') + q;
  });
  const info = { id: m.id, nome: m.nome, sigla: m.sigla, descricao: m.descricao, cor: m.cor };
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Quiz · ${m.nome} · Estudos Fontana</title>
<style>
${ler('assets/estudos.css')}
${ler('assets/quiz.css')}
</style>
</head>
<body>
<div class="wrap" id="app"></div>
<script>window.QUIZ_OFFLINE = true; window.MATERIAS = [${seguro(JSON.stringify(info))}];</script>
<script>
${seguro(dados)}
</script>
<script>
${seguro(ler('assets/quiz.js'))}
</script>
</body>
</html>
`;
  const saida = path.join(raiz, 'offline', m.id + '-quiz.html');
  fs.writeFileSync(saida, html);
  console.log('✓ ' + path.relative(raiz, saida) + ' (' + Math.round(html.length / 1024) + ' KB)' + (m.quizOffline === 'offline/' + m.id + '-quiz.html' ? '' : '  ⚠ ajuste "quizOffline" em assets/materias.js para "offline/' + m.id + '-quiz.html"'));
}
