import type { AnnouncementConfig } from "../types/announcementConfig";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题
	title: "📢 欢迎来访者",

	// 公告内容
	content: "👋🏻 Hi，欢迎来到 WWPPL 的博客！",

	// 是否允许用户关闭公告
	// 2026-09-27 起为 true：原来只有一句常驻欢迎语，关不掉；现在可关，
	// 且关闭状态记在 sessionStorage —— 换页依然生效，关掉标签页即复位。
	closable: true,

	link: {
		// 启用链接
		enable: true,
		// 链接文本
		text: "了解更多",
		// 链接 URL
		url: "/about/",
		// 内部链接
		external: false,
	},
};
