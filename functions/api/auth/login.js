import { createSessionCookie, json, sha256Hex } from "../_lib/session.js";

export async function onRequest(context) {
	const { request, env } = context;
	if (request.method !== "POST") {
		return json({ error: "method not allowed" }, 405);
	}

	let password = "";
	try {
		const body = await request.json();
		password = String(body.password || "");
	} catch {
		return json({ error: "请求格式错误" }, 400);
	}

	const expectedHash = env.ADMIN_PASSWORD_HASH || "";
	const expectedPassword = env.ADMIN_PASSWORD || "";
	if (!expectedHash && !expectedPassword) {
		return json({ error: "服务端未配置登录密码" }, 503);
	}

	let ok = false;
	if (expectedHash) {
		ok = (await sha256Hex(password)) === String(expectedHash).toLowerCase();
	} else {
		ok = password === expectedPassword;
	}

	if (!ok) {
		return json({ ok: false, error: "密码错误" }, 401);
	}

	const cookie = await createSessionCookie(request, env);
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
			"Set-Cookie": cookie,
		},
	});
}
