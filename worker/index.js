export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    try {
      if (requestUrl.pathname === "/api/accounts" && request.method === "GET") {
        return listAccounts(env);
      }
      if (requestUrl.pathname === "/api/content" && request.method === "GET") {
        return listContent(requestUrl, env);
      }
      if (requestUrl.pathname === "/api/xiaohongshu/content" && request.method === "GET") {
        return listXiaohongshuContent(requestUrl, env);
      }
      if (requestUrl.pathname === "/api/xiaohongshu/assets" && request.method === "GET") {
        return listXiaohongshuAssets(requestUrl, env);
      }
      if (requestUrl.pathname === "/api/backgrounds" && request.method === "GET") {
        return listBackgrounds(env);
      }
      if (requestUrl.pathname.startsWith("/api/avatar/") && request.method === "GET") {
        return serveAvatar(requestUrl, env);
      }
      if (requestUrl.pathname.startsWith("/api/background/") && request.method === "GET") {
        return serveBackground(requestUrl, env);
      }
      if (requestUrl.pathname.startsWith("/api/xiaohongshu/asset/") && request.method === "GET") {
        return serveXiaohongshuAsset(requestUrl, env);
      }
      if (requestUrl.pathname.startsWith("/api/admin/")) {
        return handleAdminRequest(request, requestUrl, env);
      }
    } catch (error) {
      return apiError(toChineseError(error), error?.status || 500);
    }

    if (requestUrl.pathname === "/api/image-proxy") {
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
      const source = requestUrl.searchParams.get("url");
      let imageUrl;
      try {
        imageUrl = new URL(source);
        if (!["http:", "https:"].includes(imageUrl.protocol) || isPrivateHost(imageUrl.hostname)) throw new Error("invalid URL");
      } catch {
        return new Response("Invalid image URL", { status: 400 });
      }

      try {
        const upstream = await fetch(imageUrl, {
          headers: {
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (compatible; JulyAnnieCard/1.0)",
            Referer: `${imageUrl.protocol}//${imageUrl.host}/`,
          },
          redirect: "follow",
        });
        const contentType = upstream.headers.get("content-type") || "";
        if (!upstream.ok || !contentType.toLowerCase().startsWith("image/")) {
          return new Response("The URL did not return an image", { status: 422 });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch {
        return new Response("Unable to load remote image", { status: 502 });
      }
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    const indexResponse = await env.ASSETS.fetch(new Request(indexUrl, request));
    if (request.method === "GET" && requestUrl.pathname.replace(/\/+$/, "") === "/xiaohongshu" && indexResponse.ok) {
      return withXiaohongshuMetadata(indexResponse, requestUrl.origin);
    }
    return indexResponse;
  },
};

async function withXiaohongshuMetadata(response, origin) {
  const title = "zis小红书封面生成器";
  const description = "选择模板和背景，生成1080×1440小红书封面与完整笔记文案。";
  const image = `${origin}/og-xiaohongshu.png`;
  const metadata = `<meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />`;
  const html = (await response.text())
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${description}" />`)
    .replace("</head>", `    ${metadata}\n  </head>`);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

const SESSION_SECONDS = 30 * 60;
const LOCK_SECONDS = 15 * 60;
const MAX_LOGIN_FAILURES = 5;
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const BACKGROUND_MAX_BYTES = 10 * 1024 * 1024;
const SUBJECT_MAX_BYTES = 8 * 1024 * 1024;

async function listAccounts(env) {
  requireDb(env);
  const shared = await env.DB.prepare("SELECT COUNT(*) AS count FROM contents WHERE owner_account_id IS NULL").first();
  const result = await env.DB.prepare(`
    SELECT a.id, a.display_name, a.handle, a.avatar_url, a.created_at, a.updated_at,
      COUNT(c.id) AS exclusive_content_count
    FROM accounts a
    LEFT JOIN contents c ON c.owner_account_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at ASC, a.display_name ASC
  `).all();
  const sharedCount = Number(shared?.count || 0);
  return apiJson({
    accounts: (result.results || []).map((row) => ({
      id: row.id,
      displayName: row.display_name,
      handle: row.handle,
      avatarUrl: row.avatar_url,
      exclusiveContentCount: Number(row.exclusive_content_count || 0),
      contentCount: sharedCount + Number(row.exclusive_content_count || 0),
    })),
    sharedContentCount: sharedCount,
  });
}

async function listContent(url, env) {
  requireDb(env);
  const accountId = url.searchParams.get("accountId") || "";
  if (!accountId) return apiError("请选择账号。", 400);
  const result = await env.DB.prepare(`
    SELECT c.*, a.display_name AS owner_display_name
    FROM contents c
    LEFT JOIN accounts a ON a.id = c.owner_account_id
    WHERE c.owner_account_id IS NULL OR c.owner_account_id = ?
    ORDER BY c.priority DESC, c.created_at ASC, c.id ASC
  `).bind(accountId).all();
  return apiJson({ content: (result.results || []).map(mapContentRow) });
}

async function listXiaohongshuContent(url, env) {
  requireDb(env);
  const accountId = url.searchParams.get("accountId") || "";
  if (!accountId) return apiError("请选择账号。", 400);
  const result = await env.DB.prepare(`
    SELECT c.*, a.display_name AS owner_display_name
    FROM xiaohongshu_contents c
    LEFT JOIN accounts a ON a.id = c.owner_account_id
    WHERE c.owner_account_id IS NULL OR c.owner_account_id = ?
    ORDER BY c.priority DESC, c.created_at ASC, c.id ASC
  `).bind(accountId).all();
  return apiJson({ content: (result.results || []).map(mapXiaohongshuContentRow) });
}

async function listXiaohongshuAssets(url, env) {
  requireDb(env);
  const accountId = url.searchParams.get("accountId") || "";
  const kind = url.searchParams.get("kind") || "subject";
  if (!accountId) return apiError("请选择账号。", 400);
  if (kind !== "subject") return apiError("素材类型无效。", 400);
  const account = await env.DB.prepare("SELECT id FROM accounts WHERE id = ?").bind(accountId).first();
  if (!account) return apiError("账号不存在。", 404);
  const result = await env.DB.prepare(`
    SELECT id, account_id, kind, name, image_url, display_order, created_at, updated_at
    FROM xiaohongshu_assets WHERE account_id = ? AND kind = ?
    ORDER BY display_order ASC, created_at ASC, id ASC
  `).bind(accountId, kind).all();
  return apiJson({ assets: (result.results || []).map(mapXiaohongshuAssetRow) });
}

async function listBackgrounds(env) {
  requireDb(env);
  const result = await env.DB.prepare(`
    SELECT id, name, tags, image_url, storage_key, display_order, created_at
    FROM backgrounds
    ORDER BY display_order ASC, created_at ASC, id ASC
  `).all();
  return apiJson({ backgrounds: (result.results || []).map(mapBackgroundRow) });
}

async function serveAvatar(url, env) {
  if (!env.AVATARS) return apiError("头像存储暂不可用。", 503);
  const key = decodeURIComponent(url.pathname.slice("/api/avatar/".length));
  if (!key || key.includes("..")) return apiError("头像地址无效。", 400);
  const object = await env.AVATARS.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag || object.etag || key);
  return new Response(object.body, { headers });
}

async function serveBackground(url, env) {
  if (!env.AVATARS) return apiError("背景存储暂不可用。", 503);
  const key = decodeURIComponent(url.pathname.slice("/api/background/".length));
  if (!key || key.includes("..") || !key.startsWith("backgrounds/")) return apiError("背景地址无效。", 400);
  const object = await env.AVATARS.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag || object.etag || key);
  return new Response(object.body, { headers });
}

