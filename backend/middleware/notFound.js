const notFound = (req, res, next) => {
  const error = new Error(`Route non trouvée - ${req.originalUrl}`);
  res.status(404).json({
    error: {
      message: error.message,
      code: 'ROUTE_NOT_FOUND',
      path: req.originalUrl,
      method: req.method
    }
  });
};

module.exports = { notFound };
