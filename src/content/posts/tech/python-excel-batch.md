---
title: "用 Python 批量整理 Excel，比想象中简单"
published: 2026-07-21
tags: ["Python", "Excel", "自动化"]
category: "技术"
description: "五百个订单表，四十行 pandas 代码，半分钟跑完。"
image: "/images/covers/tech-python-excel-batch.jpg"
---
帮人处理一批表格：五百多个 Excel 文件，每个是一天的订单，要汇总成一张总表，再按客户分组统计。手工做估计得两三天。我一开始以为 pandas 一行 `concat` 就完事，写出来跑了半分钟。

读文件的代码：

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

关键是 `dtype=str`。不写这个，pandas 会自动猜类型，订单号那种纯数字的会被转成整数，前导零没了，科学计数法也是它干的。代价是要自己处理数字转换，但能躲掉后面一堆莫名其妙的匹配不上。

分组统计：

```python
summary = (
    all_df.groupby("客户")
    .agg(订单数=("订单号", "count"), 金额合计=("金额", lambda s: pd.to_numeric(s).sum()))
    .reset_index()
    .sort_values("金额合计", ascending=False)
)
```

其实踩到的坑都不高级。有些表第一行是合并标题，读进来多一行全是 NaN，读完删掉首列全空的行就好。五百个文件里同一列有两种列名，"客服备注"和"客服备注 "（尾部空格），读进来先统一去空格再做后续，不然按列名取会有几百行取不到。还有些表末尾几行是空的，pandas 当有效行读进来，计数偏大，加个 `dropna(how="all")` 解决。

同事看我写这脚本，说："你这活儿手工得做两天吧。" 我说半分钟，他不信。

五百个文件，四十行代码，跑了 32 秒。手工的话我估计得请两天假。
