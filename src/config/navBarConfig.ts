import {
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/navBarConfig";
import { navLinks } from "./navLinks";

// ============================================================================
// 导航栏配置
// NavBar Configuration
// ============================================================================
//
// ⚠️ 2026-10-02 起，**菜单内容不再写在这个文件里**。
//    真正生效的是 `src/data/navLinks.json`（读取器在 `./navLinks.ts`），
//    后台「导航菜单」页（/admin/nav/）直接读写它：改名、换图标、调顺序、
//    增删菜单与子菜单都在后台做，改完提交进仓库由 Cloudflare 重新构建。
//
//    这个文件的职责只剩两件：把菜单取出来交给组件，以及保留下面的链接预设池。
//    要改菜单请去后台，别在这里改 —— 在这里改会被 JSON 里的值覆盖掉。
//
//    兜底逻辑（JSON 写坏了怎么办）在 `navLinks.ts` 里，这里不重复处理。
// ============================================================================

export const navBarConfig: NavBarConfig = { links: navLinks };

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

// ============================================================================
// 链接预设 —— 备选池，默认不出现在导航栏里
// Link Presets
//
// ⚠️ 池子里的项**只有被写进 src/data/navLinks.json 才会显示**（后台的
//    「添加菜单」下拉就是从这份池子取的）。改这里不会让导航产生任何变化。
//
//    url 指向的页面必须真实存在，否则谁启用谁就多一条 404 链接。
//
//    2026-09-24 移除了三个「指向不存在页面」的预设：设备 /devices/、时间线
//    /timeline/、番组计划 /bangumi/ —— 本站没有这三块内容（站点开关也一直是
//    关的），启用就是 404；番剧相关的需求已由 /anime/（追番）覆盖。
//    要恢复：先在 src/pages/ 下补出页面，再把预设加回来。
//
//    2026-10-02 修了一个坏图标：相册原本写 `material-symbols:photo-library`，
//    这个名字在图标集里并不存在（图标渲染成空白）→ 改成 `photo-album`。
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
		icon: "material-symbols:photo-album",
		pageKey: "gallery",
	},

	// 2026-10-06：原来的「日记」条目指向 /diary/（模板自带的示例数据页），
	// 已与「笔记本」合并 —— 那个页面删掉了，入口改指真正在写的笔记本页。
	// 去掉 pageKey：笔记本页没有页面开关，挂了会被当成"开关是 false"而整条消失。
	Notebooks: {
		name: "笔记",
		url: "/life/notebooks/",
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
