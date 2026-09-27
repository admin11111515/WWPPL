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

async function hmacKey(secret, usages) {
	return crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		usages,
	);
}

async function hmacHex(secret, data) {
	const key = await hmacKey(secret, ["sign"]);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** 把 64 位十六进制还原成 32 字节；长度或字符不对就返回 null。 */
function hexToBytes(hex) {
	if (!/^[0-9a-f]{64}$/.test(hex)) return null;
	const out = new Uint8Array(32);
	for (let i = 0; i < 32; i++) {
		const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
		if (Number.isNaN(byte)) return null;
		out[i] = byte;
	}
	return out;
}

/**
 * 用 crypto.subtle.verify 校验签名。
 *
 * 不要写成 `sig === expected`（早先就是那样）：字符串比较在第一个不同的字符处
 * 就返回，比较耗时随「相同前缀的长度」变化。HMAC 的签名是公开可猜的，
 * 攻击者能拿响应时间一分一秒地把 64 位十六进制的签名逐位试出来，
 * 拿到签名后就能自己伪造一份 admin_session。verify 内部是定长时间比较，没有这个侧信道。
 */
async function hmacVerify(secret, data, sigHex) {
	const sig = hexToBytes(sigHex.toLowerCase());
	if (!sig) return false;
	const key = await hmacKey(secret, ["verify"]);
	return crypto.subtle.verify("HMAC", key, sig, encoder.encode(data));
}

/** 定长比较两个十六进制串，语义同 `a === b`，但不按位短路。 */
function hexEqual(a, b) {
	if (typeof a !== "string" || typeof b !== "string") return false;
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
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
	if (!(await hmacVerify(secret, raw, sig))) return false;
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

export { sha256Hex, hexEqual };
