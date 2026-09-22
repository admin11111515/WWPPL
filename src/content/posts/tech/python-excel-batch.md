---
title: "用 Python 批量整理 Excel，比想象中简单"
published: 2026-07-21
tags: ["Python", "Excel", "自动化"]
category: "技术"
description: "五百个表格文件，用四十行代码处理完。"
image: "/images/covers/tech-python-excel-batch.jpg"
---
帮人处理一批表格：五百多个 Excel 文件，每个是一天的订单，需要汇总成一张总表，还要按客户分组统计。

手工做的话大概是两三天。用 Python 写了四十行，跑了半分钟。

## 读文件

```python
import pandas as pd
from pathlib import Path

files = sorted(Path("订单").glob("*.xlsx"))
frames = []
for f in files:
    df = pd.read_excel(f, dtype=str)
    df["来源文件"] = f.name
    frames.append(df)
all_df = pd.concat(frames, ignore_index=True)
```

关键点是 `dtype=str`。不写这个，pandas 会自动猜类型，订单号那种纯数字的会被转成整数，前导零就没了，变成科学计数法也是它干的。这一行的代价是要自己处理数字转换，但能避免后面一堆莫名其妙的匹配不上。

## 分组统计

```python
summary = (
    all_df.groupby("客户")
    .agg(订单数=("订单号", "count"), 金额合计=("金额", lambda s: pd.to_numeric(s).sum()))
    .reset_index()
    .sort_values("金额合计", ascending=False)
)
```

## 踩的坑

**合并单元格。** 有些表的第一行是合并标题，读进来会多出一行全是 NaN。我的处理是读完之后删掉首列全空的行。

**列名不一致。** 五百个文件里，同一列的列名有两种写法，一种是"客服备注"，一种是"客服备注 "（尾部带空格）。读进来之后先统一去空格，再做后续处理。这一步不做的话，按列名取值会有几百行取不到。

**末尾的空行。** 有些表最后几行是空的，但 pandas 会当有效行读进来，导致计数偏大。加一个 `dropna(how="all")`。

## 结论

数据清洗这类活儿，用 Python 主要是省时间。真正花时间的不是写代码，是想清楚数据里有哪些不一致的地方——这一步只能靠先抽样看几十条真实数据，看不出来就一定会返工。
