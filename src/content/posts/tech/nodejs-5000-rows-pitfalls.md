---
title: "Node.js 处理 5000 行表格，我踩的坑"
published: 2026-08-07
tags: ["Node.js", "数据处理", "踩坑"]
category: "技术"
description: "内存、编码、日期格式，每个都阴险，最阴险的是脏数据本身。"
image: "/images/covers/tech-nodejs-5000-rows-pitfalls.jpg"
---
接手个活：把五千行订单表格读进来，筛选分类再导出。数据量不大，我跟搭档吹牛说"五千行而已，半小时搞定"，结果做了一下午。

第一版写得很直接：

```js
const rows = XLSX.utils.sheet_to_json(worksheet);
const result = rows.map(process).filter(Boolean);
```

五千行没炸，但内存明显上去了，而且数据变成五万行时这套写法直接崩。后来改成流式，一批一批处理：

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

五千行场景下实际收益是内存峰值降了几十 MB，主要意义是写法上"能长大"。

Excel 把日期存成了数字。表里是 `2026-08-01`，读进来变成 `46205` 这种。这是 Excel 把日期存成序列号了。我选了读的时候显式按文本读，因为转回来要处理时区，容易差一天。

还有一列客户名，读进来出现一堆"?"。原表是 GBK 导出的，按 UTF-8 解码就乱。这没法在数据层面修，只能读的时候按正确编码解。所以源文件编码得提前确认，等读进来发现不对再说，信息已经丢了。

最阴的是两个长得一样、其实不一样的字段。"已制作"和"已制作 "（尾随空格），代码按字段名取值，取到的一直是 undefined。处理方式统一先 trim 一遍。这种坑不看真实数据根本想不到。

动手写逻辑之前，我先随机抽三十行打印出来看。看一遍能发现一半的不一致。剩下那一半，只能等它出错。
