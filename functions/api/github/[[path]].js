export async function onRequest(context) {
	const { request, env } = context;
	const url = new URL(request.url);
	const rawPath = url.pathname.replace(/^\/api\/github\/?/, "");
	const path = rawPath
		.split("/")
		.map((segment) => decodeURIComponent(segment))
		.map((segment) => encodeURIComponent(segment))
		.join("/");

	if (!env.GITHUB_TOKEN) {
		return Response.json({ error: "服务端未配置 GITHUB_TOKEN" }, { status: 503 });
	}

	const headers = new Headers({
		Authorization: `Bearer ${env.GITHUB_TOKEN}`,
		Accept: "application/vnd.github+json",
		"User-Agent": "ppl-blog-admin",
		"X-GitHub-Api-Version": "2022-11-28",
	});

	const contentType = request.headers.get("content-type");
	if (contentType) headers.set("Content-Type", contentType);

	const body =
		request.method === "GET" || request.method === "HEAD"
			? undefined
			: await request.text();

	const upstream = await fetch(`https://api.github.com/${path}${url.search}`, {
		method: request.method,
		headers,
		body,
	});

	return new Response(upstream.body, {
		status: upstream.status,
		headers: {
			"Content-Type": upstream.headers.get("content-type") || "application/json",
			"Cache-Control": "no-store",
		},
	});
}
