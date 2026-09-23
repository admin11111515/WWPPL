---
title: "TypeScript 工具类型，我真正用上的就 5 个"
published: 2026-06-25
tags: ["TypeScript", "类型", "前端"]
category: "TypeScript"
description: "剩下那些我背过，然后又忘了。"
image: "/images/covers/typescript-typescript-utility-types.jpg"
---

这篇本来打算写"10 个你可能不知道的工具类型"，列到一半心虚了：那 10 个里，我在项目里真正用过的只有 5 个。

所以下面照实写——哪些是在用的，哪些只是我读过文档。

## 每天在用的

Pick 和 Omit 这两个，占我所有工具类型用量的八成。

后台列表页要返回精简数据，接口契约里那张大表只想要 4 个字段：

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  createdAt: Date;
  lastLoginAt: Date;
  level: number;
}

type UserRow = Pick<User, "id" | "name" | "email" | "level">;
```

Omit 用得更凶，基本是冲着"别把密码发出去"这件事去的：

```typescript
type PublicUser = Omit<User, "password">;
```

上次就是因为漏了这一个 Omit，接口把 `password` 一起返回了。页面没显示，但浏览器网络面板里能看到明文。改完之后我给自己加了条规矩：任何返回用户对象的接口，类型上先把敏感字段 Omit 掉再说。

Partial 我用在表单草稿上。用户填一半跑了，我存的是 `Partial<FormData>`，提交时再校验完整性。这样"存草稿"和"提交"能共用一套类型，不用维护两份。

## 用过，但得查文档才想得起来

Record 只在写权限映射的时候用过：

```typescript
type Role = "admin" | "editor" | "guest";
type Permissions = Record<Role, string[]>;
```

好处是我漏写一个角色，编译就报错。以前用 `{ [key: string]: string[] }` 的时候漏了不报，线上才发现 guest 是 undefined。

ReturnType 用到的次数一只手数得过来，但每次都救命——想复用某个函数的返回值类型，又不想再抄一遍。

```typescript
function createUser() {
  return { id: crypto.randomUUID(), name: "新用户", createdAt: new Date() };
}

type User = ReturnType<typeof createUser>;
```

起因是一个老项目里，这个函数返回的对象被 3 个文件依赖。后来改字段改漏了一处，编译没抓住，运行到那一步才炸。加了 `ReturnType` 之后改一处就全跟着变。

## 读过文档，项目里一次没用过

`Exclude`、`Extract`、`NonNullable`、`Awaited`、`ConstructorParameters`。

这 5 个我读的时候都点头了，之后一次都没用过。

`NonNullable` 我本来以为会常用，结果发现只要在类型上排除掉 `null`，代码里就得到处写判断——不如一开始就别让它可能是 `null`。

`ConstructorParameters` 更别提。我上一个 `class` 是两年前写的，现在全是函数和对象。

## 算手写的，不算内置

`DeepPartial` 和 `DeepReadonly` 每个项目都要抄一遍：

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

我一般丢在 `src/types/utils.d.ts` 里，新项目初始化就拷过去。

还有个教训是 `Partial<Omit<User, "id">>` 这种嵌套——一开始我写成 `Omit<Partial<User>, "id">`，看起来差不多，实际前者是"先去掉 id 再全部变可选"，后者是"全部变可选之后再去掉 id"。类型上结果是像的，但推导出来的东西不一样。我是在一个表单组件里被它咬了半小时才记住的。
