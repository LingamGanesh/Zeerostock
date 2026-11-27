function authorize(...allowedRoles) {
  return function authorizeRole(req, res, next) {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required", data: null, errors: [] });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission to perform this action", data: null, errors: [] });
    }
    return next();
  };
}
module.exports = authorize;
