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
  var M = mId && window.achaMateria ? window.achaMateria(mId) : null;

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
    return a;
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
    var crumb = M
      ? '<a href="index.html">Início</a><span class="sep">›</span><a href="materia.html?m=' + encodeURIComponent(M.id) + '">' + esc(M.nome) + '</a><span class="sep">›</span><span>Quiz</span>'
      : '<a href="index.html">Início</a><span class="sep">›</span><span>Quiz</span>';
    return '<header class="site-header"><div class="in">' +
      '<a class="brand" href="index.html"><span class="logo">EF</span><span>Estudos Fontana</span></a>' +
      (extra || '<a class="nav-link" href="index.html">Todas as matérias</a>') +
      '</div></header>' +
      '<nav class="crumbs" style="margin-top:18px" aria-label="Trilha">' + crumb + '</nav>';
  }

  function telaInicio() {
    var escolha = D.questoes.filter(function (q) { return q.tipo === 'escolha'; }).length;
    var texto = D.questoes.length - escolha;
    app.innerHTML = cabecalho() +
      '<div class="qwrap"><section class="panel" style="margin-top:12px">' +
      '<p class="eyebrow">Quiz</p>' +
      '<h1>' + esc(D.titulo) + '</h1>' +
      '<div class="stats">' +
        '<div class="stat"><b>' + D.questoes.length + '</b><span>questões</span></div>' +
        '<div class="stat"><b>' + escolha + '</b><span>de escolha</span></div>' +
        '<div class="stat"><b>' + texto + '</b><span>para digitar</span></div>' +
      '</div>' +
      '<ul class="ul-clean">' +
        '<li>Toque no <b>?</b> para ver uma dica, sem a resposta.</li>' +
        '<li>Ao responder, veja a <b>explicação</b> e a versão <b>em outras palavras</b>.</li>' +
        '<li>Use <b>Pular</b> para passar sem responder. As questões ficam marcadas no mapa.</li>' +
        '<li>No teclado: setas para navegar, números para escolher e Enter para confirmar.</li>' +
      '</ul>' +
      '<div class="btns" style="margin-top:18px"><button class="btn primary" id="comecar" type="button">Começar</button>' +
      (M ? '<a class="btn" href="materia.html?m=' + encodeURIComponent(M.id) + '">Voltar à matéria</a>' : '') + '</div>' +
      '</section></div>';
    document.getElementById('comecar').addEventListener('click', function () {
      novaRodada(embaralha(D.questoes.map(function (_, i) { return i; })));
      tela = 'quiz';
      render();
    });
  }

  function cardHTML(di) {
    var q = D.questoes[di];
    var r = R[di] || {};
    var resp = respondida(di);
    var n = pos + 1, total = ordem.length;
    var h = '<article class="qcard" aria-live="polite">';
    h += '<div class="qtop"><span class="badge">' + esc(q.assunto) + '</span><span class="small muted">Questão ' + n + ' de ' + total + '</span></div>';
    if (q.alvo) {
      var fig = D.figuras[q.alvo.fig];
      var classe = q.alvo.fig === 'f1' ? 'grande' : 'pequena';
      h += '<div class="figwrap"><div class="figbox ' + classe + '" title="Figura">' + figuraSVG(q.alvo, false) + '</div>' +
        '<button class="figbtn" type="button" data-ampliar="' + di + '">🔍 Ver figura inteira</button></div>';
    }
    h += '<div class="enunc-row"><h2 class="enunc">' + esc(q.enunciado) + '</h2>' +
      '<button class="dicabtn" type="button" aria-label="Mostrar dica" aria-expanded="' + (dicaAberta[di] ? 'true' : 'false') + '" data-dica="' + di + '">?</button></div>';
    h += '<div class="dica" id="dica-' + di + '"' + (dicaAberta[di] ? '' : ' hidden') + '><strong>Dica:</strong> ' + esc(q.dica) + '</div>';

    if (q.tipo === 'escolha') {
      h += '<div class="opts" role="group" aria-label="Alternativas">';
      q.opcoes.forEach(function (op, i) {
        var cls = 'opt', dis = resp ? ' disabled' : '';
        if (resp) {
          if (i === q.correta) cls += ' ok';
          else if (i === r.escolha) cls += ' bad';
          else cls += ' dim';
        }
        h += '<button class="' + cls + '" type="button" data-op="' + i + '"' + dis + '>' +
          '<span class="letra">' + String.fromCharCode(65 + i) + '</span><span class="txt">' + esc(op) + '</span></button>';
      });
      h += '</div>';
    } else {
      var val = resp ? esc(r.texto) : '';
      var cls = resp ? (r.estado === 'certo' ? ' ok' : ' bad') : '';
      h += '<form class="txtform" id="formtexto" autocomplete="off"><input id="entrada" class="' + cls + '" type="text" placeholder="Digite o nome da peça" value="' + val + '"' +
        (resp ? ' disabled' : '') + ' aria-label="Nome da peça" autocapitalize="sentences" spellcheck="false">' +
        (resp ? '' : '<button class="btn primary" type="submit">Confirmar</button>') + '</form>';
    }

    if (resp) {
      if (r.estado === 'certo') {
        h += '<div class="fb ok"><strong>✓ Correto!</strong></div>';
      } else {
        h += '<div class="fb bad"><strong>✗ Não foi dessa vez.</strong><div class="resp">Resposta correta: <b>' + esc(q.resposta) + '</b></div></div>';
      }
      h += '<div class="exp"><h3>Explicação</h3><p>' + esc(q.explicacao) + '</p></div>';
      h += '<div class="exp simples"><h3>Em outras palavras</h3><p>' + esc(q.emOutrasPalavras) + '</p></div>';
    }

    var ultima = pos === total - 1;
    h += '<div class="qnav">' +
      '<button class="btn" type="button" id="ant"' + (pos === 0 ? ' disabled' : '') + '>← Anterior</button>' +
      '<div class="direita">' +
      (resp ? '' : '<button class="btn" type="button" id="pular">Pular</button>') +
      (resp
        ? '<button class="btn primary" type="button" id="prox">' + (ultima ? 'Ver resultado' : 'Próxima →') + '</button>'
        : (ultima ? '<button class="btn" type="button" id="fim">Ver resultado</button>' : '')) +
      '</div></div>';
    h += '</article>';
    return h;
  }

  function mapaHTML() {
    var h = '<div class="mapa" role="navigation" aria-label="Mapa de questões">';
    ordem.forEach(function (di, k) {
      var est = estadoDe(di);
      h += '<button type="button" data-ir="' + k + '" class="' + est + (k === pos ? ' atual' : '') + '" aria-label="Questão ' + (k + 1) + '">' + (k + 1) + '</button>';
    });
    h += '</div>';
    h += '<div class="legenda"><span>■ <span style="color:var(--ok)">acerto</span></span><span>■ <span style="color:var(--bad)">erro</span></span><span>▭ pulada</span></div>';
    return h;
  }

  function telaQuiz() {
    var c = contagem(), total = ordem.length;
    var feitas = c.certo + c.errado;
    var pct = total ? Math.round(feitas / total * 100) : 0;
    app.innerHTML = cabecalho('<button class="btn" type="button" id="finalizar" style="min-height:40px;padding:8px 14px">Finalizar</button>') +
      '<div class="qwrap">' +
      '<div class="qbar"><span class="info">' + feitas + ' de ' + total + ' respondidas · ✓ ' + c.certo + ' · ✗ ' + c.errado + '</span></div>' +
      '<div class="progress" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
      cardHTML(ordem[pos]) +
      mapaHTML() +
      '</div>';
    ligaEventosQuiz();
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
    if (pular) pular.addEventListener('click', function () { pulaQuestao(); });
    var prox = document.getElementById('prox');
    if (prox) prox.addEventListener('click', proxima);
    var fim = document.getElementById('fim');
    if (fim) fim.addEventListener('click', function () { mostraResultado(); });
    var ant = document.getElementById('ant');
    if (ant) ant.addEventListener('click', anterior);
    var fin = document.getElementById('finalizar');
    if (fin) fin.addEventListener('click', function () { mostraResultado(); });
    app.querySelectorAll('[data-dica]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = parseInt(b.getAttribute('data-dica'), 10);
        dicaAberta[k] = !dicaAberta[k];
        b.setAttribute('aria-expanded', dicaAberta[k] ? 'true' : 'false');
        var box = document.getElementById('dica-' + k);
        if (box) box.hidden = !dicaAberta[k];
      });
    });
    app.querySelectorAll('[data-ampliar]').forEach(function (b) {
      b.addEventListener('click', function () { abrirFigura(D.questoes[parseInt(b.getAttribute('data-ampliar'), 10)].alvo); });
    });
    app.querySelectorAll('[data-ir]').forEach(function (b) {
      b.addEventListener('click', function () { pos = parseInt(b.getAttribute('data-ir'), 10); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    });
    var entrada = document.getElementById('entrada');
    if (entrada && !entrada.disabled) entrada.focus();
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
    if (pos < ordem.length - 1) { pos++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else mostraResultado();
  }
  function anterior() {
    if (pos > 0) { pos--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  function mostraResultado() {
    tela = 'resultado';
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
      '<div class="qwrap"><section class="panel" style="margin-top:12px;text-align:center">' +
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
        (M ? '<a class="btn" href="materia.html?m=' + encodeURIComponent(M.id) + '">Voltar à matéria</a>' : '') +
      '</div>' +
      '</section></div>';
    document.getElementById('refazer').addEventListener('click', function () {
      novaRodada(embaralha(D.questoes.map(function (_, i) { return i; })));
      tela = 'quiz'; render(); window.scrollTo({ top: 0 });
    });
    var rev = document.getElementById('revisar');
    if (rev) rev.addEventListener('click', function () {
      var ruins = ordem.filter(function (di) { return estadoDe(di) !== 'certo'; });
      novaRodada(embaralha(ruins));
      tela = 'quiz'; render(); window.scrollTo({ top: 0 });
    });
  }

  function render() {
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
    app.innerHTML = cabecalho() + '<div class="qwrap"><section class="panel msg" style="margin-top:12px">' +
      '<h1>' + esc(texto) + '</h1><p class="muted">Volte à matéria para ver as opções disponíveis.</p>' +
      '<div class="btns" style="justify-content:center"><a class="btn primary" href="' + (M ? 'materia.html?m=' + encodeURIComponent(M.id) : 'index.html') + '">Voltar</a></div></section></div>';
  }

  if (!M) { semQuiz('Matéria não encontrada'); return; }
  document.title = 'Quiz · ' + M.nome + ' · Estudos Fontana';
  if (!M.quiz) { semQuiz('Quiz em breve'); return; }

  app.innerHTML = cabecalho() + '<div class="qwrap"><div class="panel msg" style="margin-top:12px"><p class="muted">Carregando quiz…</p></div></div>';
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
