/**
 * 后台页面的 html / body 类名。
 *
 * 与博客 Layout.astro 里那份 class:list 同源：卡片边框、跟随色相、导航栏吸附
 * 这几项都从 siteConfig 推导，站长在配置里一改，后台跟着一起变 —— 不用回来
 * 改四个页面。
 *
 * 少掉的只有两项，都与后台无关：
 *   · is-home / lg:is-home  首页专用
 *   · enable-banner         首页横幅专用
 */
import { siteConfig } from "@/config";

/** <html> 上的类，与 Layout.astro 的 <html> 一致 */
export const adminHtmlClass = "bg-(--page-bg) text-[14px] md:text-[16px]";

/** <body> 上的类，与 Layout.astro 的 <body> 一致 */
export const adminBodyClass = [
	"min-h-screen",
	siteConfig.navbar.stickyNavbar && "sticky-navbar",
	siteConfig.card?.border && "enable-card-border",
	siteConfig.card?.followTheme && "card-follow-theme-hue",
]
	.filter(Boolean)
	.join(" ");
