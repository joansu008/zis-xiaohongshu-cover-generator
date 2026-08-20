import assert from "node:assert/strict";
import test from "node:test";
import { buildXhsNote, getXhsExportOptions, normalizeHashtags, parseXhsRows } from "../src/xhs-utils.js";

test("xiaohongshu export configuration produces an exact 1080 by 1440 image", () => {
  const options = getXhsExportOptions();
  assert.equal(options.width * options.pixelRatio, 1080);
  assert.equal(options.height * options.pixelRatio, 1440);
  assert.deepEqual([options.outputWidth, options.outputHeight], [1080, 1440]);
});

test("xiaohongshu note title falls back and topics are deduplicated to three through five", () => {
  const note = buildXhsNote({ coverTitle: "把选择权拿回来", noteTitle: "", noteBody: "先行动，再调整。", category: "个人成长", keywords: "成长、成长、行动力" });
  assert.equal(note.title, "把选择权拿回来");
  assert.equal(note.body, "先行动，再调整。");
  assert.ok(note.hashtags.length >= 3 && note.hashtags.length <= 5);
  assert.equal(new Set(note.hashtags).size, note.hashtags.length);
  assert.match(note.fullText, /#成长/);
});

test("topic normalization strips existing hash marks and caps output at five", () => {
  const tags = normalizeHashtags(["#一", "二", "三", "四", "五", "六"], "生活");
  assert.deepEqual(tags, ["#一", "#二", "#三", "#四", "#五"]);
});

test("spreadsheet parser accepts Chinese headers and reports missing and duplicate rows", () => {
  const result = parseXhsRows([
    { 分类: "成长", 封面标题: "标题一", 笔记正文: "正文一", "关键词/话题": "成长、行动" },
    { 分类: "成长", 封面标题: "标题一", 笔记正文: "正文二" },
    { 分类: "成长", 封面标题: "缺正文" },
  ], "annie-default");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].ownerAccountId, "annie-default");
  assert.deepEqual(result.items[0].keywords, ["成长", "行动"]);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0], /重复/);
  assert.match(result.errors[1], /笔记正文/);
});

test("spreadsheet parser rejects imports over five hundred rows", () => {
  const rows = Array.from({ length: 501 }, (_, index) => ({ 封面标题: `标题${index}`, 笔记正文: `正文${index}` }));
  const result = parseXhsRows(rows);
  assert.equal(result.items.length, 500);
  assert.match(result.errors[0], /最多导入 500 条/);
});
