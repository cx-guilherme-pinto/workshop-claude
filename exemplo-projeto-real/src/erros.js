export class ErroValidacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroValidacao';
  }
}

export class ErroAcesso extends Error {
  constructor(mensagem = 'Sem permissão') {
    super(mensagem);
    this.name = 'ErroAcesso';
  }
}
