/**
 * 构建沙箱工具
 *
 * 背景：这台机器上，写入 C:\project 与 C:\Users\803\<各种子目录> 的吞吐量只有
 * 约 16 文件/秒，而 C:\Users\803\AppData\Local\Temp 可达约 4500 文件/秒
 * （同一磁盘同一用户，差异 280 倍，稳定复现，判定为某个安全软件的按路径白名单）。
 * 因此 node_modules 装在项目目录里会慢到不可用。
 *
 * 做法：源码仍以 git 管理的 C:\project\ppl_blog\WWPPL 为准（唯一事实来源），
 * 在 Temp 下建一个沙箱目录做依赖安装与构建验证。
 *
 * 用法：
 *   node dev/sandbox.mjs sync         仅同步源码到沙箱
 *   node dev/sandbox.mjs build        按 package.json 的完整链路构建
 *   node dev/sandbox.mjs build --fast 只跑 astro build，跳过内容生成与字体子集化
 *   node dev/sandbox.mjs clean        删除沙箱（含 node_modules）
 *   node dev/sandbox.mjs info         查看沙箱状态
 *
 * 关于 build 的完整性：package.json 里的 build 是五个步骤的链条，
 * 只跑 astro build 会得到一个"缺字体子集、缺搜索索引"的半成品 dist，
 * 据此验证会把正常产物误判成缺文件。所以这里默认跑完整链路。
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const SRC = "C:\\project\\ppl_blog\\WWPPL";
const SANDBOX_ROOT = path.join(os.tmpdir(), "wwppl-dev");
const DST = path.join(SANDBOX_ROOT, "WWPPL");

// 这些目录不同步：node_modules 留在沙箱里复用，其余是产物或缓存
const EXCLUDE_DIRS = new Set([
	"node_modules",
	"dist",
	".astro",
	".git",
	".wrangler",
	".vercel",
	".netlify",
]);

function log(msg) {
	console.log(msg);
}

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

/** 递归镜像 source -> dest（只覆盖文件，不删除 dest 里被排除的目录） */
function mirror(src, dest) {
	ensureDir(dest);
	const entries = fs.readdirSync(src, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isDirectory()) {
			if (EXCLUDE_DIRS.has(entry.name)) continue;
			mirror(path.join(src, entry.name), path.join(dest, entry.name));
		} else if (entry.isFile()) {
			const from = path.join(src, entry.name);
			const to = path.join(dest, entry.name);
			const srcStat = fs.statSync(from);
			// 目标已存在且大小/时间一致则跳过，减少写入
			try {
				const dstStat = fs.statSync(to);
				if (dstStat.size === srcStat.size && dstStat.mtimeMs >= srcStat.mtimeMs) continue;
			} catch {
				/* 目标不存在，继续复制 */
			}
			fs.copyFileSync(from, to);
		}
	}
}

