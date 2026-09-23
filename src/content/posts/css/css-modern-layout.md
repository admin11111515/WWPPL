---
title: "Flexbox、Grid，和我还在用的那点 float"
published: 2026-06-30
tags: ["CSS", "布局", "前端"]
category: "CSS"
description: "从清浮动到 grid 命名区域，布局这些年我踩的坑比写的代码多。"
image: "/images/covers/css-css-modern-layout.jpg"
---

我 2016 年学前端那会儿，布局全靠 `float`。两栏布局左边 `float: left`、右边 `float: right`，底下还得加个 `.clearfix` 清浮动，不然父容器高度塌成 0。清浮动的 hack 我写过不下一百次。

第一次松手是做导航栏，用 flex 一把就对了：

```css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

`gap` 代替 margin 这件事，我是被坑了才记住的。早先用 `margin-right` 加 `:last-child` 清最后一项，结果列表项动态增减时总有缝对不齐。改成 `gap: 1rem` 之后那类 bug 全没了。

```css
.container { display: flex; gap: 1rem; }
.card { flex: 1; } /* flex: 1 等同 flex-grow/shrink: 1, basis: 0% */
```

但要说真正让我把 float 扔了做页面骨架的，是 Grid。两栏、三栏、带页脚的两维布局，命名区域一眼能看懂：

```css
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

我博客现在就是这套。响应式我靠 `auto-fit` 自动算列数，不用写媒体查询：

```css
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
```

卡片列表用它，窗口从宽到窄自己从 4 列变 1 列。更细的响应式我还是在断点处重排区域：

```css
.blog-layout {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "header" "main" "sidebar" "footer";
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
```

容器查询是这两年我最喜欢的。以前卡片放侧边栏是竖排，放主内容区想横排，只能写媒体查询盯视口。现在盯容器：

```css
.card-container { container-type: inline-size; }
@container (min-width: 400px) {
  .card { display: flex; flex-direction: row; }
}
```

同一个组件，侧边栏窄就竖排，主区宽就横排，零 JS。

Subgrid 我上个月才第一次用，解决子元素对齐父 grid 轨道的问题：

```css
.parent-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.child-grid { display: grid; grid-template-columns: subgrid; grid-row: span 2; }
```

老陈 review 我那段清除了老代码，说："你这 clearfix 终于删了，我看了三年。"

float 我没全扔。图文混排里图片左浮、文字环绕，还是 `float` 最顺手，Grid 和 flex 都干不了这个。所以我现在是页面骨架用 Grid，一行一列用 flex，图文环绕才用 float。
