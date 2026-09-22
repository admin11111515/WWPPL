/**
 * 站内搜索索引构建脚本
 *
 * 为什么需要它：Pagefind 按页面上的语言标记挑选分词规则，且只认两位的语言代码。
 * 本站的语言标记是 `zh-CN`（带地区后缀），Pagefind 认不出来就退回英文规则，
 * 中文内容会被整段当作一个词，只有一字不差地输入整句才能搜到 —— 搜"体操"或
 * "放弃"都搜不到"类型体操：从入门到放弃再到真香"。这里从产物页面读出语言标记、
 * 取两位主代码传给 Pagefind，让索引按中文分词建立。
 *
 * 语言取自构建产物而不是配置文件，好处是站点语言改了（含通过环境变量改）之后
 * 搜索索引会自动跟上，不需要两处同时维护。
 *
 * 用法：node scripts/build-search-index.mjs      （在 astro build 之后运行）
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST_DIR = "dist";
const SITE_DIR = path.join(DIST_DIR, "pagefind");
const ENTRY_PAGE = path.join(DIST_DIR, "index.html");

/** 从产物首页读出语言标记，返回两位主代码（如 zh-CN -> zh） */
function detectPrimaryLanguage() {
	if (!existsSync(ENTRY_PAGE)) {
		return { code: null, reason: "找不到首页产物，无法判断语言" };
	}
	const html = readFileSync(ENTRY_PAGE, "utf8");
	const match = html.match(/<html[^>]*\slang="([^"]+)"/i);
	if (!match) {
		return { code: null, reason: "首页没有语言标记" };
	}
	const tag = match[1].trim();
	if (!tag) {
		return { code: null, reason: "首页语言标记为空" };
	}
	const primary = tag.split("-")[0].split("_")[0].toLowerCase();
	if (!/^[a-z]{2,3}$/.test(primary)) {
		return { code: null, reason: `语言标记 ${tag} 不是有效代码` };
	}
	return { code: primary, tag };
}

/**
 * 定位 pagefind 自带的命令行入口。
 *
 * 走命令行而不是直接调编程接口，是为了让项目根的 pagefind.yml 继续生效
 * （排除搜索面板、公式等选择器的规则都在那份配置里）；编程接口不会读它。
 * 入口路径靠包的导出表逐层上溯得到，不依赖 shell 包装脚本，也不写死内部路径。
 */
function resolvePagefindBin() {
	const dir = resolvePagefindDir();
	const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
	const binRel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.pagefind;
	if (!binRel) throw new Error("pagefind 未声明命令行入口");
	return path.join(dir, binRel);
}

/** 找到 pagefind 包所在目录 */
function resolvePagefindDir() {
	// 该包只在导出表里声明了 import 条件，用 require 解析会直接报错，
	// 因此先走 ESM 解析。
	try {
		const resolved = import.meta.resolve("pagefind");
		if (resolved?.startsWith("file:")) {
			const dir = walkUpToPackage(fileURLToPath(resolved));
			if (dir) return dir;
		}
	} catch {
		/* 落到底部兜底 */
	}

	// 兜底：从当前工作目录向上找 node_modules。
	// 构建脚本总是由包管理器在项目根目录执行，这条路径足够可靠。
	let dir = process.cwd();
	while (true) {
		const candidate = path.join(dir, "node_modules", "pagefind", "package.json");
		if (existsSync(candidate)) return path.dirname(candidate);
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error("未找到 pagefind，请先安装依赖");
}

/** 从某个文件出发向上找到它所属的 pagefind 包目录 */
function walkUpToPackage(fromFile) {
	let dir = path.dirname(fromFile);
	while (true) {
		const candidate = path.join(dir, "package.json");
		if (existsSync(candidate)) {
			const pkg = JSON.parse(readFileSync(candidate, "utf8"));
			if (pkg.name === "pagefind") return dir;
		}
		const parent = path.dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

const { code, tag, reason } = detectPrimaryLanguage();
const args = ["--site", DIST_DIR];

if (code) {
	args.push("--force-language", code);
	console.log(`[search] 页面语言标记为 ${tag}，按主代码 ${code} 建立索引`);
} else {
	console.log(`[search] ${reason}，交由 Pagefind 自行判断语言`);
}

const bin = resolvePagefindBin();
const res = spawnSync(process.execPath, [bin, ...args], { stdio: "inherit" });

if (res.status !== 0) {
	console.error(`[search] 索引构建失败（退出码 ${res.status}）`);
	process.exit(res.status ?? 1);
}
console.log(`[search] 索引已输出到 ${SITE_DIR}`);
