const encoder = new TextEncoder();

function base64UrlEncode(str) {
	return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
	const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
	const pad = "=".repeat((4 - (base64.length % 4)) % 4);
	return atob(base64 + pad);
}

async function sha256Hex(str) {
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(str));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function hmacHex(secret, data) {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function getCookie(request, name) {
	const header = request.headers.get("cookie") || "";
	for (const part of header.split(";")) {
		const idx = part.indexOf("=");
		if (idx < 0) continue;
		if (part.slice(0, idx).trim() === name) {
			return part.slice(idx + 1).trim();
		}
	}
	return "";
}

function isSecureRequest(request) {
	return (
		request.headers.get("x-forwarded-proto") === "https" ||
		new URL(request.url).protocol === "https:"
	);
}

export async function createSessionCookie(request, env) {
	const secret = env.AUTH_SECRET || env.ADMIN_PASSWORD_HASH || env.ADMIN_PASSWORD;
	if (!secret) return "";
	const maxAge = 30 * 24 * 60 * 60;
	const payload = { exp: Date.now() + maxAge * 1000 };
	const raw = base64UrlEncode(JSON.stringify(payload));
	const sig = await hmacHex(secret, raw);
	const secure = isSecureRequest(request) ? "; Secure" : "";
	return `admin_session=${raw}.${sig}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

export async function verifySession(request, env) {
	const secret = env.AUTH_SECRET || env.ADMIN_PASSWORD_HASH || env.ADMIN_PASSWORD;
	if (!secret) return false;
	const cookie = getCookie(request, "admin_session");
	if (!cookie) return false;
	const dot = cookie.lastIndexOf(".");
	if (dot < 1) return false;
	const raw = cookie.slice(0, dot);
	const sig = cookie.slice(dot + 1);
	const expected = await hmacHex(secret, raw);
	if (sig !== expected) return false;
	try {
		const payload = JSON.parse(base64UrlDecode(raw));
		return typeof payload.exp === "number" && payload.exp > Date.now();
	} catch {
		return false;
	}
}

export function clearSessionCookie(request) {
	const secure = isSecureRequest(request) ? "; Secure" : "";
	return `admin_session=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}

export function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

export { sha256Hex };
