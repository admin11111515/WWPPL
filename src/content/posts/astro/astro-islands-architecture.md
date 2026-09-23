---
title: "Astro Islands 架构，我的博客 JS 从 187KB 掉到 12KB"
published: 2026-07-05
tags: ["Astro", "前端", "性能优化"]
category: "Astro"
description: "静态 HTML 为主，只在要交互的地方注水，首屏 JS 省一大截。"
image: "/images/covers/astro-astro-islands-architecture.jpg"
---

我把博客从 Next.js 迁到 Astro，最直接的变化是首屏 JS 从 187KB 掉到了 12KB。这个数不是官方 benchmark，是我同一个项目、同一个 Lighthouse 跑出来的：LCP 从 2.1s 降到 0.8s，TTI 从 3.8s 降到 1.2s。

原理不复杂：页面默认是静态 HTML，不发送任何 JavaScript；只有需要交互的那一小块——Astro 管它叫 island——才加载自己的 JS。

```astro
---
const title = "Hello Astro";
---
<h1>{title}</h1>
<!-- 只有这个组件会加载 JS -->
<Counter client:visible />
```

frontmatter 那段在构建时就跑完了，不会进浏览器。阿松看我提交时说："你这首屏 JS 12KB，是把 React 都删了？" 我说没删，只是没发下去。

加载时机我用 `client:*` 指令控制，常用的就这几个：

| 指令 | 行为 |
|------|------|
| `client:load` | 页面加载时立即 hydrate |
| `client:idle` | 浏览器空闲时 hydrate |
| `client:visible` | 组件进入视口才 hydrate |
| `client:media` | 匹配媒体查询才 hydrate |

我博客首页现在 3 个 island：搜索框 `client:load`、主题切换 `client:idle`、评论 `client:visible`。评论区用户滚到才加载，桌面端菜单用 `client:media="(max-width: 768px)"`，桌面根本不加载那段 JS。

最让我意外的是可以混框架。同一个页面，React 写计数器、Vue 写侧边栏、Svelte 写弹窗，各自独立 hydrate：

```astro
---
import ReactCounter from '../components/ReactCounter.jsx';
import VueSidebar from '../components/VueSidebar.vue';
import SvelteModal from '../components/SvelteModal.svelte';
---
<ReactCounter client:visible />
<VueSidebar client:idle />
<SvelteModal client:load />
```

这种"不同人用不同框架"的场景在接手老代码时挺实用，不用为了统一把旧组件全重写。

但我那个内部用的数据看板就没迁——它满屏都是联动筛选和下钻，基本全要交互，island 之间还得共享状态。这种场景下 island 默认隔离反而碍事，我老老实实留着 React SPA。所以 Islands 不是银弹：内容展示为主的站（博客、文档、落地页）几乎白拣性能；高度交互的应用，该用什么还用什么。
