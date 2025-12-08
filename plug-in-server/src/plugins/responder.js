const fp = require('fastify-plugin');

module.exports = fp((fastify, opts = {}) => {
  const defaultSuccessCode = Number.isInteger(opts.successCode) ? opts.successCode : 0;
  const defaultErrorCode = Number.isInteger(opts.errorCode) ? opts.errorCode : null;

  const normalizeData = (payload) => (payload === undefined || payload === null ? {} : payload);
  const resolveMessage = (message) => (typeof message === 'string' ? message : '');
  const buildResponse = (code, message, payload) => ({
    code: Number.isInteger(code) ? code : 0,
    message: resolveMessage(message),
    data: normalizeData(payload),
    timestamp: Date.now()
  });

  fastify.decorateReply('sendSuccess', function sendSuccess(payload = null, statusCode = 200, message = '') {
    this.code(statusCode);
    const resolvedCode = Number.isInteger(defaultSuccessCode) ? defaultSuccessCode : 0;
    return this.send(buildResponse(resolvedCode, message, payload));
  });

  fastify.decorateReply('sendError', function sendError(message = '', statusCode = 400, codeOrOptions = null, data = null) {
    this.code(statusCode);

    let explicitCode = codeOrOptions;
    let payload = data;

    if (codeOrOptions && typeof codeOrOptions === 'object' && !Array.isArray(codeOrOptions)) {
      explicitCode = codeOrOptions.code;
      payload = codeOrOptions.data !== undefined ? codeOrOptions.data : payload;
    }

    const resolvedCode = Number.isInteger(explicitCode)
      ? explicitCode
      : Number.isInteger(defaultErrorCode)
        ? defaultErrorCode
        : Number.isInteger(statusCode)
          ? statusCode
          : 1;

    return this.send(buildResponse(resolvedCode, message, payload));
  });

  fastify.addSchema({
    $id: 'ResponseBase',
    type: 'object',
    properties: {
      code: { type: 'integer' },
      message: { type: 'string' },
      data: {},
      timestamp: { type: 'integer' }
    },
    required: ['code', 'message', 'data', 'timestamp']
  });
});
