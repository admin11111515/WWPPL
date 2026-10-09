/**
 * 后台导航的**唯一一份数据源**。
 *
 * ⚠️ 为什么单独抽出来：侧栏（AdminSideNav）和命令面板（AdminCommandPalette）
 *    要显示同一套入口。以前这份数组写在 AdminSideNav.astro 里，加一个入口就得
 *    在别处再抄一遍 —— 抄漏的那种不会报错，只会"某个入口在某个地方看不到"。
 *    2026-10-07 抽到这里，两边都 import 它。
 *
 * 图标一律给 material-symbols 的短名（不带前缀），渲染时拼成 `material-symbols:xxx`。
 * ⚠️ 名字必须在 `scripts/generate-icons.js` 的 EXPLICIT_ICONS 里，否则 `uiIcon()`
 *    会**静默返回空串**（按钮在、里面什么都没有）。
 */
export interface AdminNavItem {
	/** 显示名（侧栏、命令面板、页面标题前缀都用它） */
	name: string;
	href: string;
	/** material-symbols 短名，如 "chat-bubble" */
	icon: string;
}

export interface AdminNavGroup {
	title: string;
	items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
	{
		title: "内容",
		items: [
			{ name: "说说", href: "/admin/moments/", icon: "chat-bubble" },
			{ name: "笔记", href: "/admin/notebooks/", icon: "book-2" },
			{ name: "文章", href: "/admin/posts/", icon: "article" },
			{ name: "页面", href: "/admin/pages/", icon: "description" },
			// 项目页（/projects/）的数据在 src/data/projects.json，这一页是它唯一的编辑入口。
			// 图标 inventory-2 = 作品/物品，跟"项目"这个意思对得上。
			{ name: "项目", href: "/admin/projects/", icon: "inventory-2" },
		],
	},
	{
		title: "站点",
		items: [
			{ name: "站点信息", href: "/admin/site/", icon: "badge" },
			{ name: "导航菜单", href: "/admin/nav/", icon: "list-alt" },
			{ name: "站点外观", href: "/admin/appearance/", icon: "palette" },
		],
	},
	{
		title: "媒体",
		items: [
			{ name: "图片库", href: "/admin/media/", icon: "image" },
			// 相册（前台 /gallery/）的数据在 src/data/gallery.json。
			// 图标用 add-photo-alternate 而**不是** image —— image 已经被"图片库"占了，
			// 两个入口同一个图标会分不清。
			{ name: "相册", href: "/admin/gallery/", icon: "add-photo-alternate" },
			// 「换头像」原来只有后台首页那张入口卡能打开（首页现在改成概览、不再放功能清单），
			// 所以挪到这儿：指向 /admin/?avatar=1，由首页自己读这个参数把面板展开。
			// ⚠️ 头像面板的代码仍在 index.astro（它和「传图片」共用 compressImage）。
			{ name: "换头像", href: "/admin/?avatar=1", icon: "account-circle" },
		],
	},
];

/** 摊平成一维，命令面板按它逐条列出 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
