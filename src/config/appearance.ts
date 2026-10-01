// 同 navLinks.ts：用相对路径而不是 `@/data/...`。这份配置会被 astro.config.mjs
// 那条加载链走一遍（astro.config.mjs → src/config/index.ts → siteConfig → 这里），
// 那条链不认「别名 + JSON」的解析，会报 Cannot find module。
import raw from "../data/appearance.json";

/**
 * 站点外观 —— 后台「站点外观」页（/admin/appearance/）可以改的那几个开关
 * ============================================================
 * 唯一数据来源是 `src/data/appearance.json`。
 * 后台保存 → 提交进仓库 → Cloudflare 重新构建 → 全站生效。
 *
 * 与 siteInfo（文案）、navLinks（菜单）不同，这一份**全是结构值**：
 * 一个色相数字、几个开关、几个枚举。它们写坏的后果不是"某处文案不对"，
 * 而是整站配色错乱、页面 404 —— 所以这里一律**严格校验**：
 *
 *   · 数字不在允许范围 → 退回默认（不做 clamp，免得"填 400 却变成 360"
 *     让人以为生效了；退回去再在后台看到原值，才知道自己填错了）
 *   · 枚举不是允许值之一 → 退回默认
 *   · 开关不是布尔值 → 退回默认
 *
 * ⚠️ 没有「留空」语义：外观项空了就是站坏了，一律按"写坏"处理。
 */

/** 兜底值：与仓库里最后一次确认过的外观一致 */
const FALLBACK = {
	themeHue: 270,
	visitorCanChangeHue: true,
	defaultMode: "system",
	cardBorder: true,
	cardFollowTheme: true,
	wallpaperMode: "fullscreen",
	wallpaperSwitchable: true,
	wallpaperPlayer: true,
	bannerText: true,
} as const;

/** 页面开关的默认值。三个没做出来的页面（bangumi/devices/timeline）不进后台，
 *  它们恒为 false —— 放进来只会让人打开一个 404 页面 */
const FALLBACK_PAGES = {
	friends: true,
	sponsor: true,
	guestbook: true,
	anime: true,
	gallery: true,
	diary: true,
	projects: true,
	skills: true,
} as const;

const HUES = { min: 0, max: 360 };
const MODES = ["light", "dark", "system"] as const;
const WALLPAPER_MODES = ["banner", "fullscreen", "overlay", "none"] as const;

/** 必须是落在 [0,360] 里的数；不是数或越界 → 默认值 */
function pickHue(value: unknown, fallback: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	const rounded = Math.round(value);
	if (rounded < HUES.min || rounded > HUES.max) return fallback;
	return rounded;
}

/** 必须是布尔值；不是（留空、写成字符串）→ 默认值 */
function pickBool(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

/** 必须是枚举里的一个；不是 → 默认值 */
function pickEnum<T extends string>(
	value: unknown,
	allowed: readonly T[],
	fallback: T,
): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickPages(value: unknown): Record<keyof typeof FALLBACK_PAGES, boolean> {
	const source = isRecord(value) ? value : {};
	const out = {} as Record<keyof typeof FALLBACK_PAGES, boolean>;
	for (const key of Object.keys(FALLBACK_PAGES) as (keyof typeof FALLBACK_PAGES)[]) {
		out[key] = pickBool(source[key], FALLBACK_PAGES[key]);
	}
	return out;
}

export const appearance = {
	/** 主题色相 0–360。红 0 / 青 200 / 蓝绿 250 / 粉 345 */
	themeHue: pickHue(raw.themeHue, FALLBACK.themeHue),

	/** 访客能不能自己在显示设置里换主题色（true = 能换；站上那个开关叫 fixed，正好相反） */
	visitorCanChangeHue: pickBool(raw.visitorCanChangeHue, FALLBACK.visitorCanChangeHue),

	/** 新访客第一次进来时的明暗：light 亮 / dark 暗 / system 跟随系统 */
	defaultMode: pickEnum(raw.defaultMode, MODES, FALLBACK.defaultMode),

	/** 卡片是否有边框和阴影 */
	cardBorder: pickBool(raw.cardBorder, FALLBACK.cardBorder),

	/** 卡片风格是否跟随主题色相 */
	cardFollowTheme: pickBool(raw.cardFollowTheme, FALLBACK.cardFollowTheme),

	/** 壁纸模式：banner 横幅 / fullscreen 全屏 / overlay 全屏透明 / none 纯色无壁纸 */
	wallpaperMode: pickEnum(
		raw.wallpaperMode,
		WALLPAPER_MODES,
		FALLBACK.wallpaperMode,
	),

	/** 访客能不能自己切换壁纸模式 */
	wallpaperSwitchable: pickBool(raw.wallpaperSwitchable, FALLBACK.wallpaperSwitchable),

	/** 导航栏是否显示背景视频播放按钮 */
	wallpaperPlayer: pickBool(raw.wallpaperPlayer, FALLBACK.wallpaperPlayer),

	/** 首页横幅上的标题与句子是否显示 */
	bannerText: pickBool(raw.bannerText, FALLBACK.bannerText),

	/** 页面开关：关掉的页面会返回 404，并从导航栏里自动消失 */
	pages: pickPages(raw.pages),
};
