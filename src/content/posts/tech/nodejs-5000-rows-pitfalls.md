---
title: "Node.js 处理 5000 行表格，我踩的坑"
published: 2026-08-07
tags: ["Node.js", "数据处理", "踩坑"]
category: "技术"
description: "内存、编码、日期格式，一个比一个阴险。"
image: "/images/covers/tech-nodejs-5000-rows-pitfalls.jpg"
---
接手一个活：把五千行订单表格读进来，做筛选和分类，再导出。数据量不大，本来以为半小时的事，做了一下午。

## 坑一：一次读全部

第一版写得很直接：

```js
const rows = XLSX.utils.sheet_to_json(worksheet);
const result = rows.map(process).filter(Boolean);
```

五千行没炸，但内存占用明显上去了，而且这个写法在数据变成五万行时会直接崩。

后来改成流式读，一次处理一批：

```js
let batch = [];
for (const row of rows) {
  batch.push(row);
  if (batch.length >= 500) {
    await processBatch(batch);
    batch = [];
  }
}
if (batch.length) await processBatch(batch);
```

五千行的场景下，这个改动的实际收益是内存峰值降了几十 MB，主要意义是写法上"能长大"。

## 坑二：日期被吃掉

表格里的日期是 `2026-08-01` 这种，读进来变成了一个数字，像 `46205`。这是 Excel 把日期存成了序列号。

解决是读的时候显式指定按文本读，或者读进来之后做一次转换。我选了前者，因为转换要处理时区，容易差一天。

## 坑三：编码

有一列客户名，读进来出现了"?"。原表是 GBK 导出的，按 UTF-8 解码就乱。

这个没法在数据层面修，只能读的时候按正确编码解。所以要提前确认源文件的编码，而不是读进来之后发现不对再说——那时候信息已经丢了。

## 坑四：看起来一样的两个值

有列字段叫"已制作"，还有一列叫"已制作 "（尾随空格）。代码里按字段名取值，取到的一直是 undefined。

处理方式统一先 trim 一遍。这种问题不看真实数据是想不到的。

## 教训

数据处理的难度不在代码，在数据本身的脏。我的做法变成了：动手写逻辑之前，先随机抽三十行打印出来看。看一遍就能发现一半的不一致。

剩下那一半，只能等它出错。
