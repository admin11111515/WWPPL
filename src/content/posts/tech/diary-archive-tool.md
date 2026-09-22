---
title: "写了个小工具，把日记按月归档"
published: 2026-08-04
tags: ["工具", "Node.js", "脚本"]
category: "技术"
description: "四十行代码，解决一个天天要做的手工活。"
image: "api"
---
我的日记是按天写的，文件名是日期，像这样：

`
2026-08-01.md
2026-08-02.md
2026-08-05.md
`

时间一长，一个目录里堆几百个文件，找东西很累。我想按月份分到子目录里。

手工做的话，每个月拖一次，一次几十个文件。做是能做，但一定会忘。

## 脚本

```js
import fs from "node:fs";
import path from "node:path";

const DIR = "./日记";

for (const name of fs.readdirSync(DIR)) {
	if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) continue;

	const [year, month] = name.split("-");
	const target = path.join(DIR, year, month);
	fs.mkdirSync(target, { recursive: true });
	fs.renameSync(path.join(DIR, name), path.join(target, name));
}

console.log("归档完成");
```

核心就三件事：用正则筛出符合日期格式的文件、按年月生成目录、移动。

## 几个让它更耐用的细节

**只用正则筛，不用"其他都处理"的思路。** 目录里可能混着别的东西——图片、读书笔记、临时文件。只动符合 `YYYY-MM-DD.md` 格式的，其余的不管。这个原则很重要：批量脚本一旦"自作聪明"，就一定会误伤。

**用 rename 不用复制再删除。** 同一个磁盘下 rename 是瞬间完成的，复制再删要真读写一遍，文件多了差别很明显。

**已经归档的不重跑。** 因为只扫顶层目录，已经进到子目录里的文件不会再被扫到，天然幂等，重复运行没有副作用。

## 后来加了一步

跑了几次之后，我加了个"预览模式"：加 `--dry` 参数时只打印"会把哪个文件移到哪"，不做实际操作。

这个是我另外一个脚本的教训——有一次写错了目标路径，它把两百个文件移到同一个目录下，名字冲突，覆盖掉了一批。有预览模式就不会发生。

四十行代码，省掉了每个月重复一次的手工活。这种小工具的价值不在技术含量，在于它一天都不用你操心。
