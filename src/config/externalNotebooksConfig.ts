// 外部笔记数据源配置（基于 GitHub Gist，完全免费）
// 每个笔记本有独立的 Gist 仓库，避免单个 Gist 空间不足
// 与说说后端共用同一套认证机制

import notebookGistsJson from "@/data/notebooks.json";

/**
 * 笔记本清单 = `笔记本名 → Gist ID` 的映射。
 *
 * ⚠️ 2026-10-06：这份数据**搬到了 `src/data/notebooks.json`**，因为
 * 站长问「这个笔记本不能自己创建或编辑吗」—— 原来它写在这个 .ts 里，
 * 增删改一本笔记本就得改代码 + 提交 + 等构建，后台里做不了。
 * 抽成 JSON 之后，后台 `/admin/notebooks/` 的「笔记本管理」能直接读写它
 * （走 GitHub Contents API，和「站点信息」那套完全一样）。
 * 搬动时少了「我和宝宝的日常」那一本（站长 2026-10-06 说不需要）。
 *
 * 新建一本笔记本的流程（后台会自动走完，不用手做）：
 *   后台填名字 → 写进这个 JSON（值留空）→ 保存并首次写笔记时
 *   自动建一个 Secret Gist 并把 ID 回填进这里。
 *   手工建的话：在 https://gist.github.com 建 Secret Gist，
 *   文件名 notebooks-entries.json、内容 []，再把 Gist ID 填到对应名字后面。
 */
const notebookGists = notebookGistsJson as Record<string, string>;

export const externalNotebooksConfig = {
	// 是否启用外部笔记数据源
	enable: true,

	// 每个笔记本对应的 Gist ID（数据源：src/data/notebooks.json，后台可改）
	notebookGists: notebookGists,

	// 笔记模板（Admin 页面快速选择）
	// {name} 会被替换为今天的日期，如 2026-06-11
	// icon 写图标名（material-symbols:xxx），后台会把它换成内联 SVG 渲染；
	// 取不到的名字会原样显示，所以填 emoji 也能用，只是不推荐。
	// title / content 是写进笔记正文的文字，照原样保留，不在图标化的范围内。
	templates: [
		{
			id: "daily",
			icon: "fluent-color:calendar-24",
			name: "每日总结",
			title: "{name} 每日总结",
			content: "✅️今天做了：  \n🤔今日感悟：  \n⏰明天计划：",
		},
		{
			id: "diary",
			icon: "fluent-color:book-open-24",
			name: "日记",
			title: "{name}",
			content: "## 天气\n\n## 今天发生了什么\n\n## 心情\n\n## 想说的话\n\n",
		},
		{
			id: "reading",
			icon: "fluent-color:book-open-24",
			name: "读书笔记",
			title: "",
			content:
				"## 📖 书籍信息\n\n- 书名：\n- 作者：\n- 阅读进度：\n\n## 核心观点\n\n## 精彩摘录\n\n> \n\n## 我的思考\n\n",
		},
		{
			id: "idea",
			icon: "fluent-color:lightbulb-24",
			name: "灵感",
			title: "💡 {name} 灵感",
			content: "## 灵感来源\n\n## 具体想法\n\n## 下一步行动\n\n- [ ] \n",
		},
		{
			id: "todo",
			icon: "fluent-color:clipboard-task-24",
			name: "待办",
			title: "📋 {name} 待办",
			content:
				"## 重要且紧急\n\n- [ ] \n\n## 重要不紧急\n\n- [ ] \n\n## 紧急不重要\n\n- [ ] \n\n## 其他\n\n- [ ] \n",
		},
		{
			id: "free",
			icon: "fluent-color:document-text-24",
			name: "空白",
			title: "",
			content: "",
		},
	] as Array<{
		id: string;
		/** material-symbols 图标名（后台渲染成内联 SVG） */
		icon: string;
		name: string;
		title: string;
		content: string;
	}>,
};
