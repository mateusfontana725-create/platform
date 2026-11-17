/*
 * Registro de matérias do Estudos Fontana.
 * Para adicionar uma matéria: inclua um item aqui. Os campos "resumo" e "quiz"
 * apontam para os arquivos; use null enquanto o conteúdo não existir.
 *   id        identificador (sem espaços, usado na URL: materia.html?m=id)
 *   nome      título exibido
 *   sigla     até 4 letras, usada no selo do cartão
 *   descricao resumo curto da matéria
 *   cor       cor de destaque da matéria (hexadecimal)
 *   resumo    caminho da página de resumo (ex.: "resumo/xyz.html") ou null
 *   resumoPdf caminho do PDF do resumo, oferecido para baixar (uso offline) ou null
 *   quiz      caminho do banco de questões (ex.: "data/xyz.js") ou null
 *   quizOffline  quiz da matéria em um único .html para baixar: "offline/<id>-quiz.html"
 *                (gerado por: node tools/gerar-offline.js) ou null
 */
window.MATERIAS = [
  {
    id: 'salvamento-veicular',
    nome: 'Salvamento Veicular',
    sigla: 'SV',
    descricao: 'Resumo do POP-SAR-3201.1: fases do salvamento, guarnições, FEAs, planos e glossário.',
    cor: '#0a7d2c',
    resumo: 'resumo/salvamento-veicular.html',
    resumoPdf: 'resumo/salvamento-veicular.pdf',
    quiz: null,
    quizOffline: null
  },
  {
    id: 'epr',
    nome: 'Equipamento de Proteção Respiratória',
    sigla: 'EPR',
    descricao: 'Peças do conjunto autônomo, identificadas pela figura e pelo nome.',
    cor: '#1e3a8a',
    resumo: null,
    resumoPdf: null,
    quiz: 'data/epr.js',
    quizOffline: 'offline/epr-quiz.html'
  },
  {
    id: 'espaco-confinado-silos',
    nome: 'Espaço Confinado e Silos',
    sigla: 'EC',
    descricao: 'Resumo sobre espaço confinado e silos, em PDF.',
    cor: '#b45309',
    resumo: 'resumo/espaco-confinado-silos.html',
    resumoPdf: 'resumo/espaco-confinado-silos.pdf',
    quiz: null,
    quizOffline: null
  },
  {
    id: 'direito-penal',
    nome: 'Direito Penal e Penal Militar',
    sigla: 'DPM',
    descricao: 'Princípios, teoria do crime, CPM, deserção, IPM, legislação extravagante e NUSEG.',
    cor: '#7f1d1d',
    resumo: 'resumo/direito-penal.html',
    resumoPdf: 'resumo/direito-penal.pdf',
    quiz: 'data/direito-penal.js',
    quizOffline: 'offline/direito-penal-quiz.html'
  }
];

window.achaMateria = function (id) {
  return (window.MATERIAS || []).find(function (m) { return m.id === id; }) || null;
};
