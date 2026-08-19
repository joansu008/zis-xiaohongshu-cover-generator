import { useEffect, useMemo, useState } from "react";
import {
  Check, LockKey, NotePencil, PencilSimple, Plus, SignOut, Trash, UploadSimple, X,
} from "@phosphor-icons/react";

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "操作失败，请稍后重试。");
  return body;
}

const emptyAccount = { displayName: "", handle: "@", avatarUrl: "/annie-avatar.jpg" };
const emptyContent = {
  title: "", draft: "", insight: "", category: "未分类", ownerAccountId: "",
  productFit: "", requiresVerification: false,
};

export function AccountManagerModal({
  open, accounts, activeAccount, content, sharedContentCount, onClose, onSelect,
  onAccountsChanged, onContentChanged,
}) {
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("accounts");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accountForm, setAccountForm] = useState(null);
  const [accountAvatar, setAccountAvatar] = useState(null);
  const [accountAvatarPreview, setAccountAvatarPreview] = useState("");
  const [deleteAccountTarget, setDeleteAccountTarget] = useState(null);
  const [contentForm, setContentForm] = useState(null);
  const [contentQuery, setContentQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    apiRequest("/api/admin/session").then((result) => setAdminUnlocked(Boolean(result.authenticated))).catch(() => setAdminUnlocked(false));
  }, [open]);

  useEffect(() => {
    if (!accountAvatar) {
      setAccountAvatarPreview("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(accountAvatar);
    setAccountAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [accountAvatar]);

  useEffect(() => {
    if (!open) {
      setShowLogin(false);
      setPassword("");
      setAccountForm(null);
      setDeleteAccountTarget(null);
      setContentForm(null);
      setError("");
    }
  }, [open]);

  const visibleContent = useMemo(() => {
    const needle = contentQuery.trim().toLowerCase();
    return content.filter((item) => !needle || `${item.title} ${item.draft} ${item.category}`.toLowerCase().includes(needle));
  }, [content, contentQuery]);

  if (!open) return null;

  async function login(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await apiRequest("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
      });
      setAdminUnlocked(true); setShowLogin(false); setPassword("");
    } catch (loginError) { setError(loginError.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    await apiRequest("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAdminUnlocked(false); setTab("accounts"); setAccountForm(null); setContentForm(null);
  }

  async function saveAccount(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      let avatarUrl = accountForm.avatarUrl || "/annie-avatar.jpg";
      if (accountAvatar) {
        const data = new FormData(); data.append("avatar", accountAvatar);
        const uploaded = await apiRequest("/api/admin/avatar", { method: "POST", body: data });
        avatarUrl = uploaded.avatarUrl;
      }
      const editing = Boolean(accountForm.id);
      const result = await apiRequest(editing ? `/api/admin/accounts/${encodeURIComponent(accountForm.id)}` : "/api/admin/accounts", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: accountForm.displayName, handle: accountForm.handle, avatarUrl }),
      });
      setAccountForm(null); setAccountAvatar(null);
      await onAccountsChanged(result.account?.id || accountForm.id || null);
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }

  async function confirmDeleteAccount() {
    if (!deleteAccountTarget) return;
    setBusy(true); setError("");
    try {
      await apiRequest(`/api/admin/accounts/${encodeURIComponent(deleteAccountTarget.id)}`, { method: "DELETE" });
      setDeleteAccountTarget(null);
      await onAccountsChanged(null, deleteAccountTarget.id);
    } catch (deleteError) { setError(deleteError.message); }
    finally { setBusy(false); }
  }

  function openContentForm(item = null) {
    setContentForm(item ? {
      ...item,
      ownerAccountId: item.ownerAccountId || "",
      productFit: (item.productFit || []).join("、"),
    } : { ...emptyContent, ownerAccountId: activeAccount?.id || "" });
    setError("");
  }

  async function saveContent(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const editing = Boolean(contentForm.id);
      const payload = {
        ...contentForm,
        ownerAccountId: contentForm.ownerAccountId || null,
        productFit: String(contentForm.productFit || "").split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
      };
      await apiRequest(editing ? `/api/admin/content/${encodeURIComponent(contentForm.id)}` : "/api/admin/content", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setContentForm(null);
      await onContentChanged();
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }

  async function removeContent(item) {
    if (!window.confirm(`确定删除“${item.title}”吗？删除后无法恢复。`)) return;
    setBusy(true); setError("");
    try {
      await apiRequest(`/api/admin/content/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      await onContentChanged();
    } catch (deleteError) { setError(deleteError.message); }
    finally { setBusy(false); }
  }

  return <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-modal" role="dialog" aria-modal="true" aria-label="切换和管理账号">
      <header className="account-modal-header">
        <div><span className="account-modal-kicker">ACCOUNT LIBRARY</span><h2>{adminUnlocked ? "账号与内容管理" : "选择发布账号"}</h2></div>
        <button className="modal-close" onClick={onClose} aria-label="关闭"><X weight="bold" /></button>
      </header>

      {adminUnlocked && <div className="account-modal-tabs">
        <button className={tab === "accounts" ? "active" : ""} onClick={() => { setTab("accounts"); setContentForm(null); }}>账号管理</button>
        <button className={tab === "content" ? "active" : ""} onClick={() => { setTab("content"); setAccountForm(null); }}>内容管理</button>
      </div>}

      {error && <div className="modal-error">{error}</div>}

      {tab === "accounts" && <div className="account-modal-body">
        <div className="account-list-heading"><span>{accounts.length} 个账号 · {sharedContentCount} 条公共内容</span>{adminUnlocked && !accountForm && <button className="modal-primary-small" onClick={() => { setAccountForm({ ...emptyAccount }); setAccountAvatar(null); }}><Plus />添加账号</button>}</div>
        {!accountForm && <div className="account-choice-list">{accounts.map((item) => <article key={item.id} className={`account-choice ${item.id === activeAccount?.id ? "active" : ""}`}>
          <button className="account-choice-main" onClick={() => onSelect(item)}>
            <img src={item.avatarUrl} alt="" /><span><strong>{item.displayName}</strong><small>{item.handle} · {item.contentCount} 条可用内容</small></span>{item.id === activeAccount?.id && <Check weight="bold" />}
          </button>
          {adminUnlocked && <div className="account-admin-actions"><button onClick={() => { setAccountForm({ ...item }); setAccountAvatar(null); }} aria-label={`编辑${item.displayName}`}><PencilSimple /></button><button className="danger" onClick={() => setDeleteAccountTarget(item)} aria-label={`删除${item.displayName}`}><Trash /></button></div>}
        </article>)}</div>}

        {accountForm && <form className="modal-form" onSubmit={saveAccount}>
          <h3>{accountForm.id ? "编辑账号" : "添加新账号"}</h3>
          <div className="account-form-avatar"><img src={accountAvatarPreview || accountForm.avatarUrl} alt="头像预览" /><label><UploadSimple />选择头像<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAccountAvatar(event.target.files?.[0] || null)} /></label><small>JPEG、PNG 或 WebP，不超过5MB</small></div>
          <label><span>昵称</span><input value={accountForm.displayName} maxLength={20} onChange={(event) => setAccountForm({ ...accountForm, displayName: event.target.value })} required /></label>
          <label><span>账号</span><input value={accountForm.handle} maxLength={32} onChange={(event) => setAccountForm({ ...accountForm, handle: event.target.value })} placeholder="@账号" required /></label>
          <div className="modal-form-actions"><button type="button" onClick={() => { setAccountForm(null); setAccountAvatar(null); }}>取消</button><button className="primary" disabled={busy}>{busy ? "正在保存…" : "保存账号"}</button></div>
        </form>}

        {!adminUnlocked && !showLogin && <button className="admin-entry" onClick={() => setShowLogin(true)}><LockKey />管理账号和内容</button>}
        {!adminUnlocked && showLogin && <form className="admin-login" onSubmit={login}><label><span>管理密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required /></label><div><button type="button" onClick={() => { setShowLogin(false); setError(""); }}>取消</button><button className="primary" disabled={busy}>{busy ? "正在验证…" : "进入管理"}</button></div></form>}
      </div>}

      {adminUnlocked && tab === "content" && <div className="account-modal-body content-manager">
        {!contentForm && <><div className="content-manager-tools"><input value={contentQuery} onChange={(event) => setContentQuery(event.target.value)} placeholder="搜索当前账号可用内容" /><button className="modal-primary-small" onClick={() => openContentForm()}><Plus />添加内容</button></div>
          <p className="content-manager-note">当前显示“{activeAccount?.displayName}”可用的公共内容与专属内容。</p>
          <div className="managed-content-list">{visibleContent.map((item) => <article key={item.id}><div><span className={item.scope === "public" ? "scope-public" : "scope-account"}>{item.scope === "public" ? "公共" : item.ownerDisplayName || activeAccount?.displayName}</span><strong>{item.title}</strong><small>{item.category} · {item.draft.length} 字</small></div><div><button onClick={() => openContentForm(item)} aria-label="编辑内容"><NotePencil /></button><button className="danger" onClick={() => removeContent(item)} aria-label="删除内容"><Trash /></button></div></article>)}</div></>}
        {contentForm && <form className="modal-form content-form" onSubmit={saveContent}>
          <h3>{contentForm.id ? "编辑内容" : "添加内容"}</h3>
          <label><span>归属</span><select value={contentForm.ownerAccountId} onChange={(event) => setContentForm({ ...contentForm, ownerAccountId: event.target.value })}><option value="">公共内容</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.displayName}专属</option>)}</select></label>
          <label><span>标题</span><input value={contentForm.title} maxLength={120} onChange={(event) => setContentForm({ ...contentForm, title: event.target.value })} required /></label>
          <label><span>卡片正文</span><textarea rows={9} value={contentForm.draft} maxLength={6000} onChange={(event) => setContentForm({ ...contentForm, draft: event.target.value })} required /></label>
          <div className="content-form-row"><label><span>分类</span><input value={contentForm.category} maxLength={40} onChange={(event) => setContentForm({ ...contentForm, category: event.target.value })} /></label><label><span>标签（顿号分隔）</span><input value={contentForm.productFit} onChange={(event) => setContentForm({ ...contentForm, productFit: event.target.value })} /></label></div>
          <label><span>列表摘要</span><textarea rows={3} value={contentForm.insight} maxLength={500} onChange={(event) => setContentForm({ ...contentForm, insight: event.target.value })} placeholder="留空会自动截取正文" /></label>
          <label className="modal-checkbox"><input type="checkbox" checked={Boolean(contentForm.requiresVerification)} onChange={(event) => setContentForm({ ...contentForm, requiresVerification: event.target.checked })} />发布前需要重点核实</label>
          <div className="modal-form-actions"><button type="button" onClick={() => setContentForm(null)}>取消</button><button className="primary" disabled={busy}>{busy ? "正在保存…" : "保存内容"}</button></div>
        </form>}
      </div>}

      {adminUnlocked && <footer className="account-modal-footer"><button onClick={logout}><SignOut />退出管理状态</button><span>管理状态30分钟后自动失效</span></footer>}

      {deleteAccountTarget && <div className="delete-confirm-layer"><div><Trash /><h3>删除“{deleteAccountTarget.displayName}”？</h3><p>同时会永久删除该账号的 <b>{deleteAccountTarget.exclusiveContentCount}</b> 条专属内容，公共内容不受影响。</p><div><button onClick={() => setDeleteAccountTarget(null)}>取消</button><button className="danger-confirm" disabled={busy} onClick={confirmDeleteAccount}>{busy ? "正在删除…" : "确认删除账号"}</button></div></div></div>}
    </section>
  </div>;
}
