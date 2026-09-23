---
title: "CSS 变量：我用它做主题切换，也踩过坑"
published: 2026-06-22
tags: ["CSS", "变量", "主题"]
category: "CSS"
description: "运行时才生效、能继承、能被 JS 读写——和 Sass 变量不是一回事。"
image: "/images/covers/css-css-custom-properties.jpg"
---

我开始认真用 CSS 变量是 2021 年，想给博客加深色模式。那时候我还在用 Sass 变量，结果深色模式意味着两套编译产物，太重。CSS 变量是运行时的，浏览器原生支持，切换主题只要改一个属性，不用重新编译。

最基础的写在 `:root`：

```css
:root {
  --primary: #3b82f6;
  --spacing: 1rem;
  --radius: 0.5rem;
}

.button {
  background: var(--primary);
  padding: var(--spacing);
  border-radius: var(--radius);
}
```

它和 Sass 变量最大的区别是作用域。CSS 变量跟着 DOM 继承，我在某个容器里重定义了 `--color`，里面的元素跟着变，外面不受影响：

```css
:root { --color: blue; }
.container { --color: red; } /* 只在 container 内部生效 */
.text { color: var(--color); } /* container 内红，外部蓝 */
```

这个继承我踩过一次坑。有回我在某个卡片组件里临时设了 `--primary` 想局部调色，忘了它是继承的，结果卡片里嵌套的另一个按钮也跟着变，产品同学截图问我"这按钮颜色怎么串了"。从那以后局部变量我一律加前缀，不碰全局 token。

响应式我也用变量做，断点处整体换一套间距和字号：

```css
:root { --spacing-md: 1rem; --font-size-md: 1rem; }
@media (min-width: 768px) {
  :root {
    --spacing-md: 1.5rem;
    --font-size-md: 1.125rem;
  }
}
```

深色模式就是切 `data-theme`：

```css
:root { --bg: #ffffff; --text: #1a1a1a; --border: #e5e7eb; }
[data-theme="dark"] { --bg: #1a1a1a; --text: #f5f5f5; --border: #374151; }
body { background: var(--bg); color: var(--text); }
```

```javascript
document.documentElement.dataset.theme = "dark";
```

设计同学有一次说："你这主题切换怎么闪一下？" 我查了半天，是因为我在 JS 里先读了旧值再写新值，中间有一帧没上变量。改成直接切 attribute 之后就没了。

变量还能进 `calc`，做倍数和简单的条件：

```css
.container {
  padding: calc(var(--spacing) * var(--multiplier));
  margin: calc(var(--spacing) * (1 - var(--is-compact, 0)));
}
```

第二个那种"条件计算"我用得少，容易把自己绕进去。JS 读写都行，主题偏好我就存 localStorage 然后 setProperty：

```javascript
const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary');
document.documentElement.style.setProperty('--primary', '#ef4444');
```

兜底写法 `var(--color, red)` 我也常用，防止某个变量没定义时整块崩成透明。嵌套兜底也有：`var(--color, var(--fallback, red))`。

命名我后来统一成 `--color-primary-500`、`--space-4`、`--font-sans` 这种，配合容器查询让组件跟着容器宽度变方向：

```css
.card-container { container-type: inline-size; --card-direction: column; }
@container (min-width: 400px) {
  .card-container { --card-direction: row; }
}
.card { display: flex; flex-direction: var(--card-direction); }
```

我现在设计系统的 token 全在 CSS 变量里，Sass 只留 mixin 和函数。变量不是"高级版 Sass 变量"，它解决的是运行时可变和继承这两件事，别的它不管：

```css
:root {
  /* 颜色 */
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  /* 间距 */
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-8: 2rem;
  /* 字体 */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, monospace;
  /* 圆角 */
  --radius-md: 0.375rem;
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.button {
  font-family: var(--font-sans);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
```
