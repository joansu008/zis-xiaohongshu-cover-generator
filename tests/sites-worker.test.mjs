import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/index.js";

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to index.html for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/index.html"]);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const request of [
    new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, 404);
    assert.equal(calls, 1);
  }
});

test("proxies a valid remote image through the same origin", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (request) => {
    assert.equal(new URL(request instanceof Request ? request.url : String(request)).hostname, "images.example.com");
    return new Response("image-bytes", { headers: { "content-type": "image/jpeg" } });
  };
  try {
    const response = await worker.fetch(new Request("https://example.test/api/image-proxy?url=https%3A%2F%2Fimages.example.com%2Fphoto.jpg"), { ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.equal(await response.text(), "image-bytes");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects private and non-image proxy targets", async () => {
  const privateResponse = await worker.fetch(new Request("https://example.test/api/image-proxy?url=http%3A%2F%2F127.0.0.1%2Fsecret"), { ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } });
  assert.equal(privateResponse.status, 400);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("page", { headers: { "content-type": "text/html" } });
  try {
    const pageResponse = await worker.fetch(new Request("https://example.test/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fpage"), { ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } });
    assert.equal(pageResponse.status, 422);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
  await access(new URL("../drizzle/0000_petite_cloak.sql", import.meta.url));
});

function createApiDb(seed = {}) {
  const state = {
    accounts: seed.accounts || [{ id: "annie-default", display_name: "安妮", handle: "@kiki89699", avatar_url: "/annie-avatar.jpg", created_at: "2026-01-01", updated_at: "2026-01-01" }],
    contents: seed.contents || [
      { id: "public-1", owner_account_id: null, category: "公共", title: "公共内容", draft: "公共正文", insight: "摘要", product_fit: "[]", priority: 1, requires_verification: 0 },
      { id: "private-1", owner_account_id: "annie-default", category: "专属", title: "专属内容", draft: "专属正文", insight: "摘要", product_fit: "[]", priority: 1, requires_verification: 0 },
    ],
    attempts: new Map(),
  };

  function prepare(sql) {
    const normalized = sql.replace(/\s+/g, " ").trim();
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() {
        if (normalized.includes("COUNT(*) AS count FROM contents WHERE owner_account_id IS NULL")) return { count: state.contents.filter((item) => item.owner_account_id == null).length };
        if (normalized.includes("FROM admin_login_attempts")) return state.attempts.get(args[0]) || null;
        if (normalized === "SELECT COUNT(*) AS count FROM accounts") return { count: state.accounts.length };
        if (normalized.includes("SELECT avatar_url FROM accounts")) return state.accounts.find((item) => item.id === args[0]) || null;
        if (normalized.includes("COUNT(*) AS count FROM contents WHERE owner_account_id")) return { count: state.contents.filter((item) => item.owner_account_id === args[0]).length };
        if (normalized.includes("SELECT id FROM accounts")) return state.accounts.find((item) => item.id === args[0]) || null;
        if (normalized.includes("SELECT id FROM contents")) return state.contents.find((item) => item.id === args[0]) || null;
        return null;
      },
      async all() {
        if (normalized.includes("FROM accounts a")) {
          return { results: state.accounts.map((account) => ({ ...account, exclusive_content_count: state.contents.filter((item) => item.owner_account_id === account.id).length })) };
        }
        if (normalized.includes("FROM contents c")) {
          const accountId = args[0];
          return { results: state.contents.filter((item) => item.owner_account_id == null || item.owner_account_id === accountId).map((item) => ({
            angle: "", action: "", source_name: "测试", source_url: "", origin: "", source_article: "", source_date: "", source_file: "", ...item,
            owner_display_name: state.accounts.find((account) => account.id === item.owner_account_id)?.display_name || null,
          })) };
        }
        return { results: [] };
      },
      async run() {
        if (normalized.startsWith("INSERT INTO admin_login_attempts")) {
          state.attempts.set(args[0], { failures: args[1], locked_until: args[2], updated_at: args[3] });
        } else if (normalized.startsWith("DELETE FROM admin_login_attempts")) state.attempts.delete(args[0]);
        else if (normalized.startsWith("INSERT INTO accounts")) state.accounts.push({ id: args[0], display_name: args[1], handle: args[2], avatar_url: args[3], created_at: args[4], updated_at: args[5] });
        else if (normalized.startsWith("DELETE FROM contents WHERE owner_account_id")) state.contents = state.contents.filter((item) => item.owner_account_id !== args[0]);
        else if (normalized.startsWith("DELETE FROM accounts")) state.accounts = state.accounts.filter((item) => item.id !== args[0]);
        return { success: true };
      },
    };
    return statement;
  }

  return { state, prepare, async batch(statements) { for (const statement of statements) await statement.run(); return []; } };
}

