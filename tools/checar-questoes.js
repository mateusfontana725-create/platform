/*
 * Confere se as alternativas de um quiz estão bem distribuídas.
 * Uso:  node tools/checar-questoes.js <materia-id>
 * Regras (quiz com 20 ou mais questões de escolha):
 *   - cada letra (A, B, C, D) correta entre 18% e 32% das questões;
 *   - nenhuma letra correta repetida 3 vezes seguidas na ordem do arquivo;
 *   - a alternativa correta é a MAIS LONGA em no máximo 35% das questões
 *     (se for sempre a maior, dá para acertar sem estudar).
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const id = process.argv[2];
if (!id) { console.error('Uso: node tools/checar-questoes.js <materia-id>'); process.exit(2); }
const arq = path.join(__dirname, '..', 'data', id + '.js');
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(arq, 'utf8'), ctx);
// Questões com `origem` (ex.: gabarito do instrutor) mantêm a ordem original das alternativas e ficam fora das regras de equilíbrio.
const qs = (ctx.window.QUIZ_DATA.questoes || []).filter(q => q.tipo === 'escolha' && !q.origem);
const n = qs.length; const L = 'ABCD';
const cont = [0, 0, 0, 0]; let maior = 0, empate = 0, menor = 0, corridas = 0, run = 1, destaque = [];
qs.forEach((q, i) => {
  cont[q.correta]++;
  const t = q.opcoes.map(o => o.length), c = t[q.correta], outras = t.filter((_, j) => j !== q.correta);
  if (c > Math.max(...outras)) { maior++; if (c > Math.max(...outras) * 1.3) destaque.push(i + 1); }
  else if (c === Math.max(...outras)) empate++;
  if (c < Math.min(...outras)) menor++;
  if (i > 0 && qs[i - 1].correta === q.correta) { run++; if (run === 3) corridas++; } else run = 1;
});
const pct = x => (100 * x / n).toFixed(0) + '%';
console.log(`${id}: ${n} questões de escolha`);
console.log('  corretas por letra:', cont.map((c, i) => `${L[i]} ${c} (${pct(c)})`).join(' · '));
console.log(`  correta mais longa: ${maior} (${pct(maior)}) · empates: ${empate} · mais curta: ${menor}`);
console.log(`  sequências de 3 letras iguais: ${corridas}`);
if (destaque.length) console.log('  correta bem maior que as outras (>30%) nas questões:', destaque.join(', '));
const falhas = [];
if (n >= 20) {
  cont.forEach((c, i) => { if (c / n < 0.18 || c / n > 0.32) falhas.push(`letra ${L[i]} fora de 18% a 32%`); });
  if (maior / n > 0.35) falhas.push('a correta é a mais longa em mais de 35% das questões');
}
if (corridas) falhas.push('há sequências de 3 respostas corretas com a mesma letra');
console.log(falhas.length ? '  ✗ ' + falhas.join('; ') : '  ✓ Tudo certo');
process.exit(falhas.length ? 1 : 0);
