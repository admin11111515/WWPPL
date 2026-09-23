---
title: "给站点搜索加了 Ctrl+K"
published: 2026-08-10
tags: ["前端", "交互", "搜索"]
category: "技术"
description: "给博客搜索加了 Ctrl+K，起因是有人找不到搜索框。"
image: "/images/covers/tech-search-shortcut-ctrl-k.jpg"
---
博客搜索原来只能点导航栏那个放大镜，全站 66 篇就靠这一个入口。我一直用，没觉得缺什么。直到有天留言板有人问"搜索在哪"，我才意识到不是人人都看得见那个图标。

按 Ctrl+K（Mac 上是 Command+K）直接唤起搜索框，输入框自动聚焦。实现其实很短：

```js
window.addEventListener("keydown", (e) => {
	const isMac = navigator.platform.toUpperCase().includes("MAC");
	const mod = isMac ? e.metaKey : e.ctrlKey;
	if (mod && e.key.toLowerCase() === "k") {
		e.preventDefault();
		openSearch();
	}
});
```

有个坑我第一次没拦 `preventDefault`，在 Chrome 里 Ctrl+K 默认是"把焦点移到地址栏"，浏览器把按键抢走了，搜索框死都弹不出来。后来在 issue 里看到也有人遇到，底下回复就一句"加个 preventDefault 就好了"，服了。

我还加了 Escape 关闭。这个后来才想起来——打开了关不掉比没打开还烦。搜索框占位文字里我写了"Ctrl K"几个字，因为没提示的话这功能等于不存在，知道的人会试，不知道的人永远按不出来。手机上没 Ctrl 键，我按宽度判断，窗口窄于 768px 就不显示这行提示，省得是噪音。

说实话加这个的起因就是有人找不到搜索框，说明原来的入口不够显眼。我顺手把搜索图标往左挪了一点，离常用的几个按钮更近。结果我做了一堆快捷键的活，最后发现该改的是图标位置。
