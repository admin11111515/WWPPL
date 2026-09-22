import type { GeneratedCoverConfig } from "../types/generatedCover";

/**
 * 文章封面（本地生成）配置
 *
 * 封面在构建时按文章内容算出来，不下载任何外部图片：
 * 底色由分类决定，纹样与尺寸由文章标识算出的哈希决定，
 * 因此同一篇文章永远得到同一张封面，刷新不会变。
 *
 * 用法：文章 frontmatter 写 image: "auto"（"api" 是旧写法，兼容保留）。
 * 想给某篇文章用真实图片，把 image 写成图片路径即可，不受本配置影响。
 */
export const generatedCoverConfig: GeneratedCoverConfig = {
	// 是否启用按文章生成封面
	enable: true,

	// 分类配色：底色（色块）+ ink（压在上面的文字颜色）
	palettes: {
		技术: { base: "#7C93BE", ink: "#17253F" },
		生活: { base: "#7FB09A", ink: "#0F3A2C" },
		读书: { base: "#C9A063", ink: "#3A2A0C" },
		音乐: { base: "#9C8CBE", ink: "#2A2043" },
		番剧: { base: "#C38F9E", ink: "#4A2029" },
		Astro: { base: "#A98BB0", ink: "#3A2240" },
		CSS: { base: "#74AFA8", ink: "#123330" },
		TypeScript: { base: "#6FA3C4", ink: "#123047" },
	},

	// 分类没登记时使用
	fallbackPalette: { base: "#8C8C96", ink: "#22222A" },

	// 太笼统、不足以当封面主题词的标签（封面取"最后一个"够具体的标签）
	weakTags: [
		"生活",
		"随笔",
		"记录",
		"歌单",
		"追番",
		"前端",
		"日常",
		"其他",
	],

	// 主题词一行能放几个字宽（汉字 1，西文字母 0.62）。
	// 超过就折成两行；超过两行的部分截断。
	maxLabelWidth: 5,
};
