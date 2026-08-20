import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  AlignCenterHorizontal, AlignLeft, CaretDown, Check, CopySimple, DownloadSimple,
  FileText, ImageSquare, MagnifyingGlass, PencilSimple, SlidersHorizontal,
  Sparkle, TextT, UploadSimple, WarningCircle,
} from "@phosphor-icons/react";
import { BackgroundManagerModal } from "./BackgroundManagerModal.jsx";
import { XiaohongshuManagerModal } from "./XiaohongshuManagerModal.jsx";
import { buildXhsNote, getXhsExportOptions } from "./xhs-utils.js";
import "./xiaohongshu.css";

const fallbackAccount = { id: "annie-default", displayName: "安妮", handle: "@kiki89699", avatarUrl: "/annie-avatar.jpg" };
const fallbackBackgrounds = [
  { id: "city-1", name: "香港海边", tags: "香港 城市 海边 蓝天", src: "/backgrounds/city-1.jpg" },
  { id: "city-2", name: "城市天际线", tags: "香港 城市 天际线 日落", src: "/backgrounds/city-2.jpg" },
  { id: "city-3", name: "街头夜景", tags: "城市 街头 夜景 情绪", src: "/backgrounds/city-3.jpg" },
  { id: "city-4", name: "山海风景", tags: "自然 山 海 风景", src: "/backgrounds/city-4.jpg" },
  { id: "hk-day", name: "香港港口", tags: "香港 港口 白天 城市", src: "/backgrounds/hk-harbor-day.jpg" },
  { id: "neon-street", name: "霓虹街头", tags: "城市 夜景 霓虹", src: "/backgrounds/neon-street.jpg" },
  { id: "paper", name: "暖色纸张", tags: "纸张 米色 极简", src: "/backgrounds/generated-paper.svg" },
  { id: "dawn", name: "城市清晨", tags: "城市 清晨 粉色", src: "/backgrounds/generated-dawn.svg" },
  { id: "ink", name: "水墨山水", tags: "水墨 山水 中国风", src: "/backgrounds/generated-ink.svg" },
  { id: "cloud", name: "云上蓝天", tags: "蓝天 云朵 清新", src: "/backgrounds/generated-cloud.svg" },
];

const titleTemplates = [
  { id: "editorial", name: "编辑部网格", description: "强标题 / 杂志感" },
  { id: "photo", name: "摄影蒙版", description: "大图 / 沉浸感" },
  { id: "memo", name: "彩色便签", description: "活泼 / 高点击" },
  { id: "talking-head", name: "高亮口播", description: "人物 / 爆点字幕" },
];
const summaryTemplates = [
  { id: "paper-note", name: "纸张摘录", description: "温暖 / 阅读感" },
  { id: "dark-quote", name: "深色金句", description: "克制 / 有力量" },
  { id: "numbered", name: "编号清单", description: "清晰 / 干货感" },
];

const initialFields = {
  category: "个人成长",
  coverTitle: "真正的成长，是把选择权拿回自己手里",
  coverSubtitle: "停止等待一个完美答案，从一次真实行动开始",
  excerpt: "很多时候，我们不是没有选择，而是太习惯等待一个不会出错的答案。真正的改变，往往始于你愿意为一次选择负责。",
  noteTitle: "真正的成长，是把选择权拿回自己手里",
  noteBody: "我们总以为，等自己准备得更充分、想得更明白，就能做出一个完美的选择。\n\n但现实里真正重要的改变，常常不是从“终于想通”开始，而是从一次具体行动开始。\n\n先迈出一步，再根据真实反馈调整。选择权不是别人交给你的答案，而是你愿意为自己的决定负责。",
  keywords: "个人成长、选择、行动力",
};

function pickDifferentBackground(list, current) {
  const alternatives = list.filter((item) => item.src !== current);
  const pool = alternatives.length ? alternatives : list;
  return pool[Math.floor(Math.random() * pool.length)]?.src || current;
}

function titleFontSize(text, mode) {
  const length = String(text || "").replace(/\s+/g, "").length;
  if (mode === "summary") return length > 52 ? 33 : length > 34 ? 38 : 43;
  return length > 52 ? 38 : length > 38 ? 44 : length > 24 ? 50 : 58;
}

