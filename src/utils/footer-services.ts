import { analyticsConfig, commentConfig } from "@/config";

/**
 * 页脚里的「服务徽章」与「统计服务说明」按实际配置生成。
 *
 * 为什么要有这个文件：这两处原先写死在 `config/FooterConfig.html` 里，
 * 结果是页脚宣称在用 Twikoo / Algolia / EdgeOne / Umami / Google Analytics，
 * 而站点实际用的是 giscus / Pagefind / Cloudflare，统计也只开了 51.LA。
 * 摆着不存在的服务既误导访客，也让人不敢信页脚上的其它信息。
 * 改成从配置推导之后，换了服务页脚会自己跟上。
 *
 * 用法：`Footer.astro` 读取 FooterConfig.html 后，把 `__SERVICE_BADGES__` 与
 * `__ANALYTICS_SERVICES__` 两个占位符替换掉。
 */

type ServiceMeta = {
	name: string;
	url: string;
	logo: string;
	color: string;
	/** 统计服务说明里用的本地图标地址，可留空 */
	icon?: string;
};

/** 评论系统：键名与 commentConfig.type 对应 */
const COMMENT_PROVIDERS: Record<string, ServiceMeta> = {
	twikoo: {
		name: "Twikoo",
		url: "https://twikoo.js.org/",
		logo: "livechat",
		color: "007aff",
	},
	waline: {
		name: "Waline",
		url: "https://waline.js.org/",
		logo: "waline",
		color: "1e88e5",
	},
	giscus: {
		name: "giscus",
		url: "https://giscus.app/",
		logo: "github",
		color: "181717",
	},
	artalk: {
		name: "Artalk",
		url: "https://artalk.js.org/",
		logo: "chatbot",
		color: "ff6b6b",
	},
	disqus: {
		name: "Disqus",
		url: "https://disqus.com/",
		logo: "disqus",
		color: "2e9fff",
	},
};

/** 统计服务：只保留真的填了标识的那几个 */
function getEnabledAnalyticsProviders(): ServiceMeta[] {
	const candidates: Array<ServiceMeta & { id: string }> = [
		{
			id: (analyticsConfig.googleAnalyticsId ?? "").trim(),
			name: "Google Analytics",
			url: "https://analytics.google.com/",
			logo: "googleanalytics",
			color: "E37400",
			icon: "//www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg",
		},
		{
			id: (analyticsConfig.umamiAnalytics?.websiteId ?? "").trim(),
			name: "Umami",
			url: "https://umami.is/",
			logo: "umami",
			color: "000000",
			icon: "https://umami.is/favicon.ico",
		},
		{
			id: (analyticsConfig.la51Analytics?.Id ?? "").trim(),
			name: "51.LA",
			url: "https://51.la/",
			logo: "51.LA",
			color: "FF6A00",
			icon: "https://v6.51.la/favicon.ico",
		},
	];

	return candidates.filter((provider) => provider.id.length > 0);
}

function toBadge(label: string, meta: ServiceMeta, title: string): string {
	const src =
		`https://img.shields.io/badge/${label}-${encodeURIComponent(meta.name)}` +
		`-%23${meta.color}?logo=${encodeURIComponent(meta.logo)}&amp;logoColor=%23${meta.color}`;
	return `<a target="_blank" href="${meta.url}" title="${title}"><img alt="${meta.name}" src="${src}"></a>`;
}

/** 生成评论系统与统计服务的徽章，替换 FooterConfig.html 里的 __SERVICE_BADGES__ */
export function getServiceBadgesHtml(): string {
	const badges: string[] = [];

	const commentProvider = COMMENT_PROVIDERS[commentConfig.type];
	if (commentProvider) {
		badges.push(
			toBadge(
				"Comments",
				commentProvider,
				`本站评论系统 ${commentProvider.name}`,
			),
		);
	}

	for (const provider of getEnabledAnalyticsProviders()) {
		badges.push(toBadge("Count", provider, `本站统计服务 ${provider.name}`));
	}

	return badges.join("\n            ");
}

/** 生成统计服务说明，替换 FooterConfig.html 里的 __ANALYTICS_SERVICES__ */
export function getAnalyticsServicesHtml(): string {
	const providers = getEnabledAnalyticsProviders();

	if (providers.length === 0) {
		return "本网站未启用第三方数据统计服务";
	}

	const links = providers
		.map((provider) => {
			const icon = provider.icon
				? `<img src="${provider.icon}" alt="${provider.name}"> `
				: "";
			return `<a href="${provider.url}" target="_blank">${icon}${provider.name}</a>`;
		})
		.join(" | ");

	return `本网站由 ${links} 提供数据统计服务`;
}
