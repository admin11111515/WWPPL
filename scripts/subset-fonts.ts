// 字体子集化构建后脚本
// 在 astro build 之后运行，扫描 dist/ 中所有 HTML 页面，收集实际使用的字符，
// 为标记了 subset: true 的本地字体生成轻量 woff2 子集文件。

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import subsetFont from "subset-font";
import { fontConfig } from "../src/config";

// ─── 配置 ───────────────────────────────────────────────

const DIST_DIR = "dist";
const OUTPUT_DIR = "dist/_astro/fonts";

// ─── 字体配置解析 ────────────────────────────────────────

interface LocalSubsetFont {
	id: string;
	family: string;
	src: string;
	weight?: string | number;
	style?: string;
	display?: string;
	subsetExtraChars?: string;
}

/**
 * 从 fontConfig 中过滤出需要子集化的本地字体
 */
function getLocalSubsetFonts(): LocalSubsetFont[] {
	if (!fontConfig.enable) return [];

	return Object.values(fontConfig.fonts).filter((font) => {
		if (!font.subset || !font.src) return false;
		// 排除外部 URL
		if (
			font.src.startsWith("http://") ||
			font.src.startsWith("https://") ||
			font.src.startsWith("//")
		) {
			return false;
		}
		return true;
	}) as LocalSubsetFont[];
}

// ─── 字符收集 ────────────────────────────────────────────

/**
 * HTML 里的常见符号实体。原来只替换了 &amp; &lt; &gt; &quot; &#39; &nbsp; 六个，
 * 于是页面上的 &copy; &hellip; &mdash; 这类字符从来没进过子集 —— 显示「©」时
 * 回退到系统字体。这里补齐常见的，再交给数字实体兜底。
 */
const NAMED_ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	copy: "©",
	reg: "®",
	trade: "™",
	hellip: "…",
	mdash: "—",
	ndash: "–",
	lsquo: "‘",
	rsquo: "’",
	ldquo: "“",
	rdquo: "”",
	laquo: "«",
	raquo: "»",
	times: "×",
	divide: "÷",
	deg: "°",
	middot: "·",
	sect: "§",
	para: "¶",
	bull: "•",
	dagger: "†",
	Dagger: "‡",
	permil: "‰",
	prime: "′",
	Prime: "″",
	larr: "←",
	rarr: "→",
	uarr: "↑",
	darr: "↓",
	harr: "↔",
	minus: "−",
	plusmn: "±",
	frac12: "½",
	sup2: "²",
	sup3: "³",
	euro: "€",
	pound: "£",
	yen: "¥",
	cent: "¢",
};

/** 把 HTML 实体还原成字符：数字实体按码位转，命名实体查表，都不认就原样留着。 */
function decodeEntities(s: string): string {
	return s.replace(
		/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
		(whole, body: string) => {
			if (body.startsWith("#")) {
				const hex = body[1] === "x" || body[1] === "X";
				const n = Number.parseInt(
					hex ? body.slice(2) : body.slice(1),
					hex ? 16 : 10,
				);
				if (!Number.isFinite(n) || n <= 0 || n > 0x10ffff) return whole;
				return String.fromCodePoint(n);
			}
			return NAMED_ENTITIES[body] ?? whole;
		},
	);
}

/**
 * 从 HTML 字符串中提取纯文本内容（比 JSDOM 轻量得多）
 */
function extractTextFromHtml(html: string): string {
	// 移除 script 和 style 标签及其内容
	let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ");
	// 移除所有 HTML 标签
	text = text.replace(/<[^>]+>/g, " ");
	// 解码 HTML 实体（含符号类，见 NAMED_ENTITIES）
	text = decodeEntities(text);
	// 提取 alt、title、aria-label、placeholder 属性值
	const attrMatches = html.matchAll(
		/(?:alt|title|aria-label|placeholder)=["']([^"']+)["']/gi,
	);
	for (const match of attrMatches) {
		text += match[1];
	}
	// 其余属性值里的中文也要收。页面常把「渲染时才取出来显示」的文案塞进
	// data-* 属性（例：每日一句把整段引语放进 data-quotes 的 JSON 里），
	// 只认上面四类属性会让这些字掉出子集，显示时回退到系统字体。
	const otherAttrs = html.matchAll(/[a-zA-Z][a-zA-Z0-9-]*=["']([^"']*)["']/gi);
	for (const match of otherAttrs) {
		for (const c of match[1]) {
			const cp = c.codePointAt(0) ?? 0;
			if (
				(cp >= 0x4e00 && cp <= 0x9fff) ||
				(cp >= 0x3400 && cp <= 0x4dbf) ||
				(cp >= 0x3000 && cp <= 0x303f) ||
				(cp >= 0xff00 && cp <= 0xffef)
			) {
				text += c;
			}
		}
	}
	return text;
}

