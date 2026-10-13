/**
 * 后台页面的 html / body 类名。
 *
 * 与博客 Layout.astro 里那份 class:list 同源：卡片边框、跟随色相、导航栏吸附
 * 这几项都从 siteConfig 推导，站长在配置里一改，后台跟着一起变 —— 不用回来
 * 改每一个页面。
 *
 * 少掉的只有两项，都与后台无关：
 *   · is-home / lg:is-home  首页专用
 *   · enable-banner         首页横幅专用
 */
import { siteConfig } from "@/config";

/** <html> 上的类。
 *
 * ⚠️ **后台的根字号窄屏也保持 16px，不跟前台缩到 14px**（2026-10-13 移动端体检定的）。
 *    前台的 14px 是给**阅读**用的（正文一行多几个字）；后台是**工具界面**，
 *    而 admin.css 整套尺寸都写 rem —— 根字号一缩，所有东西跟着缩 12.5%：
 *    13px 的入口文字变 11.375px、11px 的说明文字变 **9.625px**，
 *    连带触控目标一起变小。手机上后台本来就该"更大"，不是更小。
 */
export const adminHtmlClass = "bg-(--page-bg) text-[16px]";

/** <body> 上的类，与 Layout.astro 的 <body> 一致 */
export const adminBodyClass = [
	"min-h-screen",
	siteConfig.navbar.stickyNavbar && "sticky-navbar",
	siteConfig.card?.border && "enable-card-border",
	siteConfig.card?.followTheme && "card-follow-theme-hue",
]
	.filter(Boolean)
	.join(" ");
