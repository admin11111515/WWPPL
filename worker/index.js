/**
 * Cloudflare Worker 入口
 * ============================================================
 * 本站线上是「Worker + 静态资源」形态（见 wrangler.jsonc 里的说明），
 * Worker 默认只在「静态资源里找不到对应文件」时才被调用，
 * 所以这里要做的事只有一件：把 /api/ 下那几个需要服务端的接口接住，
 * 其余的仍然交回资源层。
 *
 * 处理逻辑没有重写，全部复用 functions/api/ 下已有的函数
 * （那批文件原本按 Pages Functions 约定写，但入参形状就是
 *  request / env，照搬即可）。
 *
 * ⚠️ 注意：只能拦「精确的接口路径」，不能笼统地拦 /api/*。
 *    /api/allPostMeta.json 是构建出来的静态文件，拦下来会把它变成 404。
 */

import { onRequest as apiMiddleware } from "../functions/api/_middleware.js";
import { json } from "../functions/api/_lib/session.js";
import { onRequest as login } from "../functions/api/auth/login.js";
import { onRequest as logout } from "../functions/api/auth/logout.js";
import { onRequest as status } from "../functions/api/auth/status.js";
import { onRequest as contributions } from "../functions/api/contributions.js";
import { onRequest as githubProxy } from "../functions/api/github/[[path]].js";

/** 需要服务端处理的接口 —— 精确路径，一一对应 */
const API_ROUTES = {
	"/api/auth/login": login,
	"/api/auth/logout": logout,
	"/api/auth/status": status,
	"/api/contributions": contributions,
};

/** GitHub 代理走前缀匹配，/api/github/repos/... 之类全归它 */
const GITHUB_PREFIX = "/api/github";

/**
 * 组装出 functions/ 里那些处理函数期望的入参形状。
 * next 默认给一个 404，正常路径下用不到，只是保证接口完整、不出现 undefined。
 */
function pagesContext(request, env, next) {
	return {
		request,
		env,
		params: {},
		data: {},
		next: next || (() => json({ error: "not found" }, 404)),
	};
}

/**
 * 返回一个 Response 表示这个请求由接口接管；
 * 返回 null 表示不是本站接口，交回静态资源层。
 */
async function handleApi(request, env) {
	const { pathname } = new URL(request.url);

	// /api/github 下面全是仓库读写，先过登录校验再转发
	if (pathname === GITHUB_PREFIX || pathname.startsWith(`${GITHUB_PREFIX}/`)) {
		return apiMiddleware(
			pagesContext(request, env, () => githubProxy(pagesContext(request, env))),
		);
	}

	const handler = API_ROUTES[pathname];
	if (handler) return handler(pagesContext(request, env));

	return null;
}

/** 资源里没有这个文件时，用站点自己的 404 页面兜底，别让访客看到一片空白 */
async function notFoundPage(request, env) {
	// 传字符串而不是 URL 对象：fetch 的入参在各运行时里对 URL 对象的支持并不一致
	const page = await env.ASSETS.fetch(new URL("/404.html", request.url).toString());
	if (page.ok) {
		return new Response(page.body, { status: 404, headers: page.headers });
	}
	return new Response("Not Found", { status: 404 });
}

export default {
	async fetch(request, env) {
		const { pathname } = new URL(request.url);

		if (pathname === "/api" || pathname.startsWith("/api/")) {
			const response = await handleApi(request, env);
			if (response) return response;
		}

		const response = await env.ASSETS.fetch(request);
		if (response.status === 404) return notFoundPage(request, env);
		return response;
	},
};
