---
title: "Astro Content Collections：告别手动管理内容"
published: 2026-06-28
tags: ["Astro", "内容管理", "Zod"]
category: "Astro"
description: "深入理解 Astro 的 Content Collections，让你的内容管理更安全、更高效。"
image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800"
---

## 什么是 Content Collections？

Content Collections 是 Astro 提供的内容管理方案，它让你用 TypeScript 类型安全地管理 Markdown/MDX 内容。

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

## 为什么用 Collections？

### 1. 类型安全

```astro
---
import { getCollection } from "astro:content";

const posts = await getCollection("blog");

// TypeScript 知道每个 post 的类型
posts.forEach(post => {
  console.log(post.data.title);    // ✅ string
  console.log(post.data.published); // ✅ Date
  console.log(post.data.tags);     // ✅ string[]
});
---
```

### 2. 自动验证

如果 Markdown 的 frontmatter 不符合 schema，构建时会报错：

```markdown
---
title: 123  # ❌ 类型错误，应该是 string
published: "not-a-date"  # ❌ 日期格式错误
---
```

### 3. 强大的查询

```typescript
// 获取所有非草稿文章
const publishedPosts = await getCollection("blog", ({ data }) => {
  return !data.draft;
});

// 按标签筛选
const astroPosts = await getCollection("blog", ({ data }) => {
  return data.tags.includes("astro");
});

// 按日期排序
const sortedPosts = publishedPosts.sort(
  (a, b) => b.data.published.getTime() - a.data.published.getTime()
);
```

## 高级 Schema 技巧

### 可选字段和默认值

```typescript
const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([]),
    draft: z.boolean().optional().default(false),
    image: z.string().optional(),
  }),
});
```

### 枚举类型

```typescript
const blog = defineCollection({
  schema: z.object({
    category: z.enum(["tech", "life", "tutorial"]),
    priority: z.number().min(1).max(5),
  }),
});
```

### 嵌套对象

```typescript
const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    author: z.object({
      name: z.string(),
      avatar: z.string().optional(),
      url: z.string().url().optional(),
    }),
  }),
});
```

## 资产处理

Astro 可以自动处理内容中的图片：

```typescript
const blog = defineCollection({
  // 使用 image() schema 处理图片
  schema: ({ image }) => z.object({
    title: z.string(),
    // 封面图会自动优化
    cover: image(),
  }),
});
```

```markdown
---
title: "我的文章"
cover: "./cover.jpg"  # 会被 Astro 自动优化
---
```

## 渲染内容

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

## 实战：完整的博客系统

```typescript
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    published: z.date(),
    updated: z.date().optional(),
    description: z.string().optional().default(""),
    image: image().optional(),
    tags: z.array(z.string()).optional().default([]),
    category: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { posts };
```

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection, render } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("posts", ({ data }) => {
    return !data.draft;
  });
  
  return posts.map(post => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<article>
  <h1>{post.data.title}</h1>
  <time>{post.data.published.toLocaleDateString()}</time>
  <Content />
</article>
```

## 总结

Content Collections 的核心价值：

1. **类型安全** — 编译时捕获错误
2. **自动验证** — 保证内容质量
3. **强大查询** — 灵活筛选和排序
4. **资产处理** — 自动优化图片
5. **开发体验** — IDE 补全和提示

如果你用 Astro 做内容型网站，Content Collections 是必须掌握的特性。

---

*写于一个用 Collections 重构了整个博客的下午。*
