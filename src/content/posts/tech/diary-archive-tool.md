---
title: "写了个小工具，把日记按月归档"
published: 2026-08-04
tags: ["工具", "Node.js", "脚本"]
category: "技术"
description: "日记按天写，文件越堆越多，写了个脚本按月分到子目录，四十行。"
image: "/images/covers/tech-diary-archive-tool.jpg"
---
我的日记按天写，文件名是日期：

`
2026-08-01.md
2026-08-02.md
2026-08-05.md
`

时间一长，一个目录堆几百个文件，找东西累。我想按月份丢进子目录。

手工做，每个月拖一次，一次几十个文件。能干，但一定忘。我写了个脚本：

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
```

核心三件事：正则筛出日期格式的文件、按年月建目录、移动。

我只用正则筛，不用"其他都处理"的思路。目录里常混着图片、读书笔记、临时文件，只动符合 `YYYY-MM-DD.md` 的，其余不管。批量脚本一旦自作聪明，必定误伤。

用 rename 不用复制再删。同盘下 rename 瞬间完成，复制再删要真读写一遍，文件多了差别明显。

已经归档的不重跑。只扫顶层目录，进子目录的不会被再扫到，天然幂等，重复跑没副作用。

后来加了个预览模式，传 `--dry` 只打印"会把哪个文件移到哪"，不真动。这是我另一个脚本的教训：有回写错目标路径，把两百个文件全挪进同一个目录，名字冲突，覆盖掉一批。我当时对着终端骂了句"完了，白干半天"，从那以后凡批量移动都先跑预览。

四十行代码，换掉每个月一次的手工活。这种小工具值不值，不看技术含量，看它能不能让你从此不想这事。
