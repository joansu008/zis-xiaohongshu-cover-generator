import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  ArrowsClockwise, BookmarkSimple, ChatCircle, Check, CopySimple, DownloadSimple,
  CaretDown, DotsThree, Heart, ImageSquare, MagnifyingGlass, SealCheck, ShareNetwork,
  PencilSimple, ShieldCheck, Shuffle, Sparkle, UploadSimple, WarningCircle,
} from "@phosphor-icons/react";
import baseContentSources from "./content-sources.json";
import { AccountManagerModal } from "./AccountManagerModal.jsx";
import { BackgroundManagerModal } from "./BackgroundManagerModal.jsx";

const fallbackAccount = {
  id: "annie-default", displayName: "安妮", handle: "@kiki89699", avatarUrl: "/annie-avatar.jpg",
  exclusiveContentCount: 0, contentCount: baseContentSources.length,
};
const fallbackContentSources = baseContentSources.map((source) => ({ ...source, ownerAccountId: null, ownerDisplayName: null, scope: "public" }));
const fallbackBackgrounds = [
  { id: "city-1", name: "香港海边", tags: "香港 城市 海边 蓝天", src: "/backgrounds/city-1.jpg" },
  { id: "city-2", name: "城市天际线", tags: "香港 城市 天际线 日落", src: "/backgrounds/city-2.jpg" },
  { id: "city-3", name: "街头夜景", tags: "城市 街头 夜景 情绪", src: "/backgrounds/city-3.jpg" },
  { id: "city-4", name: "山海风景", tags: "自然 山 海 风景", src: "/backgrounds/city-4.jpg" },
  { id: "hk-day", name: "香港港口", tags: "香港 港口 白天 城市", src: "/backgrounds/hk-harbor-day.jpg" },
  { id: "hk-mountain", name: "山城天际线", tags: "香港 山 城市 天际线", src: "/backgrounds/hk-mountain-city.jpg" },
  { id: "neon-street", name: "霓虹街头", tags: "城市 夜景 霓虹 街头 情绪", src: "/backgrounds/neon-street.jpg" },
  { id: "hk-aerial", name: "香港俯瞰夜景", tags: "香港 俯瞰 夜景 灯光", src: "/backgrounds/hk-aerial-night.jpg" },
  { id: "hk-night", name: "维港夜景", tags: "香港 维多利亚港 夜景 倒影", src: "/backgrounds/hk-harbor-night.jpg" },
  { id: "tower-night", name: "城市高楼", tags: "城市 高楼 夜景 竖图", src: "/backgrounds/city-tower-night.jpg" },
  { id: "hk-peak", name: "太平山夜景", tags: "香港 太平山 夜景 天际线", src: "/backgrounds/hk-peak-night.jpg" },
  { id: "aurora", name: "极光流动", tags: "AI 科技 极光 蓝紫 抽象", src: "/backgrounds/generated-aurora.svg" },
  { id: "sunset", name: "日落山丘", tags: "日落 山丘 橙色 自然", src: "/backgrounds/generated-sunset.svg" },
  { id: "ocean", name: "深海微光", tags: "海洋 蓝色 微光 安静", src: "/backgrounds/generated-ocean.svg" },
  { id: "paper", name: "暖色纸张", tags: "纸张 米色 极简 认知", src: "/backgrounds/generated-paper.svg" },
  { id: "grid", name: "未来网格", tags: "AI 科技 网格 黑色 未来", src: "/backgrounds/generated-grid.svg" },
  { id: "forest", name: "雾中森林", tags: "森林 绿色 雾 自然", src: "/backgrounds/generated-forest.svg" },
  { id: "dawn", name: "城市清晨", tags: "城市 清晨 粉色 天空", src: "/backgrounds/generated-dawn.svg" },
  { id: "ink", name: "水墨山水", tags: "水墨 山水 黑白 中国风", src: "/backgrounds/generated-ink.svg" },
  { id: "neon", name: "霓虹渐变", tags: "霓虹 紫色 蓝色 AI 抽象", src: "/backgrounds/generated-neon.svg" },
  { id: "desert", name: "沙漠光影", tags: "沙漠 金色 光影 自然", src: "/backgrounds/generated-desert.svg" },
  { id: "cloud", name: "云上蓝天", tags: "蓝天 云朵 清新 自由", src: "/backgrounds/generated-cloud.svg" },
  { id: "matrix", name: "矩阵光线", tags: "矩阵 光线 绿色 黑色 科技", src: "/backgrounds/generated-matrix.svg" },
];

function pickNextBackground(backgroundList, currentSource) {
  if (!backgroundList.length) return currentSource;
  const alternatives = backgroundList.filter((item) => item.src !== currentSource);
  const pool = alternatives.length ? alternatives : backgroundList;
  return pool[Math.floor(Math.random() * pool.length)].src;
}

