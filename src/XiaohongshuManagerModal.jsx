import { useEffect, useMemo, useState } from "react";
import {
  Check, FileArrowUp, LockKey, NotePencil, Plus, SignOut, Trash, X,
} from "@phosphor-icons/react";
import { blankXhsContent, parseXhsRows, splitKeywords } from "./xhs-utils.js";

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "操作失败，请稍后重试。");
  return body;
}

export function XiaohongshuManagerModal({ open, accounts, activeAccount, content, assets = [], initialTab = "accounts", onClose, onSelect, onContentChanged, onAssetsChanged }) {
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("accounts");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [contentForm, setContentForm] = useState(null);
  const [contentQuery, setContentQuery] = useState("");
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importFileName, setImportFileName] = useState("");
  const [importOwner, setImportOwner] = useState("");
  const [assetFile, setAssetFile] = useState(null);
  const [assetName, setAssetName] = useState("");
  const [assetAccountId, setAssetAccountId] = useState("");
  const [assetNotice, setAssetNotice] = useState("");
  const [editingAsset, setEditingAsset] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    apiRequest("/api/admin/session").then((result) => {
      const unlocked = Boolean(result.authenticated);
      setAdminUnlocked(unlocked); setTab(unlocked ? initialTab : "accounts");
      if (!unlocked && initialTab === "subjects") setShowLogin(true);
    }).catch(() => { setAdminUnlocked(false); setTab("accounts"); });
    setAssetAccountId(activeAccount?.id || accounts[0]?.id || "");
  }, [open, initialTab, activeAccount?.id]);

  useEffect(() => {
    if (open) return;
    setShowLogin(false); setPassword(""); setTab("accounts"); setContentForm(null); setError("");
    setImportRows([]); setImportErrors([]); setImportFileName("");
    setAssetFile(null); setAssetName(""); setAssetNotice(""); setEditingAsset(null);
  }, [open]);

  const visibleContent = useMemo(() => {
    const needle = contentQuery.trim().toLowerCase();
    return content.filter((item) => !needle || `${item.coverTitle} ${item.noteBody} ${item.category}`.toLowerCase().includes(needle));
  }, [content, contentQuery]);

  if (!open) return null;

  async function login(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await apiRequest("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      setAdminUnlocked(true); setShowLogin(false); setPassword(""); setTab(initialTab === "subjects" ? "subjects" : "accounts");
    } catch (loginError) { setError(loginError.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    await apiRequest("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAdminUnlocked(false); setTab("accounts"); setContentForm(null);
  }

  function openContentForm(item = null) {
    setContentForm(item ? {
      ...item,
      ownerAccountId: item.ownerAccountId || "",
      keywords: (item.keywords || []).join("、"),
    } : { ...blankXhsContent, ownerAccountId: activeAccount?.id || "" });
    setError("");
  }

  async function saveContent(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const editing = Boolean(contentForm.id);
      const payload = { ...contentForm, ownerAccountId: contentForm.ownerAccountId || null, keywords: splitKeywords(contentForm.keywords) };
      await apiRequest(editing ? `/api/admin/xiaohongshu/content/${encodeURIComponent(contentForm.id)}` : "/api/admin/xiaohongshu/content", {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      setContentForm(null); await onContentChanged();
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }

  async function removeContent(item) {
    if (!window.confirm(`确定删除“${item.coverTitle}”吗？删除后无法恢复。`)) return;
    setBusy(true); setError("");
    try {
      await apiRequest(`/api/admin/xiaohongshu/content/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      await onContentChanged();
    } catch (deleteError) { setError(deleteError.message); }
    finally { setBusy(false); }
  }

  async function readImportFile(file) {
    if (!file) return;
    setError(""); setImportFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const parsed = parseXhsRows(rows, importOwner || null);
      setImportRows(parsed.items); setImportErrors(parsed.errors);
    } catch {
      setImportRows([]); setImportErrors(["无法读取这个文件，请使用标准 CSV 或 XLSX 表格。"]);
    }
  }

  function changeImportOwner(nextOwner) {
    setImportOwner(nextOwner);
    setImportRows((current) => current.map((item) => ({ ...item, ownerAccountId: nextOwner || null })));
  }

  async function confirmImport() {
    if (!importRows.length || importErrors.length) return;
    setBusy(true); setError("");
    try {
      await apiRequest("/api/admin/xiaohongshu/content/import", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: importRows }),
      });
      setImportRows([]); setImportFileName(""); await onContentChanged(); setTab("content");
    } catch (importError) { setError(importError.message); }
    finally { setBusy(false); }
  }

  async function inspectAssetFile(file) {
    setAssetFile(file || null); setAssetNotice("");
    if (!file) return;
    if (!["image/png", "image/webp"].includes(file.type)) { setAssetFile(null); setAssetNotice("人物图片仅支持 PNG 或 WebP。"); return; }
    if (file.size > 8 * 1024 * 1024) { setAssetFile(null); setAssetNotice("人物图片单张不能超过 8MB。"); return; }
    const source = URL.createObjectURL(file); const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 80; canvas.height = 80;
      const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(image, 0, 0, 80, 80);
      const data = context.getImageData(0, 0, 80, 80).data; let transparent = false;
      for (let index = 3; index < data.length; index += 4) if (data[index] < 250) { transparent = true; break; }
      setAssetNotice(transparent ? "检测到透明区域，适合人物白描边。" : "未检测到透明区域；可以继续上传，但人物白描边会形成矩形。");
      URL.revokeObjectURL(source);
    };
    image.onerror = () => { setAssetFile(null); setAssetNotice("无法读取这张图片。"); URL.revokeObjectURL(source); };
    image.src = source;
  }

  async function uploadAsset(event) {
    event.preventDefault();
    if (!assetFile || !assetName.trim() || !assetAccountId) return;
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.set("image", assetFile); form.set("name", assetName); form.set("accountId", assetAccountId); form.set("kind", "subject");
      await apiRequest("/api/admin/xiaohongshu/assets", { method: "POST", body: form });
      setAssetFile(null); setAssetName(""); setAssetNotice(""); await onAssetsChanged?.();
    } catch (uploadError) { setError(uploadError.message); }
    finally { setBusy(false); }
  }

  async function saveAsset(event) {
    event.preventDefault(); if (!editingAsset) return;
    setBusy(true); setError("");
    try {
      await apiRequest(`/api/admin/xiaohongshu/assets/${encodeURIComponent(editingAsset.id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editingAsset.name, displayOrder: editingAsset.displayOrder }) });
      setEditingAsset(null); await onAssetsChanged?.();
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }

  async function removeAsset(asset) {
    if (!window.confirm(`确定删除人物素材“${asset.name}”吗？云端文件也会同步删除。`)) return;
    setBusy(true); setError("");
    try { await apiRequest(`/api/admin/xiaohongshu/assets/${encodeURIComponent(asset.id)}`, { method: "DELETE" }); await onAssetsChanged?.(); }
    catch (deleteError) { setError(deleteError.message); }
    finally { setBusy(false); }
  }

  return <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-modal xhs-manager-modal" role="dialog" aria-modal="true" aria-label="小红书账号与素材管理">
      <header className="account-modal-header"><div><span className="account-modal-kicker">XHS LIBRARY</span><h2>{adminUnlocked ? "小红书账号与素材管理" : "选择发布账号"}</h2></div><button className="modal-close" onClick={onClose} aria-label="关闭"><X weight="bold" /></button></header>
      {adminUnlocked && <div className="account-modal-tabs"><button className={tab === "accounts" ? "active" : ""} onClick={() => setTab("accounts")}>账号切换</button><button className={tab === "content" ? "active" : ""} onClick={() => { setTab("content"); setContentForm(null); }}>内容素材</button><button className={tab === "subjects" ? "active" : ""} onClick={() => setTab("subjects")}>人物库</button><button className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>表格导入</button></div>}
      {error && <div className="modal-error">{error}</div>}

      {tab === "accounts" && <div className="account-modal-body">
        <div className="account-list-heading"><span>{accounts.length} 个可用账号</span></div>
        <div className="account-choice-list">{accounts.map((item) => <article key={item.id} className={`account-choice ${item.id === activeAccount?.id ? "active" : ""}`}><button className="account-choice-main" onClick={() => onSelect(item)}><img src={item.avatarUrl} alt="" /><span><strong>{item.displayName}</strong><small>{item.handle}</small></span>{item.id === activeAccount?.id && <Check weight="bold" />}</button></article>)}</div>
        {!adminUnlocked && !showLogin && <button className="admin-entry" onClick={() => setShowLogin(true)}><LockKey />管理小红书素材</button>}
        {!adminUnlocked && showLogin && <form className="admin-login" onSubmit={login}><label><span>管理密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required /></label><div><button type="button" onClick={() => setShowLogin(false)}>取消</button><button className="primary" disabled={busy}>{busy ? "正在验证…" : "进入管理"}</button></div></form>}
      </div>}

      {adminUnlocked && tab === "content" && <div className="account-modal-body content-manager">
        {!contentForm && <><div className="content-manager-tools"><input value={contentQuery} onChange={(event) => setContentQuery(event.target.value)} placeholder="搜索小红书素材" /><button className="modal-primary-small" onClick={() => openContentForm()}><Plus />添加素材</button></div>
          <p className="content-manager-note">当前显示“{activeAccount?.displayName}”可用的公共内容与专属内容。</p>
          {!visibleContent.length && <div className="xhs-manager-empty"><NotePencil /><strong>素材库还是空的</strong><span>可以手动添加，或切换到“表格导入”。</span></div>}
          <div className="managed-content-list">{visibleContent.map((item) => <article key={item.id}><div><span className={item.scope === "public" ? "scope-public" : "scope-account"}>{item.scope === "public" ? "公共" : item.ownerDisplayName || activeAccount?.displayName}</span><strong>{item.coverTitle}</strong><small>{item.category} · {item.noteBody.length} 字</small></div><div><button onClick={() => openContentForm(item)} aria-label="编辑素材"><NotePencil /></button><button className="danger" onClick={() => removeContent(item)} aria-label="删除素材"><Trash /></button></div></article>)}</div></>}
        {contentForm && <form className="modal-form content-form xhs-content-form" onSubmit={saveContent}>
          <h3>{contentForm.id ? "编辑小红书素材" : "添加小红书素材"}</h3>
          <label><span>归属</span><select value={contentForm.ownerAccountId} onChange={(event) => setContentForm({ ...contentForm, ownerAccountId: event.target.value })}><option value="">公共素材</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.displayName}专属</option>)}</select></label>
          <div className="content-form-row"><label><span>分类</span><input value={contentForm.category} onChange={(event) => setContentForm({ ...contentForm, category: event.target.value })} /></label><label><span>关键词/话题</span><input value={contentForm.keywords} onChange={(event) => setContentForm({ ...contentForm, keywords: event.target.value })} placeholder="成长、选择、行动" /></label></div>
          <label><span>封面标题</span><input value={contentForm.coverTitle} maxLength={120} onChange={(event) => setContentForm({ ...contentForm, coverTitle: event.target.value })} required /></label>
          <label><span>封面副标题</span><input value={contentForm.coverSubtitle} maxLength={180} onChange={(event) => setContentForm({ ...contentForm, coverSubtitle: event.target.value })} /></label>
          <label><span>摘要卡片文字</span><textarea rows="3" value={contentForm.excerpt} maxLength={800} onChange={(event) => setContentForm({ ...contentForm, excerpt: event.target.value })} /></label>
          <label><span>笔记标题</span><input value={contentForm.noteTitle} maxLength={120} onChange={(event) => setContentForm({ ...contentForm, noteTitle: event.target.value })} placeholder="留空时使用封面标题" /></label>
          <label><span>笔记正文</span><textarea rows="8" value={contentForm.noteBody} maxLength={10000} onChange={(event) => setContentForm({ ...contentForm, noteBody: event.target.value })} required /></label>
          <div className="content-form-row"><label><span>来源名称</span><input value={contentForm.sourceName} onChange={(event) => setContentForm({ ...contentForm, sourceName: event.target.value })} /></label><label><span>来源链接</span><input value={contentForm.sourceUrl} onChange={(event) => setContentForm({ ...contentForm, sourceUrl: event.target.value })} /></label></div>
          <label><span>核验提示</span><input value={contentForm.verificationNote} onChange={(event) => setContentForm({ ...contentForm, verificationNote: event.target.value })} placeholder="有数据、收益或事实判断时填写" /></label>
          <div className="modal-form-actions"><button type="button" onClick={() => setContentForm(null)}>取消</button><button className="primary" disabled={busy}>{busy ? "正在保存…" : "保存素材"}</button></div>
        </form>}
      </div>}

      {adminUnlocked && tab === "subjects" && <div className="account-modal-body xhs-asset-manager">
        <div className="xhs-import-intro"><FileArrowUp weight="fill" /><div><h3>账号人物素材库</h3><p>透明 PNG / WebP，单张不超过 8MB；每个账号独立保存。</p></div></div>
        <form className="xhs-asset-upload" onSubmit={uploadAsset}>
          <div className="content-form-row"><label><span>所属账号</span><select value={assetAccountId} onChange={(event) => setAssetAccountId(event.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label><label><span>素材名称</span><input value={assetName} maxLength="40" onChange={(event) => setAssetName(event.target.value)} placeholder="例如：安妮正面半身" required /></label></div>
          <label className="xhs-import-picker"><FileArrowUp /><strong>{assetFile?.name || "选择透明人物 PNG / WebP"}</strong><span>上传前会检查透明区域；没有透明背景也允许继续</span><input type="file" accept="image/png,image/webp" onChange={(event) => inspectAssetFile(event.target.files?.[0])} /></label>
          {assetNotice && <p className="xhs-asset-notice">{assetNotice}</p>}
          <button className="xhs-import-confirm" disabled={busy || !assetFile || !assetName.trim() || !assetAccountId}>{busy ? "正在上传…" : "上传到人物库"}</button>
        </form>
        <p className="content-manager-note">当前显示“{activeAccount?.displayName}”的专属人物素材。</p>
        {!assets.length && <div className="xhs-manager-empty"><NotePencil /><strong>人物库还是空的</strong><span>也可以在编辑器里临时上传，临时素材不会写入云端。</span></div>}
        <div className="xhs-managed-assets">{assets.map((asset) => <article key={asset.id}><img src={asset.src} alt={asset.name} /><div><strong>{asset.name}</strong><small>排序 {asset.displayOrder}</small></div><div><button onClick={() => setEditingAsset({ ...asset })} aria-label="编辑人物素材"><NotePencil /></button><button className="danger" onClick={() => removeAsset(asset)} aria-label="删除人物素材"><Trash /></button></div></article>)}</div>
        {editingAsset && <form className="modal-form xhs-asset-edit" onSubmit={saveAsset}><h3>编辑人物素材</h3><label><span>素材名称</span><input value={editingAsset.name} maxLength="40" onChange={(event) => setEditingAsset({ ...editingAsset, name: event.target.value })} required /></label><label><span>排序</span><input type="number" min="0" max="10000" value={editingAsset.displayOrder} onChange={(event) => setEditingAsset({ ...editingAsset, displayOrder: Number(event.target.value) })} /></label><div className="modal-form-actions"><button type="button" onClick={() => setEditingAsset(null)}>取消</button><button className="primary" disabled={busy}>保存</button></div></form>}
      </div>}

      {adminUnlocked && tab === "import" && <div className="account-modal-body xhs-import-panel">
        <div className="xhs-import-intro"><FileArrowUp weight="fill" /><div><h3>批量导入 CSV / XLSX</h3><p>必填列：封面标题、笔记正文。单次最多 500 条。</p></div></div>
        <label className="xhs-import-owner"><span>导入为</span><select value={importOwner} onChange={(event) => changeImportOwner(event.target.value)}><option value="">公共素材</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.displayName}专属素材</option>)}</select></label>
        <label className="xhs-import-picker"><FileArrowUp /><strong>{importFileName || "选择 CSV 或 XLSX 表格"}</strong><span>选择后先预览，不会立即写入素材库</span><input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => readImportFile(event.target.files?.[0])} /></label>
        {importErrors.length > 0 && <div className="xhs-import-errors"><strong>请先修正 {importErrors.length} 个问题</strong>{importErrors.slice(0, 8).map((item) => <span key={item}>{item}</span>)}</div>}
        {importRows.length > 0 && <div className="xhs-import-preview"><div><strong>准备导入 {importRows.length} 条</strong><span>{importOwner ? "账号专属" : "公共素材"}</span></div>{importRows.slice(0, 5).map((item, index) => <article key={`${item.coverTitle}-${index}`}><b>{item.category}</b><span>{item.coverTitle}</span><small>{item.noteBody.length} 字</small></article>)}{importRows.length > 5 && <p>另外还有 {importRows.length - 5} 条</p>}</div>}
        <button className="xhs-import-confirm" disabled={busy || !importRows.length || importErrors.length > 0} onClick={confirmImport}>{busy ? "正在导入…" : `确认导入 ${importRows.length || ""} 条素材`}</button>
      </div>}

      {adminUnlocked && <footer className="account-modal-footer"><button onClick={logout}><SignOut />退出管理状态</button><span>管理状态30分钟后自动失效</span></footer>}
    </section>
  </div>;
}
