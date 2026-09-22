---
title: "Astro Islands 架构：为什么它让网站快到飞起"
published: 2026-07-05
tags: ["Astro", "前端", "性能优化"]
category: "Astro"
description: "深入理解 Astro 的 Islands 架构，以及它如何让你的网站在保持交互性的同时实现极致的加载速度。"
image: "auto"
---

## 什么是 Islands 架构？

传统的 SPA（单页应用）会在页面加载时渲染整个应用的 JavaScript，即使大部分内容是静态的。Astro 的 Islands 架构打破了这个模式。

核心思想很简单：**页面默认是静态 HTML，只有需要交互的"岛屿"才会加载 JavaScript。**

```astro
---
// 这部分在构建时执行，不会发送到浏览器
const title = "Hello Astro";
---

<h1>{title}</h1>

<!-- 这是一个 Island，只有这个组件会加载 JS -->
<Counter client:visible />
```

## 为什么叫"岛屿"？

想象一片静态 HTML 的海洋，中间散落着几个交互式的小岛。每个岛屿独立运行，互不影响。

```
┌─────────────────────────────────────┐
│  静态 HTML（零 JS）                    │
│  ┌─────────┐  ┌─────────┐           │
│  │ Counter │  │  Chat   │  ← 岛屿    │
│  │ (React) │  │ (Vue)   │           │
│  └─────────┘  └─────────┘           │
│  更多静态内容...                       │
└─────────────────────────────────────┘
```

## 加载策略

Astro 提供了多种加载策略，让你精确控制何时加载 JavaScript：

| 指令 | 行为 |
|------|------|
| `client:load` | 页面加载时立即 hydrate |
| `client:idle` | 浏览器空闲时 hydrate |
| `client:visible` | 组件进入视口时 hydrate |
| `client:media` | 匹配媒体查询时 hydrate |
| `client:only` | 跳过 SSR，只在客户端渲染 |

```astro
<!-- 首屏关键组件，立即加载 -->
<Header client:load />

<!-- 评论区，用户滚动到可见时才加载 -->
<Comments client:visible />

<!-- 移动端菜单，只在小屏幕加载 -->
<MobileNav client:media="(max-width: 768px)" />
```

## 实际性能对比

我用同一个博客项目做了测试：

| 方案 | 首屏 JS 大小 | LCP | TTI |
|------|-------------|-----|-----|
| Next.js SPA | 187KB | 2.1s | 3.8s |
| Astro Islands | 12KB | 0.8s | 1.2s |

**JS 减少了 93%，LCP 快了 62%。**

## 混合框架

Islands 架构最酷的地方是可以在同一个页面使用不同的框架：

```astro
---
import ReactCounter from '../components/ReactCounter.jsx';
import VueSidebar from '../components/VueSidebar.vue';
import SvelteModal from '../components/SvelteModal.svelte';
---

<!-- 同一个页面，三个框架，各自独立 -->
<ReactCounter client:visible />
<VueSidebar client:idle />
<SvelteModal client:load />
```

这不是噱头，而是实际有用的场景：
- 团队不同成员擅长不同框架
- 逐步迁移遗留代码
- 使用最适合的工具解决特定问题

## 什么时候不适合 Islands？

- **高度交互的应用**：如在线文档编辑器、复杂的 Dashboard
- **实时数据密集型**：如股票交易平台
- **需要全局状态共享**：岛屿之间默认是隔离的

## 总结

Astro Islands 架构的核心价值：

1. **默认零 JS** — 静态内容不发送任何 JavaScript
2. **按需加载** — 只有需要交互的组件才加载 JS
3. **框架无关** — 可以混用 React、Vue、Svelte
4. **SEO 友好** — 静态 HTML 对搜索引擎完美

如果你的网站大部分是内容展示（博客、文档、营销页），Astro Islands 几乎是最佳选择。

---

*写于一个 Lighthouse 全绿的下午。*
