import { json, verifySession } from "../_lib/session.js";

export async function onRequest(context) {
	return json({ authed: await verifySession(context.request, context.env) });
}
