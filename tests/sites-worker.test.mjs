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

test("xiaohongshu app route receives route-specific social metadata", async () => {
  const response = await worker.fetch(new Request("https://example.test/xiaohongshu", { headers: { accept: "text/html" } }), {
    ASSETS: {
      fetch: async (request) => new Response(new URL(request.url).pathname === "/index.html"
        ? '<html><head><meta name="description" content="旧描述" /><title>旧标题</title></head><body></body></html>'
        : "missing", { status: new URL(request.url).pathname === "/index.html" ? 200 : 404, headers: { "content-type": "text/html" } }),
    },
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>zis小红书封面生成器<\/title>/);
  assert.match(html, /property="og:image" content="https:\/\/example\.test\/og-xiaohongshu\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
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
  await access(new URL("../drizzle/0002_natural_corsair.sql", import.meta.url));
});

function createApiDb(seed = {}) {
  const state = {
    accounts: seed.accounts || [{ id: "annie-default", display_name: "安妮", handle: "@kiki89699", avatar_url: "/annie-avatar.jpg", created_at: "2026-01-01", updated_at: "2026-01-01" }],
    contents: seed.contents || [
      { id: "public-1", owner_account_id: null, category: "公共", title: "公共内容", draft: "公共正文", insight: "摘要", product_fit: "[]", priority: 1, requires_verification: 0 },
      { id: "private-1", owner_account_id: "annie-default", category: "专属", title: "专属内容", draft: "专属正文", insight: "摘要", product_fit: "[]", priority: 1, requires_verification: 0 },
    ],
    xhsContents: seed.xhsContents || [],
    xhsAssets: seed.xhsAssets || [],
    backgrounds: seed.backgrounds || [
      { id: "city-1", name: "香港海边", tags: "香港 城市", image_url: "/backgrounds/city-1.jpg", storage_key: null, display_order: 1, created_at: "2026-01-01" },
      { id: "city-2", name: "城市天际线", tags: "城市 日落", image_url: "/backgrounds/city-2.jpg", storage_key: null, display_order: 2, created_at: "2026-01-01" },
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
        if (normalized === "SELECT COUNT(*) AS count FROM backgrounds") return { count: state.backgrounds.length };
        if (normalized.includes("MAX(display_order)") && normalized.includes("xiaohongshu_assets")) return { max_order: Math.max(0, ...state.xhsAssets.filter((item) => item.account_id === args[0] && item.kind === args[1]).map((item) => item.display_order)) };
        if (normalized.includes("MAX(display_order)")) return { max_order: Math.max(0, ...state.backgrounds.map((item) => item.display_order)) };
        if (normalized.includes("SELECT id, storage_key FROM backgrounds")) return state.backgrounds.find((item) => item.id === args[0]) || null;
        if (normalized.includes("SELECT avatar_url FROM accounts")) return state.accounts.find((item) => item.id === args[0]) || null;
        if (normalized.includes("COUNT(*) AS count FROM contents WHERE owner_account_id")) return { count: state.contents.filter((item) => item.owner_account_id === args[0]).length };
        if (normalized.includes("COUNT(*) AS count FROM xiaohongshu_contents WHERE owner_account_id")) return { count: state.xhsContents.filter((item) => item.owner_account_id === args[0]).length };
        if (normalized.includes("SELECT id FROM accounts")) return state.accounts.find((item) => item.id === args[0]) || null;
        if (normalized.includes("SELECT id FROM xiaohongshu_contents")) return state.xhsContents.find((item) => item.id === args[0]) || null;
        if (normalized.includes("SELECT id, storage_key FROM xiaohongshu_assets")) return state.xhsAssets.find((item) => item.id === args[0]) || null;
        if (normalized.includes("SELECT id FROM xiaohongshu_assets")) return state.xhsAssets.find((item) => item.id === args[0]) || null;
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
        if (normalized.includes("FROM xiaohongshu_contents c")) {
          const accountId = args[0];
          return { results: state.xhsContents.filter((item) => item.owner_account_id == null || item.owner_account_id === accountId).map((item) => ({
            category: "未分类", cover_subtitle: "", excerpt: "", note_title: "", keywords: "[]", source_name: "测试",
            source_url: "", requires_verification: 0, verification_note: "", priority: 0, ...item,
            owner_display_name: state.accounts.find((account) => account.id === item.owner_account_id)?.display_name || null,
          })) };
        }
        if (normalized.includes("FROM backgrounds")) {
          return { results: [...state.backgrounds].sort((left, right) => left.display_order - right.display_order) };
        }
        if (normalized.includes("SELECT storage_key FROM xiaohongshu_assets")) return { results: state.xhsAssets.filter((item) => item.account_id === args[0]).map((item) => ({ storage_key: item.storage_key })) };
        if (normalized.includes("FROM xiaohongshu_assets WHERE account_id")) {
          return { results: state.xhsAssets.filter((item) => item.account_id === args[0] && item.kind === args[1]).sort((left, right) => left.display_order - right.display_order) };
        }
        return { results: [] };
      },
      async run() {
        if (normalized.startsWith("INSERT INTO admin_login_attempts")) {
          state.attempts.set(args[0], { failures: args[1], locked_until: args[2], updated_at: args[3] });
        } else if (normalized.startsWith("DELETE FROM admin_login_attempts")) state.attempts.delete(args[0]);
        else if (normalized.startsWith("INSERT INTO accounts")) state.accounts.push({ id: args[0], display_name: args[1], handle: args[2], avatar_url: args[3], created_at: args[4], updated_at: args[5] });
        else if (normalized.startsWith("DELETE FROM contents WHERE owner_account_id")) state.contents = state.contents.filter((item) => item.owner_account_id !== args[0]);
        else if (normalized.startsWith("DELETE FROM xiaohongshu_contents WHERE owner_account_id")) state.xhsContents = state.xhsContents.filter((item) => item.owner_account_id !== args[0]);
        else if (normalized.startsWith("DELETE FROM xiaohongshu_assets WHERE account_id")) state.xhsAssets = state.xhsAssets.filter((item) => item.account_id !== args[0]);
        else if (normalized.startsWith("DELETE FROM accounts")) state.accounts = state.accounts.filter((item) => item.id !== args[0]);
        else if (normalized.startsWith("INSERT INTO xiaohongshu_contents")) state.xhsContents.push({ id: args[0], owner_account_id: args[1], category: args[2], cover_title: args[3], cover_subtitle: args[4], excerpt: args[5], note_title: args[6], note_body: args[7], keywords: args[8], source_name: args[9], source_url: args[10], requires_verification: args[11], verification_note: args[12], priority: args[13], created_at: args[14], updated_at: args[15] });
        else if (normalized.startsWith("DELETE FROM xiaohongshu_contents WHERE id")) state.xhsContents = state.xhsContents.filter((item) => item.id !== args[0]);
        else if (normalized.startsWith("INSERT INTO xiaohongshu_assets")) state.xhsAssets.push({ id: args[0], account_id: args[1], kind: args[2], name: args[3], image_url: args[4], storage_key: args[5], display_order: args[6], created_at: args[7], updated_at: args[8] });
        else if (normalized.startsWith("UPDATE xiaohongshu_assets")) state.xhsAssets = state.xhsAssets.map((item) => item.id === args[3] ? { ...item, name: args[0], display_order: args[1], updated_at: args[2] } : item);
        else if (normalized.startsWith("DELETE FROM xiaohongshu_assets WHERE id")) state.xhsAssets = state.xhsAssets.filter((item) => item.id !== args[0]);
        else if (normalized.startsWith("INSERT INTO backgrounds")) state.backgrounds.push({ id: args[0], name: args[1], tags: args[2], image_url: args[3], storage_key: args[4], display_order: args[5], created_at: args[6] });
        else if (normalized.startsWith("DELETE FROM backgrounds")) state.backgrounds = state.backgrounds.filter((item) => item.id !== args[0]);
        return { success: true };
      },
    };
    return statement;
  }

  return { state, prepare, async batch(statements) { for (const statement of statements) await statement.run(); return []; } };
}

function createR2() {
  const objects = new Map();
  return {
    objects,
    async put(key, value, options) { objects.set(key, { value, options }); },
    async delete(key) { objects.delete(key); },
    async get(key) { return objects.has(key) ? { body: objects.get(key).value, httpEtag: key } : null; },
  };
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

test("xiaohongshu content API exposes only public and selected-account records", async () => {
  const DB = createApiDb({
    accounts: [
      { id: "annie-default", display_name: "安妮", handle: "@kiki89699", avatar_url: "/annie-avatar.jpg", created_at: "2026-01-01", updated_at: "2026-01-01" },
      { id: "second", display_name: "第二账号", handle: "@second", avatar_url: "/annie-avatar.jpg", created_at: "2026-01-01", updated_at: "2026-01-01" },
    ],
    xhsContents: [
      { id: "xhs-public", owner_account_id: null, cover_title: "公共封面", note_body: "公共正文" },
      { id: "xhs-annie", owner_account_id: "annie-default", cover_title: "安妮封面", note_body: "安妮正文" },
      { id: "xhs-second", owner_account_id: "second", cover_title: "第二封面", note_body: "第二正文" },
    ],
  });
  const response = await worker.fetch(new Request("https://example.test/api/xiaohongshu/content?accountId=annie-default"), { DB });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.content.map((item) => item.coverTitle), ["公共封面", "安妮封面"]);
  assert.deepEqual(payload.content.map((item) => item.scope), ["public", "account"]);
});

test("xiaohongshu subject assets are isolated to the selected account", async () => {
  const DB = createApiDb({
    accounts: [
      { id: "annie-default", display_name: "安妮", handle: "@kiki89699", avatar_url: "/annie-avatar.jpg", created_at: "2026-01-01", updated_at: "2026-01-01" },
      { id: "second", display_name: "第二账号", handle: "@second", avatar_url: "/annie-avatar.jpg", created_at: "2026-01-01", updated_at: "2026-01-01" },
    ],
    xhsAssets: [
      { id: "subject-annie", account_id: "annie-default", kind: "subject", name: "安妮半身", image_url: "/api/xiaohongshu/asset/annie", storage_key: "xiaohongshu/subjects/annie-default/a.png", display_order: 2, created_at: "2026-01-01", updated_at: "2026-01-01" },
      { id: "subject-second", account_id: "second", kind: "subject", name: "第二账号人物", image_url: "/api/xiaohongshu/asset/second", storage_key: "xiaohongshu/subjects/second/b.png", display_order: 1, created_at: "2026-01-01", updated_at: "2026-01-01" },
    ],
  });
  const response = await worker.fetch(new Request("https://example.test/api/xiaohongshu/assets?accountId=annie-default&kind=subject"), { DB });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).assets.map((item) => item.name), ["安妮半身"]);
});