async function serveXiaohongshuAsset(url, env) {
  if (!env.AVATARS) return apiError("人物素材存储暂不可用。", 503);
  const key = decodeURIComponent(url.pathname.slice("/api/xiaohongshu/asset/".length));
  if (!key || key.includes("..") || !key.startsWith("xiaohongshu/subjects/")) return apiError("人物素材地址无效。", 400);
  const object = await env.AVATARS.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata?.(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag || object.etag || key);
  return new Response(object.body, { headers });
}

async function handleAdminRequest(request, url, env) {
  requireDb(env);
  if (url.pathname === "/api/admin/login" && request.method === "POST") return adminLogin(request, env);
  if (url.pathname === "/api/admin/logout" && request.method === "POST") {
    return apiJson({ authenticated: false }, 200, { "Set-Cookie": clearSessionCookie() });
  }
  if (url.pathname === "/api/admin/session" && request.method === "GET") {
    return apiJson({ authenticated: await hasAdminSession(request, env) });
  }
  if (!(await hasAdminSession(request, env))) return apiError("管理会话已过期，请重新输入管理密码。", 401);

  if (url.pathname === "/api/admin/accounts" && request.method === "POST") return createAccount(request, env);
  if (url.pathname.startsWith("/api/admin/accounts/") && request.method === "PUT") return updateAccount(request, url, env);
  if (url.pathname.startsWith("/api/admin/accounts/") && request.method === "DELETE") return deleteAccount(url, env);
  if (url.pathname === "/api/admin/content" && request.method === "POST") return createContent(request, env);
  if (url.pathname.startsWith("/api/admin/content/") && request.method === "PUT") return updateContent(request, url, env);
  if (url.pathname.startsWith("/api/admin/content/") && request.method === "DELETE") return deleteContent(url, env);
  if (url.pathname === "/api/admin/xiaohongshu/content" && request.method === "POST") return createXiaohongshuContent(request, env);
  if (url.pathname === "/api/admin/xiaohongshu/content/import" && request.method === "POST") return importXiaohongshuContent(request, env);
  if (url.pathname.startsWith("/api/admin/xiaohongshu/content/") && request.method === "PUT") return updateXiaohongshuContent(request, url, env);
  if (url.pathname.startsWith("/api/admin/xiaohongshu/content/") && request.method === "DELETE") return deleteXiaohongshuContent(url, env);
  if (url.pathname === "/api/admin/xiaohongshu/assets" && request.method === "POST") return createXiaohongshuAsset(request, env);
  if (url.pathname.startsWith("/api/admin/xiaohongshu/assets/") && request.method === "PUT") return updateXiaohongshuAsset(request, url, env);
  if (url.pathname.startsWith("/api/admin/xiaohongshu/assets/") && request.method === "DELETE") return deleteXiaohongshuAsset(url, env);
  if (url.pathname === "/api/admin/avatar" && request.method === "POST") return uploadAvatar(request, env);
  if (url.pathname === "/api/admin/backgrounds" && request.method === "POST") return createBackground(request, env);
  if (url.pathname.startsWith("/api/admin/backgrounds/") && request.method === "DELETE") return deleteBackground(url, env);
  return apiError("没有这个管理操作。", 404);
}

