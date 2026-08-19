import { useEffect, useState } from "react";
import { LockKey, Plus, SignOut, Trash, UploadSimple, X } from "@phosphor-icons/react";

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "操作失败，请稍后重试。");
  return body;
}

export function BackgroundManagerModal({ open, backgrounds, onClose, onChanged }) {
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    apiRequest("/api/admin/session")
      .then((result) => setAdminUnlocked(Boolean(result.authenticated)))
      .catch(() => setAdminUnlocked(false));
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [file]);

  useEffect(() => {
    if (open) return;
    setPassword("");
    setName("");
    setTags("");
    setFile(null);
    setError("");
  }, [open]);

  if (!open) return null;

  async function login(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await apiRequest("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setAdminUnlocked(true); setPassword("");
    } catch (loginError) { setError(loginError.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    await apiRequest("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAdminUnlocked(false); setPassword(""); setError("");
  }

  async function addBackground(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const data = new FormData();
      data.append("name", name);
      data.append("tags", tags);
      data.append("image", file);
      await apiRequest("/api/admin/backgrounds", { method: "POST", body: data });
      setName(""); setTags(""); setFile(null);
      await onChanged();
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }

  async function removeBackground(item) {
    if (!window.confirm(`确定删除背景“${item.name}”吗？删除后无法恢复。`)) return;
    setBusy(true); setError("");
    try {
      await apiRequest(`/api/admin/backgrounds/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      await onChanged(item.id);
    } catch (deleteError) { setError(deleteError.message); }
    finally { setBusy(false); }
  }

  return <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-modal background-manager-modal" role="dialog" aria-modal="true" aria-label="编辑背景库">
      <header className="account-modal-header">
        <div><span className="account-modal-kicker">BACKGROUND LIBRARY</span><h2>编辑公共背景库</h2></div>
        <button className="modal-close" onClick={onClose} aria-label="关闭"><X weight="bold" /></button>
      </header>

      {error && <div className="modal-error">{error}</div>}

      {!adminUnlocked ? <div className="background-manager-login">
        <LockKey weight="fill" />
        <h3>输入管理密码</h3>
        <p>访客可以使用背景，只有管理员能够新增或删除公共背景。</p>
        <form className="admin-login" onSubmit={login}>
          <label><span>管理密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required /></label>
          <div><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={busy}>{busy ? "正在验证…" : "进入背景管理"}</button></div>
        </form>
      </div> : <div className="background-manager-body">
        <form className="background-add-form" onSubmit={addBackground}>
          <div className="background-add-heading"><div><h3>添加新背景</h3><p>上传后会同步到所有电脑和手机</p></div><Plus weight="bold" /></div>
          <div className="background-add-grid">
            <label className={`background-file-picker ${preview ? "has-preview" : ""}`} style={preview ? { backgroundImage: `url(${preview})` } : undefined}>
              {!preview && <><UploadSimple /><span>选择图片</span></>}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
            </label>
            <div className="background-add-fields">
              <label><span>背景名称</span><input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} placeholder="例如：城市晚霞" required /></label>
              <label><span>搜索标签（选填）</span><input value={tags} maxLength={200} onChange={(event) => setTags(event.target.value)} placeholder="城市 夜景 橙色" /></label>
              <small>支持 JPEG、PNG、WebP，单张不超过10MB</small>
            </div>
          </div>
          <button className="background-save-button" disabled={busy || !file}>{busy ? "正在上传…" : "上传并加入背景库"}</button>
        </form>

        <div className="background-library-heading"><span>{backgrounds.length} 张公共背景</span><small>至少保留一张背景</small></div>
        <div className="managed-background-grid">{backgrounds.map((item) => <article key={item.id}>
          <img src={item.src} alt={item.name} />
          <div><strong>{item.name}</strong><small>{item.tags || "未设置标签"}</small></div>
          <button className="background-delete-button" disabled={busy || backgrounds.length <= 1} onClick={() => removeBackground(item)} aria-label={`删除${item.name}`}><Trash /></button>
        </article>)}</div>
      </div>}

      {adminUnlocked && <footer className="account-modal-footer"><button onClick={logout}><SignOut />退出管理状态</button><span>管理状态30分钟后自动失效</span></footer>}
    </section>
  </div>;
}