test("public background API exposes the shared ordered library", async () => {
  const DB = createApiDb();
  const response = await worker.fetch(new Request("https://example.test/api/backgrounds"), { DB });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.backgrounds.map((item) => item.name), ["香港海边", "城市天际线"]);
  assert.equal(payload.backgrounds[0].src, "/backgrounds/city-1.jpg");
});

test("anonymous visitors cannot call admin write APIs", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/accounts", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: "测试", handle: "@test" }),
  }), { DB: createApiDb(), SESSION_SECRET: "session-secret" });
  assert.equal(response.status, 401);
});

test("anonymous visitors cannot import xiaohongshu materials", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/admin/xiaohongshu/content/import", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ coverTitle: "封面", noteBody: "正文" }] }),
  }), { DB: createApiDb(), SESSION_SECRET: "session-secret" });
  assert.equal(response.status, 401);
});

test("anonymous visitors cannot upload xiaohongshu subject assets", async () => {
  const form = new FormData(); form.append("accountId", "annie-default"); form.append("name", "人物");
  form.append("image", new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: "image/png" }), "subject.png");
  const response = await worker.fetch(new Request("https://example.test/api/admin/xiaohongshu/assets", { method: "POST", body: form }), { DB: createApiDb(), SESSION_SECRET: "session-secret" });
  assert.equal(response.status, 401);
});