async function adminLogin(request, env) {
  if (!env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET) return apiError("管理密码尚未配置。", 503);
  const clientKey = await getClientKey(request, env);
  const now = Date.now();
  const attempt = await env.DB.prepare("SELECT failures, locked_until FROM admin_login_attempts WHERE client_key = ?").bind(clientKey).first();
  if (Number(attempt?.locked_until || 0) > now) {
    const minutes = Math.max(1, Math.ceil((Number(attempt.locked_until) - now) / 60000));
    return apiError(`尝试次数过多，请在 ${minutes} 分钟后再试。`, 429);
  }
  const payload = await readJson(request);
  const candidateHash = await sha256Hex(String(payload.password || ""));
  if (!safeEqual(candidateHash, String(env.ADMIN_PASSWORD_HASH).toLowerCase())) {
    const failures = Number(attempt?.failures || 0) + 1;
    const lockedUntil = failures >= MAX_LOGIN_FAILURES ? now + LOCK_SECONDS * 1000 : 0;
    await env.DB.prepare(`
      INSERT INTO admin_login_attempts (client_key, failures, locked_until, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(client_key) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until, updated_at = excluded.updated_at
    `).bind(clientKey, failures, lockedUntil, now).run();
    return apiError(failures >= MAX_LOGIN_FAILURES ? "尝试次数过多，已锁定15分钟。" : `管理密码不正确，还可尝试 ${MAX_LOGIN_FAILURES - failures} 次。`, failures >= MAX_LOGIN_FAILURES ? 429 : 401);
  }
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE client_key = ?").bind(clientKey).run();
  return apiJson({ authenticated: true }, 200, { "Set-Cookie": await createSessionCookie(env) });
}

async function createAccount(request, env) {
  const payload = await readJson(request);
  const values = validateAccount(payload);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare("INSERT INTO accounts (id, display_name, handle, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, values.displayName, values.handle, values.avatarUrl, now, now).run();
  } catch (error) {
    if (String(error).includes("UNIQUE")) return apiError("这个账号已经存在，请换一个账号。", 409);
    throw error;
  }
  return apiJson({ account: { id, ...values, exclusiveContentCount: 0, contentCount: 0 } }, 201);
}

async function updateAccount(request, url, env) {
  const id = pathId(url, "/api/admin/accounts/");
  const existing = await env.DB.prepare("SELECT avatar_url FROM accounts WHERE id = ?").bind(id).first();
  if (!existing) return apiError("账号不存在。", 404);
  const payload = await readJson(request);
  const values = validateAccount(payload);
  try {
    await env.DB.prepare("UPDATE accounts SET display_name = ?, handle = ?, avatar_url = ?, updated_at = ? WHERE id = ?")
      .bind(values.displayName, values.handle, values.avatarUrl, new Date().toISOString(), id).run();
  } catch (error) {
    if (String(error).includes("UNIQUE")) return apiError("这个账号已经存在，请换一个账号。", 409);
    throw error;
  }
  if (existing.avatar_url !== values.avatarUrl) await removeManagedAvatar(existing.avatar_url, env);
  return apiJson({ account: { id, ...values } });
}

