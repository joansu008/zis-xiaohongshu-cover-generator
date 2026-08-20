import {
  AlignCenterHorizontal, AlignLeft, ArrowDown, ArrowUp, Eye, EyeSlash,
  ImageSquare, Plus, SlidersHorizontal, Trash, UploadSimple,
} from "@phosphor-icons/react";
import { XHS_DECOR_CATALOG, XHS_FONT_OPTIONS } from "./xhs-layer-templates.js";

function Range({ label, value, min, max, step = 1, suffix = "", onChange }) {
  return <label className="xhs-range"><span>{label}<b>{Math.round(value * 100) / 100}{suffix}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function ColorControl({ label, value, onChange, allowTransparent = false }) {
  const fallback = /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#111111";
  return <label className="xhs-layer-color"><span>{label}</span><input type="color" value={fallback} onChange={(event) => onChange(event.target.value)} />{allowTransparent && <button type="button" className={value === "transparent" ? "active" : ""} onClick={() => onChange("transparent")}>透明</button>}</label>;
}

export function XhsLayerEditor({
  layers, selectedLayerId, onSelectLayer, onUpdateLayer, onResetLayer, onResetTemplate,
  onMoveLayer, onRemoveLayer, onAddDecor, onUploadDecor, subjectAssets, subjectSource,
  onSelectSubject, onLocalSubject, onOpenSubjectManager, subjectNotice,
}) {
  const layer = layers.find((item) => item.id === selectedLayerId) || layers[0];
  if (!layer) return <div className="xhs-layer-editor xhs-layer-editor-empty"><strong>当前模板没有可编辑元素</strong><span>可以恢复模板默认元素后继续编辑。</span><button onClick={onResetTemplate}>恢复整套模板</button></div>;
  const isText = layer.type === "text";
  const isAuthor = layer.type === "author";
  const isImage = ["subject", "photo", "custom-image"].includes(layer.type);
  const isDecor = layer.type === "decor";
  return <div className="xhs-layer-editor xhs-layer-editor-generic">
    <div className="xhs-layer-heading"><span>正在编辑：<b>{layer.name}</b></span><button onClick={onResetTemplate}>整套重置</button></div>
    <div className="xhs-layer-tabs">{layers.map((item) => <button key={item.id} className={`${selectedLayerId === item.id ? "active" : ""} ${!item.visible ? "muted" : ""}`} onClick={() => onSelectLayer(item.id)}>{item.name}</button>)}</div>

    {layers.some((item) => item.type === "subject") && <div className="xhs-subject-picker">
      <div><strong>人物素材</strong><button type="button" onClick={onOpenSubjectManager}>管理云端人物</button></div>
      <div className="xhs-subject-grid"><button className={!subjectSource ? "active empty" : "empty"} onClick={() => onSelectSubject("")}><ImageSquare />不使用人物</button>{subjectAssets.map((item) => <button key={item.id} className={subjectSource === item.src ? "active" : ""} onClick={() => onSelectSubject(item.src)}><img src={item.src} alt={item.name} /><span>{item.name}</span></button>)}</div>
      <label className="xhs-local-subject"><UploadSimple />临时上传透明人物 PNG / WebP<input type="file" accept="image/png,image/webp" onChange={(event) => onLocalSubject(event.target.files?.[0])} /></label>
      {subjectNotice && <p className="xhs-subject-notice">{subjectNotice}</p>}
    </div>}

    <div className="xhs-layer-actions"><button onClick={() => onUpdateLayer("visible", !layer.visible)}>{layer.visible ? <Eye /> : <EyeSlash />}{layer.visible ? "隐藏" : "显示"}</button><button onClick={() => onMoveLayer(-1)}><ArrowDown />后移</button><button onClick={() => onMoveLayer(1)}><ArrowUp />前移</button><button className="danger" onClick={onRemoveLayer}><Trash />删除元素</button></div>

    <div className="xhs-control-subhead">位置与尺寸</div>
    <Range label="水平位置" value={layer.x} min={0} max={540} onChange={(value) => onUpdateLayer("x", value)} />
    <Range label="垂直位置" value={layer.y} min={0} max={720} onChange={(value) => onUpdateLayer("y", value)} />
    <Range label="组件宽度" value={layer.width} min={40} max={540} suffix="px" onChange={(value) => onUpdateLayer("width", value)} />
    {!isText && <Range label="组件高度" value={layer.height} min={30} max={720} suffix="px" onChange={(value) => onUpdateLayer("height", value)} />}
    <Range label="组件大小" value={layer.scale * 100} min={30} max={250} suffix="%" onChange={(value) => onUpdateLayer("scale", value / 100)} />
    <Range label="旋转" value={layer.rotation} min={-180} max={180} suffix="°" onChange={(value) => onUpdateLayer("rotation", value)} />
    <Range label="透明度" value={layer.opacity * 100} min={0} max={100} suffix="%" onChange={(value) => onUpdateLayer("opacity", value / 100)} />

    {isText && <>
      <div className="xhs-control-subhead">字体与排版</div>
      <label className="xhs-layer-copy"><span>组件文字 <button type="button" onClick={() => onUpdateLayer("overrideText", undefined)}>跟随封面字段</button></span><textarea rows="2" value={layer.overrideText ?? ""} placeholder="输入后只覆盖当前组件" onChange={(event) => onUpdateLayer("overrideText", event.target.value)} /></label>
      <div className="xhs-font-picker"><span>字体</span><div>{Object.entries(XHS_FONT_OPTIONS).map(([id, item]) => <button key={id} className={layer.font === id ? "active" : ""} style={{ fontFamily: item.css }} onClick={() => onUpdateLayer("font", id)}>{item.name}</button>)}</div></div>
      <div className="xhs-style-row"><span>文字对齐</span><div><button className={layer.align === "left" ? "active" : ""} onClick={() => onUpdateLayer("align", "left")}><AlignLeft />左对齐</button><button className={layer.align === "center" ? "active" : ""} onClick={() => onUpdateLayer("align", "center")}><AlignCenterHorizontal />居中</button></div></div>
      <label className="xhs-auto-fit"><input type="checkbox" checked={layer.autoFit} onChange={(event) => onUpdateLayer("autoFit", event.target.checked)} /><span><strong>自动适配字号</strong><small>只缩小、不截断；关闭后完全手动控制</small></span></label>
      <Range label="字号" value={layer.fontSize} min={8} max={96} suffix="px" onChange={(value) => onUpdateLayer("fontSize", value)} />
      <Range label="字重" value={layer.fontWeight} min={300} max={950} step={50} onChange={(value) => onUpdateLayer("fontWeight", value)} />
      <Range label="行距" value={layer.lineHeight} min={.75} max={2} step={.05} onChange={(value) => onUpdateLayer("lineHeight", value)} />
      <Range label="字距" value={layer.letterSpacing} min={-8} max={12} suffix="px" onChange={(value) => onUpdateLayer("letterSpacing", value)} />
      <div className="xhs-color-grid"><ColorControl label="文字颜色" value={layer.color} onChange={(value) => onUpdateLayer("color", value)} /><ColorControl label="描边颜色" value={layer.strokeColor} allowTransparent onChange={(value) => onUpdateLayer("strokeColor", value)} /><ColorControl label="阴影颜色" value={layer.shadowColor} allowTransparent onChange={(value) => onUpdateLayer("shadowColor", value)} /><ColorControl label="文字底色" value={layer.backgroundColor} allowTransparent onChange={(value) => onUpdateLayer("backgroundColor", value)} /></div>
      <Range label="描边粗细" value={layer.strokeWidth} min={0} max={12} suffix="px" onChange={(value) => onUpdateLayer("strokeWidth", value)} />
      <Range label="阴影横向" value={layer.shadowX} min={-12} max={12} suffix="px" onChange={(value) => onUpdateLayer("shadowX", value)} />
      <Range label="阴影纵向" value={layer.shadowY} min={-12} max={12} suffix="px" onChange={(value) => onUpdateLayer("shadowY", value)} />
      <Range label="底色圆角" value={layer.borderRadius} min={0} max={60} suffix="px" onChange={(value) => onUpdateLayer("borderRadius", value)} />
      <Range label="底色留白" value={layer.padding} min={0} max={30} suffix="px" onChange={(value) => onUpdateLayer("padding", value)} />
    </>}

    {isAuthor && <>
      <div className="xhs-control-subhead">署名字体</div>
      <div className="xhs-font-picker"><span>字体</span><div>{Object.entries(XHS_FONT_OPTIONS).map(([id, item]) => <button key={id} className={layer.font === id ? "active" : ""} style={{ fontFamily: item.css }} onClick={() => onUpdateLayer("font", id)}>{item.name}</button>)}</div></div>
      <Range label="字号" value={layer.fontSize} min={7} max={36} suffix="px" onChange={(value) => onUpdateLayer("fontSize", value)} />
      <div className="xhs-color-grid"><ColorControl label="文字颜色" value={layer.color} onChange={(value) => onUpdateLayer("color", value)} /><ColorControl label="署名底色" value={layer.backgroundColor} allowTransparent onChange={(value) => onUpdateLayer("backgroundColor", value)} /></div>
      <Range label="底色圆角" value={layer.borderRadius} min={0} max={60} suffix="px" onChange={(value) => onUpdateLayer("borderRadius", value)} />
    </>}

    {isImage && <>
      <div className="xhs-control-subhead">图片效果</div>
      {layer.type === "subject" && <Range label="人物白描边" value={layer.whiteOutline} min={0} max={14} suffix="px" onChange={(value) => onUpdateLayer("whiteOutline", value)} />}
      <Range label="裁切横向焦点" value={layer.objectPositionX || 50} min={0} max={100} suffix="%" onChange={(value) => onUpdateLayer("objectPositionX", value)} />
      <Range label="裁切纵向焦点" value={layer.objectPositionY || 50} min={0} max={100} suffix="%" onChange={(value) => onUpdateLayer("objectPositionY", value)} />
      <Range label="亮度" value={layer.brightness || 100} min={20} max={180} suffix="%" onChange={(value) => onUpdateLayer("brightness", value)} />
      <Range label="饱和度" value={layer.saturation || 100} min={0} max={180} suffix="%" onChange={(value) => onUpdateLayer("saturation", value)} />
      <Range label="模糊" value={layer.blur || 0} min={0} max={12} suffix="px" onChange={(value) => onUpdateLayer("blur", value)} />
      {layer.type === "photo" && <Range label="图片圆角" value={layer.borderRadius || 0} min={0} max={60} suffix="px" onChange={(value) => onUpdateLayer("borderRadius", value)} />}
    </>}

    {isDecor && <><div className="xhs-control-subhead">装饰颜色</div><div className="xhs-color-grid"><ColorControl label="填充颜色" value={layer.color} onChange={(value) => onUpdateLayer("color", value)} /><ColorControl label="线条颜色" value={layer.strokeColor} onChange={(value) => onUpdateLayer("strokeColor", value)} /></div><Range label="线条粗细" value={layer.strokeWidth} min={1} max={14} suffix="px" onChange={(value) => onUpdateLayer("strokeWidth", value)} /></>}

    <div className="xhs-control-subhead">添加装饰</div>
    <div className="xhs-decor-picker">{XHS_DECOR_CATALOG.map((item) => <button key={item.id} onClick={() => onAddDecor(item.id)}><Plus />{item.name}</button>)}</div>
    <label className="xhs-upload-decor"><UploadSimple />上传 PNG / WebP / SVG 装饰<input type="file" accept="image/png,image/webp,image/svg+xml,.svg" onChange={(event) => onUploadDecor(event.target.files?.[0])} /></label>
    <div className="xhs-drag-help"><SlidersHorizontal /><span>画布中直接拖动；右下角手柄缩放</span><button onClick={onResetLayer}>重置此组件</button></div>
  </div>;
}
