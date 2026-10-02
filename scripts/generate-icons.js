/**
 * 图标预处理脚本
 * 在构建时自动扫描 Svelte 组件中使用的图标，并生成内联 SVG 数据
 *
 * 使用方法：node scripts/generate-icons.js
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getIconData, iconToSVG, iconToHTML, replaceIDs } from "@iconify/utils";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const SRC_DIR = join(ROOT_DIR, "src");
// ① 扫描 .svelte 得到的图标 → Svelte 组件用（common/Icon.svelte）
const OUTPUT_FILE = join(SRC_DIR, "constants", "icons.ts");
// ② 显式清单得到的图标 → 不走博客 Layout 的独立页面（后台）与其它免 CDN 场景
const UI_OUTPUT_FILE = join(SRC_DIR, "constants", "ui-icons.ts");

/**
 * 显式图标清单
 *
 * 为什么不靠扫描？后台页面（src/pages/admin/*）是独立 HTML：不 import
 * common/Icon.svelte，也不加载 iconify 运行时，所以只能吃构建期内联的 SVG。
 * 而 icons.ts 是给 Svelte 用的，让后台 import 它会把 Svelte 那套图标一起拖进去。
 *
 * 名字写错会直接让脚本报错退出 —— 显式清单不允许静默少一个图标。
 *
 * 命名分两类，与前台保持一致：
 *   fluent-color     内容类图标（彩色 UI 图标，带语义色），绝大多数走这个
 *   material-symbols 控件类（引用 / 批量添加 / 进度 / 挥手）—— 这些是操作控件，
 *                    染色反而杂乱，保持中性
 */
const EXPLICIT_ICONS = [
	// 后台入口 / 内容种类
	"fluent-color:clipboard-text-edit-24", // 写文章、写作
	"fluent-color:book-open-24", // 笔记本、书籍
	"fluent-color:chat-24", // 说说
	"fluent-color:image-24", // 图库、图片集
	"fluent-color:document-folder-24", // 传图片（上传到仓库的图片库，2026-10-01 加）
	"fluent-color:contact-card-24", // 站点信息（名片 = 资料）
	"fluent-color:document-edit-24", // 页面内容（改页面正文）
	"fluent-color:apps-list-detail-24", // 导航菜单（一条清单带详情，2026-10-02 加）
	"fluent-color:paint-brush-24", // 站点外观（配色、壁纸，2026-10-02 加）
	// 字段标签
	"fluent-color:document-text-24", // 内容
	"fluent-color:image-24", // 图片（带外框，用于字段标签）
	"fluent-color:bookmark-24", // 标签
	"fluent-color:location-ripple-24", // 位置
	"fluent-color:location-ripple-24", // 获取当前位置
	"fluent-color:clock-24", // 发布时间
	"fluent-color:pin-24", // 置顶
	"fluent-color:document-text-24", // 已发布 / 已有条目
	"fluent-color:history-24", // 草稿恢复
	// 编辑器工具栏
	"fluent-color:link-24", // 链接
	"fluent-color:image-24", // 插入图片
	"material-symbols:format-quote", // 引用
	"fluent-color:text-bullet-list-square-24", // 无序列表
	"fluent-color:clipboard-task-24", // 待办列表
	"fluent-color:table-24", // 表格
	"fluent-color:code-block-24", // 代码块
	"material-symbols:playlist-add", // 批量添加
	// 状态
	"fluent-color:checkmark-circle-24", // 已配置
	"fluent-color:warning-24", // 待配置 / 读取失败
	"material-symbols:progress-activity", // 进行中
	"fluent-color:mail-24", // 空列表
	"fluent-color:document-text-24", // 空笔记 / 空文章
	"fluent-color:search-visual-24", // 找不到
	"fluent-color:options-24", // 无匹配结果
	// 笔记模板
	"fluent-color:calendar-24", // 每日总结
	"fluent-color:lightbulb-24", // 灵感
	"fluent-color:book-open-24", // 读书笔记
	"material-symbols:explore", // 没指定笔记时的提示
	// 后台首页
	"material-symbols:waving-hand", // 欢迎回来
	// 文章列表的行与操作按钮（2026-10-02 加：站长说「文章管理还是没有图标」）
	// ⚠️ 控件类图标按约定一律用 material-symbols 单色，别混成 fluent-color 彩色
	"material-symbols:open-in-new", // 查看（新标签打开站上那一篇）
	"material-symbols:edit", // 编辑
	"material-symbols:delete", // 删除
	"material-symbols:note-add", // 新建文章
	"material-symbols:draft", // 草稿徽标
];

