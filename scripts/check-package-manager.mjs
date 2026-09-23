/**
 * 包管理器一致性检查（替代 only-allow pnpm 的 preinstall 钩子）
 *
 * 为什么不用 `npx only-allow pnpm`：
 *   1. only-allow 本身不在依赖里，npx 会临时去下载它；
 *   2. 它只认 pnpm，一旦构建平台用 npm 装依赖就立刻 exit 1 —— 而这一步发生在
 *      install 阶段、编译都还没开始，表现为「构建一推就秒失败」，且日志里
 *      看不出是配置问题。
 *
 * 现在的策略：本地误用 npm/yarn 照旧拦下（保住依赖一致性），
 * 但在构建平台上放行（构建平台用什么装依赖是它的事，不该拦）。
 */

const ua = process.env.npm_config_user_agent || "";

/** 常见的构建平台环境变量 */
const CI_MARKERS = [
	"CF_PAGES", // Cloudflare Pages
	"WORKERS_CI", // Cloudflare Workers Builds
	"CI", // 通用
	"VERCEL",
	"NETLIFY",
];

const onBuildPlatform = CI_MARKERS.some((k) => process.env[k]);

if (ua.startsWith("pnpm/")) {
	// 正常路径，静默通过
	process.exit(0);
}

if (onBuildPlatform) {
	const who = CI_MARKERS.find((k) => process.env[k]);
	console.warn(
		`[check-package-manager] 检测到构建平台环境（${who}），当前包管理器：${ua || "未知"}，放行。`,
	);
	console.warn(
		"[check-package-manager] 提示：本项目锁文件是 pnpm-lock.yaml，构建平台建议按 packageManager 字段使用 pnpm。",
	);
	process.exit(0);
}

console.error("");
console.error("[check-package-manager] 本项目统一使用 pnpm，检测到其他包管理器：");
console.error(`  当前：${ua || "未知（直接调用 node？）"}`);
console.error("");
console.error("  请改用：pnpm install");
console.error("  没有 pnpm 可先执行：corepack enable pnpm   或   npm i -g pnpm");
console.error("");
console.error("  之所以要拦：package-lock.json / yarn.lock 与 pnpm-lock.yaml 并存会让");
console.error("  依赖树在本地与线上产生差异，构建结果不可复现。");
console.error("");
process.exit(1);
