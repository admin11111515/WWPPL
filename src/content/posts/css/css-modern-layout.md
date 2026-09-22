---
title: "2026 年了，别再用 float 布局了"
published: 2026-06-30
tags: ["CSS", "布局", "前端"]
category: "CSS"
description: "现代 CSS 布局方案完全指南，从 Flexbox 到 Grid 到 Container Queries，告别 float 时代。"
image: "/images/covers/css-css-modern-layout.jpg"
---

## 前言

如果你还在用 `float` 做页面布局，我理解你——毕竟它曾经是唯一的方案。但 2026 年了，我们有更好的选择。

## Flexbox：一维布局之王

Flexbox 适合**单行或单列**的布局场景。

```css
/* 经典的导航栏布局 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 等分布局 */
.card-grid {
  display: flex;
  gap: 1rem;
}

.card {
  flex: 1; /* 等分剩余空间 */
}
```

### Flexbox 最佳实践

```css
/* ✅ 使用 gap 代替 margin */
.container {
  display: flex;
  gap: 1rem; /* 好 */
}

/* ❌ 不要用 margin */
.item {
  margin-right: 1rem; /* 差 */
}
.item:last-child {
  margin-right: 0; /* 多余的代码 */
}

/* ✅ 使用 flex shorthand */
.item {
  flex: 1; /* 等同于 flex-grow: 1; flex-shrink: 1; flex-basis: 0% */
}
```

## Grid：二维布局之王

Grid 适合**行列都要控制**的布局场景。

```css
/* 经典的博客布局 */
.blog-layout {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
  min-height: 100vh;
}

.header { grid-column: 1 / -1; }
.sidebar { grid-row: 2; }
.main { grid-column: 2; }
.aside { grid-column: 3; }
.footer { grid-column: 1 / -1; }
```

### 响应式 Grid

```css
/* 自动适应列数，不需要媒体查询 */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

/* 这行代码的意思：
   - 每列最小 300px
   - 自动计算能放几列
   - 列与列之间 1rem 间距
*/
```

### Grid 命名区域

```css
/* 可读性极高的布局定义 */
.layout {
  display: grid;
  grid-template-areas:
    "header header header"
    "nav    main   aside"
    "footer footer footer";
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
}

.header { grid-area: header; }
.nav { grid-area: nav; }
.main { grid-area: main; }
.aside { grid-area: aside; }
.footer { grid-area: footer; }
```

## Container Queries：组件级响应式

这是 CSS 近年来最激动人心的特性之一。

```css
/* 定义容器 */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* 根据容器宽度调整样式 */
@container card (min-width: 400px) {
  .card {
    display: flex;
    gap: 1rem;
  }
}

@container card (min-width: 600px) {
  .card {
    flex-direction: row;
  }
  .card-image {
    width: 200px;
  }
}
```

### 为什么 Container Queries 比 Media Queries 好？

```css
/* ❌ Media Queries：基于视口宽度 */
@media (min-width: 768px) {
  .card { display: flex; }
}

/* ✅ Container Queries：基于容器宽度 */
@container (min-width: 400px) {
  .card { display: flex; }
}
```

Container Queries 让组件真正可复用——同一个卡片组件放在侧边栏是竖排，放在主内容区是横排，不需要任何 JavaScript。

## Subgrid：继承父 Grid

```css
.parent-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.child-grid {
  display: grid;
  grid-template-columns: subgrid; /* 继承父级列定义 */
  grid-row: span 2; /* 占两行 */
}
```

Subgrid 解决了一个长期存在的问题：让子元素对齐父 Grid 的轨道。

## 实战：完整的响应式布局

```css
/* 2026 年的标准博客布局 */
.blog-layout {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "header"
    "main"
    "sidebar"
    "footer";
  gap: 1rem;
  padding: 1rem;
}

@media (min-width: 768px) {
  .blog-layout {
    grid-template-columns: 250px 1fr;
    grid-template-areas:
      "header  header"
      "sidebar main"
      "footer  footer";
  }
}

@media (min-width: 1200px) {
  .blog-layout {
    grid-template-columns: 250px 1fr 300px;
    grid-template-areas:
      "header  header  header"
      "sidebar main   aside"
      "footer  footer  footer";
  }
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.aside { grid-area: aside; }
.footer { grid-area: footer; }
```

## 选择指南

| 场景 | 推荐方案 |
|------|----------|
| 导航栏、按钮组 | Flexbox |
| 卡片列表、等分布局 | Flexbox 或 Grid |
| 复杂的页面布局 | Grid |
| 组件级响应式 | Container Queries |
| 子元素对齐 | Subgrid |

## 总结

现代 CSS 布局已经非常强大：

- **Flexbox** — 一维布局，简单直观
- **Grid** — 二维布局，精确控制
- **Container Queries** — 组件级响应式
- **Subgrid** — 继承父级布局

是时候告别 `float: left` 和那些清除浮动的 hack 了。

---

*写于一个用 Grid 重构了整个项目的周末。*
