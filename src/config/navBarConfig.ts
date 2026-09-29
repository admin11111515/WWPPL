import {
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/navBarConfig";

// ============================================================================
// 导航栏配置 - 根据顺序动态生成导航栏链接
// NavBar Configuration - Dynamically generate navigation bar links based on order
// ============================================================================
const getDynamicNavBarConfig = (): NavBarConfig => {
	// 基础导航栏链接
	const links: NavBarLink[] = [
		// 主页
		LinkPresets.Home,
	];

	// 文章及其子菜单
	links.push({
		name: "文章",
		url: "#",
		icon: "material-symbols:article",
		children: [
			// 归档
			LinkPresets.Archive,

			// 分类
			LinkPresets.Categories,

			// 标签
			LinkPresets.Tags,
		],
	});

	// 动态及其子菜单
	links.push({
		name: "动态",
		url: "#",
		icon: "material-symbols:bolt-outline",
		children: [
			// 朋友圈
			LinkPresets.Moments,

			// 相册
			LinkPresets.Gallery,

			// 留言板
			LinkPresets.Guestbook,

			// 日记
			LinkPresets.Diary,
		],
	});

	// 兴趣及其子菜单
	// 2026-09-26 改名：原来叫「我的」，配上「友链 / 追番 / 音乐」这三项，
	// 看不出里面装的是什么（本站审计 U6）；改成「兴趣」并让追番、音乐排前面。
	// 父级菜单在模板里是按「有没有 children」渲染成按钮的，url 不参与跳转，
	// 所以这里统一写 "#"，与「文章」「动态」保持一致。
	links.push({
		name: "兴趣",
		url: "#",
		icon: "material-symbols:person",
		children: [
			// 追番
			LinkPresets.Anime,

			// 音乐
			LinkPresets.Music,

			// 友链
			LinkPresets.Friends,
		],
	});

	// 作品及其子菜单
	// 2026-09-26 改名：原来叫「其他」（url 是 /other/，那个路径并不存在），
	// 项目与技能归到「作品」更好认。
	links.push({
		name: "作品",
		url: "#",
		icon: "material-symbols:more-horiz",
		children: [
			// 项目
			LinkPresets.Projects,

			// 技能
			LinkPresets.Skills,
		],
	});

	// 关于及其子菜单
	// 2026-09-26 改名：原来叫「更多」（url 是 /content/，那个路径并不存在），
	// 同时把「关于页面」排到「打赏」前面——先讲我是谁，再谈要不要打赏。
	links.push({
		name: "关于",
		url: "#",
		icon: "material-symbols:info",
		children: [
			// 关于页面
			LinkPresets.About,

			// 打赏
			LinkPresets.Sponsor,
		],
	});

	// 仅返回链接，其它导航搜索相关配置在模块顶层常量中独立导出

	return { links } as NavBarConfig;
};

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

// ============================================================================
// 链接预设 - 可自由自定义导航栏链接的名称、图标和URL
// Link Presets - Allows free customization of the name, icon, and URL of navigation bar links
//
// 这里是备选池：预设留着不占用导航，只有被上面的 links 引用了才会显示。
// 但 url 指向的页面必须真实存在，否则谁启用谁就多一条 404 链接。
//
// 2026-09-24 移除了三个「指向不存在页面」的预设：设备 /devices/、时间线 /timeline/、
// 番组计划 /bangumi/ —— 本站没有这三块内容（站点开关也一直是关的），启用就是 404；
// 番剧相关的需求已由 /anime/（追番）覆盖。要恢复：先在 src/pages/ 下补出页面，
// 再把预设和 links 里的引用加回来。
// ============================================================================
export const LinkPresets: Record<string, NavBarLink> = {
	Home: {
		name: "主页",
		url: "/",
		icon: "material-symbols:home",
	},
	Archive: {
		name: "归档",
		url: "/archive/",
		icon: "material-symbols:archive",
	},
	Categories: {
		name: "分类",
		url: "/categories/",
		icon: "material-symbols:folder-open-rounded",
	},
	Tags: {
		name: "标签",
		url: "/tags/",
		icon: "material-symbols:label",
	},
	Friends: {
		name: "友链",
		url: "/friends/",
		icon: "material-symbols:group",
		pageKey: "friends",
	},
	Sponsor: {
		name: "打赏",
		url: "/sponsor/",
		icon: "material-symbols:favorite",
		pageKey: "sponsor",
	},
	Guestbook: {
		name: "留言",
		url: "/guestbook/",
		icon: "material-symbols:chat",
		pageKey: "guestbook",
	},
	About: {
		name: "关于我",
		url: "/about/",
		icon: "material-symbols:person",
	},
	Anime: {
		name: "追番",
		url: "/anime/",
		icon: "material-symbols:movie",
		pageKey: "anime",
	},
	Gallery: {
		name: "相册",
		url: "/gallery/",
		icon: "material-symbols:photo-library",
		pageKey: "gallery",
	},
	Diary: {
		name: "日记",
		url: "/diary/",
		icon: "material-symbols:book",
	},
	Projects: {
		name: "项目",
		url: "/projects/",
		icon: "material-symbols:work",
	},
	Skills: {
		name: "技能",
		url: "/skills/",
		icon: "material-symbols:psychology",
	},
	Music: {
		name: "音乐",
		url: "/music/",
		icon: "material-symbols:music-note-rounded",
	},
	Moments: {
		name: "朋友圈",
		url: "/moments/",
		icon: "mdi:wechat",
	},
	Admin: {
		name: "登录",
		url: "/admin/",
		icon: "material-symbols:lock",
	},
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();
