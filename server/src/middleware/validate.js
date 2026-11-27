function validate(schema, source = "body") {
  return function validateRequest(req, res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        success: false, message: "Request validation failed", data: null,
        errors: result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      });
    }
    req[source] = result.data;
    return next();
  };
}
module.exports = validate;
