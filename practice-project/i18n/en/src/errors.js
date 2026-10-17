export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AccessError extends Error {
  constructor(message = 'Not allowed') {
    super(message);
    this.name = 'AccessError';
  }
}
