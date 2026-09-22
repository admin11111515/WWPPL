---
title: "给博客做了个阅读进度条"
published: 2026-07-27
tags: ["前端", "交互", "CSS"]
category: "技术"
description: "顶部那条细线，看着简单，做对不容易。"
image: "api"
---
博客顶上加了一条细线，滚到哪儿它就长到哪儿。看着是个小东西，实际做的时候有几个点要想清楚。

## 怎么算进度

第一反应是算滚动距离：

```js
const percent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
```

问题是这个分母不对。滚动到底时，`scrollY` 最大等于 `scrollHeight - innerHeight`，除出来刚好是 1。但页面高的时候，人眼感受到的"读了一半"和滚动距离的一半并不一致——正文如果集中在中间那一段，前面后面都是留白，滚到 50% 的时候其实正文已经看完了。

我最后还是用了这个算法，因为它是最符合直觉的：进度条跟滚动位置一致，用户滚动时不会觉得条子和手不同步。想再准一点就要按正文元素的位置算，收益不大。

## 怎么画

不要用 JS 每帧改元素宽度。滚动事件在移动端是低频触发的，改宽度会导致抖动，而且触发重排。

用 CSS 那句最简单的：

```css
.progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  width: 100%;
  transform: scaleX(var(--progress));
  transform-origin: left center;
  background: var(--accent);
}
```

JS 只负责更新一个 CSS 变量 `--progress`，从 0 到 1。`transform` 和 `opacity` 是合成器属性，不触发重排，特别顺。

## 两个细节

**别用 scroll 事件直接改样式。** 用 requestAnimationFrame 包一层，一帧最多改一次：

```js
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    document.documentElement.style.setProperty("--progress", String(getPercent()));
    ticking = false;
  });
}
```

**文章页才显示。** 首页、归档页不需要这个，它们没有"读完"的概念。我是用页面类型判断，只在文章详情页渲染这个组件。

写完之后自己用了几下，感觉确实不一样——有个东西提醒你进度，会让人更愿意读下去。
