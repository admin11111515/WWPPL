---
title: "用 Svelte 写了个进度环"
published: 2026-09-05
tags: ["Svelte", "SVG", "组件"]
category: "技术"
description: "一个圆环，几行数学，加两个容易忘的属性。"
image: "/images/covers/tech-svelte-progress-ring.jpg"
---
我上周要给项目加个环形进度显示，看着就是个圈，写的时候卡了两回。

用 SVG 的圆，靠两个属性控制比例：

```svelte
<svg viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="52" class="track" />
  <circle
    cx="60" cy="60" r="52"
    class="bar"
    stroke-dasharray={circumference}
    stroke-dashoffset={circumference * (1 - progress)}
    transform="rotate(-90 60 60)"
  />
</svg>
```

`circumference = 2 * Math.PI * r`。

第一回卡在起点。圆默认从三点钟方向开始画，进度总从右边走。要它从十二点开始得整体转 -90 度。那行 `transform="rotate(-90 60 60)"` 后面两个数是旋转中心，我有次没写，圆直接绕画布原点转飞了，跑出框外，我还以为是 viewBox 写错了，折腾好一阵。

第二回是占比换算。`stroke-dashoffset` 的逻辑是"从描边里挖掉多少"，所以挖掉的应该是 `周长 × (1 - 进度)`。我第一版写成 `周长 × 进度`，结果进度越大圆越空，完全反了。这个坑我猜每个第一次碰这属性的人都得踩一遍——群里有个兄弟发他截图问我"为啥我的环是反的"，我回"你 offset 写反了"，说完才发现自己上周刚犯过一样的错。

顺手处理了几件事：端点加了 `stroke-linecap: round`，不然切口是平的，硬。进度为 0 的时候圆头会留个小圆点，看着像已经有了一点点，所以 0 时把整条隐藏掉。环中心我塞了个百分比数字，绝对定位居中，光有环看不出准确值。

写完把它做成了可配置的：半径、线宽、颜色、显不显示数字都能传。这个环我大概就用一次，组件化对我最大的好处不是复用，是写的时候被迫把每个"写死的值"过一遍——它本来就固定，还是只是这次刚好这样。