function getAdaptiveFontSize(text, preferred, poster = false) {
  const length = text.replace(/\s+/g, "").length;
  const limit = poster
    ? length > 900 ? 11 : length > 700 ? 12 : length > 520 ? 13 : length > 360 ? 15 : length > 220 ? 17 : preferred
    : length > 1000 ? 13 : length > 720 ? 14 : length > 480 ? 15 : length > 300 ? 16 : length > 180 ? 17 : preferred;
  return Math.min(preferred, limit);
}
function createSourceDraft(source) {
  if (!source) return "选择一条内容，再调整成你想发布的版本。";
  if (source.draft) return source.draft;
  return `${source.title}\n\n${source.insight}\n\n${source.angle}\n\n${source.action || "别急着收藏更多工具。先找一件你今天真的要完成的事，用AI跑完一次，再根据结果继续调整。"}`;
}

function createInteractionData() {
  const views = Math.round(80000 + Math.random() * 720000);
  const varied = (min, max) => min + Math.random() * (max - min);
  return {
    views,
    replies: Math.max(12, Math.round(views * varied(0.0007, 0.0018))),
    reposts: Math.max(20, Math.round(views * varied(0.0018, 0.0042))),
    likes: Math.max(60, Math.round(views * varied(0.0075, 0.0145))),
    bookmarks: Math.max(18, Math.round(views * varied(0.0025, 0.0065))),
  };
}

function createRandomPostDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 120);
  const hour = 8 + Math.floor(Math.random() * 15);
  const minute = Math.floor(Math.random() * 60);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, minute).toISOString();
}

function formatViews(value) {
  return value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString("zh-CN");
}

