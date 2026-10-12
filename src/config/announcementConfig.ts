import type { AnnouncementConfig } from "../types/announcementConfig";

/**
 * 侧栏公告。
 *
 * ⚠️ 数据**不写在这个文件里**：写在 `.ts` 里后台就改不了（同类的坑踩过四次：
 *    项目页、相册页、友链页，以及 2026-10-12 盘点出来的公告/技能/打赏）。
 *    现在后台 `/admin/announcement/` 直接读写 `src/data/announcement.json`。
 *
 * ⚠️ 加字段：改 types/announcementConfig.ts（接口）+ announcement.json（数据）
 *    + 后台页的表单（三处一起改）。
 *
 * ⚠️ 关于正文长度（2026-09-27 定的，改文案前先读完）：
 *    公告卡片正文区只有 222px、16px 字号，第一行的断点固定在「…的博」后（196px），
 *    所以**两行的总宽上限是 418px**——418px 起会翻成三行，末行反而只剩「的。」两字，
 *    比原来更难看。390–415px 是两行都占满的甜区。
 *    后台表单里有一条**实时宽度提示**（估算）；改完还可以跑
 *    `node _gen/_公告栏断行测量.mjs` 复核，别凭手感加字。
 */
import announcementJson from "../data/announcement.json";

/** JSON 是**扁平**的（后台表单按 key 读写），这里组装成组件要的嵌套形状 */
interface AnnouncementJson {
	title?: string;
	content?: string;
	closable?: boolean;
	linkEnable?: boolean;
	linkText?: string;
	linkUrl?: string;
	linkExternal?: boolean;
}

/** 「写坏」时退回的默认值（与 JSON 初值一致） */
const FALLBACK = {
	title: "欢迎来访者",
	content: "Hi，欢迎来到 WWPPL 的博客！这里都是我做完的事。",
	closable: true,
	linkEnable: true,
	linkText: "了解更多",
	linkUrl: "/about/",
	linkExternal: false,
};

const j = announcementJson as AnnouncementJson;

/** 取字符串：不是字符串或空串就退默认值 */
function pick(v: unknown, fallback: string): string {
	return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
function pickBool(v: unknown, fallback: boolean): boolean {
	return typeof v === "boolean" ? v : fallback;
}

export const announcementConfig: AnnouncementConfig = {
	// 公告标题（图标由 Announcement 组件补，这里只写文字）
	title: pick(j.title, FALLBACK.title),

	// 公告内容（开头的挥手图标同样由 Announcement 组件补）
	content: pick(j.content, FALLBACK.content),

	// 是否允许用户关闭公告
	// 关闭状态记在 sessionStorage —— 换页依然生效，关掉标签页即复位。
	closable: pickBool(j.closable, FALLBACK.closable),

	link: {
		// 启用链接
		enable: pickBool(j.linkEnable, FALLBACK.linkEnable),
		// 链接文本
		text: pick(j.linkText, FALLBACK.linkText),
		// 链接 URL
		url: pick(j.linkUrl, FALLBACK.linkUrl),
		// 内部链接
		external: pickBool(j.linkExternal, FALLBACK.linkExternal),
	},
};
