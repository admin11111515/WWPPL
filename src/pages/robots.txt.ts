import type { APIRoute } from "astro";

/*
 * robots.txt
 *
 * 这里刻意不写 `Disallow: /admin/`：后台各页已经用 noindex 声明不收录，
 * 而 robots.txt 一旦拦住爬虫，爬虫就读不到那行 noindex，页面反而会以
 * "只知标题不知内容"的形式留在搜索结果里。要下架页面靠 noindex，不靠拦爬虫。
 *
 * 原先的 `Disallow: /_astro/` 也已去掉 —— 那个目录装的是页面的样式和脚本，
 * 挡住它们会让搜索引擎无法完整渲染页面，属于对收录有害的规则，
 * 而目录里本身没有任何值得排除在抓取之外的内容。
 */
const robotsTxt = `
User-agent: *
Disallow: /api/

Sitemap: ${new URL("sitemap-index.xml", import.meta.env.SITE).href}
`.trim();

export const GET: APIRoute = () => {
	return new Response(robotsTxt, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
