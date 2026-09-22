---
title: "给站点搜索加了 Ctrl+K"
published: 2026-08-10
tags: ["前端", "交互", "搜索"]
category: "技术"
description: "一个键盘快捷键，第一次用的人的猜中率差别很大。"
image: "api"
---
博客的搜索原来只能点导航栏的放大镜图标。我一直在用，没觉得有问题。直到有人在留言板问"搜索在哪"。

## 加的东西

按 Ctrl+K（在 Mac 上是 Command+K）直接唤起搜索框，输入框自动聚焦。

实现很短：

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

## 几个细节

**一定要 preventDefault。** 在 Chrome 里 Ctrl+K 是"把焦点移到地址栏"，不拦掉的话浏览器会抢走这个按键，你搜不了。

**同时支持 Escape 关闭。** 打开了但关不掉比没打开更烦人。

**要不要写提示？** 我在搜索框的占位文字里加了"Ctrl K"这几个字。如果没有提示，这个功能等于不存在——知道的人自己会试，不知道的人永远不会按。

**移动端不显示提示。** 手机上根本没有 Ctrl 键，写上去是噪音。我按宽度判断，窄屏就不显示这行提示。

## 一点想法

快捷键这类功能，价值在于"用的人觉得很顺"，不在于"有"。而且它有个临界点：如果站内导航本身清楚，快捷键只是锦上添花；如果导航本来乱，快捷键解决不了问题。

加这个的起因是有人找不到搜索框，这说明原来的入口不够明显。所以我还顺手把搜索图标往左移了一点，离常用的几个按钮更近了一些。

快捷键是加分项，入口清楚才是基本功。别用快捷键去补入口的问题。
