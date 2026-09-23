---
title: "TypeScript 类型体操，我用到哪算哪"
published: 2026-07-03
tags: ["TypeScript", "类型系统", "前端"]
category: "TypeScript"
description: "条件类型、infer、映射类型——哪些天天写，哪些只是面试前背过。"
image: "/images/covers/typescript-typescript-type-gymnastics.jpg"
---

这篇原本想写"TypeScript 高级类型技巧大全"，写到第 4 个就写不下去了——因为后面那几个我项目里真没怎么用过，硬写像在背文档。所以照实讲：哪些是我天天写的，哪些是我抄来抄去的那几个，哪些纯粹背过又忘了。

条件类型是我用得最勤的。后台有个接口，传 `"user"` 返回用户结构，传 `"post"` 返回文章结构，我用 `T extends "user" ? ... : ...` 让返回类型跟着参数变：

```typescript
type ApiResponse<T extends "user" | "post"> = 
  T extends "user" 
    ? { id: string; name: string; email: string }
    : { id: string; title: string; content: string };

async function fetchApi<T extends "user" | "post">(type: T): Promise<ApiResponse<T>> {
  const response = await fetch(`/api/${type}`);
  return response.json();
}
```

第一次用这个是因为线上出过一次事故：前端拿到响应后按 user 取 `email`，结果后端那次返回的是 post，运行时直接 `undefined.email` 崩了。类型层面把分支锁死之后，这种事编译期就报了。

模板字面量类型我试过一次就放下了。TypeScript 4.1 才支持这特性，我想用它自动拼事件名和 CSS 类名：

```typescript
type EventName = "click" | "focus" | "blur";
type EventHandler = `on${Capitalize<EventName>}`;
type Spacing = "sm" | "md" | "lg";
type PaddingClass = `p-${Spacing}`;
```

写出来挺酷，但团队里没人记得住这套映射，改起来比直接写字符串还慢。后来这部分我退回了普通 union + 注释。类型体操的边界大概就在这：自己爽，但别人接手就骂。

映射类型我基本只用内置的 `Partial` 和 `Omit`，手写的 `DeepPartial` 每个项目抄一遍：

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

用在处理嵌套配置对象的部分更新。有次我写成 `Omit<Partial<User>, "id">` 而不是 `Partial<Omit<User, "id">>`，看着差不多，实际一个先全变可选再去 id，一个先去 id 再全变可选，类型推导出来的东西不一样，在表单里被它咬了半小时才记住。

`infer` 我只真用 `ReturnType` 和 `UnwrapPromise`：

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type ArrayElement<T> = T extends (infer U)[] ? U : never;
```

起因是老项目里一个函数返回对象被 3 个文件依赖，改字段改漏一处，编译没抓到，跑到那步才炸。加了 `ReturnType` 之后改一处全跟着变。`ArrayElement` 我是想从数组字面量反推元素类型时用的：

```typescript
const users = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
type User = ArrayElement<typeof users>;
```

类型守卫我留着做 API 响应校验。`isSuccess(response)` 之后 TS 才知道里面有 `data` 还是 `message`，否则 `fetch` 回来的 `unknown` 后面没法写：

```typescript
function isSuccess(response: ApiResponse): response is SuccessResponse {
  return response.status === "success";
}
```

这个不是炫技，是收窄 `unknown` 必须要走的一步。

递归类型、泛型约束那些更花哨的，我背过，然后忘了。同事阿松有次在代码评审里说："你这类型我 review 了 20 分钟没看懂。" 那之后我定了个规矩：类型写出来如果我自己两周后看要重新想，就拆回简单的。
