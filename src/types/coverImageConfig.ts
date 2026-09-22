export type CoverImageConfig = {
	enableInPost: boolean; // 是否在文章详情页显示封面图
	fallback?: string; // 图片加载失败时的兜底图（相对于 src 目录，或以 / 开头的 public 路径）
	showLoading?: boolean; // 是否显示加载动画
};