async function deleteAccount(url, env) {
  const id = pathId(url, "/api/admin/accounts/");
  const total = await env.DB.prepare("SELECT COUNT(*) AS count FROM accounts").first();
  if (Number(total?.count || 0) <= 1) return apiError("至少需要保留一个账号。", 409);
  const account = await env.DB.prepare("SELECT avatar_url FROM accounts WHERE id = ?").bind(id).first();
  if (!account) return apiError("账号不存在。", 404);
  const exclusive = await env.DB.prepare("SELECT COUNT(*) AS count FROM contents WHERE owner_account_id = ?").bind(id).first();
  const xhsExclusive = await env.DB.prepare("SELECT COUNT(*) AS count FROM xiaohongshu_contents WHERE owner_account_id = ?").bind(id).first();
  const assetResult = await env.DB.prepare("SELECT storage_key FROM xiaohongshu_assets WHERE account_id = ?").bind(id).all();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM contents WHERE owner_account_id = ?").bind(id),
    env.DB.prepare("DELETE FROM xiaohongshu_contents WHERE owner_account_id = ?").bind(id),
    env.DB.prepare("DELETE FROM xiaohongshu_assets WHERE account_id = ?").bind(id),
    env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(id),
  ]);
  await removeManagedAvatar(account.avatar_url, env);
  for (const asset of assetResult.results || []) {
    if (asset.storage_key && env.AVATARS) try { await env.AVATARS.delete(asset.storage_key); } catch { /* database cleanup already succeeded */ }
  }
  return apiJson({ deleted: true, deletedContentCount: Number(exclusive?.count || 0), deletedXiaohongshuContentCount: Number(xhsExclusive?.count || 0), deletedXiaohongshuAssetCount: assetResult.results?.length || 0 });
}

async function createContent(request, env) {
  const payload = await readJson(request);
  const values = await validateContent(payload, env);
  const id = `content-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO contents (id, owner_account_id, category, angle, action, source_name, source_url, product_fit, priority,
      requires_verification, origin, source_article, source_date, source_file, title, draft, insight, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, values.ownerAccountId, values.category, values.angle, values.action, values.sourceName, values.sourceUrl,
    JSON.stringify(values.productFit), values.priority, values.requiresVerification ? 1 : 0, values.origin,
    values.sourceArticle, values.sourceDate, values.sourceFile, values.title, values.draft, values.insight, now, now).run();
  return apiJson({ content: { id, ...values } }, 201);
}

async function updateContent(request, url, env) {
  const id = pathId(url, "/api/admin/content/");
  const exists = await env.DB.prepare("SELECT id FROM contents WHERE id = ?").bind(id).first();
  if (!exists) return apiError("内容不存在。", 404);
  const values = await validateContent(await readJson(request), env);
  await env.DB.prepare(`
    UPDATE contents SET owner_account_id = ?, category = ?, angle = ?, action = ?, source_name = ?, source_url = ?,
      product_fit = ?, priority = ?, requires_verification = ?, origin = ?, source_article = ?, source_date = ?,
      source_file = ?, title = ?, draft = ?, insight = ?, updated_at = ? WHERE id = ?
  `).bind(values.ownerAccountId, values.category, values.angle, values.action, values.sourceName, values.sourceUrl,
    JSON.stringify(values.productFit), values.priority, values.requiresVerification ? 1 : 0, values.origin,
    values.sourceArticle, values.sourceDate, values.sourceFile, values.title, values.draft, values.insight,
    new Date().toISOString(), id).run();
  return apiJson({ content: { id, ...values } });
}

async function deleteContent(url, env) {
  const id = pathId(url, "/api/admin/content/");
  const exists = await env.DB.prepare("SELECT id FROM contents WHERE id = ?").bind(id).first();
  if (!exists) return apiError("内容不存在。", 404);
  await env.DB.prepare("DELETE FROM contents WHERE id = ?").bind(id).run();
  return apiJson({ deleted: true });
}

async function createXiaohongshuContent(request, env) {
  const values = await validateXiaohongshuContent(await readJson(request), env);
  const id = `xhs-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await insertXiaohongshuStatement(env, id, values, now).run();
  return apiJson({ content: { id, ...values } }, 201);
}