function buildPublishCopy(text) {
  const clean = text.replace(/https?:\/\/\S+/g, "").replace(/[#@][^\s]+/g, "").replace(/\s+/g, " ").trim();
  let sentence = "真正有价值的改变，永远从一次具体行动开始";
  if (/(AI|GPT|ChatGPT|Gemini|Token|人工智能)/i.test(clean)) sentence = "AI真正拉开差距的，不是知道多少工具，而是能不能用它解决一个真实问题";
  else if (/(执行|行动|拖延|验证|去做)/.test(clean)) sentence = "真正拉开差距的，从来不是想得多明白，而是愿不愿意马上去做";
  else if (/(问题|思考|认知|判断|理解)/.test(clean)) sentence = "一个真正的好问题，会让你再也回不到原来的看法里";
  else if (/(创业|赚钱|商业|项目|收入|利润)/.test(clean)) sentence = "很多机会并不复杂，真正稀缺的是看见之后愿意马上验证的人";
  else if (/(写作|内容|口播|自媒体|流量|观众)/.test(clean)) sentence = "好内容不是把道理说得更大，而是让人听完愿意多走一步";
  else {
    const candidate = clean.split(/[。！？；]/).map((item) => item.trim()).find((item) => item.length >= 10 && item.length <= 42);
    if (candidate) sentence = candidate;
  }

  const tags = [];
  const add = (tag) => { if (!tags.includes(tag) && tags.length < 2) tags.push(tag); };
  if (/(AI|GPT|ChatGPT|Gemini|Token|人工智能)/i.test(clean)) add("#AI");
  if (/(创业|赚钱|商业|项目|收入|利润)/.test(clean)) { add("#创业"); add("#财富"); }
  if (/(写作|内容|口播|自媒体|流量)/.test(clean)) add("#自媒体");
  if (/(认知|思考|问题|判断)/.test(clean)) add("#认知");
  if (/(自由职业|副业)/.test(clean)) add("#自由职业");
  if (/(成长|学习|执行|行动|拖延)/.test(clean)) add("#个人成长");
  if (tags.length === 0) add("#认知");
  if (tags.length === 1) add("#个人成长");
  return `${sentence} ${tags.join(" ")} #七月安妮`;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchImageAsDataUrl(source) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(source, { cache: attempt === 0 ? "force-cache" : "reload" });
      if (!response.ok) throw new Error(`image ${response.status}`);
      return await blobToDataUrl(await response.blob());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function createStableExportClone(node) {
  if (document.fonts?.ready) await document.fonts.ready;
  const host = document.createElement("div");
  host.className = "stable-export-host";
  const clone = node.cloneNode(true);
  clone.style.width = `${node.offsetWidth}px`;
  if (node.classList.contains("douyin-poster")) clone.style.height = `${node.offsetHeight}px`;
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    const images = [...clone.querySelectorAll("img")];
    await Promise.all(images.map(async (image) => {
      const source = image.getAttribute("src") || image.src;
      if (!source || source.startsWith("data:")) return;
      image.src = await fetchImageAsDataUrl(new URL(source, window.location.href).href);
      if (image.decode) await image.decode();
    }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { clone, cleanup: () => host.remove() };
  } catch (error) {
    host.remove();
    throw error;
  }
}

function TweetCard({ cardRef, text, fontSize, cardTheme, avatar, displayName, account, interactions, postedAt, orientation = "portrait", poster = false }) {
  const postDate = new Date(postedAt);
  const dateLabel = `${postDate.getFullYear()}年${postDate.getMonth() + 1}月${postDate.getDate()}日`;
  const timeLabel = `${postDate.getHours() < 12 ? "上午" : "下午"}${postDate.getHours() % 12 || 12}:${String(postDate.getMinutes()).padStart(2, "0")}`;
  return <article className={`tweet-card theme-${cardTheme} card-${orientation} ${poster ? "poster-tweet-card" : ""}`} ref={cardRef} aria-label="zis图文内容卡片预览">
    <header className="tweet-header">
      <img className="tweet-avatar annie-avatar" src={avatar} alt={`${displayName}头像`} />
      <div className="tweet-identity"><div className="tweet-name-line"><strong>{displayName}</strong><SealCheck weight="fill" className="verified-icon" /></div><div className="tweet-account-line">{account} · {postDate.getMonth() + 1}月{postDate.getDate()}日</div></div>
      <div className="tweet-actions-top" aria-hidden="true"><b>𝕏</b><DotsThree size={25} weight="bold" /></div>
    </header>
    <div className="tweet-body" style={{ fontSize: `${fontSize}px` }}>{text}</div>
    <footer className="tweet-footer">
      <div className="tweet-meta">{timeLabel} · {dateLabel} · <strong>{formatViews(interactions.views)}</strong> 查看</div>
      <div className="tweet-engagement">
        <span><ChatCircle />{interactions.replies.toLocaleString("zh-CN")}</span>
        <span><ArrowsClockwise />{interactions.reposts.toLocaleString("zh-CN")}</span>
        <span><Heart />{interactions.likes.toLocaleString("zh-CN")}</span>
        <span><BookmarkSimple />{interactions.bookmarks.toLocaleString("zh-CN")}</span>
        <span className="share-only"><ShareNetwork /></span>
      </div>
    </footer>
  </article>;
}

export function App() {
  const [accounts, setAccounts] = useState([fallbackAccount]);
  const [activeAccountId, setActiveAccountId] = useState(fallbackAccount.id);
  const [contentSources, setContentSources] = useState(fallbackContentSources);
  const [sharedContentCount, setSharedContentCount] = useState(fallbackContentSources.length);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [backgroundManagerOpen, setBackgroundManagerOpen] = useState(false);
  const [mode, setMode] = useState("sources");
  const [outputMode, setOutputMode] = useState("poster");
  const [orientation, setOrientation] = useState("portrait");
  const [draft, setDraft] = useState(() => fallbackContentSources[0]?.draft || "选择一条内容，再调整成你想发布的版本。");
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceCategory, setSourceCategory] = useState("全部");
  const [selectedSourceId, setSelectedSourceId] = useState(fallbackContentSources[0].id);
  const [sourceDraft, setSourceDraft] = useState(() => createSourceDraft(fallbackContentSources[0]));
  const [fontSize, setFontSize] = useState(18);
  const [cardTheme, setCardTheme] = useState("light");
  const [interactions, setInteractions] = useState(() => createInteractionData());
  const [postedAt, setPostedAt] = useState(() => createRandomPostDate());
  const [backgroundLibrary, setBackgroundLibrary] = useState(fallbackBackgrounds);
  const [background, setBackground] = useState(fallbackBackgrounds[0].src);
  const [randomBackgroundEnabled, setRandomBackgroundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("zis-random-background") !== "false";
  });
  const [backgroundQuery, setBackgroundQuery] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [overlay, setOverlay] = useState(18);
  const [cardScale, setCardScale] = useState(0.9);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [publishCopy, setPublishCopy] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const exportRef = useRef(null);
  const posterExportRef = useRef(null);
  const directCardRef = useRef(null);
  const dragStateRef = useRef(null);
  const pinchRef = useRef(null);
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const activeAccount = useMemo(() => accounts.find((item) => item.id === activeAccountId) || accounts[0] || fallbackAccount, [accounts, activeAccountId]);
  const selectedSource = useMemo(() => contentSources.find((source) => source.id === selectedSourceId) || contentSources[0], [contentSources, selectedSourceId]);
  const activeText = mode === "sources" ? sourceDraft : draft;
  const adaptiveCardFontSize = getAdaptiveFontSize(activeText, fontSize, false);
  const adaptivePosterFontSize = getAdaptiveFontSize(activeText, fontSize, true);
  const posterFitScale = activeText.length > 900 ? 0.62 : activeText.length > 700 ? 0.7 : activeText.length > 520 ? 0.78 : activeText.length > 360 ? 0.86 : 1;
  const sourceCategories = useMemo(() => ["全部", ...new Set(contentSources.map((source) => source.category))], [contentSources]);
  const sourceResults = useMemo(() => {
    const needle = sourceQuery.trim().toLowerCase();
    return contentSources.filter((source) => (sourceCategory === "全部" || source.category === sourceCategory) && (!needle || `${source.title} ${source.insight} ${source.angle} ${source.productFit.join(" ")}`.toLowerCase().includes(needle)));
  }, [contentSources, sourceCategory, sourceQuery]);
  const visibleSourceResults = sourceResults.slice(0, 100);
  const backgroundResults = useMemo(() => {
    const needle = backgroundQuery.trim().toLowerCase();
    return backgroundLibrary.filter((item) => !needle || `${item.name} ${item.tags}`.toLowerCase().includes(needle));
  }, [backgroundLibrary, backgroundQuery]);
  useEffect(() => setExported(false), [mode, outputMode, orientation, draft, sourceDraft, fontSize, cardTheme, background, overlay, cardScale, cardPosition, activeAccount, interactions, postedAt]);
  useEffect(() => setCardPosition({ x: 0, y: 0 }), [orientation]);
  useEffect(() => { setPublishCopy(""); setCopyStatus(""); }, [mode, draft, sourceDraft]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const selected = await refreshAccounts();
      if (!cancelled && selected) await refreshContent(selected.id);
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { refreshBackgrounds({ randomizeInitial: true }); }, []);

  async function refreshAccounts(preferredId = null, deletedId = null) {
    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      if (!response.ok) throw new Error("accounts unavailable");
      const payload = await response.json();
      const nextAccounts = payload.accounts || [];
      if (!nextAccounts.length) throw new Error("empty accounts");
      setAccounts(nextAccounts);
      setSharedContentCount(Number(payload.sharedContentCount || 0));
      const storedId = window.localStorage.getItem("annie-active-account");
      const requestedId = preferredId || storedId || (deletedId === activeAccountId ? null : activeAccountId);
      const nextAccount = nextAccounts.find((item) => item.id === requestedId)
        || nextAccounts.find((item) => item.id === storedId)
        || nextAccounts[0];
      setActiveAccountId(nextAccount.id);
      window.localStorage.setItem("annie-active-account", nextAccount.id);
      return nextAccount;
    } catch {
      setAccounts([fallbackAccount]);
      setSharedContentCount(fallbackContentSources.length);
      return fallbackAccount;
    }
  }

  async function refreshBackgrounds({ deletedId = null, randomizeInitial = false } = {}) {
    let nextBackgrounds = fallbackBackgrounds;
    try {
      const response = await fetch("/api/backgrounds", { cache: "no-store" });
      if (!response.ok) throw new Error("backgrounds unavailable");
      const payload = await response.json();
      if (!payload.backgrounds?.length) throw new Error("empty backgrounds");
      nextBackgrounds = payload.backgrounds;
    } catch {
      nextBackgrounds = fallbackBackgrounds;
    }
    const deletedSource = deletedId ? backgroundLibrary.find((item) => item.id === deletedId)?.src : null;
    setBackgroundLibrary(nextBackgrounds);
    setBackground((current) => {
      if (deletedSource && current === deletedSource) return nextBackgrounds[0]?.src || current;
      if (randomizeInitial && randomBackgroundEnabled) return pickNextBackground(nextBackgrounds, current);
      if (randomizeInitial && !nextBackgrounds.some((item) => item.src === current)) return nextBackgrounds[0]?.src || current;
      return current;
    });
    return nextBackgrounds;
  }

  function randomizeBackground() {
    if (!randomBackgroundEnabled) return;
    setBackground((current) => pickNextBackground(backgroundLibrary, current));
  }

  function setRandomBackground(nextEnabled) {
    setRandomBackgroundEnabled(nextEnabled);
    window.localStorage.setItem("zis-random-background", String(nextEnabled));
    if (nextEnabled) setBackground((current) => pickNextBackground(backgroundLibrary, current));
  }

  async function refreshContent(accountId = activeAccountId, preferredSourceId = null) {
    let nextSources = fallbackContentSources;
    try {
      const response = await fetch(`/api/content?accountId=${encodeURIComponent(accountId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("content unavailable");
      const payload = await response.json();
      nextSources = payload.content || [];
    } catch {
      nextSources = fallbackContentSources;
    }
    setContentSources(nextSources);
    setSourceCategory("全部");
    const rememberedId = preferredSourceId || window.localStorage.getItem(`annie-last-source:${accountId}`);
    const nextSource = nextSources.find((item) => item.id === rememberedId) || nextSources[0];
    setSelectedSourceId(nextSource?.id || "");
    setSourceDraft(createSourceDraft(nextSource));
    if (nextSource) window.localStorage.setItem(`annie-last-source:${accountId}`, nextSource.id);
    return nextSources;
  }

  async function switchAccountIdentity(nextAccount) {
    setActiveAccountId(nextAccount.id);
    window.localStorage.setItem("annie-active-account", nextAccount.id);
    randomizePostData();
    randomizeBackground();
    await refreshContent(nextAccount.id);
    setAccountModalOpen(false);
  }

  async function handleAccountsChanged(preferredId = null, deletedId = null) {
    const nextAccount = await refreshAccounts(preferredId, deletedId);
    if (nextAccount) await refreshContent(nextAccount.id);
  }

  function switchMode(nextMode) { setMode(nextMode); if (nextMode === "draft" && !draft.trim()) setDraft(sourceDraft); }
  function randomizePostData() { setInteractions(createInteractionData()); setPostedAt(createRandomPostDate()); }
  function selectSource(source) {
    if (!source) return;
    setSelectedSourceId(source.id);
    setSourceDraft(createSourceDraft(source));
    window.localStorage.setItem(`annie-last-source:${activeAccountId}`, source.id);
    randomizePostData();
    randomizeBackground();
  }
  function pickRandomSource() {
    const pool = sourceResults.length ? sourceResults : contentSources;
    const alternatives = pool.filter((source) => source.id !== selectedSourceId);
    if (pool.length) selectSource((alternatives.length ? alternatives : pool)[Math.floor(Math.random() * (alternatives.length ? alternatives.length : pool.length))]);
  }
  function loadUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBackground(String(reader.result));
    reader.readAsDataURL(file);
  }
  function applyBackgroundUrl() {
    const value = backgroundUrl.trim();
    if (!value) return;
    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("unsupported protocol");
      setBackground(import.meta.env.DEV ? parsed.href : `/api/image-proxy?url=${encodeURIComponent(parsed.href)}`);
    } catch {
      window.alert("请粘贴以 http:// 或 https:// 开头的图片地址。");
    }
  }
  function generatePublishCopy() { const next = buildPublishCopy(activeText); setPublishCopy(next); setCopyStatus(""); return next; }
  async function copyDescription() {
    const value = publishCopy || generatePublishCopy();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement("textarea"); input.value = value; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove();
    }
    setCopyStatus("已复制，可直接粘贴到抖音");
    window.setTimeout(() => setCopyStatus(""), 2200);
  }
  function resetCardPlacement() { setCardScale(0.9); setCardPosition({ x: 0, y: 0 }); }
  function startDragging(event) {
    if (outputMode !== "poster") return;
    if (pinchRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: cardPosition };
  }
  function dragCard(event) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !exportRef.current) return;
    const rect = exportRef.current.getBoundingClientRect();
    const canvasWidth = 720;
    const canvasHeight = 960;
    const nextX = drag.origin.x + (event.clientX - drag.startX) * (canvasWidth / rect.width);
    const nextY = drag.origin.y + (event.clientY - drag.startY) * (canvasHeight / rect.height);
    const maxX = 260;
    const maxY = 360;
    setCardPosition({ x: Math.max(-maxX, Math.min(maxX, nextX)), y: Math.max(-maxY, Math.min(maxY, nextY)) });
  }
  function stopDragging(event) {
    if (dragStateRef.current?.pointerId === event.pointerId) dragStateRef.current = null;
  }
  function handleTouchStart(e) {
    if (outputMode !== "poster" || e.touches.length !== 2) return;
    dragStateRef.current = null;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    pinchRef.current = { dist: Math.hypot(dx, dy), scale: cardScale };
  }
  function handleTouchMove(e) {
    if (!pinchRef.current || e.touches.length !== 2) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const ratio = Math.hypot(dx, dy) / pinchRef.current.dist;
    setCardScale(Math.max(0.55, Math.min(1.2, pinchRef.current.scale * ratio)));
  }
  function handleTouchEnd() { pinchRef.current = null; }
  async function deliverImage(dataUrl, filename) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (isMobile && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: filename });
      } else if (isMobile) {
        const imageUrl = URL.createObjectURL(blob);
        const previewLink = document.createElement("a");
        previewLink.href = imageUrl;
        previewLink.target = "_blank";
        previewLink.rel = "noopener noreferrer";
        document.body.appendChild(previewLink);
        previewLink.click();
        previewLink.remove();
        window.setTimeout(() => URL.revokeObjectURL(imageUrl), 60000);
        window.alert("图片已打开，请长按图片，选择“存储图像”或“保存到相册”。");
      } else {
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
      }
  }
  async function exportNode(node, filename, backgroundColor) {
    if (!node || exporting) return;
    setExporting(true);
    let cleanup = () => {};
    try {
      const stable = await createStableExportClone(node);
      cleanup = stable.cleanup;
      const dataUrl = await toPng(stable.clone, { cacheBust: false, pixelRatio: 2, backgroundColor });
      await deliverImage(dataUrl, filename);
      setExported(true);
      window.setTimeout(() => setExported(false), 1800);
    } catch (error) {
      if (error?.name === "AbortError") return;
      window.alert("这张网络图片禁止跨站导出。请先保存图片，再用“上传自己的背景”导入。");
    } finally {
      cleanup();
      setExporting(false);
    }
  }
  async function downloadImage() {
    const fileLabel = new Date().toISOString().slice(0, 10);
    const direction = orientation === "landscape" ? "横版" : "竖版";
    const filename = `zis图文内容卡片-${direction}-${fileLabel}.png`;
    return exportNode(outputMode === "poster" ? posterExportRef.current : exportRef.current, filename, outputMode === "poster" ? "#161616" : cardTheme === "light" ? "#ffffff" : "#000000");
  }
  async function exportDirectCard() {
    const fileLabel = new Date().toISOString().slice(0, 10);
    const direction = orientation === "landscape" ? "横版" : "竖版";
    return exportNode(directCardRef.current, `zis图文内容卡片-${direction}-${fileLabel}.png`, cardTheme === "light" ? "#ffffff" : "#000000");
  }

  const outputStep = mode === "sources" ? "04" : "03";
  const backgroundStep = mode === "sources" ? "05" : "04";
  const finishStep = mode === "sources" ? (outputMode === "poster" ? "06" : "05") : (outputMode === "poster" ? "05" : "04");

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">ZIS</div><div><p className="eyebrow">CONTENT CARD</p><h1>zis图文内容卡片生成器</h1></div><button className="topbar-account" onClick={() => setAccountModalOpen(true)}><img src={activeAccount.avatarUrl} alt="" /><span><strong>{activeAccount.displayName}</strong><small>{activeAccount.handle}</small></span><CaretDown weight="bold" /></button></header>
    <div className="app-grid">
      <aside className="control-panel">
        <section className="panel-section mode-section"><div className="section-heading"><span className="step-number">01</span><div><h2>选择内容来源</h2><p>从安妮公众号精简内容或自由编辑开始</p></div></div><div className="segmented-control two"><button className={mode === "sources" ? "active" : ""} onClick={() => switchMode("sources")}>安妮素材库</button><button className={mode === "draft" ? "active" : ""} onClick={() => switchMode("draft")}>自由编辑</button></div></section>
        {mode === "sources" && <section className="panel-section source-library-section">
          <div className="section-heading compact"><span className="step-number">02</span><div><h2>{contentSources.length.toLocaleString("zh-CN")} 条中文成品素材</h2><p>当前筛选 {sourceResults.length} 条，选一个就能生成</p></div></div>
          <div className="search-row"><label className="search-box"><MagnifyingGlass /><input value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} placeholder="搜：选择、关系、自由、写作、做自己" /></label><button className="icon-button" onClick={pickRandomSource} title="从当前结果随机一条" aria-label="随机一条素材"><Shuffle /></button></div>
          <div className="category-pills">{sourceCategories.map((category) => <button key={category} className={sourceCategory === category ? "active" : ""} onClick={() => setSourceCategory(category)}>{category}</button>)}</div>
          <div className="source-list">{visibleSourceResults.map((source) => <article key={source.id} className={`source-item ${source.id === selectedSource?.id ? "selected" : ""}`}><button className="source-main" onClick={() => selectSource(source)}><span className="source-meta"><b>{source.category}</b><em>{source.productFit.join(" · ")}</em></span><strong>{source.title}</strong><p>{source.insight}</p></button><span className="source-origin"><i className={source.scope === "public" ? "scope-public" : "scope-account"}>{source.scope === "public" ? "公共" : source.ownerDisplayName || activeAccount.displayName}</i>{source.sourceName}</span></article>)}</div>
          <p className="source-note"><ShieldCheck weight="fill" /> 素材来自安妮公众号原文的精简整理。发布前请复核当前观点、数据、个人经历和收益表述。</p>
        </section>}
        {mode === "sources" && <section className="panel-section editor-section"><div className="section-heading compact"><span className="step-number">03</span><div><h2>调整生成内容</h2><p>保留事实，改成你自己真实说话的方式</p></div></div><textarea value={sourceDraft} onChange={(event) => setSourceDraft(event.target.value)} rows={10} /><div className="editor-actions"><span>{sourceDraft.length} 字</span><button className="secondary-button" onClick={() => setSourceDraft(createSourceDraft(selectedSource))}><Sparkle weight="fill" /> 重新生成</button></div></section>}
        {mode === "draft" && <section className="panel-section editor-section"><div className="section-heading compact"><span className="step-number">02</span><div><h2>自由编辑内容</h2><p>粘贴或直接写一条自己的内容</p></div></div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={12} /><div className="editor-actions"><span>{draft.length} 字</span><button className="secondary-button" onClick={() => setDraft(sourceDraft)}><Sparkle weight="fill" /> 载入当前素材</button></div><p className="rewrite-note">发布前检查事实、数据、个人经历和收益表述，确保符合安妮当前观点。</p></section>}
        <section className="panel-section output-section"><div className="section-heading compact"><span className="step-number">{outputStep}</span><div><h2>选择发布样式</h2><p>背景始终为抖音竖图，只调整推文卡片</p></div></div><div className="output-picker"><button className={outputMode === "poster" ? "active" : ""} onClick={() => setOutputMode("poster")}><ImageSquare weight="fill" /><strong>背景图成品</strong><span>固定竖版 3:4 背景</span></button><button className={outputMode === "card" ? "active" : ""} onClick={() => setOutputMode("card")}><BookmarkSimple weight="fill" /><strong>纯推文卡片</strong><span>没有额外背景</span></button></div><div className="orientation-control"><span>推文卡片版式</span><div className="orientation-picker" role="group" aria-label="选择推文卡片版式"><button type="button" className={orientation === "portrait" ? "active" : ""} onClick={() => setOrientation("portrait")}><i className="orientation-icon portrait" />竖版卡片</button><button type="button" className={orientation === "landscape" ? "active" : ""} onClick={() => setOrientation("landscape")}><i className="orientation-icon landscape" />横版卡片</button></div><small>系统会根据内容长度自动调整字号和卡片高度，背景画布不会改变。</small></div><button className="random-data-button" type="button" onClick={randomizePostData}><Shuffle weight="bold" /><span><strong>换日期和互动数据</strong><small>日期、查看、回复、转发、点赞与收藏会成套更新</small></span></button></section>
        {outputMode === "poster" && <section className="panel-section background-section">
          <div className="background-heading-row"><div className="section-heading compact"><span className="step-number">{backgroundStep}</span><div><h2>选择背景</h2><p>云端图库、本地上传、网络图片都能用</p></div></div><button className="edit-background-button" type="button" onClick={() => setBackgroundManagerOpen(true)}><PencilSimple />编辑背景</button></div>
          <label className="random-background-toggle"><input type="checkbox" checked={randomBackgroundEnabled} onChange={(event) => setRandomBackground(event.target.checked)} /><span><b>随机背景</b><small>{randomBackgroundEnabled ? "选择新内容时自动换一张" : "当前背景保持不变"}</small></span></label>
          <label className="search-box background-search"><MagnifyingGlass /><input value={backgroundQuery} onChange={(event) => setBackgroundQuery(event.target.value)} placeholder="搜：香港、城市、夜景、山海" /></label>
          <div className="background-grid">{backgroundResults.map((item) => <button key={item.id} className={background === item.src ? "active" : ""} onClick={() => setBackground(item.src)}><img src={item.src} alt={item.name} /><span>{item.name}</span></button>)}</div>
          <div className="background-actions"><label className="upload-button"><UploadSimple /> 上传自己的背景<input type="file" accept="image/*" onChange={loadUpload} /></label><div className="url-row"><input value={backgroundUrl} onChange={(event) => setBackgroundUrl(event.target.value)} placeholder="或粘贴网上的图片地址" /><button onClick={applyBackgroundUrl}>使用</button></div></div>
          <label className="range-label"><span>背景压暗 <b>{overlay}%</b></span><input type="range" min="0" max="55" value={overlay} onChange={(event) => setOverlay(Number(event.target.value))} /></label>
          <div className="placement-controls">
            <label className="range-label"><span>卡片大小 <b>{Math.round(cardScale * 100)}%</b></span><input type="range" min="55" max="120" value={Math.round(cardScale * 100)} onChange={(event) => setCardScale(Number(event.target.value) / 100)} /></label>
            <div className="drag-help"><span>在右侧直接拖动卡片调整位置</span><button onClick={resetCardPlacement}>居中重置</button></div>
          </div>
        </section>}
        <section className="panel-section visual-section"><div className="section-heading compact"><span className="step-number">{finishStep}</span><div><h2>检查并下载</h2><p>右侧看到的就是最终图片</p></div></div><div className="card-theme-control"><span>卡片背景</span><div className="card-theme-picker" role="group" aria-label="选择卡片背景"><button type="button" className={cardTheme === "light" ? "active" : ""} onClick={() => setCardTheme("light")}><i className="theme-swatch light" />白色</button><button type="button" className={cardTheme === "dark" ? "active" : ""} onClick={() => setCardTheme("dark")}><i className="theme-swatch dark" />黑色</button></div></div><label className="range-label"><span>正文字号 <b>{fontSize}px</b>{adaptiveCardFontSize < fontSize && <em>长文自动适配为 {adaptiveCardFontSize}px</em>}</span><input type="range" min="13" max="22" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label><button className="direct-export-button" onClick={exportDirectCard} disabled={exporting}><BookmarkSimple weight="fill" /><span><strong>{isMobile ? "保存纯推文卡片到相册" : "直接导出纯推文卡片"}</strong><small>没有海报背景，尺寸随正文自动增高</small></span></button>{outputMode === "poster" && activeText.length > 700 && <div className="length-warning"><WarningCircle weight="fill" /><span>这条内容很长，系统已经自动缩小卡片。纯卡片导出不会截断，抖音竖图建议适当精简。</span></div>}</section>
        <section className="panel-section publish-copy-section">
          <div className="section-heading compact"><span className="step-number">{String(Number(finishStep) + 1).padStart(2, "0")}</span><div><h2>准备发布文案和话题</h2><p>自动生成一句文案 + 3 个相关标签</p></div></div>
          {publishCopy ? <div className="publish-copy-result">{publishCopy}</div> : <div className="publish-copy-empty">点击下方按钮，根据当前推文自动生成。</div>}
          <div className="publish-copy-actions"><button className="secondary-button" onClick={generatePublishCopy}><Sparkle weight="fill" /> {publishCopy ? "重新生成" : "生成发布文案"}</button><button className="copy-button" onClick={copyDescription}><CopySimple weight="bold" /> 一键复制</button></div>
          <p className="copy-check-note">{copyStatus || "复制前快速检查一遍，确认没有偏离原推意思。"}</p>
        </section>
      </aside>
      <section className="preview-panel">
        <div className="preview-toolbar"><div><span className={`status-dot ${mode}`} /><strong>{outputMode === "poster" ? `竖版 3:4 背景 · ${orientation === "portrait" ? "竖版" : "横版"}卡片` : `${orientation === "portrait" ? "竖版" : "横版"}纯卡片预览`}</strong></div><div className="toolbar-actions"><span>{mode === "sources" ? selectedSource?.sourceArticle || "账号内容库" : "自由编辑"}</span></div></div>
        <div className={`preview-stage ${outputMode} ${orientation}`}>{outputMode === "poster" ? <div className="douyin-poster" ref={exportRef}><img className="poster-background" src={background} crossOrigin="anonymous" alt="" /><div className="poster-overlay" style={{ background: `rgba(0,0,0,${overlay / 100})` }} /><div className={`poster-card-wrap wrap-${orientation}`} style={{ left: `calc(50% + ${cardPosition.x}px)`, top: `calc(50% + ${cardPosition.y}px)`, transform: `translate(-50%, -50%) scale(${cardScale * posterFitScale})` }} onPointerDown={startDragging} onPointerMove={dragCard} onPointerUp={stopDragging} onPointerCancel={stopDragging} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}><TweetCard text={activeText} fontSize={adaptivePosterFontSize} cardTheme={cardTheme} avatar={activeAccount.avatarUrl} displayName={activeAccount.displayName || "未命名"} account={activeAccount.handle} interactions={interactions} postedAt={postedAt} orientation={orientation} poster /></div></div> : <TweetCard cardRef={exportRef} text={activeText} fontSize={adaptiveCardFontSize} cardTheme={cardTheme} avatar={activeAccount.avatarUrl} displayName={activeAccount.displayName || "未命名"} account={activeAccount.handle} interactions={interactions} postedAt={postedAt} orientation={orientation} />}</div>
        <div className="export-bar"><div className="export-note"><Check weight="bold" /><span>{isMobile ? "生成后在系统面板选择“存储图像”，即可保存到相册。" : outputMode === "poster" ? "下载图片，再复制发布文案，就能直接发抖音。" : "下载纯推文卡片 PNG。"}</span></div><div className="export-actions"><button className="copy-export-button" onClick={copyDescription}><CopySimple weight="bold" /> 复制发布文案</button><button className="download-button" onClick={downloadImage} disabled={exporting}>{exported ? <Check weight="bold" /> : <DownloadSimple weight="bold" />}{exporting ? "正在生成…" : exported ? (isMobile ? "已生成" : "已下载") : (isMobile ? "保存到相册" : "一键下载成品")}</button></div></div>
      </section>
    </div>
    <AccountManagerModal
      open={accountModalOpen}
      accounts={accounts}
      activeAccount={activeAccount}
      content={contentSources}
      sharedContentCount={sharedContentCount}
      onClose={() => setAccountModalOpen(false)}
      onSelect={switchAccountIdentity}
      onAccountsChanged={handleAccountsChanged}
      onContentChanged={() => refreshContent(activeAccountId, selectedSourceId)}
    />
    <BackgroundManagerModal
      open={backgroundManagerOpen}
      backgrounds={backgroundLibrary}
      onClose={() => setBackgroundManagerOpen(false)}
      onChanged={(deletedId) => refreshBackgrounds({ deletedId })}
    />
    <div className="poster-export-surface" aria-hidden="true"><div className="douyin-poster" ref={posterExportRef}><img className="poster-background" src={background} crossOrigin="anonymous" alt="" /><div className="poster-overlay" style={{ background: `rgba(0,0,0,${overlay / 100})` }} /><div className={`poster-card-wrap wrap-${orientation}`} style={{ left: `calc(50% + ${cardPosition.x}px)`, top: `calc(50% + ${cardPosition.y}px)`, transform: `translate(-50%, -50%) scale(${cardScale * posterFitScale})` }}><TweetCard text={activeText} fontSize={adaptivePosterFontSize} cardTheme={cardTheme} avatar={activeAccount.avatarUrl} displayName={activeAccount.displayName || "未命名"} account={activeAccount.handle} interactions={interactions} postedAt={postedAt} orientation={orientation} poster /></div></div></div>
    <div className="direct-card-export" aria-hidden="true"><TweetCard cardRef={directCardRef} text={activeText} fontSize={adaptiveCardFontSize} cardTheme={cardTheme} avatar={activeAccount.avatarUrl} displayName={activeAccount.displayName || "未命名"} account={activeAccount.handle} interactions={interactions} postedAt={postedAt} orientation={orientation} /></div>
  </main>;
}
