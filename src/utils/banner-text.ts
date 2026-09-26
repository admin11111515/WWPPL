/**
 * 首页横幅文字的轮播内容生成。
 *
 * 构建期跑一次（模块级缓存，66 个页面共用一份结果），产出三类内容：
 *   1. quote —— 从已有文章正文里抽的一句，带出处（本站独有的池子，写一篇多一批候选）
 *   2. stat  —— 站点实况，如「建站第 148 天」，每次构建重算
 *   3. own   —— 配置里手写的句子
 * 另有 live —— 需要按访客本地时间实时生成的模板，交给浏览器填充。
 *
 * 抽句是「随机抽一批」而不是「全量内联」：候选池现有 900+ 条，
 * 全塞进 HTML 会把 66 个页面一起撑大，而访客一次会话根本看不完。
 * 每次构建重抽，等效于池子无限大，但产物体积恒定。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backgroundWallpaper, siteConfig } from "@/config";
import type { BannerItem, BannerLive } from "@/types/bannerText";

/** 句子长度区间：太短没信息量，太长打字机要等 */
const QUOTE_MIN = 14;
const QUOTE_MAX = 30;
/** markdown 残留、行内标记一律不收 */
const BAD_CHARS = /[*_`[\]()<>|#~^$\\{}]/;
/** 代码味、链接味 */
const CODE_HINTS =
	/(=>|\bconsole\b|\bfunction\b|\bimport\b|\bexport\b|\bconst\b|\breturn\b|https?:\/\/|\.js\b|\.py\b|\.ts\b|\.css\b|<\/?[a-z]+>|\bJSON\b)/i;
/**
 * 脱离上下文读不通的开头：枚举的第二/三点、纯追加句。
 * 这类句子单独拎出来会显得没头没尾，直接不要。
 */
const FRAGMENT_HEAD =
	/^(?:[一二三四五六七八九十]是|其[一二三四五六七八九十]|首先|其次|另外|此外|也(?!许)|还|而且|然后|接着)/;
/** 连续空白 = 原文里有东西被剥掉了（行内代码之类），留着会露出空档 */
const GAP = /\s{2,}|\u3000{2,}/;

/**
 * 文章目录。
 * 打包后 import.meta.url 指向产物位置，相对路径会解析错，
 * 所以优先用构建时的项目根（Astro 构建时 cwd 即项目根），再退回相对路径。
 */
function resolvePostsDir(): string {
	const candidates = [
		path.join(process.cwd(), "src", "content", "posts"),
		fileURLToPath(new URL("../content/posts", import.meta.url)),
	];
	for (const c of candidates) {
		try {
			if (fs.statSync(c).isDirectory()) return c;
		} catch {
			// 试下一个
		}
	}
	return candidates[0];
}

const POSTS_DIR = resolvePostsDir();

type HomeTextConfig = {
	subtitle?: string | string[];
	sources?: {
		quotes?: { enable?: boolean; limit?: number };
		stats?: { enable?: boolean };
		now?: { enable?: boolean };
	};
};

function homeText(): HomeTextConfig {
	return (backgroundWallpaper.common?.homeText ?? {}) as HomeTextConfig;
}

export function bannerSources(): {
	quotes: boolean;
	stats: boolean;
	now: boolean;
} {
	const s = homeText().sources;
	return {
		quotes: s?.quotes?.enable !== false,
		stats: s?.stats?.enable !== false,
		now: s?.now?.enable !== false,
	};
}

export function ownSentences(): string[] {
	const sub = homeText().subtitle;
	if (typeof sub === "string") return sub.trim() ? [sub.trim()] : [];
	if (Array.isArray(sub))
		return sub.filter((s) => typeof s === "string" && s.trim());
	return [];
}

let cache: { items: BannerItem[]; live: BannerLive[] } | null = null;

/** 读全部文章：只取标题、正文、发布日期，草稿跳过 */
function readPosts(): { title: string; body: string; published: string }[] {
	const files: string[] = [];
	(function walk(dir: string) {
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			const p = path.join(dir, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.name.endsWith(".md") || e.name.endsWith(".mdx")) files.push(p);
		}
	})(POSTS_DIR);

	const posts: { title: string; body: string; published: string }[] = [];
	for (const f of files) {
		let raw = "";
		try {
			raw = fs.readFileSync(f, "utf8");
		} catch {
			continue;
		}
		const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
		const front = fm ? fm[1] : "";
		const body = fm ? raw.slice(fm[0].length) : raw;
		if (/^draft:\s*true\s*$/m.test(front)) continue;
		const title = (/^title:\s*"?(.*?)"?\s*$/m.exec(front)?.[1] || "").trim();
		const published = (
			/^published:\s*"?([\d-]+)"?/m.exec(front)?.[1] || ""
		).trim();
		posts.push({ title: title || "未命名", body, published });
	}
	return posts;
}

/** 从正文里抽可能独立成句的话 */
function extractQuotes(body: string): string[] {
	const out: string[] = [];
	// 先去掉代码块与行内代码，避免把代码切成句子
	const clean = body
		.replace(/```[\s\S]*?```/g, "")
		.replace(/`[^`\n]*`/g, "")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

	for (const rawLine of clean.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;
		// 标题、引用、列表、表格、图片行整行跳过
		if (/^[#>*+|!]/.test(line)) continue;
		if (/^\d+[.、)]/.test(line)) continue;

		for (const piece of line.split(/(?<=[。！？])/)) {
			const q = piece.trim();
			if (q.length < QUOTE_MIN || q.length > QUOTE_MAX) continue;
			if (!/[。！？]$/.test(q)) continue;
			if (BAD_CHARS.test(q)) continue;
			if (CODE_HINTS.test(q)) continue;
			if (FRAGMENT_HEAD.test(q)) continue;
			if (GAP.test(q)) continue;
			if (!/[\u4e00-\u9fa5]/.test(q)) continue;
			// 汉字占比要够，滤掉中英夹生的技术句
			const han = (q.match(/[\u4e00-\u9fa5]/g) || []).length;
			if (han / q.length < 0.7) continue;
			out.push(q);
		}
	}
	return out;
}

function shuffle<T>(arr: T[]): T[] {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/** 各文章轮流供句，保证来源分散，不会连着几条都出自同一篇 */
function pickQuotes(
	groups: { title: string; quotes: string[] }[],
	limit: number,
): BannerItem[] {
	const picked: BannerItem[] = [];
	if (limit <= 0) return picked;
	const pools = groups
		.filter((g) => g.quotes.length > 0)
		.map((g) => ({ title: g.title, quotes: shuffle(g.quotes) }));
	if (pools.length === 0) return picked;

	const cursors = new Array(pools.length).fill(0);
	let guard = 0;
	while (picked.length < limit && guard < limit * 8) {
		guard++;
		let advanced = false;
		for (let i = 0; i < pools.length && picked.length < limit; i++) {
			const c = cursors[i];
			if (c >= pools[i].quotes.length) continue;
			cursors[i] = c + 1;
			picked.push({
				kind: "quote",
				text: pools[i].quotes[c],
				from: pools[i].title,
			});
			advanced = true;
		}
		if (!advanced) break;
	}
	return picked;
}

/** 站点实况：全部由构建期真实数据算出，不写死 */
function buildStats(
	posts: { body: string; published: string }[],
	now: Date,
): BannerItem[] {
	const out: BannerItem[] = [];
	if (posts.length === 0) return out;

	const startRaw = (siteConfig as { siteStartDate?: string }).siteStartDate;
	if (startRaw) {
		const start = new Date(`${startRaw}T00:00:00+08:00`);
		const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
		if (days > 0) out.push({ kind: "stat", text: `建站第 ${days} 天` });
	}

	let chars = 0;
	const dates: string[] = [];
	for (const p of posts) {
		chars += p.body.replace(/\s/g, "").length;
		if (p.published) dates.push(p.published);
	}
	dates.sort();

	if (chars > 0) {
		out.push({
			kind: "stat",
			text: `这里躺着 ${posts.length} 篇文章，${(chars / 10000).toFixed(1)} 万字`,
		});
	}

	if (dates.length >= 2) {
		const first = new Date(`${dates[0]}T00:00:00+08:00`);
		const span = Math.floor((now.getTime() - first.getTime()) / 86400000);
		const gap = span / dates.length;
		if (gap >= 0.5)
			out.push({ kind: "stat", text: `平均 ${gap.toFixed(1)} 天写一篇` });
	}

	const lastRaw = dates[dates.length - 1];
	if (lastRaw) {
		const last = new Date(`${lastRaw}T00:00:00+08:00`);
		const ago = Math.floor((now.getTime() - last.getTime()) / 86400000);
		if (ago <= 0) out.push({ kind: "stat", text: "上一篇写于今天" });
		else if (ago === 1) out.push({ kind: "stat", text: "上一篇写于昨天" });
		else out.push({ kind: "stat", text: `上一篇写在 ${ago} 天前` });
	}

	const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const monthCount = dates.filter((d) => d.startsWith(ym)).length;
	if (monthCount > 0)
		out.push({ kind: "stat", text: `这个月写了 ${monthCount} 篇` });

	return out;
}

/** 此刻状态：模板交给浏览器按访客本地时间填充 */
function buildLive(now: Date): BannerLive[] {
	const startRaw = (siteConfig as { siteStartDate?: string }).siteStartDate;
	let dayNo = 0;
	if (startRaw) {
		const start = new Date(`${startRaw}T00:00:00+08:00`);
		dayNo = Math.floor((now.getTime() - start.getTime()) / 86400000);
	}
	const list: BannerLive[] = [
		{ template: "现在是 {{time}}，今天已过 {{percent}}%" },
		{ template: "{{greet}}，今天还剩 {{left}}" },
	];
	if (dayNo > 0) {
		list.push({ template: "{{date}} {{weekday}}，本站第 {{dayNo}} 天", dayNo });
	}
	return list;
}

/** 非抽句内容每隔几条插一次，再做一次整体打乱，保证节奏不呆板 */
function interleave(others: BannerItem[], quotes: BannerItem[]): BannerItem[] {
	const pool = shuffle(others);
	const result: BannerItem[] = [];
	let oi = 0;
	let sinceOther = 0;
	for (const q of quotes) {
		result.push(q);
		sinceOther++;
		if (sinceOther >= 3 && oi < pool.length) {
			result.push(pool[oi++]);
			sinceOther = 0;
		}
	}
	while (oi < pool.length) result.push(pool[oi++]);
	return shuffle(result);
}

export function getBannerText(): { items: BannerItem[]; live: BannerLive[] } {
	if (cache) return cache;

	const now = new Date();
	const posts = readPosts();
	const { quotes: quotesOn, stats: statsOn, now: nowOn } = bannerSources();
	const limit = homeText().sources?.quotes?.limit ?? 48;

	const quotes = quotesOn
		? pickQuotes(
				posts.map((p) => ({ title: p.title, quotes: extractQuotes(p.body) })),
				Math.max(0, limit),
			)
		: [];
	const stats = statsOn ? buildStats(posts, now) : [];
	const own: BannerItem[] = ownSentences().map((text) => ({
		kind: "own",
		text,
	}));

	const items =
		quotes.length > 0
			? interleave([...own, ...stats], quotes)
			: [...own, ...stats];

	cache = { items, live: nowOn ? buildLive(now) : [] };
	return cache;
}
