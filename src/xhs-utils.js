const categoryTags = {
  "个人成长": ["个人成长", "自我提升", "成长思维"],
  "职场": ["职场成长", "工作思考", "职场干货"],
  "情感": ["情感共鸣", "亲密关系", "女性成长"],
  "创作": ["内容创作", "自媒体", "创作灵感"],
  "生活": ["生活感悟", "生活方式", "记录生活"],
  "读书": ["读书笔记", "阅读分享", "知识分享"],
};

export function splitKeywords(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[、,，|｜;；\n]/);
  return source.map((item) => String(item).trim().replace(/^#+/, "")).filter(Boolean);
}

export function normalizeHashtags(keywords, category = "个人成长") {
  const result = [];
  const add = (value) => {
    const clean = String(value || "").trim().replace(/^#+/, "").replace(/\s+/g, "");
    if (clean && !result.includes(clean) && result.length < 5) result.push(clean);
  };
  splitKeywords(keywords).forEach(add);
  (categoryTags[category] || [category, "灵感分享", "成长记录"]).forEach(add);
  ["小红书创作", "今日分享", "值得收藏"].forEach(add);
  return result.slice(0, 5).map((item) => `#${item}`);
}

export function buildXhsNote(fields) {
  const title = String(fields.noteTitle || fields.coverTitle || "未命名笔记").trim();
  const body = String(fields.noteBody || "").trim();
  const hashtags = normalizeHashtags(fields.keywords, fields.category);
  return {
    title,
    body,
    hashtags,
    fullText: [title, body, hashtags.join(" ")].filter(Boolean).join("\n\n"),
  };
}

export function getXhsExportOptions() {
  return { width: 540, height: 720, pixelRatio: 2, outputWidth: 1080, outputHeight: 1440 };
}

const columnAliases = {
  ownerAccountId: ["归属账号ID", "ownerAccountId"],
  category: ["分类", "category"],
  coverTitle: ["封面标题", "coverTitle"],
  coverSubtitle: ["封面副标题", "coverSubtitle"],
  excerpt: ["摘要", "excerpt"],
  noteTitle: ["笔记标题", "noteTitle"],
  noteBody: ["笔记正文", "noteBody"],
  keywords: ["关键词/话题", "关键词", "话题", "keywords"],
  sourceName: ["来源名称", "sourceName"],
  sourceUrl: ["来源链接", "sourceUrl"],
  verificationNote: ["核验提示", "verificationNote"],
  priority: ["优先级", "priority"],
};

function readColumn(row, aliases) {
  for (const key of aliases) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return "";
}

export function parseXhsRows(rows, defaultOwnerAccountId = null) {
  const items = [];
  const errors = [];
  const seen = new Set();
  if (!Array.isArray(rows)) return { items, errors: ["文件中没有可读取的表格行。"] };
  if (rows.length > 500) errors.push("单次最多导入 500 条，请拆分表格后重试。");

  rows.slice(0, 500).forEach((row, index) => {
    const line = index + 2;
    const value = {};
    for (const [field, aliases] of Object.entries(columnAliases)) value[field] = readColumn(row, aliases);
    const coverTitle = String(value.coverTitle || "").trim();
    const noteBody = String(value.noteBody || "").trim();
    if (!coverTitle || !noteBody) {
      errors.push(`第 ${line} 行缺少${!coverTitle ? "“封面标题”" : ""}${!coverTitle && !noteBody ? "和" : ""}${!noteBody ? "“笔记正文”" : ""}。`);
      return;
    }
    const duplicateKey = `${coverTitle}\n${String(value.noteTitle || "").trim()}`.toLowerCase();
    if (seen.has(duplicateKey)) {
      errors.push(`第 ${line} 行与表格前面的内容重复：${coverTitle}`);
      return;
    }
    seen.add(duplicateKey);
    items.push({
      ownerAccountId: value.ownerAccountId ? String(value.ownerAccountId).trim() : defaultOwnerAccountId,
      category: String(value.category || "未分类").trim(),
      coverTitle,
      coverSubtitle: String(value.coverSubtitle || "").trim(),
      excerpt: String(value.excerpt || noteBody.replace(/\s+/g, " ").slice(0, 160)).trim(),
      noteTitle: String(value.noteTitle || coverTitle).trim(),
      noteBody,
      keywords: splitKeywords(value.keywords),
      sourceName: String(value.sourceName || "自建小红书素材").trim(),
      sourceUrl: String(value.sourceUrl || "").trim(),
      verificationNote: String(value.verificationNote || "").trim(),
      requiresVerification: Boolean(String(value.verificationNote || "").trim()),
      priority: Number.isFinite(Number(value.priority)) ? Number(value.priority) : 0,
    });
  });
  return { items, errors };
}

export const blankXhsContent = {
  ownerAccountId: "",
  category: "个人成长",
  coverTitle: "",
  coverSubtitle: "",
  excerpt: "",
  noteTitle: "",
  noteBody: "",
  keywords: "",
  sourceName: "自建小红书素材",
  sourceUrl: "",
  verificationNote: "",
  requiresVerification: false,
  priority: 0,
};
