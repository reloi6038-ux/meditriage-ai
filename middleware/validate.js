module.exports = schema => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const err = new Error('Validation failed');
    err.status = 422;
    err.details = error.details.map(d => d.message);
    return next(err);
  }
  req.body = value;
  next();
};