import { generatedCoverConfig } from "../config/generatedCoverConfig";
import type { GeneratedCoverPalette } from "../types/generatedCover";

/**
 * 封面由本地生成时，frontmatter 里 image 字段的取值。
 * "api" 是旧写法（原先是远程随机图），保留兼容，含义已改为本地生成。
 */
export const GENERATED_COVER_MARKER = "auto";

/** 判断这篇文章的封面是否走本地生成 */
export function isGeneratedCover(image?: string | null): boolean {
	if (!generatedCoverConfig.enable) return false;
	return image === GENERATED_COVER_MARKER || image === "api";
}

/** FNV-1a，稳定哈希：同一输入跨构建、跨机器结果一致 */
function hashString(input: string): number {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

const CJK_RE = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/;
const CJK_CH = /[\u4e00-\u9fa5]/;
const LATIN_CH = /[a-zA-Z0-9]/;
/** 可以断行的位置 */
const BREAK_CHARS = /[\s\u00b7·\-–—/|&+、,，:：.。]/;

/** 一行文字占几个字宽（em）：汉字算 1，西文按 0.62 粗估（宁大不小，给缩放留余量） */
function emWidth(text: string): number {
	let w = 0;
	for (const ch of text) w += CJK_RE.test(ch) ? 1 : 0.62;
	return w;
}

/**
 * 封面画布：1200 x 600。
 * 背景用铺满裁切（slice）画，页面里盒子比例一变就会被裁；
 * 所以文字不能画在画布里——它单独放在一层 HTML 里，按容器尺寸算字号，
 * 这样无论封面被压成多窄的竖条，字都不会被裁掉（见 GeneratedCover.astro）。
 * 下面这两个字号只给"分享海报"用：海报把封面等比缩放画进画布，
 * 横向不会被裁，用设计稿里的固定字号即可，成品与宽版封面完全一致。
 */
const CANVAS_W = 1200;
const CANVAS_H = 600;
const CX = CANVAS_W / 2;
const CY = CANVAS_H / 2;

const LABEL_FONT_SIZE = 56;
const LABEL_LETTER_SPACING_EM = 0.04;
const OVERLINE_FONT_SIZE = 30;
const OVERLINE_LETTER_SPACING_EM = 0.15;

/** 文字最多占容器宽度的多少（两边各留一成空隙，西文字宽是估算值，留够余量） */
const WIDTH_SLACK_PERCENT = 80;

/** 主题词字号占容器高度的百分比，56 / 600 = 9.3% */
const LABEL_HEIGHT_CQH = ((100 * LABEL_FONT_SIZE) / CANVAS_H).toFixed(1);
/** 分类名字号占容器高度的百分比，30 / 600 = 5% */
const OVERLINE_HEIGHT_CQH = ((100 * OVERLINE_FONT_SIZE) / CANVAS_H).toFixed(1);

/**
 * 算出字号表达式。
 * 同时受两个条件约束：
 *  - 宽度：文字总宽不超过容器宽度的 80%（列表模式下封面只剩中间一条，靠这个兜住）
 *  - 高度：不超过容器高度的固定比例（宽版封面上"字有多大"由这个决定）
 */
function fontExpr(units: number, heightCqh: string): string {
	if (units <= 0) return "";
	return `min(calc(${WIDTH_SLACK_PERCENT}cqw / ${units.toFixed(2)}), ${heightCqh}cqh)`;
}

/** 找最接近中间的自然断点，返回"断点前有几个字"，找不到返回 -1 */
function findBreak(text: string): number {
	const chars = [...text];
	const mid = chars.length / 2;
	const points: number[] = [];
	for (let i = 1; i < chars.length - 1; i++) {
		const prev = chars[i - 1];
		const cur = chars[i];
		if (BREAK_CHARS.test(cur)) points.push(i);
		else if (LATIN_CH.test(prev) && /[A-Z]/.test(cur)) points.push(i);
		else if (CJK_CH.test(prev) !== CJK_CH.test(cur)) points.push(i);
	}
	if (points.length === 0) return -1;
	return points.reduce((best, p) =>
		Math.abs(p - mid) < Math.abs(best - mid) ? p : best,
	);
}

/**
 * 把主题词排成最多两行。
 * 一行放不下就在自然断点处断开（空格、分隔符、驼峰、中英交界）；
 * 中文还能逐字断行，西文单词不硬拆。
 */
export function splitLabel(label: string): string[] {
	const text = truncateToWidth(label, generatedCoverConfig.maxLabelWidth * 2);
	if (text === "") return [];

	if (lineUnits(text, LABEL_LETTER_SPACING_EM) <= generatedCoverConfig.maxLabelWidth) {
		return [text];
	}

	const chars = [...text];
	const at = findBreak(text);
	if (at > 0) {
		return [chars.slice(0, at).join(""), chars.slice(at).join("")];
	}

	const cjkRatio = chars.filter((c) => CJK_CH.test(c)).length / chars.length;
	if (cjkRatio >= 0.5) {
		const mid = Math.ceil(chars.length / 2);
		return [chars.slice(0, mid).join(""), chars.slice(mid).join("")];
	}

	// 西文单词不硬拆，缩字号让它待在一行里
	return [text];
}

/** 超出长度上限时截断，并在末尾补一个省略号 */
function truncateToWidth(text: string, limit: number): string {
	if (emWidth(text) <= limit) return text;
	let out = "";
	let w = 0;
	const room = limit - 1; // 给省略号留一个字宽
	for (const ch of text) {
		const cw = CJK_RE.test(ch) ? 1 : 0.62;
		if (w + cw > room) break;
		out += ch;
		w += cw;
	}
	return `${out}…`;
}

/** 一行的实际占位宽度（含字距），用来算字号 */
function lineUnits(line: string, letterSpacingEm: number): number {
	return emWidth(line) + letterSpacingEm * [...line].length;
}

const escapeXml = (s: string): string =>
	s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

/**
 * 决定封面上的两行字。
 * 上行是分类名；下行取"最后一个足够具体的标签"（跳过太笼统的标签与分类名本身）。
 * 一个都没有时只显示分类名。
 */
export function resolveCoverTheme(
	category?: string | null,
	tags: string[] = [],
): { overline: string; label: string } {
	const cat = (category || "").trim();
	const weak = new Set(generatedCoverConfig.weakTags);
	const candidates = tags
		.map((t) => (t || "").trim())
		.filter((t) => t !== "" && t !== cat && !weak.has(t));
	const theme = candidates.length > 0 ? candidates[candidates.length - 1] : "";

	if (theme === "") return { overline: "", label: cat };
	return { overline: cat, label: theme };
}

const VARIANTS = ["rows", "cols", "diag", "rings", "grid", "dots"] as const;
export type GeneratedCoverVariant = (typeof VARIANTS)[number];

export interface GeneratedCoverParams {
	base: string;
	ink: string;
	variant: GeneratedCoverVariant;
	/** 纹样间距（设计单位，画布 1200x600） */
	step: number;
	/** 纹样透明度 */
	patternOpacity: number;
	/** 中央圆环半径 */
	ringRadius: number;
	/** 中央画几道圆环 */
	ringCount: number;
	/** 上方分类名，空字符串表示不显示 */
	overline: string;
	/** 分类名的字号（CSS 表达式，页面用） */
	overlineFontExpr: string;
	/** 主题词，已断行（最多两行） */
	labelLines: string[];
	/** 主题词的字号（CSS 表达式，页面用） */
	labelFontExpr: string;
	/** 用文章标识算出的短串，保证同页多个封面各自的纹样 id 不冲突 */
	uid: string;
}

/**
 * 算出这篇文章封面要用到的全部参数。
 * 只依赖文章自身信息，因此结果稳定可复现。
 */
export function getGeneratedCoverParams(input: {
	title?: string;
	category?: string | null;
	tags?: string[];
	seed?: string;
}): GeneratedCoverParams {
	const { title = "", category = "", tags = [], seed = "" } = input;
	const palette: GeneratedCoverPalette =
		generatedCoverConfig.palettes[(category || "").trim()] ||
		generatedCoverConfig.fallbackPalette;

	const h = hashString(`${seed}|${title}|${category}`);
	const { overline, label } = resolveCoverTheme(category, tags);
	const labelLines = splitLabel(label);
	const labelUnits = Math.max(
		0,
		...labelLines.map((l) => lineUnits(l, LABEL_LETTER_SPACING_EM)),
	);

	return {
		base: palette.base,
		ink: palette.ink,
		variant: VARIANTS[h % VARIANTS.length],
		step: 56 + ((h >>> 5) % 5) * 6,
		patternOpacity: 0.16 + ((h >>> 3) % 10) / 100,
		ringRadius: 158 + ((h >>> 7) % 5) * 12,
		ringCount: (h >>> 11) % 2 === 0 ? 1 : 2,
		overline,
		overlineFontExpr: overline
			? fontExpr(lineUnits(overline, OVERLINE_LETTER_SPACING_EM), OVERLINE_HEIGHT_CQH)
			: "",
		labelLines,
		labelFontExpr: fontExpr(labelUnits, LABEL_HEIGHT_CQH),
		uid: `gc${h.toString(36)}`,
	};
}

const FONT_STACK =
	"'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif";

function buildPatternDef(p: GeneratedCoverParams): string {
	const { uid, step, patternOpacity: o } = p;
	const stroke = `stroke="#FFFFFF" stroke-opacity="${o.toFixed(2)}" stroke-width="1.5" fill="none"`;
	const tile = (w: number, h: number, inner: string, transform?: string) =>
		`<pattern id="${uid}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${
			transform ? ` patternTransform="${transform}"` : ""
		}>${inner}</pattern>`;

	switch (p.variant) {
		case "rows":
			return tile(CANVAS_W, step, `<path d="M0 0.75H${CANVAS_W}" ${stroke}/>`);
		case "cols":
			return tile(step, CANVAS_H, `<path d="M0.75 0V${CANVAS_H}" ${stroke}/>`);
		case "diag":
			return tile(step, step, `<path d="M0.75 0V${step}" ${stroke}/>`, "rotate(-45)");
		case "grid":
			return tile(
				step,
				step,
				`<path d="M0 0.75H${step}" ${stroke}/><path d="M0.75 0V${step}" ${stroke}/>`,
			);
		case "dots":
			return tile(
				step,
				step,
				`<circle cx="${step / 2}" cy="${step / 2}" r="2.5" fill="#FFFFFF" fill-opacity="${o.toFixed(2)}"/>`,
			);
		default:
			// rings 不用纹样，直接画同心圆
			return "";
	}
}

/**
 * 生成封面画布（底色 + 纹样 + 圆环 + 内框）。
 * 页面里的文字不画在这里，由 GeneratedCover.astro 单独渲染；
 * 分享海报需要一张能塞进画布的完整图，所以带 withText 时把字也画进去。
 */
export function buildGeneratedCoverSvg(
	p: GeneratedCoverParams,
	withText = false,
): string {
	const parts: string[] = [];
	const def = buildPatternDef(p);
	if (def) parts.push(`<defs>${def}</defs>`);

	parts.push(`<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${p.base}"/>`);

	if (p.variant === "rings") {
		for (let i = 0; i < 5; i++) {
			parts.push(
				`<circle cx="${CX}" cy="${CY}" r="${90 + i * 62}" fill="none" stroke="#FFFFFF" stroke-opacity="${p.patternOpacity.toFixed(2)}" stroke-width="1.5"/>`,
			);
		}
	} else if (def) {
		parts.push(`<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#${p.uid})"/>`);
	}

	// 中央圆环：给文字一个落点
	parts.push(
		`<circle cx="${CX}" cy="${CY}" r="${p.ringRadius}" fill="none" stroke="#FFFFFF" stroke-opacity="0.42" stroke-width="1.5"/>`,
	);
	if (p.ringCount === 2) {
		parts.push(
			`<circle cx="${CX}" cy="${CY}" r="${p.ringRadius + 34}" fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="1.5"/>`,
		);
	}

	// 内框
	parts.push(
		`<rect x="36" y="36" width="${CANVAS_W - 72}" height="${CANVAS_H - 72}" fill="none" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1.5"/>`,
	);

	if (withText) {
		const lines = p.labelLines.length > 0 ? p.labelLines : [""];
		const lineHeight = LABEL_FONT_SIZE * 1.16;
		const blockHeight =
			(lines.length - 1) * lineHeight + LABEL_FONT_SIZE + (p.overline ? LABEL_FONT_SIZE * 1.05 : 0);
		const top = CY - blockHeight / 2 + LABEL_FONT_SIZE * 0.36;

		let y = top;
		if (p.overline) {
			parts.push(
				`<text x="${CX}" y="${Math.round(y)}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${OVERLINE_FONT_SIZE}" letter-spacing="${(OVERLINE_FONT_SIZE * OVERLINE_LETTER_SPACING_EM).toFixed(1)}" fill="${p.ink}" fill-opacity="0.62">${escapeXml(p.overline)}</text>`,
			);
			y += LABEL_FONT_SIZE * 1.05;
		}
		for (const line of lines) {
			parts.push(
				`<text x="${CX}" y="${Math.round(y)}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${LABEL_FONT_SIZE}" font-weight="500" letter-spacing="${(LABEL_FONT_SIZE * LABEL_LETTER_SPACING_EM).toFixed(1)}" fill="${p.ink}">${escapeXml(line)}</text>`,
			);
			y += lineHeight;
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" style="display:block">${parts.join("")}</svg>`;
}

/** 把封面转成可直接喂给 img / canvas 的 data URI（分享海报用，含文字） */
export function buildGeneratedCoverDataUri(p: GeneratedCoverParams): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildGeneratedCoverSvg(p, true))}`;
}
