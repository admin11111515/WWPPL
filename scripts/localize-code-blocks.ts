/**
 * 代码块复制按钮的提示文案本地化（构建后处理）。
 *
 * 要解决的问题：鼠标移到代码块右上角的复制按钮，提示文字是英文的
 * （`title="Copy to clipboard"`，点下去变成 `Copied!`），中文站点上很突兀。
 *
 * 为什么不在配置里直接改：Expressive Code 的框架插件把这两个字符串写死在
 * 自己的文案表（`pluginFramesTexts`）里，内置的本地化只有德语。
 * 文案表本身提供了覆盖接口，但 astro.config.mjs 会被单独打成一个模块图，
 * 在那里拿到的插件对象与实际渲染用的不是同一份，覆盖了也不生效
 * （试过 `overrideTexts`，产物仍是英文）；挂渲染钩子同样改不动最终 HTML。
 * 所以退一步，在产物上直接改 —— 确定、可验、不依赖框架内部机制。
 *
 * 只动 `<button ... data-code="...">` 这个标签里的两个属性，不碰代码正文，
 * 因此代码示例里出现同样的英文也不会被误改。
 *
 * 站内语言取自产物首页的 `<html lang>`，与 build-search-index.mjs 同一套办法：
 * 语言来自产物而不是配置，将来站点换语言这里会自动跟上。
 *
 * 用法：npx tsx scripts/localize-code-blocks.ts   （在 astro build 之后运行）
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import I18nKey from "../src/i18n/i18nKey";
import { getTranslation } from "../src/i18n/translation";

const DIST_DIR = "dist";

/** 框架插件写死的英文原文 */
const SOURCE_TOOLTIP = "Copy to clipboard";
const SOURCE_COPIED = "Copied!";

/** 读出产物首页的语言标记（如 zh-CN），读不到就按英文算 */
function detectSiteLangTag(): string {
	try {
		const html = readFileSync(join(DIST_DIR, "index.html"), "utf-8");
		return (html.match(/<html[^>]*\slang="([^"]+)"/i)?.[1] || "en").trim();
	} catch {
		return "en";
	}
}

function walkHtml(dir: string, found: string[] = []): string[] {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) walkHtml(full, found);
		else if (entry.name.endsWith(".html")) found.push(full);
	}
	return found;
}

const langTag = detectSiteLangTag();
// 站点自己的语言映射用的是下划线写法（zh_CN），这里统一一下再查
const texts = getTranslation(langTag.replace(/-/g, "_"));
const targetTooltip = texts[I18nKey.codeCopyTooltip];
const targetCopied = texts[I18nKey.copied];

if (!targetTooltip || !targetCopied) {
	console.error("[code-blocks] 取不到复制按钮的目标文案，已跳过");
	process.exit(0);
}

// 站点本来就是英文时不用动
if (targetTooltip === SOURCE_TOOLTIP) {
	console.log("[code-blocks] 站点语言为英文，无需处理");
	process.exit(0);
}

const pages = walkHtml(DIST_DIR);
let buttonsTotal = 0;
let localized = 0;
let leftover = 0;
let touchedPages = 0;

for (const page of pages) {
	const source = readFileSync(page, "utf-8");

	// 只认带 data-code 的复制按钮，整段标签一起看
	const next = source.replace(/<button[^>]*\sdata-code="[^"]*"[^>]*>/g, (tag) => {
		buttonsTotal += 1;
		const patched = tag
			.replace(`title="${SOURCE_TOOLTIP}"`, `title="${targetTooltip}"`)
			.replace(`data-copied="${SOURCE_COPIED}"`, `data-copied="${targetCopied}"`);
		if (patched !== tag) localized += 1;
		else if (tag.includes(SOURCE_TOOLTIP)) leftover += 1;
		return patched;
	});

	if (next !== source) {
		writeFileSync(page, next, "utf-8");
		touchedPages += 1;
	}
}

console.log(
	`[code-blocks] 页面语言 ${langTag}，复制按钮 ${buttonsTotal} 个，` +
		`已本地化 ${localized} 个${touchedPages ? `，涉及 ${touchedPages} 个页面` : ""}`,
);

if (leftover > 0) {
	console.warn(
		`[code-blocks] 注意：仍有 ${leftover} 个按钮停留在英文文案，可能是上游改了默认值`,
	);
}

// 有按钮却一个都没换成，说明上游文案变了，直接失败，别让英文悄悄上线
if (buttonsTotal > 0 && localized === 0) {
	console.error(
		"[code-blocks] 一个都没替换成功，上游文案可能已变化，请检查脚本里的 SOURCE_TOOLTIP / SOURCE_COPIED",
	);
	process.exit(1);
}
