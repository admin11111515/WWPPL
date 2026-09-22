---
title: "TypeScript 类型体操：从入门到放弃再到真香"
published: 2026-07-03
tags: ["TypeScript", "类型系统", "前端"]
category: "TypeScript"
description: "分享几个实用的 TypeScript 高级类型技巧，让你的代码更安全、更优雅。"
image: "auto"
---

## 前言

TypeScript 的类型系统是一把双刃剑。用得好，它能帮你在编译时捕获无数 bug；用得不好，你会在类型错误的海洋里迷失方向。

这篇文章不讲理论，直接上实战中真正有用的类型技巧。

## 1. 条件类型：让类型学会判断

```typescript
// 根据输入类型返回不同的结果
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<42>;      // false
```

实战场景：API 响应类型根据参数不同而不同。

```typescript
type ApiResponse<T extends "user" | "post"> = 
  T extends "user" 
    ? { id: string; name: string; email: string }
    : { id: string; title: string; content: string };

async function fetchApi<T extends "user" | "post">(type: T): Promise<ApiResponse<T>> {
  const response = await fetch(`/api/${type}`);
  return response.json();
}

// 自动推断返回类型
const user = await fetchApi("user"); // { id: string; name: string; email: string }
const post = await fetchApi("post"); // { id: string; title: string; content: string }
```

## 2. 模板字面量类型：字符串的类型安全

```typescript
type EventName = "click" | "focus" | "blur";
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"
```

实战场景：自动生成 CSS 类名。

```typescript
type Spacing = "sm" | "md" | "lg";
type Direction = "top" | "right" | "bottom" | "left";
type PaddingClass = `p-${Direction}-${Spacing}`;
// "p-top-sm" | "p-top-md" | "p-top-lg" | "p-right-sm" | ...
```

## 3. 映射类型：批量修改类型属性

```typescript
// 把所有属性变成可选
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// 把所有属性变成只读
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

实战场景：创建 API 的不同版本。

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// 公开 API 版本，隐藏敏感字段
type PublicUser = Omit<User, "password">;

// 创建用户时，id 由服务器生成
type CreateUserDto = Omit<User, "id">;

// 更新用户时，所有字段都是可选的
type UpdateUserDto = Partial<Omit<User, "id">>;
```

## 4. infer 关键字：从类型中提取信息

```typescript
// 提取函数返回类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 提取 Promise 内部类型
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type A = UnwrapPromise<Promise<string>>; // string
type B = UnwrapPromise<number>;          // number
```

实战场景：提取数组元素类型。

```typescript
type ArrayElement<T> = T extends (infer U)[] ? U : never;

const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

type User = ArrayElement<typeof users>;
// { id: number; name: string }
```

## 5. 递归类型：处理深层嵌套

```typescript
// 深度 Partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 深度 Readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

实战场景：处理嵌套的配置对象。

```typescript
interface Config {
  database: {
    host: string;
    port: number;
    credentials: {
      username: string;
      password: string;
    };
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
}

// 部分配置更新
function updateConfig(config: DeepPartial<Config>): void {
  // 可以只更新 database.host，其他保持不变
}

updateConfig({
  database: {
    host: "new-host.example.com",
  },
});
```

## 6. 类型守卫：运行时类型检查

```typescript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function processValue(value: string | number) {
  if (isString(value)) {
    // TypeScript 知道这里 value 是 string
    console.log(value.toUpperCase());
  } else {
    // TypeScript 知道这里 value 是 number
    console.log(value.toFixed(2));
  }
}
```

实战场景：API 响应验证。

```typescript
interface SuccessResponse {
  status: "success";
  data: unknown;
}

interface ErrorResponse {
  status: "error";
  message: string;
}

type ApiResponse = SuccessResponse | ErrorResponse;

function isSuccess(response: ApiResponse): response is SuccessResponse {
  return response.status === "success";
}

async function handleResponse(response: ApiResponse) {
  if (isSuccess(response)) {
    // TypeScript 知道这里有 data
    console.log(response.data);
  } else {
    // TypeScript 知道这里有 message
    console.error(response.message);
  }
}
```

## 总结

TypeScript 类型系统的价值不在于炫技，而在于：

1. **提前发现错误** — 编译时而不是运行时
2. **更好的 IDE 支持** — 自动补全、重构、跳转
3. **代码即文档** — 类型就是最好的文档
4. **重构信心** — 改了类型，所有用到的地方都会报错

类型体操的最高境界是：**写出来的类型让人一看就懂，而不是让人想放弃。**

---

*写于一个被类型错误折磨了三小时的深夜。*
