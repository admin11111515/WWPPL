// 用相对路径而不是 `@/data/...`：这份配置会被 astro.config.mjs 那条加载链
// 走一遍（astro.config.mjs → src/config/index.ts → navBarConfig → 这里），
// 而那条链对「别名 + JSON」的解析不认账，会报 Cannot find module。相对路径两边都稳。
import raw from "../data/navLinks.json";
import type { NavBarLink } from "../types/navBarConfig";

/**
 * 导航菜单 —— 后台「导航菜单」页（/admin/nav/）可以改的那份数据
 * ============================================================
 * 唯一数据来源是 `src/data/navLinks.json`。
 * 后台保存 → 提交进仓库 → Cloudflare 重新构建 → 全站导航栏跟着变。
 *
 * 这里包一层的理由与 `siteInfo.ts` 一样：**兜底**。
 * JSON 是后台写进去的（手改也可能改坏），键丢了、值成了对象、整个文件成了
 * 对象而不是数组 —— 这些都不该让构建挂掉，也不能让导航栏变成一条不剩。
 * 所以下面逐项校验，不合格的项直接丢掉；**全丢光了才整体退回默认菜单**。
 *
 * ⚠️ 与 siteInfo 不同的地方：导航菜单**没有「留空」这个语义**。
 *    菜单空了就是站点坏了（访客进不去任何栏目），所以「空数组」也按写坏处理，
 *    退回默认菜单。这是这一份文件与 siteInfo.ts 唯一的判别差异，别照抄过去。
 */

/** 兜底菜单：与仓库里最后一次确认过的导航一致，JSON 整体不可用/一项都不剩时顶上 */
const FALLBACK_LINKS: NavBarLink[] = [
	{ name: "主页", url: "/", icon: "material-symbols:home" },
	{
		name: "文章",
		url: "#",
		icon: "material-symbols:article",
		children: [
			{ name: "归档", url: "/archive/", icon: "material-symbols:archive" },
			{
				name: "分类",
				url: "/categories/",
				icon: "material-symbols:folder-open-rounded",
			},
			{ name: "标签", url: "/tags/", icon: "material-symbols:label" },
		],
	},
	{
		name: "动态",
		url: "#",
		icon: "material-symbols:bolt-outline",
		children: [
			{ name: "朋友圈", url: "/moments/", icon: "mdi:wechat" },
			{
				name: "相册",
				url: "/gallery/",
				icon: "material-symbols:photo-album",
				pageKey: "gallery",
			},
			{
				name: "留言",
				url: "/guestbook/",
				icon: "material-symbols:chat",
				pageKey: "guestbook",
			},
			// 2026-10-06：日记页已与笔记本合并，入口指向笔记本（原来那个页面是模板示例数据）
			{ name: "笔记", url: "/life/notebooks/", icon: "material-symbols:book" },
		],
	},
	{
		name: "兴趣",
		url: "#",
		icon: "material-symbols:person",
		children: [
			{
				name: "追番",
				url: "/anime/",
				icon: "material-symbols:movie",
				pageKey: "anime",
			},
			{
				name: "音乐",
				url: "/music/",
				icon: "material-symbols:music-note-rounded",
			},
			{
				name: "友链",
				url: "/friends/",
				icon: "material-symbols:group",
				pageKey: "friends",
			},
		],
	},
	{
		name: "作品",
		url: "#",
		icon: "material-symbols:more-horiz",
		children: [
			{ name: "项目", url: "/projects/", icon: "material-symbols:work" },
			{ name: "技能", url: "/skills/", icon: "material-symbols:psychology" },
		],
	},
	{
		name: "关于",
		url: "#",
		icon: "material-symbols:info",
		children: [
			{ name: "关于我", url: "/about/", icon: "material-symbols:person" },
			{
				name: "打赏",
				url: "/sponsor/",
				icon: "material-symbols:favorite",
				pageKey: "sponsor",
			},
		],
	},
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 逐项校验：名称与地址都必须是非空字符串，缺一样整项丢掉。
 *
 * 只支持两层（顶级 + 子项）：导航模板（DropdownMenu / NavMenuPanel）就是
 * 按「有 children 就渲染成下拉按钮」写的，第三层不会显示，收进来只会让人
 * 以为保存成功却看不见 —— 多余的层级在这里就丢掉，别让它进产物。
 */
function parseLink(value: unknown, depth: number): NavBarLink | null {
	if (!isRecord(value)) return null;

	const name = typeof value.name === "string" ? value.name.trim() : "";
	if (!name) return null;

	const url = typeof value.url === "string" ? value.url.trim() : "";
	if (!url) return null;

	const link: NavBarLink = { name, url };

	if (typeof value.icon === "string" && value.icon.trim()) {
		link.icon = value.icon.trim();
	}
	if (typeof value.pageKey === "string" && value.pageKey.trim()) {
		link.pageKey = value.pageKey.trim();
	}
	// 站外地址以 http(s) 开头：后台就是按这个判定「新窗口打开」的，
	// 这里保持一致，别让后台存进去的 external 与渲染时的判定打架
	if (/^https?:\/\//i.test(url)) {
		link.external = true;
	}

	if (depth < 1 && Array.isArray(value.children)) {
		const children = value.children
			.map((child) => parseLink(child, depth + 1))
			.filter((child): child is NavBarLink => child !== null);
		if (children.length > 0) link.children = children;
	}

	return link;
}

const parsed: NavBarLink[] = Array.isArray(raw)
	? raw
			.map((item) => parseLink(item, 0))
			.filter((item): item is NavBarLink => item !== null)
	: [];

/** 一条都不剩 = 文件被改坏了，用默认菜单顶上（导航栏空掉比显示旧菜单糟得多） */
export const navLinks: NavBarLink[] = parsed.length > 0 ? parsed : FALLBACK_LINKS;