function excerptFontSize(text) {
  const length = String(text || "").replace(/\s+/g, "").length;
  return length > 280 ? 15 : length > 210 ? 17 : length > 140 ? 19 : 21;
}

function talkingTitleFontSize(text) {
  const length = String(text || "").replace(/\s+/g, "").length;
  return length > 42 ? 36 : length > 30 ? 41 : length > 20 ? 47 : 54;
}

function talkingExcerptFontSize(text) {
  const length = String(text || "").replace(/\s+/g, "").length;
  return length > 80 ? 16 : length > 52 ? 18 : length > 30 ? 21 : 26;
}

function CoverCanvas({ fields, mode, template, background, overlay, accent, align, textScale, textPosition, account, interactive, onPointerDown, onPointerMove, onPointerUp }) {
  const coverTitle = fields.coverTitle || "请输入封面主标题";
  const excerpt = fields.excerpt || "添加一段摘要，让读者快速知道这篇笔记会讲什么。";
  const transform = `translate(calc(-50% + ${textPosition.x}px), calc(-50% + ${textPosition.y}px)) scale(${textScale})`;
  return <article className={`xhs-canvas mode-${mode} xhs-template-${template}`} data-export-size="1080x1440">
    <img className="xhs-canvas-background" src={background} crossOrigin="anonymous" alt="" />
    <div className="xhs-canvas-overlay" style={{ background: `rgba(0,0,0,${overlay / 100})` }} />
    <div className="xhs-decor-grid" />
    <div className="xhs-decor-shape one" style={{ backgroundColor: accent }} /><div className="xhs-decor-shape two" />
    {template === "talking-head" ? <div className={`xhs-copy-block xhs-talking-copy align-${align} ${interactive ? "interactive" : ""}`} style={{ transform }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="xhs-talking-stickers">
        <span className="white">{fields.category || "今日话题"}</span>
        <span className="yellow">{fields.coverSubtitle || "一句话说透这件事"}</span>
      </div>
      <h2 className="xhs-talking-title" style={{ fontSize: `${talkingTitleFontSize(coverTitle)}px` }}>{coverTitle}</h2>
      <p className="xhs-talking-highlight" style={{ fontSize: `${talkingExcerptFontSize(excerpt)}px` }}>{excerpt}</p>
      <footer className="xhs-talking-author"><img src={account.avatarUrl} alt="" /><strong>{account.displayName || "未命名"}</strong><span>{account.handle}</span></footer>
    </div> : <div className={`xhs-copy-block align-${align} ${interactive ? "interactive" : ""}`} style={{ transform }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="xhs-cover-kicker"><span style={{ backgroundColor: accent }}>{fields.category || "未分类"}</span><b>{mode === "title" ? "COVER STORY" : "NOTE 01"}</b></div>
      <h2 style={{ fontSize: `${titleFontSize(coverTitle, mode)}px` }}>{coverTitle}</h2>
      {mode === "title" ? <p className="xhs-cover-subtitle">{fields.coverSubtitle || "添加一句副标题，让读者知道能获得什么"}</p> : <div className="xhs-cover-excerpt" style={{ fontSize: `${excerptFontSize(excerpt)}px` }}>{template === "numbered" && <strong>01</strong>}<p>{excerpt}</p></div>}
      <footer className="xhs-cover-author"><img src={account.avatarUrl} alt="" /><div><strong>{account.displayName || "未命名"}</strong><span>{account.handle}</span></div><em>ZIS / XHS COVER</em></footer>
    </div>}
  </article>;
}

export function XiaohongshuApp() {
  const [accounts, setAccounts] = useState([fallbackAccount]);
  const [activeAccountId, setActiveAccountId] = useState(fallbackAccount.id);
  const [content, setContent] = useState([]);
  const [sourceMode, setSourceMode] = useState("free");
  const [sourceQuery, setSourceQuery] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [fields, setFields] = useState(initialFields);
  const [coverMode, setCoverMode] = useState("title");
  const [template, setTemplate] = useState("editorial");
  const [backgrounds, setBackgrounds] = useState(fallbackBackgrounds);
  const [background, setBackground] = useState(fallbackBackgrounds[1].src);
  const [backgroundQuery, setBackgroundQuery] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [overlay, setOverlay] = useState(20);
  const [accent, setAccent] = useState("#ff604e");
  const [align, setAlign] = useState("left");
  const [textScale, setTextScale] = useState(1);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [randomBackground, setRandomBackground] = useState(() => typeof window === "undefined" || window.localStorage.getItem("zis-xhs-random-background") !== "false");
  const [managerOpen, setManagerOpen] = useState(false);
  const [backgroundManagerOpen, setBackgroundManagerOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.8);
  const stageRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const exportRef = useRef(null);
  const dragRef = useRef(null);

  const activeAccount = useMemo(() => accounts.find((item) => item.id === activeAccountId) || accounts[0] || fallbackAccount, [accounts, activeAccountId]);
  const templates = coverMode === "title" ? titleTemplates : summaryTemplates;
  const activeTemplate = templates.find((item) => item.id === template) || templates[0];
  const note = useMemo(() => buildXhsNote(fields), [fields]);
  const visibleContent = useMemo(() => {
    const needle = sourceQuery.trim().toLowerCase();
    return content.filter((item) => !needle || `${item.coverTitle} ${item.noteBody} ${item.category}`.toLowerCase().includes(needle));
  }, [content, sourceQuery]);
  const visibleBackgrounds = useMemo(() => {
    const needle = backgroundQuery.trim().toLowerCase();
    return backgrounds.filter((item) => !needle || `${item.name} ${item.tags}`.toLowerCase().includes(needle));
  }, [backgroundQuery, backgrounds]);
  const titleTooLong = fields.coverTitle.replace(/\s+/g, "").length > 52;
  const excerptTooLong = fields.excerpt.replace(/\s+/g, "").length > 280;
  const talkingExcerptTooLong = template === "talking-head" && fields.excerpt.replace(/\s+/g, "").length > 80;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "zis小红书封面生成器";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "选择模板和背景，生成小红书 3:4 封面与完整笔记文案。");
    return () => { document.title = previousTitle; };
  }, []);
  useEffect(() => { refreshAccounts(); refreshBackgrounds(); }, []);
  useEffect(() => { refreshContent(activeAccountId); }, [activeAccountId]);
  useEffect(() => {
    if (!stageRef.current || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setPreviewScale(Math.max(0.42, Math.min(1, (width - 44) / 540, (height - 44) / 720)));
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setExported(false), [fields, coverMode, template, background, overlay, accent, align, textScale, textPosition, activeAccount]);

  async function refreshAccounts() {
    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      if (!payload.accounts?.length) throw new Error();
      setAccounts(payload.accounts);
      const remembered = window.localStorage.getItem("zis-xhs-active-account");
      const selected = payload.accounts.find((item) => item.id === remembered) || payload.accounts[0];
      setActiveAccountId(selected.id);
    } catch { setAccounts([fallbackAccount]); }
  }

  async function refreshContent(accountId = activeAccountId) {
    try {
      const response = await fetch(`/api/xiaohongshu/content?accountId=${encodeURIComponent(accountId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      setContent(payload.content || []);
    } catch { setContent([]); }
  }

  async function refreshBackgrounds({ deletedId = null } = {}) {
    let next = fallbackBackgrounds;
    try {
      const response = await fetch("/api/backgrounds", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      if (payload.backgrounds?.length) next = payload.backgrounds;
    } catch { next = fallbackBackgrounds; }
    setBackgrounds(next);
    if (deletedId && !next.some((item) => item.src === background)) setBackground(next[0]?.src || background);
  }

  function updateField(key, value) { setFields((current) => ({ ...current, [key]: value })); }
  function selectSource(item) {
    setSelectedSourceId(item.id);
    setFields({ category: item.category || "未分类", coverTitle: item.coverTitle, coverSubtitle: item.coverSubtitle || "", excerpt: item.excerpt || item.noteBody.replace(/\s+/g, " ").slice(0, 160), noteTitle: item.noteTitle || item.coverTitle, noteBody: item.noteBody, keywords: (item.keywords || []).join("、") });
    if (randomBackground) setBackground((current) => pickDifferentBackground(backgrounds, current));
  }
  function chooseCoverMode(nextMode) { setCoverMode(nextMode); setTemplate(nextMode === "title" ? "editorial" : "paper-note"); resetPlacement(); }
  function chooseTemplate(nextTemplate) { setTemplate(nextTemplate); if (nextTemplate === "talking-head") { setAlign("center"); setOverlay(8); } }
  function switchAccount(item) { setActiveAccountId(item.id); window.localStorage.setItem("zis-xhs-active-account", item.id); setManagerOpen(false); if (randomBackground) setBackground((current) => pickDifferentBackground(backgrounds, current)); }
  function setRandomEnabled(enabled) { setRandomBackground(enabled); window.localStorage.setItem("zis-xhs-random-background", String(enabled)); if (enabled) setBackground((current) => pickDifferentBackground(backgrounds, current)); }
  function loadBackground(event) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setBackground(String(reader.result)); reader.readAsDataURL(file); }
  function applyBackgroundUrl() {
    try { const url = new URL(backgroundUrl.trim()); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); setBackground(import.meta.env.DEV ? url.href : `/api/image-proxy?url=${encodeURIComponent(url.href)}`); }
    catch { window.alert("请粘贴以 http:// 或 https:// 开头的图片地址。"); }
  }
  function resetPlacement() { setTextScale(1); setTextPosition({ x: 0, y: 0 }); }
  function startDrag(event) { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: textPosition }; }
  function moveDrag(event) {
    const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId || !previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = drag.origin.x + (event.clientX - drag.startX) * (540 / rect.width);
    const y = drag.origin.y + (event.clientY - drag.startY) * (720 / rect.height);
    setTextPosition({ x: Math.max(-135, Math.min(135, x)), y: Math.max(-210, Math.min(210, y)) });
  }
  function stopDrag(event) { if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null; }

  async function copyText(value, label) {
    try { await navigator.clipboard.writeText(value); }
    catch { const area = document.createElement("textarea"); area.value = value; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove(); }
    setCopyStatus(`${label}已复制`); window.setTimeout(() => setCopyStatus(""), 1800);
  }

  async function downloadCover() {
    if (exporting || !exportRef.current) return;
    setExporting(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const exportOptions = getXhsExportOptions();
      const dataUrl = await toPng(exportRef.current, { pixelRatio: exportOptions.pixelRatio, width: exportOptions.width, height: exportOptions.height, cacheBust: true, backgroundColor: "#171717" });
      const blob = await (await fetch(dataUrl)).blob();
      const filename = `zis小红书封面-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      if (mobile && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) await navigator.share({ files: [file], title: filename });
      else { const link = document.createElement("a"); link.download = filename; link.href = dataUrl; link.click(); }
      setExported(true); window.setTimeout(() => setExported(false), 1800);
    } catch { window.alert("封面生成失败。若使用了网络图片，请先保存图片，再通过“上传背景”导入。"); }
    finally { setExporting(false); }
  }

  return <main className="xhs-shell">
    <header className="xhs-topbar"><div className="xhs-brand-mark">ZIS</div><div><p>XHS COVER</p><h1>zis小红书封面生成器</h1></div><button className="xhs-account" onClick={() => setManagerOpen(true)}><img src={activeAccount.avatarUrl} alt="" /><span><strong>{activeAccount.displayName}</strong><small>{activeAccount.handle}</small></span><CaretDown weight="bold" /></button></header>
    <div className="xhs-workspace">
      <aside className="xhs-controls">
        <section><div className="xhs-heading"><b>01</b><div><h2>选择内容来源</h2><p>从小红书素材库开始，或直接自由编辑</p></div></div><div className="xhs-segment"><button className={sourceMode === "library" ? "active" : ""} onClick={() => setSourceMode("library")}>小红书素材库</button><button className={sourceMode === "free" ? "active" : ""} onClick={() => setSourceMode("free")}>自由编辑</button></div>
          {sourceMode === "library" && <div className="xhs-source-library"><label className="xhs-search"><MagnifyingGlass /><input value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} placeholder="搜索标题、正文或分类" /></label>{!visibleContent.length ? <div className="xhs-library-empty"><FileText /><strong>素材库还是空的</strong><p>点击右上角账号进入管理，可手动添加或批量导入；现在也可以直接使用自由编辑。</p><button onClick={() => setSourceMode("free")}>切换到自由编辑</button></div> : <div className="xhs-source-list">{visibleContent.map((item) => <button key={item.id} className={selectedSourceId === item.id ? "active" : ""} onClick={() => selectSource(item)}><span>{item.category}</span><strong>{item.coverTitle}</strong><small>{item.excerpt}</small></button>)}</div>}</div>}
        </section>
        <section><div className="xhs-heading"><b>02</b><div><h2>编辑封面文字</h2><p>短、准、有画面感，系统会自动适配字号</p></div></div>
          <div className="xhs-field-row"><label className="xhs-field"><span>栏目</span><input value={fields.category} maxLength="20" onChange={(event) => updateField("category", event.target.value)} /></label><label className="xhs-field"><span>关键词 / 话题</span><input value={fields.keywords} onChange={(event) => updateField("keywords", event.target.value)} /></label></div>
          <label className="xhs-field"><span>主标题 <em>{fields.coverTitle.length} 字</em></span><textarea value={fields.coverTitle} onChange={(event) => updateField("coverTitle", event.target.value)} rows="3" /></label>
          <label className="xhs-field"><span>副标题</span><textarea value={fields.coverSubtitle} onChange={(event) => updateField("coverSubtitle", event.target.value)} rows="2" /></label>
          <label className="xhs-field"><span>摘要卡片文字 <em>{fields.excerpt.length} 字</em></span><textarea value={fields.excerpt} onChange={(event) => updateField("excerpt", event.target.value)} rows="4" /></label>
          {(titleTooLong || excerptTooLong || talkingExcerptTooLong) && <div className="xhs-length-warning"><WarningCircle weight="fill" /><span>{titleTooLong ? "主标题偏长，系统已缩小字号；精简到 52 字以内会更醒目。" : talkingExcerptTooLong ? "高亮口播的粉色强调句偏长，系统已缩小字号；精简到 80 字以内更接近参考效果。" : "摘要偏长，系统已缩小字号；建议保留最核心的一段。"}</span></div>}
        </section>
        <section><div className="xhs-heading"><b>03</b><div><h2>选择封面样式</h2><p>大标题 4 套，摘要卡片 3 套</p></div></div><div className="xhs-template-tabs"><button className={coverMode === "title" ? "active" : ""} onClick={() => chooseCoverMode("title")}><TextT weight="bold" />大标题海报</button><button className={coverMode === "summary" ? "active" : ""} onClick={() => chooseCoverMode("summary")}><ImageSquare weight="bold" />摘要卡片</button></div><div className="xhs-template-list">{templates.map((item) => <button key={item.id} className={template === item.id ? "active" : ""} onClick={() => chooseTemplate(item.id)}><i className={item.id} /><strong>{item.name}</strong><small>{item.description}</small></button>)}</div></section>
        <section><div className="xhs-background-heading"><div className="xhs-heading"><b>04</b><div><h2>选择背景</h2><p>共享图库、本地图片和网络地址都能用</p></div></div><button onClick={() => setBackgroundManagerOpen(true)}><PencilSimple />管理背景</button></div>
          <label className="xhs-random-toggle"><input type="checkbox" checked={randomBackground} onChange={(event) => setRandomEnabled(event.target.checked)} /><span><strong>随机背景</strong><small>更换内容或账号时自动换图</small></span></label>
          <label className="xhs-search"><MagnifyingGlass /><input value={backgroundQuery} onChange={(event) => setBackgroundQuery(event.target.value)} placeholder="搜索：城市、纸张、蓝天" /></label>
          <div className="xhs-background-grid">{visibleBackgrounds.map((item) => <button key={item.id} className={background === item.src ? "active" : ""} onClick={() => setBackground(item.src)}><img src={item.src} alt={item.name} /><span>{item.name}</span></button>)}</div>
          <div className="xhs-background-actions"><label><UploadSimple />上传背景<input type="file" accept="image/*" onChange={loadBackground} /></label><div><input value={backgroundUrl} onChange={(event) => setBackgroundUrl(event.target.value)} placeholder="粘贴图片地址" /><button onClick={applyBackgroundUrl}>使用</button></div></div>
        </section>
        <section><div className="xhs-heading"><b>05</b><div><h2>微调封面</h2><p>只保留高频选项，不需要设计经验</p></div></div>
          <div className="xhs-style-row"><span>文字对齐</span><div><button className={align === "left" ? "active" : ""} onClick={() => setAlign("left")}><AlignLeft />左对齐</button><button className={align === "center" ? "active" : ""} onClick={() => setAlign("center")}><AlignCenterHorizontal />居中</button></div></div>
          <div className="xhs-accent-row"><span>强调色</span>{["#ff604e", "#ffe15c", "#8ad9ff", "#b7ef9c", "#e6b7ff"].map((color) => <button key={color} className={accent === color ? "active" : ""} style={{ backgroundColor: color }} onClick={() => setAccent(color)} aria-label={`使用强调色 ${color}`} />)}</div>
          <label className="xhs-range"><span>背景压暗 <b>{overlay}%</b></span><input type="range" min="0" max="65" value={overlay} onChange={(event) => setOverlay(Number(event.target.value))} /></label>
          <label className="xhs-range"><span>文字大小 <b>{Math.round(textScale * 100)}%</b></span><input type="range" min="70" max="120" value={Math.round(textScale * 100)} onChange={(event) => setTextScale(Number(event.target.value) / 100)} /></label>
          <div className="xhs-drag-help"><SlidersHorizontal /><span>在右侧直接拖动文字区调整位置</span><button onClick={resetPlacement}>居中重置</button></div>
        </section>
        <section><div className="xhs-heading"><b>06</b><div><h2>生成整篇小红书笔记</h2><p>标题、正文和 3–5 个相关话题一次准备好</p></div></div>
          <label className="xhs-field"><span>笔记标题</span><input value={fields.noteTitle} onChange={(event) => updateField("noteTitle", event.target.value)} placeholder="留空时使用封面标题" /></label>
          <label className="xhs-field"><span>笔记正文</span><textarea value={fields.noteBody} onChange={(event) => updateField("noteBody", event.target.value)} rows="9" /></label>
          <div className="xhs-note-tags">{note.hashtags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="xhs-copy-actions"><button onClick={() => copyText(note.title, "标题")}><CopySimple />复制标题</button><button onClick={() => copyText(note.fullText, "整篇笔记")} className="primary"><Sparkle weight="fill" />复制整篇笔记</button></div><p className="xhs-copy-status">{copyStatus || "复制前请检查事实、数据、个人经历和收益表述。"}</p>
        </section>
      </aside>
      <section className="xhs-preview-panel"><div className="xhs-preview-bar"><span><i />1080 × 1440 · {coverMode === "title" ? "大标题海报" : "摘要卡片"}</span><small>{activeTemplate.name}</small></div><div className="xhs-stage" ref={stageRef}><div className="xhs-canvas-viewport" style={{ width: `${540 * previewScale}px`, height: `${720 * previewScale}px` }}><div ref={previewCanvasRef} style={{ transform: `scale(${previewScale})` }} className="xhs-canvas-scaled"><CoverCanvas fields={fields} mode={coverMode} template={template} background={background} overlay={overlay} accent={accent} align={align} textScale={textScale} textPosition={textPosition} account={activeAccount} interactive onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} /></div></div></div><div className="xhs-export-bar"><div><Check weight="bold" /><span>预览与下载使用同一版式，可直接发小红书</span></div><div><button className="xhs-copy-export" onClick={() => copyText(note.fullText, "整篇笔记")}><CopySimple />复制笔记</button><button className="xhs-download" onClick={downloadCover} disabled={exporting}>{exported ? <Check weight="bold" /> : <DownloadSimple weight="bold" />}{exporting ? "正在生成…" : exported ? "已下载" : "下载 3:4 封面"}</button></div></div></section>
    </div>
    <XiaohongshuManagerModal open={managerOpen} accounts={accounts} activeAccount={activeAccount} content={content} onClose={() => setManagerOpen(false)} onSelect={switchAccount} onContentChanged={() => refreshContent(activeAccountId)} />
    <BackgroundManagerModal open={backgroundManagerOpen} backgrounds={backgrounds} onClose={() => setBackgroundManagerOpen(false)} onChanged={(deletedId) => refreshBackgrounds({ deletedId })} />
    <div className="xhs-export-surface" aria-hidden="true"><div ref={exportRef}><CoverCanvas fields={fields} mode={coverMode} template={template} background={background} overlay={overlay} accent={accent} align={align} textScale={textScale} textPosition={textPosition} account={activeAccount} /></div></div>
  </main>;
}
