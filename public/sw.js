/*
 * Service Worker —— 离线可读 + 静态资源缓存
 *
 * 设计取舍：
 *
 * 1. 页面用「网络优先」，静态资源用「缓存优先 + 后台更新」。
 *    页面必须网络优先，否则发了新文章、改了内容，访客看到的还是旧页面；
 *    静态资源可以缓存优先，因为 Astro 会给它们带上内容哈希文件名
 *    （形如 /_astro/xxx.AbCd1234.js），内容一变文件名就变，不会拿到旧版本。
 *
 * 2. 后台与接口完全不接管。
 *    /admin 与 /api/* 一旦被缓存，会出现「登录态看起来还在、实际已失效」
 *    或「改了文章但看到旧数据」这类极难排查的问题，因此直接放行给网络。
 *
 * 3. 不预缓存整站。
 *    只为离线兜底页做预缓存。其余内容在访客实际访问时按需进入缓存，
 *    避免首访就下载一堆用不到的资源。
 *
 * 4. 缓存有上限。
 *    每次构建都会产生新的哈希文件名，旧条目不会自动失效，因此按条目数
 *    淘汰最旧的，防止缓存无限膨胀。
 *
 * 维护提示：改动本文件的缓存策略后，务必把 VERSION 加一，
 * 否则老访客的浏览器会继续沿用旧的缓存结构（activate 只清理版本号不同的缓存）。
 */

const VERSION = "v1";
const STATIC_CACHE = `wwppl-static-${VERSION}`;
const PAGE_CACHE = `wwppl-page-${VERSION}`;
// 显式解析成绝对地址：Cache.match() 虽然也接受相对路径，但那依赖浏览器按
// Service Worker 地址去解析，写成绝对地址可以避免任何解析歧义。
const OFFLINE_URL = new URL("/offline/", self.location.href).href;

// 静态资源缓存的最大条目数，超出后按插入顺序淘汰最旧的
const STATIC_CACHE_LIMIT = 220;

// 从不接管：这些路径必须走网络
const BYPASS_PREFIXES = ["/admin", "/api/"];

// 走缓存优先的静态资源
const STATIC_PREFIXES = [
	"/_astro/",
	"/fonts/",
	"/icons/",
	"/images/",
	"/assets/",
	"/js/",
	"/pio/",
	"/favicon/",
	"/pagefind/",
	"/mouse/",
];

// ── 安装：预缓存离线兜底页 ──────────────────────────────────
self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			try {
				const cache = await caches.open(PAGE_CACHE);
				await cache.addAll([OFFLINE_URL]);
			} catch (error) {
				// 预缓存失败不应阻断 Service Worker 安装，
				// 否则一次网络抖动就会让整个离线能力失效
				console.warn("[sw] 预缓存离线页失败，稍后按需缓存", error);
			}
			await self.skipWaiting();
		})(),
	);
});

// ── 激活：清理旧版本缓存并立即接管页面 ──────────────────────
self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
					.map((key) => caches.delete(key)),
			);
			await self.clients.claim();
		})(),
	);
});

/** 缓存是否值得写入：只存同源的正常响应 */
function isCacheable(response) {
	return !!response && response.ok && response.type === "basic";
}

/** 按插入顺序裁剪缓存条目数 */
async function trimCache(cache, limit) {
	const keys = await cache.keys();
	const overflow = keys.length - limit;
	if (overflow <= 0) return;
	for (let i = 0; i < overflow; i++) {
		await cache.delete(keys[i]);
	}
}

/** 缓存优先 + 后台更新：先返回缓存，同时在后台拉取最新副本 */
async function staleWhileRevalidate(request, cacheName) {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);

	const network = fetch(request)
		.then(async (response) => {
			if (isCacheable(response)) {
				await cache.put(request, response.clone());
				await trimCache(cache, STATIC_CACHE_LIMIT);
			}
			return response;
		})
		.catch(() => null);

	return cached || (await network) || Response.error();
}

/** 网络优先：拿得到就用最新的，拿不到回落到缓存，再不行给离线页 */
async function networkFirstPage(request) {
	const cache = await caches.open(PAGE_CACHE);

	try {
		const response = await fetch(request);
		if (isCacheable(response)) {
			await cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await cache.match(request);
		if (cached) return cached;

		const offline = await cache.match(OFFLINE_URL);
		if (offline) return offline;

		return new Response("offline", {
			status: 503,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}
}

// ── 请求拦截 ────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
	const { request } = event;

	// 只处理 GET，写操作一律直连
	if (request.method !== "GET") return;

	const url = new URL(request.url);

	// 跨域请求不接管（外部图片、统计脚本、CDN 等）
	if (url.origin !== self.location.origin) return;

	// 后台与接口不接管
	if (BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

	// 带 Range 的请求（音视频拖动、断点续传）不缓存，避免存下残缺副本
	if (request.headers.has("range")) return;

	// 静态资源：缓存优先
	if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
		event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
		return;
	}

	// 页面导航，以及站内无刷新跳转（Swup）发起的 HTML 片段请求
	const accept = request.headers.get("accept") || "";
	if (request.mode === "navigate" || accept.includes("text/html")) {
		event.respondWith(networkFirstPage(request));
	}

	// 其余请求（RSS、JSON 等）不接管，交给浏览器默认行为
});
