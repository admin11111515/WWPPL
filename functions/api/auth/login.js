import { createSessionCookie, hexEqual, json, sha256Hex } from "../_lib/session.js";

/**
 * 口令错误时统一拖这么久再回。
 *
 * 这个 Worker 是无状态的，没有地方记「同一个 IP 试了几次」，所以写不出真正的限流。
 * 但把每次失败都拖慢三百毫秒，在线爆破的速率就被压到每秒三次左右，
 * 而正常用户手滑输错一次，多等三百毫秒是感觉不到的。
 * 真限流要靠 Cloudflare 控制台的 Rate Limiting Rule，配置方法见 docs/后台启用清单.md。
 */
const FAIL_DELAY_MS = 300;

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

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

	// 变量值可能带着粘贴时蹭上的空格或换行；哈希里不会有空白，去掉是安全的。
	// 去掉之后还要求它是 64 位十六进制 —— 这一条是为了把「把明文口令填进了哈希变量」
	// 这种错法拦在登录之前：否则不管输什么口令都只会回一句"密码错误"，查不出原因。
	const expectedHash = (env.ADMIN_PASSWORD_HASH || "").trim().toLowerCase();
	const expectedPassword = env.ADMIN_PASSWORD || "";
	if (!expectedHash && !expectedPassword) {
		return json({ error: "服务端未配置登录密码" }, 503);
	}
	if (expectedHash && !/^[0-9a-f]{64}$/.test(expectedHash)) {
		return json(
			{
				error:
					"ADMIN_PASSWORD_HASH 填得不对：这里要填口令的 SHA-256（64 位十六进制），不是口令本身。" +
					"生成一次再填。",
			},
			503,
		);
	}

	let ok = false;
	if (expectedHash) {
		ok = hexEqual(await sha256Hex(password), expectedHash);
	} else {
		// 回落到明文口令是历史遗留用法，能不用就不用；同样用定长比较。
		ok = hexEqual(await sha256Hex(password), await sha256Hex(expectedPassword));
	}

	if (!ok) {
		await sleep(FAIL_DELAY_MS);
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
