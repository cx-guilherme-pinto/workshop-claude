import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'ph-03',
  title: 'O anexo disfarçado',
  category: 'phishing',
  difficulty: 1,
  concept: 'Uma extensão dupla esconde um programa atrás de um nome que parece um documento.',
  prompt: 'Estes anexos chegaram de um fornecedor. Qual é um programa disfarçado?',
  language: 'texto',
  segments: [
    'relatorio_marco.pdf',
    'fatura_0423.pdf.exe',
    'fotos_evento.jpg',
    'contrato.docx',
    'orcamento.xlsx',
  ],
  answer: [1],
  explanation: 'O que conta é a última extensão: .exe é um programa. Ativa a opção de mostrar as extensões e nunca abras executáveis recebidos por email.',
});
