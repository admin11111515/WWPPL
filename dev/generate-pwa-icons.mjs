/**
 * PWA 图标生成器
 *
 * 从 favicon 的设计语言出发，用矢量重绘并栅格化出各尺寸图标。
 * 之所以重绘而不是放大现有 PNG：现有素材最大只有 192x192，直接放大到 512
 * 边缘会发虚；而图形本身是纯色扁平形状（圆角方块 + 圆点），用矢量重绘可以
 * 在任意尺寸下保持锐利，并且以后改主题色只需改这里的常量。
 *
 * 几何参数与配色均从 public/favicon/favicon-light-192.png 实测取得：
 *   画布 192x192，圆角方块铺满，圆角半径 41px（21.4%）
 *   圆点中心 (59.5, 59.5) 即 31.0% 处，半径 23.5px（12.24%）
 *   底色 #1e212b，圆点 #90aafa
 *
 * 用法（需能解析到 sharp，通常在沙箱内执行）：
 *   node dev/generate-pwa-icons.mjs [--out <目录>]
 * 默认输出到 public/icons/。
 */
import fs from "node:fs";
import path from "node:path";

// 需要 sharp；在沙箱内运行时由沙箱的 node_modules 提供
const sharp = (await import("sharp")).default;

// ── 实测取得的品牌常量 ───────────────────────────────────────
const BG = "#1e212b"; // 底色
const DOT = "#90aafa"; // 圆点
const CORNER_RATIO = 0.214; // 圆角半径占边长比例
const DOT_CX = 0.31; // 圆点中心横坐标占比
const DOT_CY = 0.31; // 圆点中心纵坐标占比
const DOT_R = 0.1224; // 圆点半径占边长比例

/** 常规图标：圆角方块 + 偏左上的圆点，与站点 favicon 完全一致 */
function anySvg(size) {
	const r = (size * CORNER_RATIO).toFixed(2);
	const cx = (size * DOT_CX).toFixed(2);
	const cy = (size * DOT_CY).toFixed(2);
	const dr = (size * DOT_R).toFixed(2);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${dr}" fill="${DOT}"/>
</svg>`;
}

/**
 * 可遮罩图标（maskable）：
 * 系统会按自己的形状裁切，安全区是以中心为圆心、直径 80% 的圆。
 * 因此这里底色铺满整个画布不留圆角，圆点移到正中心并放大，
 * 保证任何裁切形状下都不会被切掉。
 */
function maskableSvg(size) {
	const cx = size / 2;
	const cy = size / 2;
	const dr = size * 0.26;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${dr}" fill="${DOT}"/>
</svg>`;
}

const outArgIndex = process.argv.indexOf("--out");
const OUT = path.resolve(
	outArgIndex >= 0 && process.argv[outArgIndex + 1]
		? process.argv[outArgIndex + 1]
		: "public/icons",
);

fs.mkdirSync(OUT, { recursive: true });

const jobs = [
	{ file: "icon-192.png", size: 192, svg: anySvg },
	{ file: "icon-512.png", size: 512, svg: anySvg },
	{ file: "icon-maskable-512.png", size: 512, svg: maskableSvg },
	// iOS 不读 manifest 的图标，只认 apple-touch-icon，单独出一张
	{ file: "apple-touch-icon.png", size: 180, svg: anySvg },
];

console.log(`[icons] 输出目录: ${OUT}`);
for (const job of jobs) {
	const buf = Buffer.from(job.svg(job.size));
	const out = path.join(OUT, job.file);
	// SVG 内已带 width/height，按默认密度栅格化即为目标尺寸；
	// 再 resize 一次作为兜底，防止渲染器密度差异导致尺寸跑偏。
	await sharp(buf)
		.resize(job.size, job.size)
		.png({ compressionLevel: 9 })
		.toFile(out);
	const meta = await sharp(out).metadata();
	const bytes = fs.statSync(out).size;
	if (meta.width !== job.size || meta.height !== job.size) {
		throw new Error(
			`${job.file} 尺寸不符：期望 ${job.size}x${job.size}，实得 ${meta.width}x${meta.height}`,
		);
	}
	console.log(
		`  ${job.file.padEnd(26)} ${meta.width}x${meta.height}  ${bytes} 字节`,
	);
}
console.log("[icons] 完成");
