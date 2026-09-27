import { json, verifySession } from "./_lib/session.js";

export async function onRequest(context) {
	const url = new URL(context.request.url);
	// 只认「/api/github」本身和它下面的一层。早先写的是 startsWith("/api/github")，
	// 那样 /api/githubxxx 也会被当成受保护接口、回 401，
	// 一个本该 404 的路径却报「未登录」，排查时会被带偏。
	const isGithub = url.pathname === "/api/github" || url.pathname.startsWith("/api/github/");
	if (!isGithub) {
		return context.next();
	}
	if (!(await verifySession(context.request, context.env))) {
		return json({ error: "unauthorized" }, 401);
	}
	return context.next();
}
