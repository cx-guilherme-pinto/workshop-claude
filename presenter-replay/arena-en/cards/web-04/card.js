import { spotTheFlaw } from '../../templates/spot-the-flaw.js';

export default spotTheFlaw({
  id: 'web-04',
  title: 'As faturas dos outros',
  category: 'web',
  difficulty: 2,
  concept: 'IDOR: o servidor devolve um objeto só pelo id, sem confirmar que pertence a quem pede.',
  prompt: 'Qualquer cliente autenticado consegue ver a fatura de outro mudando o número no URL. Que linha causa o problema?',
  language: 'js',
  segments: [
    "app.get('/faturas/:id', autenticado, async (req, res) => {",
    '  const fatura = await db.faturas.findOne({ id: req.params.id });',
    '  if (!fatura) return res.status(404).end();',
    '  res.json(fatura);',
    '});',
  ],
  answer: [1],
  explanation: 'Estar autenticado não chega: falta confirmar o dono. Procura com findOne({ id: req.params.id, clienteId: req.user.id }) para cada cliente ver só o que é seu.',
});
