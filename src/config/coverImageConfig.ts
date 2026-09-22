import type { CoverImageConfig } from "../types/coverImageConfig";

/**
 * 文章封面配置
 *
 * 封面的来源写在文章 frontmatter 的 image 字段里，两种写法：
 *
 * 1. image: "auto"  —— 按文章生成（底色取自分类，纹样取自文章标识），
 *    规则见 src/config/generatedCoverConfig.ts。不下载任何外部图片，
 *    同一篇文章永远得到同一张封面。
 * 2. image: 图片路径 —— 使用本地图片或外链图片，本文件不参与。
 *
 * 说明：原来自带的"远程随机图接口"已移除。
 * 那几个接口返回的是与文章无关的壁纸，而且同一篇文章每次刷新都会换一张，
 * 也经常加载不出来，因此改为本地生成。
 */
export const coverImageConfig: CoverImageConfig = {
	// 是否在文章详情页显示封面图
	enableInPost: true,

	// 图片加载失败时的兜底图（相对于 src 目录或以 / 开头的 public 目录路径）
	fallback: "assets/images/cover.avif",

	// 是否显示加载动画
	showLoading: true,
};
