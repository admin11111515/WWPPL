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
		// ⚠️ **这个分组的顺序照前台导航排**（文章 → 动态 → 兴趣 → 作品 → 关于），
		//    名字也用前台的叫法 —— 目的就是让「后台的板块」和「前台的板块」一眼对得上。
		//    凡前台导航里有的栏目，这里都要有一条（内容手填的用来编辑，内容自动拉取的
		//    用来开关 + 说明来源），一条都不能少、也不能多出前台没有的"板块"。
		//    逐条断言见 `_gen/_前后台板块对照.mjs`（改板块就改它那张表）。
		items: [
			// 前台「文章」（归档/分类/标签 是它自己的下级页，且只由文章内容派生，不单列入口）
			{ name: "文章", href: "/admin/posts/", icon: "article" },
			// 前台「动态 › 朋友圈」。⚠️ 页名从前叫「说说」—— 前台一直叫朋友圈，
			// 两套叫法让人对不上，2026-10-15 统一成前台的叫法。
			{ name: "朋友圈", href: "/admin/moments/", icon: "chat-bubble" },
			// 前台「动态 › 相册」。原来挂在「媒体」组里，2026-10-15 挪回板块组
			// —— 它是个前台栏目，不是站点媒体设置（图片库才是）。
			{ name: "相册", href: "/admin/gallery/", icon: "add-photo-alternate" },
			// 前台「动态 › 留言」。内容在评论系统里（配置一次就够），这页只放开关与说明。
			{ name: "留言", href: "/admin/guestbook/", icon: "chat" },
			// 前台「动态 › 笔记」（/life/notebooks/）
			{ name: "笔记", href: "/admin/notebooks/", icon: "book-2" },
			// 前台「兴趣 › 追番」。内容是构建时从 B 站拉的，这页只放开关与说明。
			{ name: "追番", href: "/admin/anime/", icon: "movie" },
			// 前台「兴趣 › 音乐」。歌单是接口预取的，这页只放开关与说明。
			{ name: "音乐", href: "/admin/music/", icon: "music-note-rounded" },
			// 前台「兴趣 › 友链」（/friends/）数据在 src/data/friends.json。图标与前台一致。
			{ name: "友链", href: "/admin/friends/", icon: "group" },
			// 前台「作品 › 项目」（/projects/）数据在 src/data/projects.json。
			{ name: "项目", href: "/admin/projects/", icon: "inventory-2" },
			// 前台「作品 › 技能」（/skills/）数据在 src/data/skills.json。
			{ name: "技能", href: "/admin/skills/", icon: "psychology" },
			// 前台「关于 › 关于我」= src/content/spec/about.md。
			// ⚠️ 这里叫「说明页」而不是「关于我」：这一页还管着「留言板」和「友链」的说明文
			//    （spec 目录下三份），只挂"关于我"会让人以为别的改不了。
			{ name: "说明页", href: "/admin/pages/", icon: "description" },
			// 前台「关于 › 打赏」。打赏方式写在 src/config/sponsorConfig.ts（硬编码），
			// 这页只放开关与说明 —— 别做成假的编辑框。
			{ name: "打赏", href: "/admin/sponsor/", icon: "favorite" },
		],
	},
	{
		title: "站点",
		items: [
			{ name: "站点信息", href: "/admin/site/", icon: "badge" },
			// 公告：全站左侧栏那条。数据在 src/data/announcement.json。
			{ name: "公告", href: "/admin/announcement/", icon: "campaign" },
			{ name: "导航菜单", href: "/admin/nav/", icon: "list-alt" },
			{ name: "站点外观", href: "/admin/appearance/", icon: "palette" },
		],
	},
	{
		title: "媒体",
		// 这两个是**站点设置**、不是前台栏目：图片库是全站图片的存放处（前台没有这个页面），
		// 换头像改的是站点头像。别把它们当成"前台板块"去找对应关系。
		items: [
			{ name: "图片库", href: "/admin/media/", icon: "image" },
			// 「换头像」原来只有后台首页那张入口卡能打开（首页改成概览后不放功能清单），
			// 所以挪到这儿：指向 /admin/?avatar=1，由首页自己读这个参数把面板展开。
			{ name: "换头像", href: "/admin/?avatar=1", icon: "account-circle" },
		],
	},
];

/** 摊平成一维，命令面板按它逐条列出 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
