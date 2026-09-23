---
title: "Astro Content Collections，迁移完我才敢乱改 frontmatter"
published: 2026-06-28
tags: ["Astro", "内容管理", "Zod"]
category: "Astro"
description: "类型安全的 frontmatter，构建时就报错，比上线后发现强。"
image: "/images/covers/astro-astro-content-collections.jpg"
---

我第一次用 Content Collections 是去年把博客从老的静态生成器迁到 Astro。之前 frontmatter 全靠手写，字段名拼错、日期写成字符串是常事，最惨的一次把 `published` 写成了 `"2026/06/28"` 这种字符串，构建不报错，到了列表页按时间排序时才炸——`"2026/06/28"` 当字符串比，排到了一堆奇怪的位置。

迁过来之后，schema 先定义好：

```typescript
// src/content.config.ts
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    published: z.date(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

这张表是 Astro 5 的 content layer 写法（老版本是 `src/content/config.ts` 配 `type: 'content'`）。`published` 一旦写成字符串，构建直接红：

```markdown
---
title: 123             # 应该是 string
published: "not-a-date" # 不是日期
---
```

我现在反而喜欢这种"红得好早"的感觉。同事看了我这套配置说："你这 frontmatter 现在比数据库还严。" 确实，但这正是我要的。代码里取数据也是带类型的：

```astro
---
import { getCollection } from "astro:content";

const posts = await getCollection("blog");
posts.forEach(post => {
  console.log(post.data.title);     // string
  console.log(post.data.published); // Date
});
---
```

`tags` 我设成了 `z.array(z.string()).default([])`，因为有些老文章确实没打标签，缺了就给空数组，比硬性要求强。`description` 也给了 `.optional().default("")`。还有次我加了个 `category` 字段想做枚举：

```typescript
category: z.enum(["tech", "life", "tutorial"]),
```

结果一篇随笔的 category 写成了 `essay`，构建报错，我才发现那篇压根没归类。这种错放以前绝对溜到线上。

查询也顺手。取非草稿、按 tag 筛、按日期排：

```typescript
const publishedPosts = await getCollection("blog", ({ data }) => !data.draft);
const astroPosts = await getCollection("blog", ({ data }) => data.tags.includes("astro"));
const sortedPosts = publishedPosts.sort(
  (a, b) => b.data.published.getTime() - a.data.published.getTime()
);
```

封面图我用 `image()` 让 Astro 自动优化，避免我手敲路径把图搞成 3MB：

```typescript
const blog = defineCollection({
  schema: ({ image }) => z.object({
    title: z.string(),
    cover: image().optional(),
  }),
});
```

渲染时拿标题和正文，顺手把 `headings` 拿来生成右侧目录，比自己解析 markdown 标题稳：

```astro
---
import { getCollection, render } from "astro:content";
const post = await getEntry("blog", "my-post");
const { Content, headings } = await render(post);
---
<article>
  <nav>
    {headings.map(heading => (
      <a href={`#${heading.slug}`}>{heading.text}</a>
    ))}
  </nav>
  <Content />
</article>
```

整套跑下来，我那个博客 60 多篇内容，schema 帮我拦住的 frontmatter 错误少说 5 次。代价是每个新字段都得先改 schema，但比起上线才发现，这个代价我认。
