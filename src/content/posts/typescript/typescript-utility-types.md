---
title: "TypeScript 内置工具类型：你可能不知道的 10 个"
published: 2026-06-25
tags: ["TypeScript", "工具类型", "前端"]
category: "TypeScript"
description: "深入介绍 TypeScript 内置的工具类型，让你的代码更简洁、更安全。"
image: "/images/covers/typescript-typescript-utility-types.jpg"
---

## 前言

TypeScript 内置了很多实用的工具类型，但很多人只用过 `Partial` 和 `Required`。这篇文章介绍 10 个你可能不知道但非常有用的工具类型。

## 1. Pick — 提取部分属性

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
}

// 只需要 id 和 name
type UserPreview = Pick<User, "id" | "name">;
// { id: string; name: string }
```

使用场景：API 返回精简数据。

## 2. Omit — 排除部分属性

```typescript
// 排除敏感字段
type PublicUser = Omit<User, "password">;
// { id: string; name: string; email: string; avatar: string }
```

使用场景：创建 DTO（数据传输对象）。

## 3. Record — 创建键值对类型

```typescript
// 创建角色权限映射
type Role = "admin" | "user" | "guest";
type Permissions = Record<Role, string[]>;

const permissions: Permissions = {
  admin: ["read", "write", "delete"],
  user: ["read", "write"],
  guest: ["read"],
};
```

使用场景：配置对象、状态映射。

## 4. Exclude — 从联合类型中排除

```typescript
type Status = "pending" | "active" | "deleted" | "banned";

// 排除删除和封禁状态
type ActiveStatus = Exclude<Status, "deleted" | "banned">;
// "pending" | "active"
```

使用场景：过滤联合类型的成员。

## 5. Extract — 从联合类型中提取

```typescript
type Status = "pending" | "active" | "deleted" | "banned";

// 只提取活跃状态
type GoodStatus = Extract<Status, "active" | "pending">;
// "active" | "pending"
```

使用场景：提取特定的联合类型成员。

## 6. NonNullable — 排除 null 和 undefined

```typescript
type MaybeString = string | null | undefined;

// 确保是 string
type DefinitelyString = NonNullable<MaybeString>;
// string
```

使用场景：处理可能为空的类型。

## 7. ReturnType — 提取函数返回类型

```typescript
function createUser() {
  return {
    id: crypto.randomUUID(),
    name: "New User",
    createdAt: new Date(),
  };
}

// 自动推断返回类型
type User = ReturnType<typeof createUser>;
// { id: string; name: string; createdAt: Date }
```

使用场景：避免手动定义函数返回类型。

## 8. Parameters — 提取函数参数类型

```typescript
function greet(name: string, greeting: string = "Hello") {
  return `${greeting}, ${name}!`;
}

// 提取参数类型
type GreetParams = Parameters<typeof greet>;
// [name: string, greeting: string]
```

使用场景：创建包装函数或高阶函数。

## 9. Awaited — 解包 Promise 类型

```typescript
type FetchResult = Promise<{ data: User[]; total: number }>;

// 提取 Promise 内部类型
type Result = Awaited<FetchResult>;
// { data: User[]; total: number }
```

使用场景：处理异步函数的返回类型。

## 10. ConstructorParameters — 提取构造函数参数

```typescript
class UserService {
  constructor(
    private apiUrl: string,
    private timeout: number = 5000
  ) {}
}

// 提取构造函数参数
type UserServiceParams = ConstructorParameters<typeof UserService>;
// [apiUrl: string, timeout?: number]
```

使用场景：工厂函数或依赖注入。

## 组合使用

这些工具类型可以组合使用，创建更复杂的类型：

```typescript
interface Article {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  tags: string[];
  publishedAt: Date;
  updatedAt: Date;
}

// 创建文章摘要
type ArticleSummary = Pick<Article, "id" | "title" | "tags" | "publishedAt">;

// 创建更新 DTO
type UpdateArticle = Partial<Omit<Article, "id" | "author">>;

// 创建创建 DTO
type CreateArticle = Omit<Article, "id" | "publishedAt" | "updatedAt">;
```

## 自定义工具类型

基于内置类型，可以创建自己的工具类型：

```typescript
// 深度 Partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 深度 Readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 可为空的类型
type Nullable<T> = T | null;

// 可为空的 Record
type NullableRecord<K extends keyof any, T> = Record<K, T | null>;
```

## 总结

TypeScript 内置工具类型的价值：

1. **减少重复** — 不用手动定义相似的类型
2. **保持一致** — 类型之间有关联，修改一处自动更新
3. **提高可读性** — 语义化的类型名称
4. **编译时安全** — 类型错误在编译时被捕获

掌握这些工具类型，能让你的 TypeScript 代码更简洁、更安全、更易维护。

---

*写于一个把 200 行类型定义简化成 50 行的下午。*
