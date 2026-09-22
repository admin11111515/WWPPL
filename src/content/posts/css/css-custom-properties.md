---
title: "CSS Custom Properties：不只是变量那么简单"
published: 2026-06-22
tags: ["CSS", "变量", "主题"]
category: "CSS"
description: "深入理解 CSS Custom Properties（CSS 变量）的高级用法，以及它如何让你的样式系统更灵活。"
image: "auto"
---

## 前言

很多人把 CSS Custom Properties 当成 Sass 变量的替代品，但它们有本质的区别。CSS 变量是**运行时**的，而 Sass 变量是**编译时**的。这个区别带来了巨大的灵活性。

## 基础用法

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

## 作用域和继承

CSS 变量遵循 CSS 的作用域和继承规则：

```css
:root {
  --color: blue;
}

.container {
  --color: red; /* 只在 container 内部生效 */
}

.text {
  color: var(--color); /* 在 container 内是红色，外部是蓝色 */
}
```

## 响应式变量

结合媒体查询，可以创建响应式的设计系统：

```css
:root {
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
}

@media (min-width: 768px) {
  :root {
    --spacing-sm: 1rem;
    --spacing-md: 1.5rem;
    --spacing-lg: 3rem;
    --font-size-sm: 1rem;
    --font-size-md: 1.125rem;
    --font-size-lg: 1.5rem;
  }
}
```

## 主题切换

这是 CSS 变量最强大的用法之一：

```css
/* 浅色主题 */
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
  --border: #e5e7eb;
  --card-bg: #f9fafb;
}

/* 深色主题 */
[data-theme="dark"] {
  --bg: #1a1a1a;
  --text: #f5f5f5;
  --border: #374151;
  --card-bg: #2d2d2d;
}

/* 使用变量 */
body {
  background: var(--bg);
  color: var(--text);
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
}
```

切换主题只需要修改 `data-theme` 属性：

```javascript
document.documentElement.dataset.theme = "dark";
```

## 动态计算

CSS 变量可以参与计算：

```css
:root {
  --spacing: 1rem;
  --multiplier: 2;
}

.container {
  /* 使用 calc 进行计算 */
  padding: calc(var(--spacing) * var(--multiplier));
  
  /* 条件计算 */
  margin: calc(var(--spacing) * (1 - var(--is-compact, 0)));
}
```

## 与 JavaScript 交互

```javascript
// 读取变量
const primary = getComputedStyle(document.documentElement)
  .getPropertyValue('--primary');

// 设置变量
document.documentElement.style.setProperty('--primary', '#ef4444');
```

## 默认值

```css
.element {
  /* 如果 --color 未定义，使用 red */
  color: var(--color, red);
  
  /* 嵌套默认值 */
  color: var(--color, var(--fallback, red));
}
```

## 类型化变量

通过命名约定和 JavaScript 配合，可以实现类型安全的变量系统：

```css
/* 颜色变量 */
--color-primary: #3b82f6;
--color-secondary: #10b981;
--color-danger: #ef4444;

/* 间距变量 */
--space-xs: 0.25rem;
--space-sm: 0.5rem;
--space-md: 1rem;
--space-lg: 2rem;

/* 字体变量 */
--font-size-xs: 0.75rem;
--font-size-sm: 0.875rem;
--font-size-md: 1rem;
--font-size-lg: 1.125rem;
--font-size-xl: 1.25rem;
```

## 容器查询结合

CSS 变量与容器查询结合，可以创建更灵活的组件：

```css
.card-container {
  container-type: inline-size;
  --card-direction: column;
}

@container (min-width: 400px) {
  .card-container {
    --card-direction: row;
  }
}

.card {
  display: flex;
  flex-direction: var(--card-direction);
}
```

## 实战：设计系统

```css
:root {
  /* 颜色 */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  
  /* 间距 */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* 字体 */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, monospace;
  
  /* 圆角 */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* 组件 */
.button {
  font-family: var(--font-sans);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s;
}

.button:hover {
  box-shadow: var(--shadow-md);
}
```

## 总结

CSS Custom Properties 的核心优势：

1. **运行时可变** — 不需要预处理器
2. **作用域感知** — 遵循 CSS 继承规则
3. **JavaScript 可读写** — 动态修改样式
4. **主题切换简单** — 修改变量即可
5. **性能优秀** — 浏览器原生支持

如果你还在用 Sass 变量做主题切换，是时候考虑 CSS 变量了。

---

*写于一个用 CSS 变量重构了整个设计系统的周末。*
