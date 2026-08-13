import { json, verifySession } from "./_lib/session.js";

export async function onRequest(context) {
	const url = new URL(context.request.url);
	if (!url.pathname.startsWith("/api/github")) {
		return context.next();
	}
	if (!(await verifySession(context.request, context.env))) {
		return json({ error: "unauthorized" }, 401);
	}
	return context.next();
}