/**
 * 从 HTML 的 <script> 标签里提取中文字符。
 * 页面渲染后才由 JS 写进 DOM 的文案（天气、日历、播放器提示等）不在 HTML 文本里，
 * 只扫文本会让这些字掉出子集，运行时回退到系统字体。
 */
function extractScriptCjk(html: string): string {
	let out = "";
	for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
		for (const c of m[1]) {
			const cp = c.codePointAt(0) ?? 0;
			if (
				(cp >= 0x4e00 && cp <= 0x9fff) || // CJK 统一表意文字
				(cp >= 0x3400 && cp <= 0x4dbf) || // CJK 扩展 A
				(cp >= 0x3000 && cp <= 0x303f) || // CJK 标点
				(cp >= 0xff00 && cp <= 0xffef) // 全角符号
			) {
				out += c;
			}
		}
	}
	return out;
}

/**
 * 扫描 dist/ 中的 HTML 文件，提取实际使用的所有字符。
 * 不传 files 时扫全站；opts.scriptCjk 为 true 时额外收进脚本里的中文字符。
 */
async function collectChars(
	files?: string[],
	opts: { scriptCjk?: boolean } = {},
): Promise<string> {
	const htmlFiles = files ?? (await glob(`${DIST_DIR}/**/*.html`));
	const charSet = new Set<string>();

	for (const file of htmlFiles) {
		const html = await fs.readFile(file, "utf-8");
		const text = extractTextFromHtml(html);
		for (const c of text) charSet.add(c);
		if (opts.scriptCjk) {
			for (const c of extractScriptCjk(html)) charSet.add(c);
		}
	}

	return [...charSet].join("");
}

// ─── 子集生成 ────────────────────────────────────────────

