---
title: "用 Svelte 写了个进度环"
published: 2026-09-05
tags: ["Svelte", "SVG", "组件"]
category: "技术"
description: "一个圆环，几行数学，加两个容易忘的属性。"
image: "/images/covers/tech-svelte-progress-ring.jpg"
---
需要一个环形进度显示，看着简单，写的时候有两个地方卡了一下。

## 画法

用 SVG 的圆，靠两个属性控制显示的比例：

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

其中 `circumference = 2 * Math.PI * r`。

## 卡住的第一处：起点位置

圆是从三点钟方向开始画的，所以进度总是从右边开始走。要让它从十二点开始，得整体旋转 -90 度。

`transform="rotate(-90 60 60)"` 后面那两个数是旋转中心，不写的话会绕画布原点转，圆会飞出画框。

## 卡住的第二处：占比换算

`stroke-dashoffset` 的逻辑是"从描边里挖掉多少"，所以挖掉的部分应该是 `周长 × (1 - 进度)`，进度越大挖掉越少，露出来的越多。

我第一次写成了 `周长 × 进度`，结果是进度越大圆越空，完全是反的。这个坑大概每个第一次用这个属性的人都会踩。

## 顺手的处理

**首尾要圆头。**

```css
.bar { stroke-linecap: round; }
```

不加的话进度条的端点是被切断的平面，看着很硬。

**进度为 0 时不要显示端点。** 圆头在 0 的位置会留下一个小圆点，看起来像已经有一点点进度。所以进度为 0 的时候把整条隐藏掉。

**要显示数字。** 光有环看不出准确值，环中心放一个百分比数字，用定位绝对居中。

## 最后

写完之后把它做成了可配置的：半径、线宽、颜色、是否显示数字都可以传参。

组件化这个东西的好处不在于复用——这个环我可能只用一次——而在于写的时候会把每个"写死的值"想一遍：它是本来就固定的，还是只是这次刚好这样。
