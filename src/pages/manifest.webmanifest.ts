import { siteConfig } from "@/config/siteConfig";

/**
 * PWA 应用清单（Web App Manifest）
 *
 * 由站点配置生成而不是写成静态文件，这样改动 siteConfig 里的站点标题、
 * 描述、语言后，清单会自动跟随，不需要两处维护同一份信息。
 *
 * 图标由 dev/generate-pwa-icons.mjs 生成，配色与几何参数取自站点现有 favicon，
 * 因此从浏览器标签页到手机主屏图标是同一种视觉语言。
 */
export async function GET() {
	const manifest = {
		name: siteConfig.title,
		// 主屏图标下方只留很短的宽度，取导航栏标题作为短名
		short_name: siteConfig.navbar.title,
		description: siteConfig.description,
		lang: siteConfig.lang.replace("_", "-"),
		start_url: "/",
		scope: "/",
		display: "standalone",
		display_override: ["standalone", "minimal-ui"],
		orientation: "any",
		// 启动画面与浏览器配色统一用品牌深色：应用图标本身就是深色圆角方块，
		// 深色背景让启动过程没有白屏闪烁，从启动画面过渡到应用是连续的。
		background_color: "#1e212b",
		theme_color: "#1e212b",
		categories: ["blog", "personal"],
		icons: [
			{
				src: "/icons/icon-192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/icons/icon-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			{
				// 可遮罩图标：底色铺满、图形收在中心安全区内，
				// 这样被系统裁成圆形、方形、水滴形都不会切到图形
				src: "/icons/icon-maskable-512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};

	return new Response(JSON.stringify(manifest, null, "\t"), {
		headers: {
			"Content-Type": "application/manifest+json; charset=utf-8",
		},
	});
}
