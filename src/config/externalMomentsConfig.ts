// 外部说说数据源配置（基于 GitHub Gist，完全免费）
// 数据存储在 GitHub Gist 中，通过 GitHub API 读写
// 添加新说说不会修改仓库中的任何代码

export const externalMomentsConfig = {
	// 是否启用外部说说数据源
	enable: true,

	// GitHub Gist ID（创建 Gist 后从 URL 中获取）
	gistId: "63681782052c48c2b7814ea6969c3b43",

	// Gist 中的文件名
	fileName: "moments.json",

	// 默认作者信息
	defaultAuthor: "WWPPL",
	defaultAvatar: "/assets/avatar.png",
};
