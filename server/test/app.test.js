const test = require("node:test");
const assert = require("node:assert/strict");

// Configure required environment before loading the Express application.
process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/zeerostock_test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-that-is-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-that-is-at-least-32-characters";
process.env.CLIENT_URL = "http://localhost:5173";

const app = require("../src/app");

test("health endpoint responds without database authentication", async (t) => {
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, "ok");
});

test("protected inventory and reporting APIs reject anonymous requests", async (t) => {
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ["/api/v2/inventory", "/api/v2/dashboard", "/api/v2/purchase-orders", "/api/v2/reports/stock", "/api/v2/reports/movements"]) {
    const response = await fetch(base + path);
    const body = await response.json();
    assert.equal(response.status, 401, path);
    assert.equal(body.success, false, path);
    assert.match(body.message, /authentication required/i, path);
  }
});
