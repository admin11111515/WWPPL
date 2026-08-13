import { clearSessionCookie, json } from "../_lib/session.js";

export async function onRequest(context) {
	if (context.request.method !== "POST") {
		return json({ error: "method not allowed" }, 405);
	}
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
			"Set-Cookie": clearSessionCookie(context.request),
		},
	});
}
