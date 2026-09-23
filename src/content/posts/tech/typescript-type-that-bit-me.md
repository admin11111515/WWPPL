---
title: "TypeScript 里让我栽过跟头的一个类型"
published: 2026-07-24
tags: ["TypeScript", "类型系统", "踩坑"]
category: "技术"
description: "看起来完全正确的代码，编译通过，运行时炸了。"
image: "/images/covers/tech-typescript-type-that-bit-me.jpg"
---
事情是这样的。写了个函数从一组数据取某个字段，加了层防御：

```ts
function pickValue(rows: Row[], key: keyof Row): string {
  const row = rows[0];
  if (!row) return "";
  return String(row[key] ?? "");
}
```

编译过，测试过。上线之后有段数据 rows 是空数组，返回空字符串，下游按"空值"处理了。但业务上"没有数据"和"数据为空值"是两码事：前者该报错，后者才静默过。这个 bug 我查了快一下午，最后发现是空数组在类型层面完全合法，编译器压根没义务提醒我。

类型签名只说了"输入输出是什么"，没说"什么情况下会发生什么"。空数组这个状态它合法得很，编译期爱莫能助。

后来我改成两个写法。一个是用类型把"可能没有"显式说出来：

```ts
function firstRow(rows: Row[]): Row | undefined {
  return rows[0];
}
```

拿到 `Row | undefined`，调用方就必须处理这个分支。还有个编译选项 `noUncheckedIndexedAccess`，默认是关的，开了之后 `rows[0]` 的类型自动变 `Row | undefined`，逼你处理越界。这选项一开，一大片老代码哗哗报错，但报的错都是真问题。

另一个写法是给"没有"和"空值"分两个类型：

```ts
type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
```

返回值不再是字符串，而是明确的成功/失败。调用方想忽略失败都做不到，因为取 value 前必须先判 ok。

我那同事看了改完的代码说"你这是把注释写进类型里了"，我想想还真是——以前我在函数上面写"空数组要报错"，没人看；现在不写都不行。类型系统保证不了"业务对"，但能把"业务上必须判断的地方"从隐性变显性。
