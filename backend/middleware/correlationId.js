const { v4: uuidv4 } = require('uuid');

const headerName = 'x-correlation-id';

module.exports = function correlationId(req, res, next) {
  const incoming = req.headers[headerName] || req.headers[headerName.toUpperCase()];
  const id = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : uuidv4();
  req.correlationId = id;
  res.setHeader(headerName, id);
  next();
};

