export const XHS_FONT_OPTIONS = {
  display: { name: "得意黑", css: '"Smiley Sans", "Arial Rounded MT Bold", "PingFang SC", system-ui, sans-serif' },
  bold: { name: "黑体", css: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif' },
  rounded: { name: "圆体", css: '"Arial Rounded MT Bold", "PingFang SC", system-ui, sans-serif' },
  serif: { name: "宋体", css: '"Noto Serif SC", "Songti SC", "STSong", serif' },
  kai: { name: "楷体", css: '"Kaiti SC", "STKaiti", serif' },
};

export const XHS_DECOR_CATALOG = [
  { id: "arrow", name: "手绘箭头" },
  { id: "sparkle", name: "星芒" },
  { id: "circle", name: "手绘圈" },
  { id: "underline", name: "下划线" },
  { id: "tape", name: "胶带" },
  { id: "chalk", name: "粉笔线" },
  { id: "question", name: "问号" },
  { id: "badge", name: "编号徽章" },
];

const base = (id, name, type, values = {}) => ({
  id, name, type, x: 270, y: 360, width: 260, height: 100, scale: 1, rotation: 0,
  zIndex: 10, opacity: 1, visible: true, ...values,
});

const text = (id, name, binding, values = {}) => base(id, name, "text", {
  binding, text: "", font: "bold", fontSize: 36, minFontSize: 13, fontWeight: 900,
  lineHeight: 1.08, letterSpacing: -1.5, align: "center", color: "#111111",
  strokeColor: "transparent", strokeWidth: 0, shadowColor: "transparent", shadowX: 0,
  shadowY: 0, backgroundColor: "transparent", borderRadius: 0, padding: 0,
  autoFit: true, maxLines: 3, ...values,
});

const subject = (values = {}) => base("subject", "人物图片", "subject", {
  width: 390, height: 520, x: 270, y: 430, zIndex: 8, whiteOutline: 6,
  brightness: 100, blur: 0, saturation: 100, objectPositionX: 50, objectPositionY: 50,
  ...values,
});

const photo = (id, name, values = {}) => base(id, name, "photo", {
  width: 420, height: 220, borderRadius: 0, brightness: 100, blur: 0, saturation: 100,
  objectPositionX: 50, objectPositionY: 50, ...values,
});

const decor = (id, name, decorKind, values = {}) => base(id, name, "decor", {
  decorKind, width: 90, height: 90, color: "#ffdf48", strokeColor: "#174f85",
  strokeWidth: 5, ...values,
});

const author = (values = {}) => base("author", "账号署名", "author", {
  x: 426, y: 682, width: 150, height: 36, zIndex: 30, font: "bold", fontSize: 10,
  color: "#111111", backgroundColor: "rgba(255,255,255,.92)", borderRadius: 999,
  ...values,
});

export const XHS_LAYER_TEMPLATE_IDS = new Set([
  "talking-head", "cream-tutorial", "chalkboard-class", "soft-lifestyle",
  "blue-sop", "manga-mood", "burgundy-editorial",
]);

export const XHS_PERSON_TEMPLATE_IDS = new Set([
  "cream-tutorial", "chalkboard-class", "soft-lifestyle", "blue-sop",
]);

export const XHS_LAYER_TEMPLATES = {
  "talking-head": {
    canvasClass: "talking-head",
    layers: [
      text("category", "白色栏目", "category", { x: 270, y: 72, width: 250, fontSize: 27, backgroundColor: "#ffffff", borderRadius: 13, padding: 9, zIndex: 20, maxLines: 2 }),
      text("subtitle", "黄色副标题", "coverSubtitle", { x: 270, y: 130, width: 430, fontSize: 27, backgroundColor: "#ffe000", borderRadius: 13, padding: 9, zIndex: 19, maxLines: 3 }),
      text("title", "绿描边主标题", "coverTitle", { x: 270, y: 505, width: 470, fontSize: 47, minFontSize: 24, color: "#0a0a0a", strokeColor: "#78ff57", strokeWidth: 8, shadowColor: "rgba(255,255,255,.9)", shadowY: 4, zIndex: 18, maxLines: 4 }),
      text("highlight", "粉色强调句", "excerpt", { x: 270, y: 603, width: 455, fontSize: 21, minFontSize: 13, color: "#ffffff", strokeColor: "#111111", strokeWidth: 2, backgroundColor: "#ef8bb8", padding: 10, rotation: -1.2, zIndex: 17, maxLines: 5 }),
      author(),
    ],
  },
  "cream-tutorial": {
    canvasClass: "cream-tutorial",
    layers: [
      text("category", "左侧栏目", "category", { x: 72, y: 176, width: 55, fontSize: 14, letterSpacing: 1, color: "#25344b", backgroundColor: "#fff5cd", borderRadius: 10, padding: 8, rotation: -5, zIndex: 20, maxLines: 4 }),
      text("title", "顶部主标题", "coverTitle", { x: 270, y: 90, width: 468, font: "display", fontSize: 54, minFontSize: 29, color: "#fff067", strokeColor: "#21558b", strokeWidth: 7, shadowColor: "#ffffff", shadowX: 2, shadowY: 4, zIndex: 19, maxLines: 2 }),
      subject({ y: 406, height: 535, whiteOutline: 7, zIndex: 10 }),
      text("keyword-1", "关键词贴纸一", "keyword:0", { x: 86, y: 340, width: 112, fontSize: 15, color: "#174f85", backgroundColor: "#ffdf48", borderRadius: 18, padding: 8, rotation: -10, zIndex: 21, maxLines: 2 }),
      text("keyword-2", "关键词贴纸二", "keyword:1", { x: 444, y: 330, width: 112, fontSize: 15, color: "#174f85", backgroundColor: "#ffdf48", borderRadius: 18, padding: 8, rotation: 8, zIndex: 21, maxLines: 2 }),
      text("keyword-3", "关键词贴纸三", "keyword:2", { x: 84, y: 468, width: 112, fontSize: 14, color: "#174f85", backgroundColor: "#ffdf48", borderRadius: 18, padding: 8, rotation: -8, zIndex: 21, maxLines: 2 }),
      decor("arrow-left", "左箭头", "arrow", { x: 118, y: 272, width: 70, height: 72, rotation: 150, zIndex: 16 }),
      decor("sparkle-right", "右侧星芒", "sparkle", { x: 462, y: 238, width: 54, height: 54, color: "#ffdf48", zIndex: 16 }),
      text("subtitle", "底部结论", "coverSubtitle", { x: 270, y: 642, width: 475, font: "display", fontSize: 38, minFontSize: 20, color: "#fff067", strokeColor: "#21558b", strokeWidth: 7, shadowColor: "#ffffff", shadowY: 3, zIndex: 22, maxLines: 2 }),
    ],
  },
  "chalkboard-class": {
    canvasClass: "chalkboard-class",
    layers: [
      text("category", "课程编号", "category", { x: 72, y: 148, width: 92, fontSize: 14, color: "#153c34", backgroundColor: "#ffe36a", borderRadius: 4, padding: 7, rotation: -4, zIndex: 20, maxLines: 2 }),
      text("title", "粉笔主标题", "coverTitle", { x: 270, y: 105, width: 470, font: "display", fontSize: 56, minFontSize: 28, color: "#f4fff9", strokeColor: "#b6f5e8", strokeWidth: 4, shadowColor: "rgba(0,0,0,.55)", shadowX: 6, shadowY: 7, zIndex: 19, maxLines: 2 }),
      subject({ x: 340, y: 438, width: 350, height: 515, whiteOutline: 7, zIndex: 10 }),
      decor("chalk-left", "左侧粉笔线稿", "chalk", { x: 105, y: 365, width: 145, height: 170, color: "#d9fff3", strokeColor: "#d9fff3", strokeWidth: 3, rotation: -8, zIndex: 8 }),
      decor("arrow-right", "右侧箭头", "arrow", { x: 460, y: 240, width: 72, height: 82, color: "#ffe36a", strokeColor: "#ffe36a", rotation: 38, zIndex: 18 }),
      text("subtitle", "底部知识点", "coverSubtitle", { x: 270, y: 638, width: 455, fontSize: 27, minFontSize: 17, color: "#16483e", backgroundColor: "#ffe36a", borderRadius: 20, padding: 10, zIndex: 22, maxLines: 3 }),
      author({ x: 426, y: 690, backgroundColor: "rgba(244,255,249,.9)" }),
    ],
  },
  "soft-lifestyle": {
    canvasClass: "soft-lifestyle",
    layers: [
      text("oversize", "人物后方大字", "coverTitle", { x: 190, y: 210, width: 510, font: "display", fontSize: 74, minFontSize: 42, align: "left", color: "#f2d667", opacity: .82, zIndex: 5, maxLines: 3 }),
      subject({ x: 292, y: 438, width: 390, height: 545, whiteOutline: 6, zIndex: 10 }),
      text("category", "右上角栏目", "category", { x: 444, y: 88, width: 135, fontSize: 14, color: "#ffffff", backgroundColor: "#89725f", borderRadius: 18, padding: 8, zIndex: 18, maxLines: 2 }),
      text("subtitle", "底部短标签", "coverSubtitle", { x: 270, y: 631, width: 440, fontSize: 26, minFontSize: 16, color: "#2d2925", backgroundColor: "rgba(255,248,229,.94)", borderRadius: 4, padding: 11, zIndex: 20, maxLines: 3 }),
      decor("underline", "手绘下划线", "underline", { x: 272, y: 680, width: 290, height: 30, color: "#d7aa43", strokeColor: "#d7aa43", zIndex: 21 }),
    ],
  },
  "blue-sop": {
    canvasClass: "blue-sop",
    layers: [
      text("category", "右上角角标", "category", { x: 438, y: 90, width: 126, fontSize: 14, color: "#153e58", backgroundColor: "#f7cf4a", borderRadius: 18, padding: 8, rotation: -4, zIndex: 20, maxLines: 2 }),
      subject({ x: 315, y: 390, width: 365, height: 505, whiteOutline: 6, zIndex: 9 }),
      text("title", "蓝色问题句", "coverTitle", { x: 300, y: 560, width: 470, font: "display", fontSize: 46, minFontSize: 24, color: "#8ce6ff", strokeColor: "#153e58", strokeWidth: 7, shadowColor: "#ffffff", shadowY: 3, zIndex: 20, maxLines: 3 }),
      text("subtitle", "黑白结论句", "coverSubtitle", { x: 285, y: 647, width: 460, fontSize: 28, minFontSize: 17, color: "#ffffff", strokeColor: "#151515", strokeWidth: 5, zIndex: 21, maxLines: 3 }),
      decor("question", "右侧问号", "question", { x: 468, y: 488, width: 62, height: 88, color: "#8ce6ff", strokeColor: "#153e58", strokeWidth: 5, rotation: 8, zIndex: 18 }),
    ],
  },
  "manga-mood": {
    canvasClass: "manga-mood",
    layers: [
      text("oversize", "半透明大字", "coverTitle", { x: 255, y: 185, width: 520, font: "serif", fontSize: 82, minFontSize: 42, align: "left", color: "rgba(238,232,218,.58)", letterSpacing: -5, zIndex: 8, maxLines: 3 }),
      decor("circle", "红色手绘圈", "circle", { x: 310, y: 355, width: 365, height: 250, color: "#d93d42", strokeColor: "#d93d42", strokeWidth: 7, rotation: -9, opacity: .86, zIndex: 16 }),
      decor("underline", "红色下划线", "underline", { x: 225, y: 545, width: 330, height: 45, color: "#d93d42", strokeColor: "#d93d42", strokeWidth: 7, rotation: -3, zIndex: 16 }),
      text("subtitle", "情绪短句", "coverSubtitle", { x: 270, y: 625, width: 460, font: "display", fontSize: 33, minFontSize: 19, color: "#f8f3e9", strokeColor: "#1c1b1a", strokeWidth: 4, backgroundColor: "rgba(28,27,26,.7)", padding: 10, zIndex: 20, maxLines: 3 }),
      text("category", "小栏目", "category", { x: 86, y: 681, width: 130, fontSize: 13, align: "left", color: "#f8f3e9", zIndex: 21, maxLines: 2 }),
    ],
  },
  "burgundy-editorial": {
    canvasClass: "burgundy-editorial",
    layers: [
      text("eyebrow", "英文眉题", "static", { text: "A NEW YEAR / HARD ADVISE", x: 278, y: 79, width: 430, font: "serif", fontSize: 14, fontWeight: 500, letterSpacing: 3, color: "#d6c6c1", zIndex: 18, maxLines: 2 }),
      text("title", "中文衬线标题", "coverTitle", { x: 180, y: 210, width: 300, font: "serif", fontSize: 54, minFontSize: 28, align: "left", color: "#fff7ef", letterSpacing: 2, zIndex: 20, maxLines: 4 }),
      text("subtitle", "右侧辅助字", "coverSubtitle", { x: 420, y: 230, width: 165, font: "serif", fontSize: 21, minFontSize: 14, align: "left", color: "#d6c6c1", opacity: .86, zIndex: 19, maxLines: 6 }),
      photo("photo-card", "底部照片", { x: 270, y: 510, width: 440, height: 275, borderRadius: 2, saturation: 72, brightness: 76, zIndex: 8 }),
      decor("badge", "编号徽章", "badge", { x: 437, y: 390, width: 84, height: 84, color: "#f2e8df", strokeColor: "#f2e8df", zIndex: 22 }),
      text("number", "编号", "static", { text: "20", x: 437, y: 385, width: 64, font: "serif", fontSize: 31, color: "#5d252d", zIndex: 23, maxLines: 1 }),
      text("category", "底部栏目", "category", { x: 112, y: 681, width: 170, fontSize: 12, align: "left", color: "#e2d3cc", letterSpacing: 2, zIndex: 20, maxLines: 2 }),
      author({ x: 430, y: 680, backgroundColor: "rgba(255,247,239,.9)" }),
    ],
  },
};

export function createTemplateLayerState(templateId) {
  return (XHS_LAYER_TEMPLATES[templateId]?.layers || []).map((layer) => ({ ...layer }));
}

export function createAllTemplateLayerStates() {
  return Object.fromEntries([...XHS_LAYER_TEMPLATE_IDS].map((id) => [id, createTemplateLayerState(id)]));
}

export function resolveLayerText(layer, fields, account) {
  if (layer.overrideText !== undefined) return layer.overrideText;
  if (layer.binding === "static") return layer.text || "";
  if (layer.binding === "category") return fields.category || "未分类";
  if (layer.binding === "coverTitle") return fields.coverTitle || "请输入封面主标题";
  if (layer.binding === "coverSubtitle") return fields.coverSubtitle || "添加一句副标题";
  if (layer.binding === "excerpt") return fields.excerpt || "添加一段核心摘要";
  if (String(layer.binding).startsWith("keyword:")) {
    const index = Number(String(layer.binding).split(":")[1] || 0);
    const words = String(fields.keywords || "").split(/[、,，|｜;；\s]+/).map((item) => item.trim().replace(/^#+/, "")).filter(Boolean);
    return words[index] || fields.category || `关键词${index + 1}`;
  }
  if (layer.binding === "author") return account.displayName || "未命名";
  return layer.text || "";
}

export function fittedFontSize(layer, content) {
  if (!layer.autoFit) return layer.fontSize;
  const length = String(content || "").replace(/\s+/g, "").length;
  if (!length) return layer.fontSize;
  const usableWidth = Math.max(30, layer.width - Number(layer.padding || 0) * 2);
  const charsPerLine = Math.max(1, usableWidth / (layer.fontSize * .98));
  const capacity = charsPerLine * Math.max(1, layer.maxLines || 3);
  if (length <= capacity) return layer.fontSize;
  return Math.max(layer.minFontSize || 10, Math.round(layer.fontSize * Math.sqrt(capacity / length)));
}

export function layerMayOverflow(layer, content) {
  if (layer.type !== "text") return false;
  const fontSize = fittedFontSize(layer, content);
  const usableWidth = Math.max(30, layer.width - Number(layer.padding || 0) * 2);
  const capacity = (usableWidth / (fontSize * .98)) * Math.max(1, layer.maxLines || 3);
  return String(content || "").replace(/\s+/g, "").length > capacity * 1.15 && fontSize <= (layer.minFontSize || 10);
}

export function createDecorLayer(decorKind, index = 0, src = "") {
  const catalog = XHS_DECOR_CATALOG.find((item) => item.id === decorKind);
  return base(`custom-${Date.now()}-${index}`, catalog?.name || "自定义装饰", src ? "custom-image" : "decor", {
    decorKind, src, x: 270, y: 360, width: 110, height: 110, zIndex: 40,
    color: "#ffdf48", strokeColor: "#174f85", strokeWidth: 5,
  });
}