test("admin can batch import validated xiaohongshu materials and duplicates are rejected", async () => {
  const DB = createApiDb();
  const password = "xhs-admin-password";
  const env = { DB, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex") };
  const login = await worker.fetch(new Request("https://example.test/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }),
  }), env);
  const cookie = login.headers.get("set-cookie");
  const imported = await worker.fetch(new Request("https://example.test/api/admin/xiaohongshu/content/import", {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ items: [
      { ownerAccountId: null, category: "成长", coverTitle: "拿回选择权", noteBody: "先行动，再调整。", keywords: ["成长", "行动"] },
      { ownerAccountId: "annie-default", category: "创作", coverTitle: "把想法写出来", noteBody: "完成比完美重要。", keywords: ["创作"] },
    ] }),
  }), env);
  assert.equal(imported.status, 201);
  assert.equal((await imported.json()).imported, 2);
  assert.equal(DB.state.xhsContents.length, 2);

  const duplicate = await worker.fetch(new Request("https://example.test/api/admin/xiaohongshu/content/import", {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ items: [
      { coverTitle: "重复封面", noteTitle: "同一笔记", noteBody: "正文一" },
      { coverTitle: "重复封面", noteTitle: "同一笔记", noteBody: "正文二" },
    ] }),
  }), env);
  assert.equal(duplicate.status, 409);
  assert.equal(DB.state.xhsContents.length, 2);
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
    xhsAssets: [{ id: "subject-annie", account_id: "annie-default", kind: "subject", name: "安妮", image_url: "/api/xiaohongshu/asset/x", storage_key: "xiaohongshu/subjects/annie-default/a.png", display_order: 1, created_at: "2026-01-01", updated_at: "2026-01-01" }],
  });
  const AVATARS = createR2(); await AVATARS.put("xiaohongshu/subjects/annie-default/a.png", "bytes");
  const password = "admin-password";
  const env = { DB, AVATARS, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex") };
  const login = await worker.fetch(new Request("https://example.test/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }),
  }), env);
  const response = await worker.fetch(new Request("https://example.test/api/admin/accounts/annie-default", {
    method: "DELETE", headers: { cookie: login.headers.get("set-cookie") },
  }), env);

  assert.equal(response.status, 200);
  const payload = await response.json(); assert.equal(payload.deletedContentCount, 1); assert.equal(payload.deletedXiaohongshuAssetCount, 1);
  assert.deepEqual(DB.state.accounts.map((item) => item.id), ["second"]);
  assert.deepEqual(DB.state.contents.map((item) => item.id), ["public-1", "private-2"]);
  assert.equal(DB.state.xhsAssets.length, 0); assert.equal(AVATARS.objects.size, 0);
});