async function updateXiaohongshuContent(request, url, env) {
  const id = pathId(url, "/api/admin/xiaohongshu/content/");
  const exists = await env.DB.prepare("SELECT id FROM xiaohongshu_contents WHERE id = ?").bind(id).first();
  if (!exists) return apiError("小红书素材不存在。", 404);
  const values = await validateXiaohongshuContent(await readJson(request), env);
  await env.DB.prepare(`
    UPDATE xiaohongshu_contents SET owner_account_id = ?, category = ?, cover_title = ?, cover_subtitle = ?, excerpt = ?,
      note_title = ?, note_body = ?, keywords = ?, source_name = ?, source_url = ?, requires_verification = ?,
      verification_note = ?, priority = ?, updated_at = ? WHERE id = ?
  `).bind(values.ownerAccountId, values.category, values.coverTitle, values.coverSubtitle, values.excerpt,
    values.noteTitle, values.noteBody, JSON.stringify(values.keywords), values.sourceName, values.sourceUrl,
    values.requiresVerification ? 1 : 0, values.verificationNote, values.priority, new Date().toISOString(), id).run();
  return apiJson({ content: { id, ...values } });
}

async function deleteXiaohongshuContent(url, env) {
  const id = pathId(url, "/api/admin/xiaohongshu/content/");
  const exists = await env.DB.prepare("SELECT id FROM xiaohongshu_contents WHERE id = ?").bind(id).first();
  if (!exists) return apiError("小红书素材不存在。", 404);
  await env.DB.prepare("DELETE FROM xiaohongshu_contents WHERE id = ?").bind(id).run();
  return apiJson({ deleted: true });
}

async function importXiaohongshuContent(request, env) {
  const payload = await readJson(request);
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) return apiError("表格中没有可导入的素材。", 400);
  if (items.length > 500) return apiError("单次最多导入500条素材。", 413);
  const values = [];
  const duplicateKeys = new Set();
  for (const item of items) {
    const validated = await validateXiaohongshuContent(item, env);
    const key = `${validated.ownerAccountId || "public"}\n${validated.coverTitle.toLowerCase()}\n${validated.noteTitle.toLowerCase()}`;
    if (duplicateKeys.has(key)) return apiError(`导入内容重复：${validated.coverTitle}`, 409);
    duplicateKeys.add(key);
    values.push(validated);
  }
  const now = new Date().toISOString();
  await env.DB.batch(values.map((item) => insertXiaohongshuStatement(env, `xhs-${crypto.randomUUID()}`, item, now)));
  return apiJson({ imported: values.length }, 201);
}

