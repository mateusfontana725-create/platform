/*
 * Teste de telas do Estudos Fontana.
 * Uso:  node tools/testar-telas.js <materia-id> [base-url]
 *       node tools/testar-telas.js <materia-id> --offline   (testa o .html baixável, aberto direto do disco)
 *   (suba antes um servidor na pasta do projeto: python3 -m http.server 8765)
 * Mede, em vários tamanhos de tela, se as páginas têm rolagem horizontal e se cada
 * estado do quiz (pergunta, dica aberta, respondida, digitada) cabe sem rolar.
 */
const { chromium } = require('playwright');
const id = process.argv[2] || 'epr';
const offline = process.argv.includes('--offline');
const base = (process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'http://127.0.0.1:8765/').replace(/\/?$/, '/');
const quizUrl = offline ? 'file://' + require('path').resolve(__dirname, '..', 'offline', id + '-quiz.html') : base + 'quiz.html?m=' + id;
const telas = [
  ['celular pequeno 360x640', 360, 640],
  ['celular 390x844', 390, 844],
  ['celular grande 412x915', 412, 915],
  ['celular deitado 844x390', 844, 390],
  ['tablet em pé 768x1024', 768, 1024],
  ['tablet deitado 1024x768', 1024, 768],
  ['computador 1280x800', 1280, 800],
];
(async () => {
  const b = await chromium.launch();
  let problemas = 0;
  const erros = [];
  for (const [nome, w, h] of telas) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => erros.push(nome + ': ' + e.message));
    const linhas = [];
    const horiz = async (rotulo) => {
      const r = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      if (r[0] > r[1]) { linhas.push(`  ✗ ${rotulo}: rolagem horizontal (${r[0]} > ${r[1]})`); problemas++; }
    };
    const cabe = async (rotulo) => {
      const r = await p.evaluate(() => { const m = document.getElementById('qmain'); return m ? [m.scrollHeight, m.clientHeight] : null; });
      if (!r) return;
      const ok = r[0] <= r[1] + 1;
      linhas.push(`  ${ok ? '✓' : '✗'} ${rotulo}: ${ok ? 'cabe' : 'precisa rolar ' + (r[0] - r[1]) + 'px'}`);
      if (!ok) problemas++;
    };
    if (!offline) {
      await p.goto(base + 'index.html'); await horiz('início');
      const hi = await p.evaluate(() => [document.documentElement.scrollHeight, innerHeight]);
      linhas.push(`  · início: altura ${hi[0]} para tela de ${hi[1]}`);
      await p.goto(base + 'materia.html?m=' + id); await horiz('matéria');
      const hm = await p.evaluate(() => [document.documentElement.scrollHeight, innerHeight]);
      linhas.push(`  · matéria: altura ${hm[0]} para tela de ${hm[1]}${hm[0] > hm[1] ? ' (rola)' : ''}`);
    }
    await p.goto(quizUrl); await p.waitForSelector('#comecar'); await horiz('início do quiz');
    await p.click('#comecar'); await p.waitForTimeout(150);
    // percorre TODAS as questões: com dica aberta, respondida (cada aba) e digitada
    let total = 0, ruins = 0, pior = 0, exemplo = '';
    const mede = async (rotulo, i) => {
      const r = await p.evaluate(() => { const m = document.getElementById('qmain'); return m ? [m.scrollHeight, m.clientHeight] : null; });
      if (!r) return;
      total++;
      if (r[0] > r[1] + 1) { ruins++; if (r[0] - r[1] > pior) { pior = r[0] - r[1]; exemplo = `${rotulo} (questão ${i + 1})`; } }
    };
    for (let i = 0; i < 400; i++) {
      const temOpt = await p.locator('.opt').count(), temTxt = await p.locator('#formtexto').count();
      if (!temOpt && !temTxt) break;
      await horiz('questão ' + (i + 1));
      if (temOpt) {
        await mede('escolha', i);
        await p.click('.dicabtn'); await mede('escolha com dica', i);
        await p.click('.opt >> nth=0'); await p.waitForTimeout(30);
        await mede('respondida, aba Explicação', i);
        const aba = p.locator('[data-aba="simples"]');
        if (await aba.isVisible()) { await aba.click(); await mede('respondida, aba Em outras palavras', i); }
      } else {
        await mede('digitar', i);
        await p.click('.dicabtn'); await mede('digitar com dica', i);
        await p.fill('#entrada', 'resposta qualquer'); await p.click('#formtexto button'); await p.waitForTimeout(30);
        await mede('digitada respondida, aba Explicação', i);
        const aba = p.locator('[data-aba="simples"]');
        if (await aba.isVisible()) { await aba.click(); await mede('digitada respondida, aba Em outras palavras', i); }
      }
      const prox = p.locator('#prox');
      if (await prox.count() && !(await prox.innerText()).includes('resultado')) await prox.click(); else break;
    }
    if (ruins) { problemas++; linhas.push(`  ✗ quiz: ${ruins} de ${total} estados precisam rolar (pior: ${pior}px em ${exemplo})`); }
    else linhas.push(`  ✓ quiz: ${total} estados verificados, todos cabem sem rolar`);
    await p.click('#finalizar'); await p.waitForTimeout(100); await horiz('resultado');
    console.log(`\n${nome}\n${linhas.join('\n')}`);
    await p.close();
  }
  console.log(`\n${problemas ? 'PROBLEMAS: ' + problemas : 'Tudo certo'}${erros.length ? '\nErros de JavaScript:\n' + erros.join('\n') : ''}`);
  await b.close();
  process.exit(problemas || erros.length ? 1 : 0);
})();
