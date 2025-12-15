class ErrorHandler extends Error {
  constructor(message, statusCode, field = null) {
    super(message);
    this.statusCode = statusCode;
    this.field = field;
  }
}

module.exports = ErrorHandler;
