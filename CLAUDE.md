# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firefly is a feature-rich static blog theme built on **Astro 6** with **Svelte 5** for interactive components. It's a fork of [Fuwari](https://github.com/saicaca/fuwari) extended with extensive features. Primary language is Chinese (Simplified) with i18n for en, zh_TW, ja, ru.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build (icons → LQIPs → Astro build → Pagefind indexing) |
| `pnpm preview` | Preview production build |
| `pnpm check` | `astro check` for type/error checking |
| `pnpm type-check` | `tsc --noEmit --isolatedDeclarations` |
| `pnpm lint` | Biome lint + auto-fix |
| `pnpm format` | Biome format |
| `pnpm new-post <filename>` | Scaffold a new blog post |
| `node dev/sandbox.mjs build` | Build in a Temp sandbox（本机磁盘写入慢，见 `dev/sandbox.mjs` 注释）|
| `node dev/admin-preview.mjs` | 本地预览后台四个页面（接口用假数据顶替，见「后台页面」一节）|

Package manager is **pnpm** (enforced). Node.js >= 22 required.

## Architecture

### Astro + Svelte Hybrid

- `.astro` components for static content and layouts
- `.svelte` components for interactive UI (search, settings, pagination, archive) — mounted with `client:load` or `client:visible`
- Swup.js handles SPA-like page transitions with multiple container targets

### Configuration-Driven

All features are toggled/configured via TypeScript files in `src/config/`, exported through the barrel at `src/config/index.ts`. Key configs:

- `siteConfig.ts` — core site settings, theme, pagination
- `sidebarConfig.ts` — sidebar layout (left/right/both, widget ordering)
- `commentConfig.ts`, `analyticsConfig.ts`, `fontConfig.ts`, etc.

### Layout System

- `Layout.astro` — base HTML shell (head, body, theme init, analytics, Swup hooks)
- `MainGridLayout.astro` — full page grid with sidebar(s), navbar, wallpaper, footer

### Content Collections

Defined in `src/content.config.ts`:
- `posts` — blog posts (`.md`/`.mdx`) with frontmatter: title, published, tags, category, draft, pinned, password, comment, etc.
- `spec` — special pages (about, guestbook)

### Key Directories

- `src/components/` — organized by domain: `analytics/`, `comment/`, `common/`, `controls/`, `features/`, `layout/`, `misc/`, `pages/`, `widget/`
- `src/plugins/` — 15 custom remark/rehype plugins (Mermaid, PlantUML, KaTeX, GitHub cards, reading time, etc.)
- `src/i18n/` — translation keys in `i18nKey.ts`, language files in `languages/*.ts`, lookup via `translation.ts`
- `src/utils/` — content sorting, crypto (encrypted posts), date formatting, image processing/LQIP, TOC generation
- `src/pages/` — Astro file-based routing
- `scripts/` — build-time utilities (`generate-icons.js`, `generate-lqips.ts`, `new-post.js`)

### 后台页面（/admin）

四个后台页（`/admin/`、`/admin/posts/`、`/admin/moments/`、`/admin/notebooks/`）都是独立的 HTML 文档，不走博客的 `Layout`，所以默认拿不到博客的样式、字体与主题色。共用部分集中在这两处，**改后台外观应当改它们，不要在单个页面里各写一套**：

- `public/admin/theme.css` — 后台共用样式层。设计令牌照抄 `src/styles/variables.styl`，颜色用 `oklch(... var(--hue))` 驱动，`--hue` 由页面脚本注入，所以访客在博客上换主题色，后台跟着变
- `src/components/admin/AdminTheme.astro` — 在每个后台页的 `<head>` 里放一个，负责引入上面的样式表、复用博客的字体组件、初始化色相与明暗

页面自己的 `<style is:inline>` 里只留「这一页特有的排版」，应当很短。

数据接口 `/api/auth/*` 与 `/api/github/*` 是 Cloudflare Pages Functions（见 `functions/`），**本地 `astro dev` 里没有它们**。而后台页打开时会先问 `/api/auth/status`，拿不到就被踢回登录页 —— 于是本地只看得见登录页，改样式时无从对照。两个办法：

```bash
node dev/admin-preview.mjs          # 本地预览，假接口，默认 http://127.0.0.1:4322
node dev/admin-preview.mjs --shot   # 顺便按亮/暗各截一张，图落在 _gen/admin-shots/
npx wrangler pages dev dist         # 跑真实 Functions，需 .dev.vars 里配齐三个变量
```

预览脚本把上述两类接口用「本地 `src/content/posts` 当仓库内容 + 一律回答已登录」顶替，能看能点，但**保存不会写入仓库**（写请求会被明确拒绝，不会假装成功）。三个变量是 `ADMIN_PASSWORD_HASH`、`AUTH_SECRET`、`GITHUB_TOKEN`，见 `docs/Cloudflare部署指南.md`。

### Path Aliases (tsconfig.json)

`@components/*`, `@assets/*`, `@constants/*`, `@utils/*`, `@i18n/*`, `@layouts/*` → `./src/<dir>/*`; `@/*` → `./src/*`

## Code Style

- **Biome** enforces: tab indentation, double quotes, recommended lint rules
- Relaxed rules for `.svelte`/`.astro` files (useConst off, noUnusedVariables off)
- Commit convention: **Conventional Commits** (`feat:`, `fix:`, `chore:`, etc.)

## Build Pipeline

Multi-step: `scripts/generate-icons.js` → `scripts/generate-lqips.ts` → `astro build` → `pagefind --site dist`

Icons/LQIP data are generated into `src/constants/` and committed. Regenerate with `pnpm icons` or `pnpm lqips`.

## Deployment

- **Vercel** (default, `vercel.json`)
- **Cloudflare Workers** (`wrangler.jsonc`, set `CF_WORKERS` env var)
- Static output to `dist/`