test("admin can upload a validated background to R2 and the shared library", async () => {
  const DB = createApiDb();
  const AVATARS = createR2();
  const password = "admin-password";
  const env = { DB, AVATARS, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex") };
  const login = await worker.fetch(new Request("https://example.test/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }),
  }), env);
  const form = new FormData();
  form.append("name", "新背景");
  form.append("tags", "城市 蓝色");
  form.append("image", new Blob(["image-bytes"], { type: "image/webp" }), "background.webp");
  const response = await worker.fetch(new Request("https://example.test/api/admin/backgrounds", {
    method: "POST", headers: { cookie: login.headers.get("set-cookie") }, body: form,
  }), env);

  assert.equal(response.status, 201);
  assert.equal(DB.state.backgrounds.length, 3);
  assert.equal(AVATARS.objects.size, 1);
  assert.match(DB.state.backgrounds[2].image_url, /^\/api\/background\//);
});

test("background uploads reject unsupported files", async () => {
  const DB = createApiDb();
  const AVATARS = createR2();
  const password = "admin-password";
  const env = { DB, AVATARS, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex") };
  const login = await worker.fetch(new Request("https://example.test/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }),
  }), env);
  const form = new FormData();
  form.append("name", "错误文件");
  form.append("image", new Blob(["not-an-image"], { type: "text/plain" }), "notes.txt");
  const response = await worker.fetch(new Request("https://example.test/api/admin/backgrounds", {
    method: "POST", headers: { cookie: login.headers.get("set-cookie") }, body: form,
  }), env);

  assert.equal(response.status, 400);
  assert.equal(DB.state.backgrounds.length, 2);
  assert.equal(AVATARS.objects.size, 0);
});

test("admin can upload, rename, order and delete a validated subject asset", async () => {
  const DB = createApiDb(); const AVATARS = createR2(); const password = "admin-password";
  const env = { DB, AVATARS, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex") };
  const login = await worker.fetch(new Request("https://example.test/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }), env);
  const cookie = login.headers.get("set-cookie");
  const form = new FormData(); form.append("accountId", "annie-default"); form.append("kind", "subject"); form.append("name", "安妮正面半身");
  form.append("image", new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: "image/png" }), "subject.png");
  const created = await worker.fetch(new Request("https://example.test/api/admin/xiaohongshu/assets", { method: "POST", headers: { cookie }, body: form }), env);
  assert.equal(created.status, 201); assert.equal(DB.state.xhsAssets.length, 1); assert.equal(AVATARS.objects.size, 1);
  const asset = (await created.json()).asset;
  const updated = await worker.fetch(new Request(`https://example.test/api/admin/xiaohongshu/assets/${asset.id}`, { method: "PUT", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ name: "安妮讲课半身", displayOrder: 7 }) }), env);
  assert.equal(updated.status, 200); assert.equal(DB.state.xhsAssets[0].name, "安妮讲课半身"); assert.equal(DB.state.xhsAssets[0].display_order, 7);
  const deleted = await worker.fetch(new Request(`https://example.test/api/admin/xiaohongshu/assets/${asset.id}`, { method: "DELETE", headers: { cookie } }), env);
  assert.equal(deleted.status, 200); assert.equal(DB.state.xhsAssets.length, 0); assert.equal(AVATARS.objects.size, 0);
});