function countFiles(dir, limit = 999999) {
	let n = 0;
	const walk = (d) => {
		if (n >= limit) return;
		let entries;
		try {
			entries = fs.readdirSync(d, { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			if (n >= limit) return;
			if (e.isDirectory()) walk(path.join(d, e.name));
			else n++;
		}
	};
	walk(dir);
	return n;
}

function doSync() {
	log(`[sync] ${SRC}`);
	log(`    -> ${DST}`);
	ensureDir(SANDBOX_ROOT);
	const t0 = Date.now();
	mirror(SRC, DST);
	const dt = Date.now() - t0;
	log(`[sync] 完成，耗时 ${dt} ms`);
	if (dt > 3000) {
		log("[sync] 提示：同步本身也受写入限速影响，属预期现象");
	}
}

function doClean() {
	if (fs.existsSync(SANDBOX_ROOT)) {
		fs.rmSync(SANDBOX_ROOT, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
		log(`[clean] 已删除 ${SANDBOX_ROOT}`);
	} else {
		log("[clean] 沙箱不存在，无需清理");
	}
}

function doInfo() {
	const has = fs.existsSync(DST);
	log(`[info] 沙箱根目录: ${SANDBOX_ROOT}`);
	log(`[info] 源码目录  : ${DST}  ${has ? "存在" : "不存在"}`);
	if (has) {
		log(`[info] 文件总数  : ${countFiles(DST)} (含 node_modules)`);
		try {
			const astro = JSON.parse(
				fs.readFileSync(path.join(DST, "node_modules", "astro", "package.json"), "utf8"),
			);
			log(`[info] astro     : ${astro.version}`);
		} catch {
			log("[info] astro     : 未安装");
		}
		try {
			const rollup = JSON.parse(
				fs.readFileSync(
					path.join(DST, "node_modules", ".pnpm", "node_modules", "rollup", "package.json"),
					"utf8",
				),
			);
			log(`[info] rollup    : ${rollup.version} ${rollup.version.startsWith("4") ? "(正确)" : "(应为 4.x)"}`);
		} catch {
			log("[info] rollup    : 无法读取");
		}
	}
	const store = path.join(process.env.LOCALAPPDATA || "", "pnpm", "store");
	log(`[info] pnpm store: ${store} ${fs.existsSync(store) ? "存在" : "不存在"}`);
}

const cmd = process.argv[2] || "info";

switch (cmd) {
	case "sync":
		doSync();
		break;
	case "clean":
		doClean();
		break;
	case "info":
		doInfo();
		break;
	case "build": {
		const fast = process.argv.includes("--fast");
		doSync();
		const env = {
			...process.env,
			http_proxy: "",
			https_proxy: "",
			HTTP_PROXY: "",
			HTTPS_PROXY: "",
		};
		// 与 package.json 的 build 脚本逐条对应，顺序不可换
		const steps = [
			{
				name: "生成图标常量 -> src/constants/icons.ts",
				cmd: process.execPath,
				args: ["scripts/generate-icons.js"],
				fast: true,
			},
			{
				name: "生成图片占位色 -> src/constants/lqips.json",
				cmd: "npx",
				args: ["--yes", "tsx", "scripts/generate-lqips.ts"],
				fast: true,
			},
			{
				name: "构建页面 -> dist/",
				cmd: process.execPath,
				args: ["./node_modules/astro/bin/astro.mjs", "build"],
			},
			{
				// 便宜且属于 HTML 收尾，--fast 也照跑
				name: "本地化代码块复制按钮 -> dist/**/*.html",
				cmd: "npx",
				args: ["--yes", "tsx", "scripts/localize-code-blocks.ts"],
			},
			{
				name: "字体子集化 -> dist/_astro/fonts/",
				cmd: "npx",
				args: ["--yes", "tsx", "scripts/subset-fonts.ts"],
				fast: true,
			},
			{
				name: "生成站内搜索索引 -> dist/pagefind/",
				cmd: process.execPath,
				args: ["scripts/build-search-index.mjs"],
			},
		];

		const t0 = Date.now();
		for (const step of steps) {
			if (fast && step.fast) {
				log(`[build] 跳过（--fast）：${step.name}`);
				continue;
			}
			log(`[build] 开始：${step.name}`);
			const res = spawnSync(step.cmd, step.args, {
				cwd: DST,
				env,
				stdio: "inherit",
				shell: process.platform === "win32",
			});
			if (res.status !== 0) {
				log(`[build] 失败：${step.name}（退出码 ${res.status}）`);
				log("[build] 链条已中断，后续步骤不再执行");
				process.exit(res.status ?? 1);
			}
			log(`[build] 完成：${step.name}`);
		}
		log(`[build] 全部步骤完成，总耗时 ${((Date.now() - t0) / 1000).toFixed(1)} s`);
		process.exit(0);
	}
	default:
		log("用法: node dev/sandbox.mjs [sync|build|build --fast|clean|info]");
}