function insertXiaohongshuStatement(env, id, values, now) {
  return env.DB.prepare(`
    INSERT INTO xiaohongshu_contents (id, owner_account_id, category, cover_title, cover_subtitle, excerpt, note_title,
      note_body, keywords, source_name, source_url, requires_verification, verification_note, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, values.ownerAccountId, values.category, values.coverTitle, values.coverSubtitle, values.excerpt,
    values.noteTitle, values.noteBody, JSON.stringify(values.keywords), values.sourceName, values.sourceUrl,
    values.requiresVerification ? 1 : 0, values.verificationNote, values.priority, now, now);
}

async function createXiaohongshuAsset(request, env) {
  if (!env.AVATARS) return apiError("人物素材存储暂不可用。", 503);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > SUBJECT_MAX_BYTES + 300000) return apiError("人物图片不能超过8MB。", 413);
  const form = await request.formData();
  const file = form.get("image");
  const name = String(form.get("name") || "").trim().slice(0, 40);
  const accountId = String(form.get("accountId") || "").trim();
  const kind = String(form.get("kind") || "subject");
  if (!name) return apiError("请填写人物素材名称。", 400);
  if (!accountId) return apiError("请选择素材所属账号。", 400);
  if (kind !== "subject") return apiError("人物素材类型无效。", 400);
  const account = await env.DB.prepare("SELECT id FROM accounts WHERE id = ?").bind(accountId).first();
  if (!account) return apiError("指定账号不存在。", 400);
  if (!file || typeof file.arrayBuffer !== "function") return apiError("请选择人物图片。", 400);
  if (file.size > SUBJECT_MAX_BYTES) return apiError("人物图片不能超过8MB。", 413);
  const extensions = { "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension) return apiError("人物图片仅支持 PNG 或 WebP。", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasImageSignature(bytes, file.type)) return apiError("图片内容与文件格式不符。", 400);
  const id = `xhs-asset-${crypto.randomUUID()}`;
  const storageKey = `xiaohongshu/subjects/${accountId}/${crypto.randomUUID()}.${extension}`;
  const imageUrl = `/api/xiaohongshu/asset/${encodeURIComponent(storageKey)}`;
  const createdAt = new Date().toISOString();
  const orderRow = await env.DB.prepare("SELECT COALESCE(MAX(display_order), 0) AS max_order FROM xiaohongshu_assets WHERE account_id = ? AND kind = ?").bind(accountId, kind).first();
  await env.AVATARS.put(storageKey, bytes, { httpMetadata: { contentType: file.type } });
  try {
    await env.DB.prepare("INSERT INTO xiaohongshu_assets (id, account_id, kind, name, image_url, storage_key, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, accountId, kind, name, imageUrl, storageKey, Number(orderRow?.max_order || 0) + 1, createdAt, createdAt).run();
  } catch (error) {
    try { await env.AVATARS.delete(storageKey); } catch { /* best-effort cleanup */ }
    throw error;
  }
  return apiJson({ asset: { id, accountId, kind, name, src: imageUrl, displayOrder: Number(orderRow?.max_order || 0) + 1, createdAt } }, 201);
}

async function updateXiaohongshuAsset(request, url, env) {
  const id = pathId(url, "/api/admin/xiaohongshu/assets/");
  const asset = await env.DB.prepare("SELECT id FROM xiaohongshu_assets WHERE id = ?").bind(id).first();
  if (!asset) return apiError("人物素材不存在。", 404);
  const payload = await readJson(request);
  const name = String(payload.name || "").trim().slice(0, 40);
  const displayOrder = Math.max(0, Math.min(10000, Math.round(Number(payload.displayOrder || 0))));
  if (!name) return apiError("请填写人物素材名称。", 400);
  await env.DB.prepare("UPDATE xiaohongshu_assets SET name = ?, display_order = ?, updated_at = ? WHERE id = ?")
    .bind(name, displayOrder, new Date().toISOString(), id).run();
  return apiJson({ asset: { id, name, displayOrder } });
}

async function deleteXiaohongshuAsset(url, env) {
  const id = pathId(url, "/api/admin/xiaohongshu/assets/");
  const asset = await env.DB.prepare("SELECT id, storage_key FROM xiaohongshu_assets WHERE id = ?").bind(id).first();
  if (!asset) return apiError("人物素材不存在。", 404);
  await env.DB.prepare("DELETE FROM xiaohongshu_assets WHERE id = ?").bind(id).run();
  if (asset.storage_key && env.AVATARS) try { await env.AVATARS.delete(asset.storage_key); } catch { /* database deletion already succeeded */ }
  return apiJson({ deleted: true, id });
}

async function uploadAvatar(request, env) {
  if (!env.AVATARS) return apiError("头像存储暂不可用。", 503);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > AVATAR_MAX_BYTES + 200000) return apiError("头像不能超过5MB。", 413);
  const form = await request.formData();
  const file = form.get("avatar");
  if (!file || typeof file.arrayBuffer !== "function") return apiError("请选择头像文件。", 400);
  if (file.size > AVATAR_MAX_BYTES) return apiError("头像不能超过5MB。", 413);
  const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension) return apiError("头像仅支持 JPEG、PNG 或 WebP。", 400);
  const key = `avatars/${crypto.randomUUID()}.${extension}`;
  await env.AVATARS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return apiJson({ avatarUrl: `/api/avatar/${encodeURIComponent(key)}` }, 201);
}

async function createBackground(request, env) {
  if (!env.AVATARS) return apiError("背景存储暂不可用。", 503);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > BACKGROUND_MAX_BYTES + 300000) return apiError("背景图片不能超过10MB。", 413);
  const form = await request.formData();
  const file = form.get("image");
  const name = String(form.get("name") || "").trim().slice(0, 40);
  const tags = String(form.get("tags") || "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (!name) return apiError("请填写背景名称。", 400);
  if (!file || typeof file.arrayBuffer !== "function") return apiError("请选择背景图片。", 400);
  if (file.size > BACKGROUND_MAX_BYTES) return apiError("背景图片不能超过10MB。", 413);
  const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension) return apiError("背景仅支持 JPEG、PNG 或 WebP。", 400);

  const id = `background-${crypto.randomUUID()}`;
  const storageKey = `backgrounds/${crypto.randomUUID()}.${extension}`;
  const imageUrl = `/api/background/${encodeURIComponent(storageKey)}`;
  const createdAt = new Date().toISOString();
  const orderRow = await env.DB.prepare("SELECT COALESCE(MAX(display_order), 0) AS max_order FROM backgrounds").first();
  await env.AVATARS.put(storageKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  try {
    await env.DB.prepare("INSERT INTO backgrounds (id, name, tags, image_url, storage_key, display_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(id, name, tags, imageUrl, storageKey, Number(orderRow?.max_order || 0) + 1, createdAt).run();
  } catch (error) {
    try { await env.AVATARS.delete(storageKey); } catch { /* best-effort cleanup */ }
    throw error;
  }
  return apiJson({ background: { id, name, tags, src: imageUrl, storageKey, createdAt } }, 201);
}

async function deleteBackground(url, env) {
  const id = pathId(url, "/api/admin/backgrounds/");
  const total = await env.DB.prepare("SELECT COUNT(*) AS count FROM backgrounds").first();
  if (Number(total?.count || 0) <= 1) return apiError("至少需要保留一张背景。", 409);
  const background = await env.DB.prepare("SELECT id, storage_key FROM backgrounds WHERE id = ?").bind(id).first();
  if (!background) return apiError("背景不存在。", 404);
  await env.DB.prepare("DELETE FROM backgrounds WHERE id = ?").bind(id).run();
  if (background.storage_key && env.AVATARS) {
    try { await env.AVATARS.delete(background.storage_key); } catch { /* metadata deletion already succeeded */ }
  }
  return apiJson({ deleted: true, id });
}

function validateAccount(payload) {
  const displayName = String(payload.displayName || "").trim().slice(0, 20);
  const handleValue = String(payload.handle || "").trim().replace(/^@+/, "").replace(/\s+/g, "").slice(0, 31);
  const avatarUrl = String(payload.avatarUrl || "/annie-avatar.jpg").trim();
  if (!displayName) throw httpError("请填写昵称。", 400);
  if (!handleValue) throw httpError("请填写账号。", 400);
  if (!/^[\p{L}\p{N}_.-]+$/u.test(handleValue)) throw httpError("账号只能包含文字、数字、下划线、点和短横线。", 400);
  if (!avatarUrl.startsWith("/") && !avatarUrl.startsWith("data:image/")) throw httpError("头像地址无效。", 400);
  return { displayName, handle: `@${handleValue}`, avatarUrl };
}

async function validateContent(payload, env) {
  const title = String(payload.title || "").trim().slice(0, 120);
  const draft = String(payload.draft || "").trim().slice(0, 6000);
  const category = String(payload.category || "未分类").trim().slice(0, 40) || "未分类";
  const ownerAccountId = payload.ownerAccountId ? String(payload.ownerAccountId) : null;
  if (!title) throw httpError("请填写内容标题。", 400);
  if (!draft) throw httpError("请填写卡片正文。", 400);
  if (ownerAccountId) {
    const owner = await env.DB.prepare("SELECT id FROM accounts WHERE id = ?").bind(ownerAccountId).first();
    if (!owner) throw httpError("指定账号不存在。", 400);
  }
  const insight = String(payload.insight || draft.replace(/\s+/g, " ").slice(0, 180)).trim().slice(0, 500);
  const tags = Array.isArray(payload.productFit) ? payload.productFit : String(payload.productFit || "").split(/[、,，]/);
  return {
    ownerAccountId,
    category,
    angle: String(payload.angle || "").trim().slice(0, 1000),
    action: String(payload.action || "").trim().slice(0, 1000),
    sourceName: String(payload.sourceName || "自建内容").trim().slice(0, 120),
    sourceUrl: String(payload.sourceUrl || "").trim().slice(0, 1000),
    productFit: tags.map((item) => String(item).trim()).filter(Boolean).slice(0, 8),
    priority: Math.max(0, Math.min(10000, Number(payload.priority || 0))),
    requiresVerification: Boolean(payload.requiresVerification),
    origin: String(payload.origin || "账号内容库").trim().slice(0, 200),
    sourceArticle: String(payload.sourceArticle || "").trim().slice(0, 240),
    sourceDate: String(payload.sourceDate || "").trim().slice(0, 30),
    sourceFile: String(payload.sourceFile || "").trim().slice(0, 300),
    title,
    draft,
    insight,
  };
}

async function validateXiaohongshuContent(payload, env) {
  const coverTitle = String(payload.coverTitle || "").trim().slice(0, 120);
  const noteBody = String(payload.noteBody || "").trim().slice(0, 10000);
  const ownerAccountId = payload.ownerAccountId ? String(payload.ownerAccountId) : null;
  if (!coverTitle) throw httpError("请填写封面标题。", 400);
  if (!noteBody) throw httpError("请填写笔记正文。", 400);
  if (ownerAccountId) {
    const owner = await env.DB.prepare("SELECT id FROM accounts WHERE id = ?").bind(ownerAccountId).first();
    if (!owner) throw httpError("指定账号不存在。", 400);
  }
  const keywordSource = Array.isArray(payload.keywords) ? payload.keywords : String(payload.keywords || "").split(/[、,，|｜;；\n]/);
  const keywords = [...new Set(keywordSource.map((item) => String(item).trim().replace(/^#+/, "")).filter(Boolean))].slice(0, 12);
  const verificationNote = String(payload.verificationNote || "").trim().slice(0, 1000);
  return {
    ownerAccountId,
    category: String(payload.category || "未分类").trim().slice(0, 40) || "未分类",
    coverTitle,
    coverSubtitle: String(payload.coverSubtitle || "").trim().slice(0, 180),
    excerpt: String(payload.excerpt || noteBody.replace(/\s+/g, " ").slice(0, 160)).trim().slice(0, 800),
    noteTitle: String(payload.noteTitle || coverTitle).trim().slice(0, 120) || coverTitle,
    noteBody,
    keywords,
    sourceName: String(payload.sourceName || "自建小红书素材").trim().slice(0, 120),
    sourceUrl: String(payload.sourceUrl || "").trim().slice(0, 1000),
    requiresVerification: Boolean(payload.requiresVerification || verificationNote),
    verificationNote,
    priority: Math.max(0, Math.min(10000, Number(payload.priority || 0))),
  };
}

function mapContentRow(row) {
  let productFit = [];
  try { productFit = JSON.parse(row.product_fit || "[]"); } catch { productFit = []; }
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id || null,
    ownerDisplayName: row.owner_display_name || null,
    scope: row.owner_account_id ? "account" : "public",
    category: row.category,
    angle: row.angle,
    action: row.action,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    productFit,
    priority: Number(row.priority || 0),
    requiresVerification: Boolean(row.requires_verification),
    origin: row.origin,
    sourceArticle: row.source_article,
    sourceDate: row.source_date,
    sourceFile: row.source_file,
    title: row.title,
    draft: row.draft,
    insight: row.insight,
  };
}

function mapXiaohongshuContentRow(row) {
  let keywords = [];
  try { keywords = JSON.parse(row.keywords || "[]"); } catch { keywords = []; }
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id || null,
    ownerDisplayName: row.owner_display_name || null,
    scope: row.owner_account_id ? "account" : "public",
    category: row.category,
    coverTitle: row.cover_title,
    coverSubtitle: row.cover_subtitle,
    excerpt: row.excerpt,
    noteTitle: row.note_title,
    noteBody: row.note_body,
    keywords,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    requiresVerification: Boolean(row.requires_verification),
    verificationNote: row.verification_note,
    priority: Number(row.priority || 0),
  };
}

function mapBackgroundRow(row) {
  return {
    id: row.id,
    name: row.name,
    tags: row.tags || "",
    src: row.image_url,
    storageKey: row.storage_key || null,
    displayOrder: Number(row.display_order || 0),
    createdAt: row.created_at,
  };
}

function mapXiaohongshuAssetRow(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    kind: row.kind,
    name: row.name,
    src: row.image_url,
    displayOrder: Number(row.display_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hasImageSignature(bytes, type) {
  if (type === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

async function hasAdminSession(request, env) {
  if (!env.SESSION_SECRET) return false;
  const token = parseCookies(request.headers.get("cookie") || "").annie_admin;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || Number(parts[0]) <= Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacBase64Url(env.SESSION_SECRET, `${parts[0]}.${parts[1]}`);
  return safeEqual(parts[2], expected);
}

async function createSessionCookie(env) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const nonce = crypto.randomUUID();
  const signature = await hmacBase64Url(env.SESSION_SECRET, `${expires}.${nonce}`);
  return `annie_admin=${expires}.${nonce}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

function clearSessionCookie() {
  return "annie_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

async function hmacBase64Url(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return bytesToBase64Url(bytes);
}

async function sha256Hex(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getClientKey(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  return sha256Hex(`${ip}:${env.SESSION_SECRET}`);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function parseCookies(value) {
  return Object.fromEntries(value.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index), part.slice(index + 1)];
  }));
}

async function removeManagedAvatar(avatarUrl, env) {
  if (!env.AVATARS || !String(avatarUrl || "").startsWith("/api/avatar/")) return;
  const key = decodeURIComponent(String(avatarUrl).slice("/api/avatar/".length));
  if (key.startsWith("avatars/")) await env.AVATARS.delete(key);
}

async function readJson(request) {
  try { return await request.json(); } catch { throw httpError("请求内容格式不正确。", 400); }
}

function pathId(url, prefix) {
  const id = decodeURIComponent(url.pathname.slice(prefix.length));
  if (!id || id.includes("/")) throw httpError("记录编号无效。", 400);
  return id;
}

function requireDb(env) {
  if (!env.DB) throw httpError("云端内容库暂不可用。", 503);
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toChineseError(error) {
  const message = String(error?.message || error || "");
  if (message.includes("no such table")) return "云端内容库正在初始化，请稍后刷新。";
  return message || "操作失败，请稍后重试。";
}

function apiJson(body, status = 200, extraHeaders = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extraHeaders } });
}

function apiError(message, status = 500) {
  return apiJson({ error: message }, status);
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0" || host === "::1") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}