// 支持的图标集及其包名
const ICON_SETS = {
	"material-symbols": "@iconify-json/material-symbols",
	// 彩色 UI 图标（微软官方）。内容类图标改用它 —— 原 material-symbols 的
	// 「无后缀 = Filled」是这套里最重最黑的一档，正是「图标显黑显笨」的根因
	"fluent-color": "@iconify-json/fluent-color",
	"fa7-solid": "@iconify-json/fa7-solid",
	"fa7-brands": "@iconify-json/fa7-brands",
	"fa7-regular": "@iconify-json/fa7-regular",
	mdi: "@iconify-json/mdi",
	"simple-icons": "@iconify-json/simple-icons",
	mingcute: "@iconify-json/mingcute",
	"svg-spinners": "@iconify-json/svg-spinners",
};

// 图标集数据缓存
const iconSetCache = new Map();

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dir, extensions = [".svelte"]) {
	const files = [];

	function walk(currentDir) {
		const items = readdirSync(currentDir);
		for (const item of items) {
			const fullPath = join(currentDir, item);
			const stat = statSync(fullPath);

			if (stat.isDirectory()) {
				// 跳过 node_modules 和隐藏目录
				if (!item.startsWith(".") && item !== "node_modules") {
					walk(fullPath);
				}
			} else if (extensions.some((ext) => item.endsWith(ext))) {
				files.push(fullPath);
			}
		}
	}

	walk(dir);
	return files;
}

/**
 * 从文件内容中提取图标名称
 */
