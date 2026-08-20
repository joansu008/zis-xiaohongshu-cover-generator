import { XHS_FONT_OPTIONS, fittedFontSize, resolveLayerText } from "./xhs-layer-templates.js";

function whiteOutlineFilter(size) {
  if (!size) return "none";
  const value = `${size}px`;
  return [
    `drop-shadow(${value} 0 0 #fff)`, `drop-shadow(-${value} 0 0 #fff)`,
    `drop-shadow(0 ${value} 0 #fff)`, `drop-shadow(0 -${value} 0 #fff)`,
  ].join(" ");
}

function DecorGraphic({ layer }) {
  const common = { fill: "none", stroke: layer.strokeColor || layer.color, strokeWidth: Math.max(2, layer.strokeWidth || 4), strokeLinecap: "round", strokeLinejoin: "round" };
  if (layer.decorKind === "arrow") return <svg viewBox="0 0 100 100"><path {...common} d="M12 78 C32 61 53 42 82 28 M59 17 L84 27 L75 53" /></svg>;
  if (layer.decorKind === "sparkle") return <svg viewBox="0 0 100 100"><path {...common} d="M50 5 C53 34 66 47 95 50 C66 53 53 66 50 95 C47 66 34 53 5 50 C34 47 47 34 50 5Z" fill={layer.color} /></svg>;
  if (layer.decorKind === "circle") return <svg viewBox="0 0 100 70"><path {...common} d="M8 39 C10 10 80 4 94 29 C108 54 48 71 17 59 C-2 51 2 29 21 15" /></svg>;
  if (layer.decorKind === "underline") return <svg viewBox="0 0 120 30"><path {...common} d="M5 18 C35 8 74 24 115 12 M12 24 C43 17 79 28 108 20" /></svg>;
  if (layer.decorKind === "tape") return <svg viewBox="0 0 120 50"><path d="M6 7 L114 3 L108 44 L12 47Z" fill={layer.color} opacity=".8" /><path {...common} d="M6 7 L114 3 L108 44 L12 47Z" /></svg>;
  if (layer.decorKind === "chalk") return <svg viewBox="0 0 120 150"><path {...common} d="M16 21 C58 2 100 26 79 55 C60 80 23 54 31 93 C39 126 92 104 105 133 M17 128 L45 119 M88 18 L103 33 M14 67 L2 72" /><circle cx="58" cy="75" r="8" fill={layer.color} opacity=".7" /></svg>;
  if (layer.decorKind === "question") return <svg viewBox="0 0 80 110"><path {...common} d="M15 27 C20 2 68 1 70 30 C71 54 39 55 37 76" /><circle cx="36" cy="97" r="5" fill={layer.color} stroke="none" /></svg>;
  return <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill={layer.color} stroke={layer.strokeColor} strokeWidth={Math.max(2, layer.strokeWidth || 4)} /><path d="M22 50 H78" stroke={layer.strokeColor} strokeWidth="3" opacity=".35" /></svg>;
}

export function XhsLayerCanvas({ layers, fields, account, background, subjectSource, selectedLayerId, interactive, onLayerPointerDown, onLayerPointerMove, onLayerPointerUp }) {
  return <div className="xhs-generic-layers">
    {[...layers].sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
      if (!layer.visible) return null;
      const content = resolveLayerText(layer, fields, account);
      const baseStyle = {
        left: `${layer.x}px`, top: `${layer.y}px`, width: `${layer.width}px`, height: layer.type === "text" ? "auto" : `${layer.height}px`,
        opacity: layer.opacity, zIndex: layer.zIndex,
        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`,
      };
      const layerProps = {
        className: `xhs-generic-layer type-${layer.type} ${interactive ? "interactive" : ""} ${interactive && selectedLayerId === layer.id ? "selected" : ""}`,
        style: baseStyle,
        "data-layer-id": layer.id,
        onPointerDown: interactive ? (event) => onLayerPointerDown(event, layer.id, "move") : undefined,
        onPointerMove: interactive ? onLayerPointerMove : undefined,
        onPointerUp: interactive ? onLayerPointerUp : undefined,
        onPointerCancel: interactive ? onLayerPointerUp : undefined,
      };
      let child = null;
      if (layer.type === "text") {
        const fontSize = fittedFontSize(layer, content);
        child = <div className="xhs-layer-text" style={{
          fontFamily: XHS_FONT_OPTIONS[layer.font]?.css || XHS_FONT_OPTIONS.bold.css,
          fontSize: `${fontSize}px`, fontWeight: layer.fontWeight, lineHeight: layer.lineHeight,
          letterSpacing: `${layer.letterSpacing}px`, textAlign: layer.align, color: layer.color,
          WebkitTextStroke: `${layer.strokeWidth}px ${layer.strokeColor}`, paintOrder: "stroke fill",
          textShadow: `${layer.shadowX}px ${layer.shadowY}px 0 ${layer.shadowColor}`,
          background: layer.backgroundColor, borderRadius: `${layer.borderRadius}px`, padding: `${layer.padding}px`,
        }}>{content}</div>;
      } else if (layer.type === "subject") {
        child = subjectSource ? <img src={subjectSource} crossOrigin="anonymous" alt="" style={{
          objectPosition: `${layer.objectPositionX}% ${layer.objectPositionY}%`,
          filter: `${whiteOutlineFilter(layer.whiteOutline)} brightness(${layer.brightness}%) blur(${layer.blur}px) saturate(${layer.saturation}%)`,
        }} /> : null;
      } else if (layer.type === "photo") {
        child = <img src={background} crossOrigin="anonymous" alt="" style={{
          objectPosition: `${layer.objectPositionX}% ${layer.objectPositionY}%`, borderRadius: `${layer.borderRadius}px`,
          filter: `brightness(${layer.brightness}%) blur(${layer.blur}px) saturate(${layer.saturation}%)`,
        }} />;
      } else if (layer.type === "author") {
        child = <div className="xhs-layer-author" style={{
          fontFamily: XHS_FONT_OPTIONS[layer.font]?.css || XHS_FONT_OPTIONS.bold.css,
          fontSize: `${layer.fontSize}px`, color: layer.color, background: layer.backgroundColor,
          borderRadius: `${layer.borderRadius}px`,
        }}><img src={account.avatarUrl} alt="" /><strong>{account.displayName || "未命名"}</strong><span>{account.handle}</span></div>;
      } else if (layer.type === "custom-image") {
        child = <img src={layer.src} alt="" />;
      } else {
        child = <DecorGraphic layer={layer} />;
      }
      return <div key={layer.id} {...layerProps}>{child}{interactive && selectedLayerId === layer.id && <button className="xhs-layer-resize" aria-label="缩放当前组件" onPointerDown={(event) => onLayerPointerDown(event, layer.id, "resize")} />}</div>;
    })}
  </div>;
}