test("public account and content APIs expose shared plus account-owned records", async () => {
  const DB = createApiDb();
  const accountsResponse = await worker.fetch(new Request("https://example.test/api/accounts"), { DB });
  assert.equal(accountsResponse.status, 200);
  const accountsPayload = await accountsResponse.json();
  assert.equal(accountsPayload.accounts[0].contentCount, 2);
  assert.equal(accountsPayload.sharedContentCount, 1);

  const contentResponse = await worker.fetch(new Request("https://example.test/api/content?accountId=annie-default"), { DB });
  assert.equal(contentResponse.status, 200);
  const contentPayload = await contentResponse.json();
  assert.deepEqual(contentPayload.content.map((item) => item.scope), ["public", "account"]);
});

test("anonymous visitors cannot call admin write APIs", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/accounts", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: "测试", handle: "@test" }),
  }), { DB: createApiDb(), SESSION_SECRET: "session-secret" });
  assert.equal(response.status, 401);
});

test("admin login creates a secure session and authorizes account creation", async () => {
  const DB = createApiDb();
  const password = "correct-horse-battery-staple";
  const env = { DB, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex") };
  const login = await worker.fetch(new Request("https://example.test/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.10" }, body: JSON.stringify({ password }),
  }), env);
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);

  const create = await worker.fetch(new Request("https://example.test/api/admin/accounts", {
    method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ displayName: "新账号", handle: "new_account", avatarUrl: "/annie-avatar.jpg" }),
  }), env);
  assert.equal(create.status, 201);
  assert.equal(DB.state.accounts.length, 2);
});

test("five failed admin passwords trigger a fifteen-minute lock", async () => {
  const DB = createApiDb();
  const env = { DB, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update("right-password").digest("hex") };
  let response;
  for (let index = 0; index < 5; index += 1) {
    response = await worker.fetch(new Request("https://example.test/api/admin/login", {
      method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.20" }, body: JSON.stringify({ password: "wrong" }),
    }), env);
  }
  assert.equal(response.status, 429);
  assert.match((await response.json()).error, /15分钟/);
});

test("the final remaining account cannot be deleted", async () => {
  const DB = createApiDb();
  const password = "admin-password";
  const env = { DB, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex") };
  const login = await worker.fetch(new Request("https://example.test/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }),
  }), env);
  const response = await worker.fetch(new Request("https://example.test/api/admin/accounts/annie-default", {
    method: "DELETE", headers: { cookie: login.headers.get("set-cookie") },
  }), env);
  assert.equal(response.status, 409);
});

test("deleting an account removes only its exclusive content", async () => {
  const DB = createApiDb({
    accounts: [
      { id: "annie-default", display_name: "安妮", handle: "@kiki89699", avatar_url: "/annie-avatar.jpg", created_at: "2026-01-01", updated_at: "2026-01-01" },
      { id: "second", display_name: "第二账号", handle: "@second", avatar_url: "/annie-avatar.jpg", created_at: "2026-01-01", updated_at: "2026-01-01" },
    ],
    contents: [
      { id: "public-1", owner_account_id: null, category: "公共", title: "公共内容", draft: "公共正文", insight: "摘要", product_fit: "[]", priority: 1, requires_verification: 0 },
      { id: "private-1", owner_account_id: "annie-default", category: "专属", title: "专属内容", draft: "专属正文", insight: "摘要", product_fit: "[]", priority: 1, requires_verification: 0 },
      { id: "private-2", owner_account_id: "second", category: "专属", title: "第二账号内容", draft: "专属正文", insight: "摘要", product_fit: "[]", priority: 1, requires_verification: 0 },
    ],
  });
  const password = "admin-password";
  const env = { DB, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex") };
  const login = await worker.fetch(new Request("https://example.test/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }),
  }), env);
  const response = await worker.fetch(new Request("https://example.test/api/admin/accounts/annie-default", {
    method: "DELETE", headers: { cookie: login.headers.get("set-cookie") },
  }), env);

  assert.equal(response.status, 200);
  assert.equal((await response.json()).deletedContentCount, 1);
  assert.deepEqual(DB.state.accounts.map((item) => item.id), ["second"]);
  assert.deepEqual(DB.state.contents.map((item) => item.id), ["public-1", "private-2"]);
});
