// 文章管理后台配置（基于 GitHub Contents API）
// 文章直接写入博客仓库，保存后由 Cloudflare 自动重新构建

export const externalPostsConfig = {
	// 是否启用文章管理后台
	enable: true,

	// 博客仓库信息
	owner: "admin11111515",
	repo: "WWPPL",
	branch: "main",

	// 文章 Markdown 存放目录（相对于仓库根目录）
	postsPath: "src/content/posts",

	// 文章图片存放目录（相对于仓库根目录）
	imagesPath: "public/images/posts",
};
