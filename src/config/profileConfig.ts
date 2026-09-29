import type { ProfileConfig } from "../types/profileConfig";
import { siteInfo } from "./siteInfo";

export const profileConfig: ProfileConfig = {
	// 头像
	// 图片路径支持三种格式：
	// 1. public 目录（以 "/" 开头，不优化）："/assets/images/avatar.webp"
	// 2. src 目录（不以 "/" 开头，自动优化但会增加构建时间，推荐）："assets/images/avatar.webp"
	// 3. 远程 URL："https://example.com/avatar.jpg"
	avatar: "/assets/avatar.png",

	// 名字
	// 后台「站点信息」页可改，值存在 src/data/siteInfo.json。
	// 显示在：页脚版权行「© 2026 ___ All Rights Reserved.」、侧边栏资料卡。
	// **不能为空** —— 空了页脚版权行会缺一块
	name: siteInfo.authorName,

	// 个人签名
	// 后台「站点信息」页（/admin/site/）可改，值存在 src/data/siteInfo.json。
	// 显示在侧边栏资料卡头像下面。
	bio: siteInfo.bio,

	// 链接配置
	// 已经预装的图标集：fa7-brands，fa7-regular，fa7-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
	links: [
		{
			name: "QQ",
			icon: "fa7-brands:qq",
			url: "https://wpa.qq.com/msgrd?v=3&uin=3057067320",
			showName: false,
		},
		{
			name: "Email",
			icon: "fa7-solid:envelope",
			url: "mailto:3057067320@qq.com",
			showName: false,
		},
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/admin11111515",
			showName: false,
		},
		{
			name: "RSS",
			icon: "fa7-solid:rss",
			url: "/rss/",
			showName: false,
		},
	],
};
