/*
 * Motor de quiz do Estudos Fontana.
 * Lê o banco carregado em window.QUIZ_DATA (ver data/*.js). Não depende do conteúdo:
 * qualquer matéria nova usa o mesmo motor, só troca o arquivo de dados.
 *
 * Formato de cada questão:
 *   tipo: "escolha" (opcoes + correta: índice) ou "texto" (aceitos: lista de respostas aceitas)
 *   assunto, enunciado, resposta (texto exibido como correta)
 *   alvo (opcional): { fig, s:[x,y], t:[x,y], vista?:[x,y,w,h] } para marcar a figura com seta
 *   dica, explicacao, emOutrasPalavras
 */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var params = new URLSearchParams(location.search);
  var mId = params.get('m');
  // Modo offline: o arquivo baixado já traz tudo embutido (window.QUIZ_OFFLINE) e não tem links para o resto da plataforma.
  var OFF = !!window.QUIZ_OFFLINE;
  var M = OFF ? (window.MATERIAS || [])[0] : (mId && window.achaMateria ? window.achaMateria(mId) : null);

  var D = null;       // dados carregados
  var ordem = [];     // índices das questões em D.questoes, na ordem da rodada
  var R = {};         // resposta por índice de questão: { estado, escolha, texto }
  var dicaAberta = {};
  var pos = 0;        // posição atual em ordem
  var tela = 'inicio';
  var rodada = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function embaralha(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    // questões com `origem` (ex.: do instrutor) vão sempre para o fim, na ordem original
    var vem = function (x) { return D.questoes[x] && D.questoes[x].origem; };
    return a.filter(function (x) { return !vem(x); }).concat(a.filter(vem).sort(function (x, y) { return x - y; }));
  }

  // ---- comparação de respostas digitadas (sem acento, sem palavras de ligação)
  var STOP = ['de', 'do', 'da', 'dos', 'das', 'ou', 'em', 'com', 'tipo', 'para', 'uma', 'nos', 'nas', 'por'];
  function tokens(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 3 && STOP.indexOf(t) < 0; });
  }
  function aceita(entrada, aliases) {
    var inT = tokens(entrada);
    if (!inT.length) return false;
    return (aliases || []).some(function (a) {
      var at = tokens(a);
      return at.length && at.every(function (t) { return inT.indexOf(t) >= 0; });
    });
  }

  // ---- figura com seta (coordenadas da imagem original)
  function vistaDe(alvo, fig, cheia) {
    if (cheia || alvo.fig !== 'f1') return [0, 0, fig.w, fig.h];
    if (alvo.vista) return alvo.vista.slice();
    var xs = [alvo.s[0], alvo.t[0]], ys = [alvo.s[1], alvo.t[1]];
    var w = Math.max(480, Math.max.apply(null, xs) - Math.min.apply(null, xs) + 220), h = w * 0.62;
    var cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, cy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
    var x = Math.min(Math.max(0, cx - w / 2), fig.w - w), y = Math.min(Math.max(0, cy - h / 2), fig.h - h);
    return [x, y, w, h];
  }
  function figuraSVG(alvo, cheia) {
    var fig = D.figuras[alvo.fig];
    var v = vistaDe(alvo, fig, cheia), vx = v[0], vy = v[1], vw = v[2], vh = v[3];
    var sw = cheia ? vw / 220 : vw / 140, hl = sw * 3.4, hw = sw * 1.8;
    var sx = alvo.s[0], sy = alvo.s[1], tx = alvo.t[0], ty = alvo.t[1];
    var ux = tx - sx, uy = ty - sy, L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
    var Lmin = vw * 0.13;
    if (L < Lmin) { sx = tx - ux * Lmin; sy = ty - uy * Lmin; }
    var m = sw * 1.5;
    sx = Math.min(vx + vw - m, Math.max(vx + m, sx)); sy = Math.min(vy + vh - m, Math.max(vy + m, sy));
    var nx = -uy, ny = ux, bx = tx - ux * hl, by = ty - uy * hl;
    var pts = tx + ',' + ty + ' ' + (bx + nx * hw) + ',' + (by + ny * hw) + ' ' + (bx - nx * hw) + ',' + (by - ny * hw);
    return '<svg viewBox="' + vx + ' ' + vy + ' ' + vw + ' ' + vh + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Figura com seta apontando para a peça">' +
      '<image href="' + fig.src + '" x="0" y="0" width="' + fig.w + '" height="' + fig.h + '" preserveAspectRatio="none"/>' +
      '<circle class="pulso" cx="' + tx + '" cy="' + ty + '" r="' + (sw * 1.2) + '" fill="none" stroke="#e11d48" stroke-width="' + (sw * 0.6) + '"/>' +
      '<line x1="' + sx + '" y1="' + sy + '" x2="' + bx + '" y2="' + by + '" stroke="#fff" stroke-width="' + (sw * 2.2) + '" stroke-linecap="round"/>' +
      '<polygon points="' + pts + '" fill="#fff" stroke="#fff" stroke-width="' + (sw * 1.2) + '" stroke-linejoin="round"/>' +
      '<line x1="' + sx + '" y1="' + sy + '" x2="' + bx + '" y2="' + by + '" stroke="#e11d48" stroke-width="' + sw + '" stroke-linecap="round"/>' +
      '<polygon points="' + pts + '" fill="#e11d48"/>' +
      '<circle cx="' + sx + '" cy="' + sy + '" r="' + (sw * 0.9) + '" fill="#e11d48" stroke="#fff" stroke-width="' + (sw * 0.4) + '"/>' +
      '</svg>';
  }
  function abrirFigura(alvo) {
    var ov = document.createElement('div');
    ov.className = 'ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="dicas">Figura inteira. Role para ver os detalhes.</div>' +
      '<button class="btn fechar" type="button">Fechar ✕</button><div class="inner">' + figuraSVG(alvo, true) + '</div>';
    function fecha() { ov.remove(); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') fecha(); }
    ov.querySelector('.fechar').addEventListener('click', fecha);
    ov.addEventListener('click', function (e) { if (e.target === ov) fecha(); });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(ov);
    ov.querySelector('.fechar').focus();
  }

  // ---- estado
  function novaRodada(indices) {
    R = {};
    dicaAberta = {};
    ordem = indices.slice();
    pos = 0;
    rodada++;
  }
  function estadoDe(di) { return (R[di] && R[di].estado) || 'pendente'; }
  function respondida(di) { var e = estadoDe(di); return e === 'certo' || e === 'errado'; }
  function contagem() {
    var c = { certo: 0, errado: 0, pulada: 0, pendente: 0 };
    ordem.forEach(function (di) { c[estadoDe(di)]++; });
    return c;
  }

  // ---- telas
  function tituloQuiz() { return D ? D.titulo : (M ? M.nome : 'Quiz'); }
  function cabecalho(extra) {
    var crumb = OFF
      ? '<span>' + esc(M.nome) + '</span><span class="sep">›</span><span>Quiz</span>'
      : M
      ? '<a href="index.html">Início</a><span class="sep">›</span><a href="materia.html?m=' + encodeURIComponent(M.id) + '">' + esc(M.nome) + '</a><span class="sep">›</span><span>Quiz</span>'
      : '<a href="index.html">Início</a><span class="sep">›</span><span>Quiz</span>';
    return '<header class="site-header"><div class="in">' +
      (OFF ? '<span class="brand"><span class="logo">EF</span><span>Estudos Fontana</span></span>'
           : '<a class="brand" href="index.html"><span class="logo">EF</span><span>Estudos Fontana</span></a>') +
      (OFF ? '' : (extra || '<a class="nav-link" href="index.html">Todas as matérias</a>')) +
      '</div></header>' +
      '<nav class="crumbs" aria-label="Trilha">' + crumb + '</nav>';
  }

  function telaInicio() {
    var escolha = D.questoes.filter(function (q) { return q.tipo === 'escolha'; }).length;
    var texto = D.questoes.length - escolha;
    var nomesAssuntos = [];
    D.questoes.forEach(function (q) { if (q.assunto && nomesAssuntos.indexOf(q.assunto) < 0) nomesAssuntos.push(q.assunto); });
    app.innerHTML = cabecalho() +
      '<div class="qwrap"><section class="panel">' +
      '<p class="eyebrow">Quiz</p>' +
      '<h1>' + esc(D.titulo) + '</h1>' +
      '<div class="stats">' +
        '<div class="stat"><b>' + D.questoes.length + '</b><span>questões</span></div>' +
        '<div class="stat"><b>' + nomesAssuntos.length + '</b><span>assuntos</span></div>' +
        (texto
          ? '<div class="stat"><b>' + texto + '</b><span>para digitar</span></div>'
          : '<div class="stat"><b>A–D</b><span>objetivas</span></div>') +
      '</div>' +
      '<ul class="ul-clean">' +
        '<li>Toque em <b>Dica</b> para receber uma pista, sem a resposta.</li>' +
        '<li>Ao responder, veja a <b>explicação</b> e a versão <b>em outras palavras</b>.</li>' +
        '<li>Use <b>Pular</b> para passar sem responder. As questões ficam marcadas no mapa.</li>' +
        '<li>No teclado: setas para navegar, números para escolher e Enter para confirmar.</li>' +
      '</ul>' +
      (nomesAssuntos.length > 1 ? '<p class="eyebrow" style="margin-top:18px">Assuntos</p><div class="assuntos-lista">' +
        nomesAssuntos.map(function (a) { return '<span>' + esc(a) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="btns" style="margin-top:20px"><button class="btn primary" id="comecar" type="button">Começar</button>' +
      (M && !OFF ? '<a class="btn" href="materia.html?m=' + encodeURIComponent(M.id) + '">Voltar à matéria</a>' : '') +
      (M && !OFF && M.quizOffline ? '<a class="btn" href="' + M.quizOffline + '" download>↓ Baixar quiz (.html)</a>' : '') + '</div>' +
      '</section></div>';
    document.getElementById('comecar').addEventListener('click', function () {
      novaRodada(embaralha(D.questoes.map(function (_, i) { return i; })));
      tela = 'quiz';
      render();
    });
  }

  var abas = {};      // aba de explicação aberta por questão ("exp" ou "simples")

  function feedbackHTML(di) {
    var q = D.questoes[di], r = R[di];
    var aba = abas[di] || 'exp';
    var h = '';
    var letraCerta = q.tipo === 'escolha' ? String.fromCharCode(65 + q.correta) : '';
    if (r.estado === 'certo') {
      h += '<div class="fb ok"><span class="ic">✓</span><span>Resposta correta!' +
        (q.tipo === 'escolha' ? '' : ' <span class="sub">' + esc(q.resposta) + '</span>') + '</span></div>';
    } else if (q.tipo === 'escolha') {
      h += '<div class="fb bad"><span class="ic">✗</span><span>Resposta incorreta. <span class="sub">Você marcou <b>' + String.fromCharCode(65 + r.escolha) +
        '</b>; a correta é a <b>' + letraCerta + '</b>.</span></span></div>';
    } else {
      h += '<div class="fb bad"><span class="ic">✗</span><span>Resposta incorreta.' +
        '<span class="resp" style="display:block">Você respondeu: ' + esc(r.texto) + '</span>' +
        '<span class="resp" style="display:block">Correta: <b>' + esc(q.resposta) + '</b></span></span></div>';
    }
    h += '<div class="tabs" role="tablist">' +
      '<button type="button" role="tab" data-aba="exp" aria-selected="' + (aba === 'exp') + '">Explicação</button>' +
      '<button type="button" role="tab" data-aba="simples" aria-selected="' + (aba === 'simples') + '">Em outras palavras</button></div>';
    h += '<div class="exps">';
    h += '<div class="exp painel' + (aba === 'exp' ? ' ativo' : '') + '" data-painel="exp"><h3>Explicação</h3><p>' + esc(q.explicacao) + '</p></div>';
    h += '<div class="exp simples painel' + (aba === 'simples' ? ' ativo' : '') + '" data-painel="simples"><h3>Em outras palavras</h3><p>' + esc(q.emOutrasPalavras) + '</p></div>';
    return h + '</div>';
  }

  function opcoesHTML(di) {
    var q = D.questoes[di], r = R[di], resp = respondida(di);
    var h = '<ol class="opts" aria-label="Alternativas">';
    q.opcoes.forEach(function (op, i) {
      var cls = 'opt', marca = '';
      if (resp) {
        if (i === q.correta) { cls += ' certa'; marca = '<span class="marca">Correta</span>'; }
        else if (i === r.escolha) { cls += ' errada'; marca = '<span class="marca">Sua resposta</span>'; }
        else cls += ' apagada';
      }
      h += '<li' + (cls.indexOf('apagada') >= 0 ? ' class="apagada"' : cls.indexOf('errada') >= 0 ? ' class="errada"' : '') + '><button class="' + cls + '" type="button" data-op="' + i + '"' + (resp ? ' disabled' : '') + '>' +
        '<span class="letra">' + (resp && i === q.correta ? '✓' : resp && i === r.escolha ? '✗' : String.fromCharCode(65 + i)) + '</span>' +
        '<span class="txt">' + esc(op) + '</span>' + marca + '</button></li>';
    });
    return h + '</ol>';
  }

  function respostaHTML(di) {
    var q = D.questoes[di];
    if (q.tipo === 'escolha') return opcoesHTML(di) + (respondida(di) ? feedbackHTML(di) : '');
    if (respondida(di)) return feedbackHTML(di);
    return '<form class="txtform" id="formtexto" autocomplete="off"><input id="entrada" type="text" placeholder="Digite o nome da peça" ' +
      'aria-label="Resposta" autocapitalize="sentences" spellcheck="false" enterkeyhint="done">' +
      '<button class="btn primary" type="submit">Confirmar</button></form>';
  }

  function quizHTML(di) {
    var q = D.questoes[di];
    var resp = respondida(di);
    var total = ordem.length, ultima = pos === total - 1;
    var h = '<div class="qgrid' + (resp ? ' resp' : '') + (q.alvo ? '' : ' sem-fig') + '"><section class="qleft">';
    var ICO_DICA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z"/></svg>';
    h += '<div class="qmeta"><span class="badge' + (q.origem ? ' instrutor' : '') + '"><span>' + esc(q.assunto) + '</span></span>' +
      '<button class="dicabtn" type="button" aria-label="Mostrar dica" aria-expanded="' + (dicaAberta[di] ? 'true' : 'false') + '" data-dica="' + di + '">' + ICO_DICA + 'Dica</button></div>';
    if (q.alvo) {
      h += '<div class="figwrap"><div class="figbox ' + (q.alvo.fig === 'f1' ? 'grande' : 'pequena') + '">' + figuraSVG(q.alvo, false) + '</div>' +
        '<button class="figbtn" type="button" data-ampliar="' + di + '">🔍 Ver figura inteira</button></div>';
    }
    h += '<h2 class="enunc">' + esc(q.enunciado) + '</h2>';
    h += '<div class="dica" id="dica-' + di + '"' + (dicaAberta[di] ? '' : ' hidden') + '><strong>Dica:</strong> ' + esc(q.dica) + '</div>';
    h += '</section><section class="qright" aria-live="polite">' + respostaHTML(di) + '</section></div>';
    return h;
  }

  function rodapeHTML() {
    var di = ordem[pos], resp = respondida(di), ultima = pos === ordem.length - 1;
    return '<div class="in"><button class="btn" type="button" id="ant"' + (pos === 0 ? ' disabled' : '') + '>← Anterior</button>' +
      (resp
        ? '<button class="btn primary" type="button" id="prox">' + (ultima ? 'Ver resultado' : 'Próxima →') + '</button>'
        : '<button class="btn" type="button" id="pular">' + (ultima ? 'Pular e finalizar' : 'Pular →') + '</button>') + '</div>';
  }

  function telaQuiz() {
    var c = contagem(), total = ordem.length;
    var feitas = c.certo + c.errado;
    var pct = total ? Math.round(feitas / total * 100) : 0;
    var voltar = M ? 'materia.html?m=' + encodeURIComponent(M.id) : 'index.html';
    var SVG = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    var icoVoltar = SVG('<path d="M15 18l-6-6 6-6"/>');
    var icoMapa = SVG('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>');
    app.innerHTML =
      '<div class="qapp"' + (M && M.cor ? ' style="--cor:' + esc(M.cor) + '"' : '') + '>' +
      '<header class="qhead"><div class="in">' +
        (OFF ? '<button class="iconbtn" type="button" id="sair" aria-label="Voltar ao início do quiz">' + icoVoltar + '</button>'
             : '<a class="iconbtn" href="' + voltar + '" aria-label="Sair do quiz">' + icoVoltar + '</a>') +
        '<div class="qprog"><div class="qinfo"><span><b>Questão ' + (pos + 1) + '</b> de ' + total + '</span>' +
        '<span class="placar"><span class="c">✓ ' + c.certo + '</span><span class="e">✗ ' + c.errado + '</span></span></div>' +
        '<div class="progress" aria-hidden="true"><i style="width:' + pct + '%"></i></div></div>' +
        '<button class="iconbtn" type="button" id="abrirmapa" aria-label="Mapa de questões">' + icoMapa + '</button>' +
        '<button class="iconbtn txt" type="button" id="finalizar">Encerrar</button>' +
      '</div></header>' +
      '<main class="qmain" id="qmain">' + quizHTML(ordem[pos]) + '</main>' +
      '<footer class="qfoot" id="qfoot">' + rodapeHTML() + '</footer>' +
      '</div>';
    ligaEventosQuiz();
    var m = document.getElementById('qmain'); if (m) m.scrollTop = 0;
    compacta();
  }

  // se a questão não cabe na tela (dica aberta, explicação longa), aperta o layout em etapas.
  // Respondida: as alternativas que não importam ficam apagadas e, se faltar altura, somem.
  function compacta() {
    var m = document.getElementById('qmain'), g = m && m.querySelector('.qgrid');
    if (!g) return;
    var niveis = ['compacta', 'compacta2', 'compacta3', 'compacta4'];
    niveis.forEach(function (c) { g.classList.remove(c); });
    for (var i = 0; i < niveis.length && m.scrollHeight > m.clientHeight + 1; i++) g.classList.add(niveis[i]);
  }
  var tReset;
  window.addEventListener('resize', function () { clearTimeout(tReset); tReset = setTimeout(compacta, 120); });

  function abrirMapa() {
    var ov = document.createElement('div');
    ov.className = 'ov sheet';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Mapa de questões');
    var g = '';
    ordem.forEach(function (di, k) {
      g += '<button type="button" data-ir="' + k + '" class="' + estadoDe(di) + (k === pos ? ' atual' : '') + '" aria-label="Questão ' + (k + 1) + '">' + (k + 1) + '</button>';
    });
    ov.innerHTML = '<div class="sheetbox"><div class="sheethead"><b>Mapa de questões</b><button class="btn fechar" type="button">Fechar ✕</button></div>' +
      '<div class="mapagrid">' + g + '</div>' +
      '<div class="legenda"><span><i class="l-c"></i>acerto</span><span><i class="l-e"></i>erro</span><span><i class="l-p"></i>pulada</span><span><i></i>pendente</span></div></div>';
    function fecha() { ov.remove(); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') fecha(); }
    ov.querySelector('.fechar').addEventListener('click', fecha);
    ov.addEventListener('click', function (e) { if (e.target === ov) fecha(); });
    ov.querySelectorAll('[data-ir]').forEach(function (b) {
      b.addEventListener('click', function () { pos = parseInt(b.getAttribute('data-ir'), 10); fecha(); render(); });
    });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(ov);
    ov.querySelector('.fechar').focus();
  }

  function ligaEventosQuiz() {
    app.querySelectorAll('[data-op]').forEach(function (b) {
      b.addEventListener('click', function () { escolhe(parseInt(b.getAttribute('data-op'), 10)); });
    });
    var form = document.getElementById('formtexto');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = document.getElementById('entrada').value;
      if (!v.trim()) { document.getElementById('entrada').focus(); return; }
      respondeTexto(v);
    });
    var pular = document.getElementById('pular');
    if (pular) pular.addEventListener('click', pulaQuestao);
    var prox = document.getElementById('prox');
    if (prox) prox.addEventListener('click', proxima);
    var ant = document.getElementById('ant');
    if (ant) ant.addEventListener('click', anterior);
    document.getElementById('finalizar').addEventListener('click', mostraResultado);
    var sair = document.getElementById('sair');
    if (sair) sair.addEventListener('click', function () { tela = 'inicio'; render(); });
    document.getElementById('abrirmapa').addEventListener('click', abrirMapa);
    app.querySelectorAll('[data-dica]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = parseInt(b.getAttribute('data-dica'), 10);
        dicaAberta[k] = !dicaAberta[k];
        b.setAttribute('aria-expanded', dicaAberta[k] ? 'true' : 'false');
        var box = document.getElementById('dica-' + k);
        if (box) box.hidden = !dicaAberta[k];
        compacta();
      });
    });
    app.querySelectorAll('[data-ampliar]').forEach(function (b) {
      b.addEventListener('click', function () { abrirFigura(D.questoes[parseInt(b.getAttribute('data-ampliar'), 10)].alvo); });
    });
    app.querySelectorAll('[data-aba]').forEach(function (b) {
      b.addEventListener('click', function () {
        var di = ordem[pos], a = b.getAttribute('data-aba');
        abas[di] = a;
        app.querySelectorAll('[data-aba]').forEach(function (x) { x.setAttribute('aria-selected', String(x.getAttribute('data-aba') === a)); });
        app.querySelectorAll('[data-painel]').forEach(function (x) { x.classList.toggle('ativo', x.getAttribute('data-painel') === a); });
        compacta();
      });
    });
    var entrada = document.getElementById('entrada');
    if (entrada) entrada.focus({ preventScroll: true });
  }

  function escolhe(i) {
    var di = ordem[pos];
    var q = D.questoes[di];
    if (respondida(di)) return;
    var certo = i === q.correta;
    R[di] = { estado: certo ? 'certo' : 'errado', escolha: i, texto: '' };
    render();
  }
  function respondeTexto(v) {
    var di = ordem[pos];
    var q = D.questoes[di];
    if (respondida(di)) return;
    var certo = aceita(v, q.aceitos);
    R[di] = { estado: certo ? 'certo' : 'errado', escolha: -1, texto: v };
    render();
  }
  function pulaQuestao() {
    var di = ordem[pos];
    if (!respondida(di)) R[di] = { estado: 'pulada', escolha: -1, texto: '' };
    proxima();
  }
  function proxima() {
    if (pos < ordem.length - 1) { pos++; render(); }
    else mostraResultado();
  }
  function anterior() {
    if (pos > 0) { pos--; render(); }
  }

  function mostraResultado() {
    tela = 'resultado';
    document.body.classList.remove('modo-quiz');
    var c = contagem(), total = ordem.length;
    var pct = total ? Math.round(c.certo / total * 100) : 0;
    var msg = pct >= 80 ? 'Muito bem! Seu domínio está forte.' : pct >= 60 ? 'Bom caminho. Revise os erros com as explicações.' : 'Vale revisar com calma. Use as explicações para entender cada ponto.';
    // desempenho por assunto
    var grupos = {};
    ordem.forEach(function (di) {
      var a = D.questoes[di].assunto;
      grupos[a] = grupos[a] || { total: 0, certo: 0 };
      grupos[a].total++;
      if (estadoDe(di) === 'certo') grupos[a].certo++;
    });
    var assuntos = Object.keys(grupos).map(function (a) {
      var g = grupos[a], p = g.total ? Math.round(g.certo / g.total * 100) : 0;
      return '<div class="assunto"><div class="lin"><span>' + esc(a) + '</span><span>' + g.certo + ' de ' + g.total + '</span></div>' +
        '<div class="barra"><i style="width:' + p + '%"></i></div></div>';
    }).join('');
    var erros = c.errado + c.pulada;
    app.innerHTML = cabecalho() +
      '<div class="qwrap"><section class="panel" style="text-align:center">' +
      '<p class="eyebrow">Resultado</p>' +
      '<div class="pct">' + pct + '%</div>' +
      '<p style="margin:0 0 6px"><b>Você acertou ' + c.certo + ' de ' + total + '.</b></p>' +
      '<p class="muted" style="margin:0 auto;max-width:48ch">' + msg + '</p>' +
      '<div class="stats" style="margin-top:18px">' +
        '<div class="stat"><b style="color:var(--ok)">' + c.certo + '</b><span>acertos</span></div>' +
        '<div class="stat"><b style="color:var(--bad)">' + c.errado + '</b><span>erros</span></div>' +
        '<div class="stat"><b>' + c.pulada + '</b><span>puladas</span></div>' +
      '</div>' +
      '<div style="text-align:left;margin-top:8px">' + assuntos + '</div>' +
      '<div class="btns" style="justify-content:center;margin-top:18px">' +
        '<button class="btn primary" type="button" id="refazer">Refazer quiz</button>' +
        (erros ? '<button class="btn" type="button" id="revisar">Revisar erros e puladas (' + erros + ')</button>' : '') +
        (M && !OFF ? '<a class="btn" href="materia.html?m=' + encodeURIComponent(M.id) + '">Voltar à matéria</a>' : '') +
      '</div>' +
      '</section></div>';
    document.getElementById('refazer').addEventListener('click', function () {
      novaRodada(embaralha(D.questoes.map(function (_, i) { return i; })));
      tela = 'quiz'; render();
    });
    var rev = document.getElementById('revisar');
    if (rev) rev.addEventListener('click', function () {
      var ruins = ordem.filter(function (di) { return estadoDe(di) !== 'certo'; });
      novaRodada(embaralha(ruins));
      tela = 'quiz'; render();
    });
  }

  function render() {
    document.body.classList.toggle('modo-quiz', tela === 'quiz');
    if (tela === 'inicio') telaInicio();
    else if (tela === 'quiz') telaQuiz();
    else if (tela === 'resultado') mostraResultado();
  }

  // ---- teclado (fora de campos de texto)
  document.addEventListener('keydown', function (e) {
    if (tela !== 'quiz' || document.querySelector('.ov')) return;
    var ativo = document.activeElement;
    if (ativo && (ativo.tagName === 'INPUT' || ativo.tagName === 'TEXTAREA')) return;
    var di = ordem[pos];
    if (e.key === 'ArrowRight') { proxima(); }
    else if (e.key === 'ArrowLeft') { anterior(); }
    else if (/^[1-4]$/.test(e.key) && di !== undefined && D.questoes[di].tipo === 'escolha') {
      var op = app.querySelector('[data-op="' + (parseInt(e.key, 10) - 1) + '"]');
      if (op && !op.disabled) escolhe(parseInt(e.key, 10) - 1);
    }
    else if (e.key === 'Enter' && respondida(di)) { proxima(); }
  });

  // ---- carregamento
  function semQuiz(texto) {
    app.innerHTML = cabecalho() + '<div class="qwrap"><section class="panel msg">' +
      '<h1>' + esc(texto) + '</h1><p class="muted">Volte à matéria para ver as opções disponíveis.</p>' +
      '<div class="btns" style="justify-content:center"><a class="btn primary" href="' + (M ? 'materia.html?m=' + encodeURIComponent(M.id) : 'index.html') + '">Voltar</a></div></section></div>';
  }

  if (!M) { semQuiz('Matéria não encontrada'); return; }
  if (OFF && window.QUIZ_DATA) { D = window.QUIZ_DATA; tela = 'inicio'; render(); return; }
  document.title = 'Quiz · ' + M.nome + ' · Estudos Fontana';
  if (!M.quiz) { semQuiz('Quiz em breve'); return; }

  app.innerHTML = cabecalho() + '<div class="qwrap"><div class="panel msg"><p class="muted">Carregando quiz…</p></div></div>';
  var s = document.createElement('script');
  s.src = M.quiz;
  s.onload = function () {
    if (!window.QUIZ_DATA || !window.QUIZ_DATA.questoes || !window.QUIZ_DATA.questoes.length) { semQuiz('Quiz indisponível'); return; }
    D = window.QUIZ_DATA;
    tela = 'inicio';
    render();
  };
  s.onerror = function () { semQuiz('Não foi possível carregar o quiz'); };
  document.head.appendChild(s);
})();
