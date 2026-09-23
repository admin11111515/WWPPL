---
title: "重构一段 300 行的旧代码"
published: 2026-08-20
tags: ["重构", "代码质量", "实践"]
category: "技术"
description: "三个月前写的 300 行函数，一个下午拆成 4 个文件，行数没少但改 bug 快了。"
image: "/images/covers/tech-refactoring-300-lines.jpg"
---
这个函数是三个月前写的，干六件事。当时心里想的是"先能跑再说"，一层层往上叠，叠到后来自己都不敢打开看。

上周三下午产品又报了个 bug 落在这函数里，我盯着那 300 多行，服了，决定重来。

我做的第一件事是什么都不动，从第一行读到最后一行，在旁边写注释：这段在干嘛。

读完发现它干了六件事：读文件、校验数据、清洗字段、按规则分组、调接口、写结果。三百行里真正费脑子的只有"按规则分组"那一段，其余五段都是直来直去的流程，纯体力活。

拆成六个函数，主函数变成这样：

```js
async function run(input) {
	const raw = await readInput(input);
	const valid = validateRows(raw);
	const cleaned = cleanFields(valid);
	const groups = groupByRule(cleaned);
	await sendGroups(groups);
	writeResult(groups);
}
```

主函数从三百行变成六行。说实话这倒不是最要紧的，要紧的是现在每一步能单独跑测试了。

过程中顺手改了三处。原来散落着 `> 20`、`=== 3`、`slice(0, 5)` 这种判断，看完谁也不知道 20 是什么，我把它提成命名常量，比如 `MAX_RETRY = 3`。原来最多嵌了五层 if，最后一层的 else 我根本对不上是哪个 if 进来的，改成提前返回之后最多两层。还有报错信息，以前出错就一句"数据异常"，现在会告诉你第几行、哪个字段、期望什么。

老陈路过看了一眼，说"你这注释比代码还多"，我说那也比三个月前那坨强。

拆完是 4 个文件，总行数还是三百出头——行数一点没少。但昨天又来一个 bug，我直接打开 `groupByRule`，看了一分钟就改完了。三个月前那版，我得在那三百行里翻十分钟，还不一定敢动。
