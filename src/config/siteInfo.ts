// 用相对路径而不是 `@/data/...`：这个模块会被 astro.config.mjs 那条加载链
// 走一遍（siteConfig → siteInfo），而那条链对「别名 + JSON」的解析不认账，
// 会报 Cannot find module。相对路径两边都稳。
import raw from "../data/siteInfo.json";

/**
 * 站点信息 —— 后台「站点信息」页（/admin/site/）可以改的那几段文案
 * ============================================================
 * 唯一数据来源是 `src/data/siteInfo.json`。
 * 后台页面直接读写这个文件：保存 → 提交进仓库 → Cloudflare 重新构建 → 全站生效。
 *
 * 这里为什么还要单独包一层，而不是各位各 import 一次 JSON：
 *
 *   1. **兜底**。JSON 是后台写进去的，写坏（键丢了、值成了数组）不该让构建挂掉。
 *      下面按字段校验一遍，不合格就退回默认值。
 *   2. **收口**。这几个值散落在四处（站点配置 / 资料卡 / 首页横幅 / 页脚 / 友链页），
 *      将来要加字段只动这一个文件。
 *
 * ⚠️ 「空」与「坏」是两回事，处理方式不同：
 *    · 值**不存在或类型不对** → 用默认值顶上（文件被改坏时兜底，别让站变空白）
 *    · 值是**空字符串 / 空数组** → 尊重操作，就是"不要这段"，不拿默认值盖回去
 *      否则你在后台清空页脚文案，前台却照旧显示，只会让人以为没保存上。
 *
 * 不含站点 URL、主题色、导航这些 —— 那些改错了会让站直接坏，留在配置文件里改代码。
 */

/** 兜底值：与仓库里最后一次确认过的文案一致，JSON 字段缺失或类型不对时顶上 */
const FALLBACK = {
	siteTitle: "WWPPL Blog",
	siteSubtitle:
		"白天上课，晚上学专业软件、做项目。业余折腾最新的人工智能小玩意，水平也业余。",
	bio: "白天上课，晚上学专业软件、做项目。业余折腾最新的人工智能小玩意，水平也业余。",
	bannerLines: [
		"白天上课，晚上学专业软件、做项目。业余折腾最新的人工智能小玩意，水平也业余。",
		"不追热点，只写做完的事",
		"写下来，才算真正想过",
		"软件出身，机械谋生，代码是业余里的正经事",
	],
	footerText:
		"白天上课，晚上学专业软件、做项目。业余折腾最新的人工智能小玩意，水平也业余。",
	friendsDesc:
		"白天上课，晚上学专业软件、做项目。业余折腾最新的人工智能小玩意，水平也业余。",
} as const;

/** 字段缺失 / 类型不对 → 兜底；空串 → 就是空（尊重"不要这段"的操作） */
function pickText(value: unknown, fallback: string): string {
	return typeof value === "string" ? value.trim() : fallback;
}

/** 少数几处不能为空，空了自己会出洋相（比如浏览器标签页变成空标题） */
function pickRequired(value: unknown, fallback: string): string {
	if (typeof value !== "string") return fallback;
	const trimmed = value.trim();
	return trimmed ? trimmed : fallback;
}

/** 一组句子。非数组 → 兜底；数组（哪怕空数组）→ 原样采用 */
function pickLines(value: unknown, fallback: readonly string[]): string[] {
	if (!Array.isArray(value)) return [...fallback];
	return value
		.filter((line): line is string => typeof line === "string")
		.map((line) => line.trim())
		.filter(Boolean);
}

export const siteInfo = {
	/** 站点标题：浏览器标签、页脚版权行、首页横幅主标题。**不能为空** */
	siteTitle: pickRequired(raw.siteTitle, FALLBACK.siteTitle),

	/** 站点副标题：搜索引擎结构化数据、RSS 描述。
	 *  ⚠️ 不进浏览器标签页标题（见 Layout.astro 里的说明） */
	siteSubtitle: pickText(raw.siteSubtitle, FALLBACK.siteSubtitle),

	/** 个人签名：侧边栏资料卡头像下面那行 */
	bio: pickText(raw.bio, FALLBACK.bio),

	/** 首页横幅句子：与文章摘句、站点实况一起轮播。空数组 = 不要手写句子 */
	bannerLines: pickLines(raw.bannerLines, FALLBACK.bannerLines),

	/** 页脚文案：FooterConfig.html 里 {{footerText}} 那个位置 */
	footerText: pickText(raw.footerText, FALLBACK.footerText),

	/** 友链页站点描述：出现在「一键复制所有信息」的载荷里 */
	friendsDesc: pickText(raw.friendsDesc, FALLBACK.friendsDesc),
};
