/**
 * 按文章生成的封面（本地生成，不依赖任何外部图片服务）
 */

export interface GeneratedCoverPalette {
	/** 封面底色 */
	base: string;
	/** 压在底色上的文字颜色 */
	ink: string;
}

export interface GeneratedCoverConfig {
	/** 是否启用"按文章生成封面" */
	enable: boolean;
	/** 分类名 -> 配色。分类名需与文章 frontmatter 里的 category 完全一致 */
	palettes: Record<string, GeneratedCoverPalette>;
	/** 文章分类没在 palettes 里登记时使用的配色 */
	fallbackPalette: GeneratedCoverPalette;
	/** 过于笼统、不适合单独作为封面主题词的标签 */
	weakTags: string[];
	/** 封面主题词的最大显示宽度（一个汉字算 1，一个西文字母算 0.55） */
	maxLabelWidth: number;
}
