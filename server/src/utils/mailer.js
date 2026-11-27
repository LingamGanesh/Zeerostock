const config = require("../config/env");

async function sendEmail({ to, subject, html, text }) {
  if (!config.RESEND_API_KEY) {
    const error = new Error("Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + config.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.EMAIL_FROM, to: [to], subject, html, text }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error("Email delivery failed. Please try again later.");
    error.statusCode = 502;
    error.cause = detail;
    throw error;
  }
}

module.exports = { sendEmail };
