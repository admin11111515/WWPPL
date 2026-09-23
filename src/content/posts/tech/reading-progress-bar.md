---
title: "给博客做了个阅读进度条"
published: 2026-07-27
tags: ["前端", "交互", "CSS"]
category: "技术"
description: "顶部那条细线，看着简单，滚动同步和重排才是难点。"
image: "/images/covers/tech-reading-progress-bar.jpg"
---
博客顶上加了条细线，滚到哪儿它就长到哪儿。看着是个小东西，说实话做的时候几个点挺费劲。

第一反应是算滚动距离：

```js
const percent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
```

这个分母其实不对。滚到底时 `scrollY` 最大等于 `scrollHeight - innerHeight`，除出来刚好 1。但页面高的时候，人眼觉得"读了一半"和滚动距离的一半并不一致——正文如果挤在中间，前后都是留白，滚到 50% 时正文其实看完了。我最后还是用了这个算法，因为它最跟手：进度条跟滚动位置一致，用户不会觉得条子和手不同步。想更准得按正文元素位置算，收益不大。

画的时候别用 JS 每帧改元素宽度。滚动事件在移动端低频触发，改宽度会抖，还触发重排。用 CSS 这句：

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

JS 只更新一个 CSS 变量 `--progress`，从 0 到 1。`transform` 和 `opacity` 是合成器属性，不触发重排，特别顺。这个组件挂在 Astro 的文章布局里。

滚动事件别直接改样式，用 `requestAnimationFrame` 包一层，一帧最多改一次：

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

还有个细节：首页、归档页不需要这玩意，它们没有"读完"的概念。我按页面类型判断，只在文章详情页渲染。

同事看见这进度条，说："你这线怎么跟手跟得这么紧。" 我说是 CSS 变量加合成器属性的功劳。

现在文章页顶部那条 2px 的线跟着滚动走，合成器属性不触发重排，滚起来不抖。就这些。