function extractIconNames(content) {
	const icons = new Set();

	// 匹配各种图标使用模式
	const patterns = [
		// icon="xxx:yyy" 或 icon='xxx:yyy'
		/icon=["']([a-z0-9-]+:[a-z0-9-]+)["']/gi,
		// icon={`xxx:yyy`}
		/icon=\{[`"']([a-z0-9-]+:[a-z0-9-]+)[`"']\}/gi,
		// getIconSvg("xxx:yyy") 或 getIconSvg('xxx:yyy')
		/getIconSvg\(["']([a-z0-9-]+:[a-z0-9-]+)["']\)/gi,
		// hasIcon("xxx:yyy")
		/hasIcon\(["']([a-z0-9-]+:[a-z0-9-]+)["']\)/gi,
	];

	for (const pattern of patterns) {
		let match;
		while ((match = pattern.exec(content)) !== null) {
			icons.add(match[1]);
		}
	}

	return icons;
}

/**
 * 加载图标集数据
 */
async function loadIconSet(prefix) {
	if (iconSetCache.has(prefix)) {
		return iconSetCache.get(prefix);
	}

	const packageName = ICON_SETS[prefix];
	if (!packageName) {
		console.warn(`⚠️  未知图标集: ${prefix}`);
		return null;
	}

	try {
		// 动态导入图标集 JSON
		const iconSetPath = join(ROOT_DIR, "node_modules", packageName, "icons.json");
		const data = JSON.parse(readFileSync(iconSetPath, "utf-8"));
		iconSetCache.set(prefix, data);
		return data;
	} catch (error) {
		console.warn(`⚠️  无法加载图标集 ${packageName}: ${error.message}`);
		return null;
	}
}

/**
 * 获取单个图标的 SVG
 */
async function getIconSvg(iconName) {
	const [prefix, name] = iconName.split(":");
	if (!prefix || !name) {
		console.warn(`⚠️  无效的图标名称: ${iconName}`);
		return null;
	}

	const iconSet = await loadIconSet(prefix);
	if (!iconSet) {
		return null;
	}

	const iconData = getIconData(iconSet, name);
	if (!iconData) {
		console.warn(`⚠️  图标未找到: ${iconName}`);
		return null;
	}

	// 转换为 SVG
	const renderData = iconToSVG(iconData, {
		height: "1em",
		width: "1em",
	});

	let svg = iconToHTML(replaceIDs(renderData.body), renderData.attributes);

	// 确保支持 currentColor
	if (!svg.includes("currentColor")) {
		svg = svg.replace("<svg", '<svg fill="currentColor"');
	}

	return svg;
}

/**
 * 生成 icons.ts 文件
 */
function generateIconsFile(iconsMap) {
	const iconEntries = Array.from(iconsMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, svg]) => `\t"${name}":\n\t\t'${svg.replace(/'/g, "\\'")}'`)
		.join(",\n");

	const content = `/**
 * 自动生成的图标数据文件
 * 由 scripts/generate-icons.js 在构建时生成
 * 请勿手动编辑此文件
 */

const iconSvgData: Record<string, string> = {
${iconEntries}
};

/**
 * 根据 iconify 格式的图标名获取内联 SVG HTML
 * @param iconName 图标名称，如 "fluent-color:search-visual-24"
 * @returns SVG HTML 字符串
 */
export function getIconSvg(iconName: string): string {
	return iconSvgData[iconName] || "";
}

/**
 * 检查图标是否可用
 */
export function hasIcon(iconName: string): boolean {
	return iconName in iconSvgData;
}

/**
 * 获取所有可用图标名称
 */
export function getAvailableIcons(): string[] {
	return Object.keys(iconSvgData);
}

export default iconSvgData;
`;

	return content;
}

/**
 * 生成 ui-icons.ts（显式清单专用）
 */
function generateUiIconsFile(iconsMap) {
	const iconEntries = Array.from(iconsMap.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, svg]) => `\t"${name}":\n\t\t'${svg.replace(/'/g, "\\'")}'`)
		.join(",\n");

	return `/**
 * 自动生成的图标数据文件（显式清单）
 * 由 scripts/generate-icons.js 生成，请勿手动编辑
 *
 * 与 icons.ts 的分工：icons.ts 是「扫描 .svelte 得到」的，供 Svelte 组件用；
 * 本文件是「显式声明」的，给不走博客 Layout、不加载 iconify 运行时的独立页面
 * （后台 /admin/*）用。要增删图标，改 scripts/generate-icons.js 的 EXPLICIT_ICONS。
 */

const uiIconSvgData: Record<string, string> = {
${iconEntries}
};

/**
 * 按 iconify 图标名取内联 SVG
 * @param iconName 如 "fluent-color:clipboard-text-edit-24"
 * @returns SVG HTML 字符串；名字不存在时返回空串
 */
export function uiIcon(iconName: string): string {
	return uiIconSvgData[iconName] || "";
}

/** 图标是否可用 */
export function hasUiIcon(iconName: string): boolean {
	return iconName in uiIconSvgData;
}

/** 全部可用图标名 */
export function getUiIconNames(): string[] {
	return Object.keys(uiIconSvgData);
}

export default uiIconSvgData;
`;
}

/**
 * 主函数
 */
async function main() {
	console.log("🔍 扫描源文件中的图标使用...\n");

	// 获取所有源文件
	const files = getAllFiles(SRC_DIR);
	console.log(`📁 找到 ${files.length} 个源文件\n`);

	// 收集所有使用的图标
	const allIcons = new Set();

	for (const file of files) {
		// 跳过 icons.ts 文件本身
		if (file.endsWith("icons.ts")) continue;

		const content = readFileSync(file, "utf-8");
		const icons = extractIconNames(content);

		for (const icon of icons) {
			allIcons.add(icon);
		}
	}

	console.log(`🎨 发现 ${allIcons.size} 个不同的图标:\n`);

	// 按图标集分组显示
	const iconsBySet = {};
	for (const icon of allIcons) {
		const [prefix] = icon.split(":");
		if (!iconsBySet[prefix]) {
			iconsBySet[prefix] = [];
		}
		iconsBySet[prefix].push(icon);
	}

	for (const [prefix, icons] of Object.entries(iconsBySet)) {
		console.log(`   ${prefix}: ${icons.length} 个图标`);
	}
	console.log("");

	// 获取所有图标的 SVG
	const iconsMap = new Map();
	let successCount = 0;
	let failCount = 0;

	for (const iconName of allIcons) {
		const svg = await getIconSvg(iconName);
		if (svg) {
			iconsMap.set(iconName, svg);
			successCount++;
		} else {
			failCount++;
		}
	}

	console.log(`✅ 成功加载 ${successCount} 个图标`);
	if (failCount > 0) {
		console.log(`❌ 失败 ${failCount} 个图标`);
	}

	// 生成输出文件
	const output = generateIconsFile(iconsMap);
	writeFileSync(OUTPUT_FILE, output, "utf-8");

	console.log(`\n📝 已生成: ${OUTPUT_FILE}`);
	console.log(`📦 文件大小: ${(Buffer.byteLength(output, "utf-8") / 1024).toFixed(2)} KB\n`);

	// ── 显式清单（后台等独立页面用）─────────────────────────────
	const uiMap = new Map();
	const missing = [];

	for (const iconName of EXPLICIT_ICONS) {
		const svg = await getIconSvg(iconName);
		if (svg) {
			uiMap.set(iconName, svg);
		} else {
			missing.push(iconName);
		}
	}

	// 显式清单写错名字要立刻失败，不能静默少一个图标
	if (missing.length) {
		console.error(`❌ 显式清单里有 ${missing.length} 个图标取不到：`);
		for (const m of missing) {
			console.error(`   ${m}`);
		}
		process.exit(1);
	}

	const uiOutput = generateUiIconsFile(uiMap);
	writeFileSync(UI_OUTPUT_FILE, uiOutput, "utf-8");

	console.log(`📝 已生成: ${UI_OUTPUT_FILE}`);
	console.log(
		`📦 文件大小: ${(Buffer.byteLength(uiOutput, "utf-8") / 1024).toFixed(2)} KB（${uiMap.size} 个图标）\n`,
	);
}

main().catch(console.error);
