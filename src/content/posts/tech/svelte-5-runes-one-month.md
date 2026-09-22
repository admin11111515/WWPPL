---
title: "Svelte 5 的 runes 用了一个月，说说真实感受"
published: 2026-07-07
tags: ["Svelte", "前端", "状态管理"]
category: "技术"
description: "从 store 换到 runes，哪些地方变顺了，哪些地方还在别扭。"
image: "/images/covers/tech-svelte-5-runes-one-month.jpg"
---
之前一直用 Svelte 4 的 store，升到 5 之后把手上一个两三屏的小项目整个改用 runes 重写了一遍。写了一个月，说说真实的感受。

## 变顺的地方

**依赖关系一眼能看出来。** store 的问题是，你看到一个变量的值，但不知道谁在改它。得全局搜 set。runes 里 `$state` 定义在哪、`$derived` 从谁推出来，都在同一段代码里，读起来省事。

**不用再写 subscribe 和 unsubscribe。** 以前在组件里订阅 store，得在 onDestroy 里退订，漏一次就是内存泄漏。现在组件销毁时状态跟着走，这块心不用操。

**`$derived` 比 computed 直观。** 直接写一个表达式，它自己知道依赖了什么：

```js
let items = $state([]);
let count = $derived(items.length);
let total = $derived(items.reduce((s, i) => s + i.price, 0));
```

不用像 Vue 那样显式声明依赖数组。

## 还在别扭的地方

**在 .svelte.ts 文件里用 runes 要小心。** 状态写在模块级别的文件里时，如果被多个组件导入，是共享的；想每处独立，得包在函数里返回。这个坑我踩过一次，两个页面互相串状态，查了半天。

**`$effect` 容易写成万能胶。** 什么逻辑都往里塞，最后变成一堆互相触发的副作用，比 store 还难追。我现在的规矩是：能从状态推出来的，一律用 `$derived`，`$effect` 只用来做"和外面世界打交道"的事，比如操作 DOM、写 localStorage、发请求。

**报错信息有时候指不到点上。** 尤其是把 `$state` 写在了不该写的地方，报错会说运行时的值不是响应式的，但不会告诉你哪一行忘了加。

## 结论

如果新起项目，我会直接用 runes，不犹豫。已有项目不急着全量迁移，它是向下兼容的，可以一个个组件慢慢改。

真正让我留下来的原因不是语法更短，是"数据从哪来、往哪去"这件事变得能读了。
