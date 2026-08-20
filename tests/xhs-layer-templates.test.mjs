import assert from "node:assert/strict";
import test from "node:test";
import {
  XHS_LAYER_TEMPLATE_IDS,
  XHS_PERSON_TEMPLATE_IDS,
  createAllTemplateLayerStates,
  createDecorLayer,
  createTemplateLayerState,
  fittedFontSize,
  layerMayOverflow,
  resolveLayerText,
} from "../src/xhs-layer-templates.js";

const fields = { category: "成长", coverTitle: "把选择权拿回自己手里", coverSubtitle: "先行动，再调整", excerpt: "摘要", keywords: "行动力、选择、复盘" };
const account = { displayName: "安妮", handle: "@kiki89699" };

test("all seven layer templates are independently cloned and six new portrait styles exist", () => {
  assert.equal(XHS_LAYER_TEMPLATE_IDS.size, 7);
  assert.equal(XHS_PERSON_TEMPLATE_IDS.size, 4);
  for (const id of ["cream-tutorial", "chalkboard-class", "soft-lifestyle", "blue-sop", "manga-mood", "burgundy-editorial"]) {
    assert.ok(XHS_LAYER_TEMPLATE_IDS.has(id));
    assert.ok(createTemplateLayerState(id).length >= 4);
  }
  const states = createAllTemplateLayerStates();
  states["cream-tutorial"][0].x = 1;
  assert.notEqual(states["chalkboard-class"][0].x, 1);
  assert.notEqual(createTemplateLayerState("cream-tutorial")[0].x, 1);
});

test("keyword stickers bind to deduplicated-looking editable keyword positions", () => {
  const layers = createTemplateLayerState("cream-tutorial");
  assert.equal(resolveLayerText(layers.find((item) => item.id === "keyword-1"), fields, account), "行动力");
  assert.equal(resolveLayerText(layers.find((item) => item.id === "keyword-2"), fields, account), "选择");
  assert.equal(resolveLayerText(layers.find((item) => item.id === "keyword-3"), fields, account), "复盘");
  const overridden = { ...layers.find((item) => item.id === "keyword-1"), overrideText: "我的贴纸" };
  assert.equal(resolveLayerText(overridden, fields, account), "我的贴纸");
});

test("automatic fitting only shrinks and explicitly detects text that still overflows", () => {
  const layer = { ...createTemplateLayerState("cream-tutorial").find((item) => item.id === "title"), width: 80, maxLines: 1, minFontSize: 20 };
  const longText = "这是一段非常非常长而且必须显示溢出警告不能静默截断的中文封面标题";
  const size = fittedFontSize(layer, longText);
  assert.ok(size <= layer.fontSize);
  assert.ok(size >= layer.minFontSize);
  assert.equal(layerMayOverflow(layer, longText), true);
});

test("uploaded decorations are removable custom layers with full transform state", () => {
  const layer = createDecorLayer("custom", 3, "data:image/png;base64,abc");
  assert.equal(layer.type, "custom-image");
  assert.match(layer.id, /^custom-/);
  assert.equal(layer.rotation, 0);
  assert.equal(layer.opacity, 1);
  assert.equal(layer.visible, true);
});
