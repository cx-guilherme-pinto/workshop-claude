import { clicaErro } from '../../templates/clica-erro.js';

export default clicaErro({
  id: 'web-01',
  title: 'Encontra a injeção SQL',
  category: 'web',
  difficulty: 2,
  concept: 'Juntar texto do utilizador a uma consulta SQL deixa o atacante reescrever a consulta.',
  prompt: 'Este código de login vai para produção amanhã. Que linha permite uma injeção SQL?',
  explanation: 'Ao colar o email no SQL, o atacante pode fechar a aspa e juntar \' OR \'1\'=\'1. Usa consultas parametrizadas: db.query(\'… WHERE email = ?\', [email]).',
  language: 'js',
  segments: [
    'const email = req.body.email;',
    'const pass = req.body.password;',
    "const sql = \"SELECT * FROM users WHERE email = '\" + email + \"'\";",
    'const user = await db.query(sql);',
    'if (!user || !(await verify(pass, user.hash))) return res.status(401).end();',
  ],
  answer: [2],
});
