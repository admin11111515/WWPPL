import type { AnnouncementConfig } from "../types/announcementConfig";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题（图标由 Announcement 组件补，这里只写文字）
	title: "欢迎来访者",

	// 公告内容（开头的挥手图标同样由 Announcement 组件补，理由见上面的 title）
	//
	// 长度不是随便定的：公告卡片正文区只有 222px、16px 字号，
	// 第一行的断点固定在「…的博」后（196px），所以**两行的总宽上限是 418px**——
	// 418px 起会翻成三行，末行反而只剩「的。」两字，比原来更难看。
	// 390–415px 是两行都占满的甜区。这段现为 387px（两行各占 88% / 86%）。
	// 改动后跑 `node _gen/_公告栏断行测量.mjs` 复核，别凭手感加字。
	content: "Hi，欢迎来到 WWPPL 的博客！这里都是我做完的事。",

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
