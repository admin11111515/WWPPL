---
title: "Svelte 5 的 runes 用了一个月，说说真实感受"
published: 2026-07-07
tags: ["Svelte", "前端", "状态管理"]
category: "技术"
description: "从 store 换到 runes，哪些地方变顺了，哪些地方还在别扭。"
image: "/images/covers/tech-svelte-5-runes-one-month.jpg"
---
之前一直用 Svelte 4 的 store，升到 5 之后把手上一个小项目（也就两三屏）整个改成 runes 重写了一遍。写了一个月，说点真感受。

最明显的爽点是依赖关系能一眼看出来了。store 的毛病是，你看到一个变量的值，但不知道谁在改它，得全局搜 `set`。runes 里 `$state` 定义在哪、`$derived` 从谁推出来，都在同一段代码里，读着省事。也不用再在 `onDestroy` 里退订 store 了，以前漏一次就是内存泄漏，现在组件销毁状态跟着走。

`$derived` 比 Vue 的 computed 直观，直接写表达式它自己知道依赖了什么：

```js
let items = $state([]);
let count = $derived(items.length);
let total = $derived(items.reduce((s, i) => s + i.price, 0));
```

不用像 Vue 那样显式声明依赖数组。

不过也有别扭的。状态写在 `.svelte.ts` 这种模块级文件里时，如果被多个组件导入是共享的；想每处独立得包在函数里返回。这个坑我踩过一次，两个页面互相串状态，查了半天。当时我还以为是缓存问题，把浏览器关了重开，没用，最后才发现是状态被共享了。

`$effect` 也容易被我写成万能胶，什么逻辑都往里塞，最后变成一堆互相触发的副作用，比 store 还难追。我现在给自己定的规矩是：能从状态推出来的，一律 `$derived`；`$effect` 只用来"跟外面世界打交道"——操作 DOM、写 localStorage、发请求。

报错信息有时候指不到点上。把 `$state` 写在不该写的地方，它会说"运行时的值不是响应式的"，但不告诉你哪行忘了加。我同事看了我的报错截图，回了一句"这破提示，谁看得懂"，我竟无法反驳。

我现在的打算是，新项目直接上 runes，老项目不急，它向下兼容，慢慢改。语法更短不是重点，重点是"数据从哪来、往哪去"现在能读出来了。
