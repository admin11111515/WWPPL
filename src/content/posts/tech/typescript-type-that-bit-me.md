---
title: "TypeScript 里让我栽过跟头的一个类型"
published: 2026-07-24
tags: ["TypeScript", "类型系统", "踩坑"]
category: "技术"
description: "看起来完全正确的代码，编译通过，运行时炸了。"
image: "/images/covers/tech-typescript-type-that-bit-me.jpg"
---
事情是这样的。我写了一个函数，从一组数据里取出某个字段，加了一层防御：

```ts
function pickValue(rows: Row[], key: keyof Row): string {
  const row = rows[0];
  if (!row) return "";
  return String(row[key] ?? "");
}
```

编译通过，测试也过。上线之后，有一段数据里 rows 是空数组，返回空字符串，下游按"空值"处理了——但业务上"没有数据"和"数据为空值"是两件不同的事，前者应该报错，后者才是静默通过。这个 bug 排查了很久。

## 问题在哪

类型签名没错，但类型签名只说了"输入什么、输出什么"，没说"什么情况下会发生什么"。空数组这个状态在类型层面是完全合法的，编译期根本没有义务提醒我。

## 后来我学到的两个写法

**第一，用类型把"可能没有"显式表达出来。**

```ts
function firstRow(rows: Row[]): Row | undefined {
  return rows[0];
}
```

然后调用方拿到 `Row | undefined`，就必须处理这个分支。注意 `noUncheckedIndexedAccess` 这个编译选项：它是关的，开了之后 `rows[0]` 的类型自动变成 `Row | undefined`，逼你处理越界。这个选项会让一大片老代码报错，但报的错都是真问题。

**第二，区分"没有"和"空值"用两个不同的类型。**

```ts
type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
```

返回值不再是一个字符串，而是一个明确的成功/失败。调用方想忽略失败都做不到，因为取 value 之前必须先判断 ok。

## 想法

类型系统能保证的只有"结构对"，保证不了"业务对"。但可以用它把"业务上必须做判断的地方"从隐性变成显性——判断写不出来就编译不过。

这比写注释管用，注释可以不看。
