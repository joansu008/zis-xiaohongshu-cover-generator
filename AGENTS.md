# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable product decisions

- Brand the app as “zis图文内容卡片生成器” with the compact mark “ZIS / CONTENT CARD”; seed “安妮 / @kiki89699” with `public/annie-avatar.jpg` as the default account while allowing the active exported identity to come from the cloud account library.
- Use only the user-provided 七月安妮公众号 archive as the content source; do not ship the original TianCe tweet or AI libraries.
- Keep extracted cards editable and label claims that require verification before publication.
- Export cards in a complete X-post structure with timestamp, view count, and the reply/repost/like/bookmark/share row. Let operators randomize a coherent set of illustrative interaction figures using realistic ratios.
- Randomize the post date, time, and complete interaction dataset whenever a new source item is selected, when the random-content action is used, and on a fresh page load.
- Put account switching in the top navigation. Public visitors may switch accounts and use content without signing in; password-protected managers may add, edit, and delete cloud-synced accounts and public/account-specific content.
- Store structured account/content data in Sites D1 and uploaded account avatars in Sites R2. Seed the original 156 七月安妮 entries as public content available to every account.
- Keep the shared background library cloud-backed and admin-managed. The random-background preference is device-local, defaults on, and changes the background when content or account selection changes.

- Keep the primary workflow extremely simple: select a tweet, select a publishing style/background, and download a finished image.
- Keep two output modes: the original standalone tweet card and a Douyin-ready 3:4 portrait image combining a background with the tweet card.
- Backgrounds must support built-in presets, local image upload, and a pasted online image URL. The preview should match the downloaded PNG.
- The poster editor must let mouse and touch users drag the tweet card, scale it, and reset it to a centered default.
- Optimize the controls and copy for matrix-account operators who should not need design or editing experience.
- Treat a finished post as two deliverables: a downloadable image and a one-line Douyin description with exactly three relevant hashtags that can be copied directly.
- Let operators switch the exported card identity by uploading an avatar and editing the nickname and account handle; keep a one-click reset to the default 安妮 / @kiki89699 identity.

- Provide “zis小红书封面生成器” as an independent `/xiaohongshu` entry that shares the existing cloud accounts and background library without changing the original card-generator route.
- Keep the Xiaohongshu content library separate and empty by default. Managers may add, edit, delete, or import up to 500 CSV/XLSX rows; do not seed it from the existing 156公众号卡片 unless the user later supplies or approves new source material.
- Export Xiaohongshu covers as 1080×1440 PNGs. Preserve the four base title posters and three summary cards, and add six portrait-style title posters—“奶油知识课、黑板课堂、奶油生活感、蓝白效率卡、漫画情绪卡、酒红杂志卡”—for ten title templates total. Preview and export must always share the same rendering node.
- Include a “高亮口播” title-poster style for portrait/talking-head backgrounds: stacked white and yellow topic labels, a bold black headline with neon-green outline, and a pink highlighted summary phrase, following the user-provided Xiaohongshu profile reference without embedding that screenshot in the product.
- Use one reusable preset-based layer editor for “高亮口播” and all six portrait styles. Text, subject, photo, author, shape, SVG decoration, and temporary image layers keep independent position, size, scale, rotation, stacking, opacity, and visibility; expose relevant font, stroke, shadow, background, crop, image-filter, outline, reset, and direct mouse/touch controls without becoming a fully free canvas. Keep each template's session edits independent.
- Let operators delete any selected layer, including preset text, subject, photo, author, and decoration layers—not only newly added decorations. If all layers are removed, keep a visible action that restores the complete template defaults.
- Bind cover fields and keywords to template layers by default while allowing static English, numbering, and sticker text to be overridden per layer. Auto-fit may shrink text but must never truncate it silently; show an overflow warning after the configured minimum font size is reached.
- Maintain account-specific Xiaohongshu subject libraries in D1 and the existing R2 binding. Admins may upload, rename, order, and delete signature-validated PNG/WebP files up to 8MB; public users may use their active account's cloud subjects or a temporary local subject. Do not add browser cutout or any external cutout service; warn when a subject has no transparent pixels because white outlining will become rectangular.
- Provide built-in editable arrow, sparkle, hand-drawn circle, underline, tape, chalk line, question mark, and number-badge SVG decorations. Allow temporary sanitized PNG/WebP/SVG decorations, but do not bundle screenshots, people, logos, text, or other assets from the reference video.
- Generate an editable Xiaohongshu title, body, and 3–5 deduplicated topics through deterministic templates only; do not add external AI rewriting or direct platform publishing in the first version.