function contentHash(buffer: Buffer): string {
	return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

/**
 * 将本地 src 路径解析为 public/ 下的绝对文件路径
 */
function resolveFontPath(src: string): string {
	const relativePath = src.startsWith("/") ? src.slice(1) : src;
	return path.resolve("public", relativePath);
}

/**
 * 检测字体文件的实际格式
 */
function detectFontFormat(
	filePath: string,
): "woff2" | "woff" | "truetype" | "opentype" {
	const ext = path.extname(filePath).toLowerCase();
	switch (ext) {
		case ".woff2":
			return "woff2";
		case ".woff":
			return "woff";
		case ".otf":
			return "opentype";
		case ".ttf":
		default:
			return "truetype";
	}
}

// ─── 主流程 ──────────────────────────────────────────────

interface SubsetResult {
	id: string;
	family: string;
	weight?: string | number;
	style?: string;
	display?: string;
	hash: string;
	format: string;
	originalSrc: string;
}

async function main() {
	console.log("🔤 Font subsetting started...");

	// 1. 从配置中获取需要子集化的本地字体
	const localSubsetFonts = getLocalSubsetFonts();

	if (localSubsetFonts.length === 0) {
		console.log("   No local fonts with subset: true found. Skipping.");
		return;
	}

	console.log(
		`   Found ${localSubsetFonts.length} font(s) to subset: ${localSubsetFonts.map((f) => f.id).join(", ")}`,
	);

	// 2. 收集页面字符
	console.log("🔍 Collecting characters from dist/...");
	const pageChars = await collectChars();
	console.log(`   Collected ${pageChars.length} unique characters (全站).`);

	if (pageChars.length === 0) {
		console.warn("⚠ No characters found in dist/. Skipping subsetting.");
		return;
	}

	// 2b. 首页单独收一份。
	// 字体是 preload 的阻塞资源，而全站字符集里绝大部分是文章正文的生僻字，首页根本用不到。
	// 让首页背全站子集是纯浪费：实测首页 547 字 / 全站 2028 字。
	// 额外收进 index.html 内联脚本里的中文，避免运行时文案回退到系统字体。
	const HOME_HTML = path.join(DIST_DIR, "index.html");
	let homeChars = pageChars;
	let hasHome = false;
	try {
		await fs.access(HOME_HTML);
		homeChars = await collectChars([HOME_HTML], { scriptCjk: true });
		hasHome = true;
		console.log(
			`   Collected ${homeChars.length} unique characters (首页专用，含脚本文案).`,
		);
	} catch {
		console.log("   ⚠ 没找到 dist/index.html，首页与全站共用子集。");
	}

	// 3. 确保输出目录存在
	await fs.mkdir(OUTPUT_DIR, { recursive: true });

	// 4. 为每个字体生成子集（全站一份 + 首页一份）
	const results: SubsetResult[] = [];
	const homeResults: SubsetResult[] = [];

	/** 生成一个子集文件；失败返回 null */
	async function buildSubset(
		font: LocalSubsetFont,
		chars: string,
		label: string,
	): Promise<SubsetResult | null> {
		const fontPath = resolveFontPath(font.src);
		const fontBuffer = await fs.readFile(fontPath);
		const originalFormat = detectFontFormat(fontPath);

		try {
			const subsetBuffer = await subsetFont(fontBuffer, chars, {
				targetFormat: "woff2",
				preserveNameTable: true,
			});

			const hash = contentHash(subsetBuffer);
			await fs.writeFile(path.join(OUTPUT_DIR, `${hash}.woff2`), subsetBuffer);

			const sizeKB = (subsetBuffer.length / 1024).toFixed(1);
			const originalSizeKB = (fontBuffer.length / 1024).toFixed(1);
			const ratio = (
				((fontBuffer.length - subsetBuffer.length) / fontBuffer.length) *
				100
			).toFixed(1);

			console.log(
				`   ✔ [${label}] ${hash}.woff2 (${sizeKB} KB / 原 ${originalSizeKB} KB, 省 ${ratio}%)`,
			);

			return {
				id: font.id,
				family: font.family,
				weight: font.weight,
				style: font.style,
				display: font.display,
				hash,
				format: originalFormat,
				originalSrc: font.src,
			};
		} catch (err) {
			console.error(`   ❌ Failed to subset '${font.id}' [${label}]:`, err);
			return null;
		}
	}

	for (const font of localSubsetFonts) {
		// 检查字体文件是否存在
		try {
			await fs.access(resolveFontPath(font.src));
		} catch {
			console.error(
				`❌ Font file not found: ${resolveFontPath(font.src)} (src: ${font.src})`,
			);
			continue;
		}

		console.log(`⏳ Generating subset for '${font.id}' (${font.family})...`);

		// 合并页面字符和额外字符
		const withExtra = (base: string) =>
			font.subsetExtraChars
				? [...new Set([...base, ...font.subsetExtraChars])].join("")
				: base;

		const all = await buildSubset(font, withExtra(pageChars), "全站");
		if (all) results.push(all);

		if (hasHome) {
			const home = await buildSubset(font, withExtra(homeChars), "首页");
			if (home) homeResults.push(home);
		}
	}

	if (results.length === 0) {
		console.warn("⚠ No subsets were generated.");
		return;
	}

	// 5. 替换 dist/ 中 CSS 和 HTML 的字体引用
	//    @font-face 可能在独立 CSS 文件中，也可能在 HTML 内联 <style> 中
	console.log("🔄 Replacing font URLs in dist/ CSS and HTML files...");
	const filesToReplace = await glob(`${DIST_DIR}/**/*.{css,html}`);
	const homeAbs = path.resolve(HOME_HTML);

	for (const file of filesToReplace) {
		// 只有首页换成首页专用小份；其余页面（文章正文要生僻字）继续用全站子集
		const useHome = homeResults.length > 0 && path.resolve(file) === homeAbs;
		const set = useHome ? homeResults : results;

		let content = await fs.readFile(file, "utf-8");
		let replaced = false;

		for (const result of set) {
			const placeholder = `__SUBSET_FONT_${result.id}__`;
			if (content.includes(placeholder)) {
				const subsetUrl = `/_astro/fonts/${result.hash}.woff2`;
				content = content.replaceAll(placeholder, subsetUrl);
				replaced = true;
			}
		}

		if (replaced) {
			await fs.writeFile(file, content);
			console.log(`   ✔ Updated${useHome ? " [首页专用子集]" : ""}: ${file}`);
		}
	}

	// 6. 清理 dist/ 中的原始字体文件
	console.log("🗑 Cleaning up original font files from dist/...");
	for (const result of results) {
		const originalInDist = path.join(
			DIST_DIR,
			result.originalSrc.startsWith("/")
				? result.originalSrc.slice(1)
				: result.originalSrc,
		);
		try {
			await fs.access(originalInDist);
			await fs.unlink(originalInDist);
			console.log(`   ✔ Removed: ${originalInDist}`);
		} catch {
			// 文件可能不存在，忽略
		}
	}

	console.log("✨ Font subsetting completed!");
}

main().catch((err) => {
	console.error("❌ Font subsetting failed:", err);
	process.exit(1);
});