test("subject uploads reject spoofed image signatures", async () => {
  const DB = createApiDb(); const AVATARS = createR2(); const password = "admin-password";
  const env = { DB, AVATARS, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex") };
  const login = await worker.fetch(new Request("https://example.test/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }), env);
  const form = new FormData(); form.append("accountId", "annie-default"); form.append("name", "伪装图片"); form.append("image", new Blob(["not-a-png"], { type: "image/png" }), "fake.png");
  const response = await worker.fetch(new Request("https://example.test/api/admin/xiaohongshu/assets", { method: "POST", headers: { cookie: login.headers.get("set-cookie") }, body: form }), env);
  assert.equal(response.status, 400); assert.equal(DB.state.xhsAssets.length, 0); assert.equal(AVATARS.objects.size, 0);
});

test("deleting backgrounds cleans uploaded objects and protects the last record", async () => {
  const DB = createApiDb({ backgrounds: [
    { id: "built-in", name: "内置", tags: "", image_url: "/backgrounds/city-1.jpg", storage_key: null, display_order: 1, created_at: "2026-01-01" },
    { id: "uploaded", name: "上传", tags: "", image_url: "/api/background/backgrounds%2Fuploaded.webp", storage_key: "backgrounds/uploaded.webp", display_order: 2, created_at: "2026-01-01" },
  ] });
  const AVATARS = createR2();
  await AVATARS.put("backgrounds/uploaded.webp", "bytes");
  const password = "admin-password";
  const env = { DB, AVATARS, SESSION_SECRET: "session-secret", ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex") };
  const login = await worker.fetch(new Request("https://example.test/api/admin/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }),
  }), env);
  const cookie = login.headers.get("set-cookie");
  const deleted = await worker.fetch(new Request("https://example.test/api/admin/backgrounds/uploaded", { method: "DELETE", headers: { cookie } }), env);
  assert.equal(deleted.status, 200);
  assert.equal(AVATARS.objects.size, 0);
  const finalDelete = await worker.fetch(new Request("https://example.test/api/admin/backgrounds/built-in", { method: "DELETE", headers: { cookie } }), env);
  assert.equal(finalDelete.status, 409);
  assert.equal(DB.state.backgrounds.length, 1);
});
