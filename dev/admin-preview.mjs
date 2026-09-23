/**
 * 后台本地预览
 *
 * 为什么需要它：
 *   后台四个页面打开时都会先问 /api/auth/status，没登录就跳回登录页；文章列表、
 *   正文、说说、笔记又全部走 /api/github/*。而这两个接口是 Cloudflare Pages
 *   Functions，本地只跑 astro dev / astro preview 时并不存在 —— 于是本地看到的
 *   永远只有登录页，没法确认样式改成了什么样。
 *
 * 这个脚本把这两类接口用本地数据假扮出来：
 *   /api/auth/status   → 直接回答"已登录"
 *   /api/github/*      → 把 src/content/posts 当仓库内容读；Gist 给一份空数据
 *   写操作（保存/删除）一律拒绝，并且明确说明是预览模式，不会假装保存成功。
 *
 * 用法：
 *   node dev/admin-preview.mjs                起服务，默认 http://127.0.0.1:4322
 *   node dev/admin-preview.mjs --port 5000    换端口
 *   node dev/admin-preview.mjs --shot         起服务后自动截图四个后台页（亮/暗各一张）
 *   node dev/admin-preview.mjs --dir <path>   指定构建产物目录（默认自动找）
 *
 * 构建产物位置：优先 WWPPL/dist；本机若用 dev/sandbox.mjs 构建，产物在
 * %TEMP%/wwppl-dev/WWPPL/dist，脚本会自动回落到那里。
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import http from "node:http";
import { spawn } from "node:child_process";

const WWPPL = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const opt = (name, dflt) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : dflt;
};
const WANT_SHOT = args.includes("--shot");
const HOST = "127.0.0.1";
/** 实际监听的端口：默认 4322，被占了就往后找一个 */
let PORT = Number(opt("port", 4322));

// ---------- 找构建产物 ----------
function distCandidates() {
	const custom = opt("dir", null);
	if (custom) return [path.resolve(custom)];
	return [
		path.join(WWPPL, "dist"),
		path.join(os.tmpdir(), "wwppl-dev", "WWPPL", "dist"),
	];
}

/**
 * 有不止一份产物：npm run build 落在 WWPPL/dist，dev/sandbox.mjs build 落在
 * Temp 沙箱里。取「最近一次构建」的那份 —— 否则刚构建完却在预览一份旧页面，
 * 看着像改动没生效。
 */
const MARKER = path.join("admin", "posts", "index.html");
const DIST = distCandidates()
	.map((dir) => {
		const marker = path.join(dir, MARKER);
		return fs.existsSync(marker) ? { dir, at: fs.statSync(marker).mtime } : null;
	})
	.filter(Boolean)
	.sort((a, b) => b.at - a.at)[0];

if (!DIST) {
	console.error("找不到构建产物（dist/admin/posts/index.html）。请先构建：");
	console.error("  node dev/sandbox.mjs build --fast      # 本机推荐，产物在 Temp 沙箱里");
	console.error("  npm run build                          # 完整构建，产物在 WWPPL/dist");
	process.exit(1);
}
const DIST_INFO = `${DIST.dir}（构建于 ${DIST.at.toLocaleString()}）`;

// ---------- 把本地文章当作仓库内容 ----------
const POSTS_PATH = "src/content/posts";
const IMAGES_PATH = "public/images/posts";

/** GitHub 的 blob sha 算法，前端用它判断缓存是否还有效 */
function gitBlobSha(content) {
	const buf = Buffer.from(content, "utf8");
	return crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}

/** 递归收集文章文件：相对仓库根的路径 -> 内容 */
function collectPosts() {
	const files = new Map();
	const base = path.join(WWPPL, POSTS_PATH);
	if (!fs.existsSync(base)) return files;
	const walk = (dir) => {
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, e.name);
			if (e.isDirectory()) walk(full);
			else if (/\.(md|mdx)$/i.test(e.name)) {
				const rel = path.relative(WWPPL, full).split(path.sep).join("/");
				files.set(rel, fs.readFileSync(full, "utf8"));
			}
		}
	};
	walk(base);
	return files;
}
const postFiles = collectPosts();

/** Gist 里那个文件名，从配置文件里抓，省得写死 */
function fileNameFrom(configFile, dflt) {
	try {
		const src = fs.readFileSync(path.join(WWPPL, "src/config", configFile), "utf8");
		const m = src.match(/fileName\s*:\s*["']([^"']+)["']/);
		return m ? m[1] : dflt;
	} catch {
		return dflt;
	}
}
const MOMENTS_FILE = fileNameFrom("externalMomentsConfig.ts", "moments.json");
const NOTEBOOKS_FILE = fileNameFrom("externalNotebooksConfig.ts", "notebooks.json");

// ---------- 静态文件 ----------
const MIME = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".txt": "text/plain; charset=utf-8",
	".xml": "application/xml; charset=utf-8",
	".webmanifest": "application/manifest+json",
};

function serveStatic(req, res) {
	let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
	if (p.endsWith("/")) p += "index.html";
	let full = path.join(DIST.dir, p);
	// 目录形式（/admin/posts）也当索引页
	if (!fs.existsSync(full) && fs.existsSync(full + "/index.html")) full += "/index.html";
	if (!fs.existsSync(full) && fs.existsSync(full + ".html")) full += ".html";
	if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
		res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
		res.end("404 " + p);
		return;
	}
	res.writeHead(200, {
		"content-type": MIME[path.extname(full).toLowerCase()] || "application/octet-stream",
		"cache-control": "no-store",
	});
	fs.createReadStream(full).pipe(res);
}

// ---------- 假接口 ----------
/** 预览默认当作已登录；截图时会临时切成未登录，好看到登录表单本身 */
let mockAuthed = true;

function json(res, data, status = 200) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(data));
}

function handleApi(req, res, url) {
	const p = url.pathname;

	// 认证：默认回答已登录；未登录状态只在截图时短暂用到
	if (p === "/api/auth/status") return json(res, { authed: mockAuthed });
	if (p === "/api/auth/login") return json(res, { ok: true });
	if (p === "/api/auth/logout") return json(res, { ok: true });

	// 写入类请求：明确拒绝，不假装成功
	if (req.method !== "GET") {
		return json(
			res,
			{
				error:
					"这是本地预览，不会写入仓库。要看真实保存效果，请在线上后台操作。",
			},
			403,
		);
	}

	// 仓库目录树
	const tree = p.match(/^\/api\/github\/repos\/[^/]+\/[^/]+\/git\/trees\/[^/]+$/);
	if (tree) {
		return json(res, {
			tree: [...postFiles].map(([file, content]) => ({
				path: file,
				type: "blob",
				sha: gitBlobSha(content),
			})),
		});
	}

	// 单个文件内容
	const contents = p.match(/^\/api\/github\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/);
	if (contents) {
		const file = decodeURIComponent(contents[1]).split("/").map(decodeURIComponent).join("/");
		const content = postFiles.get(file);
		if (content === undefined) return json(res, { error: "Not Found" }, 404);
		return json(res, {
			path: file,
			sha: gitBlobSha(content),
			content: Buffer.from(content, "utf8").toString("base64"),
			encoding: "base64",
		});
	}

	// Gist（说说 / 笔记）
	if (p === "/api/github/gists") {
		return json(res, { id: "preview-gist", files: {} });
	}
	const gist = p.match(/^\/api\/github\/gists\/([^/]+)$/);
	if (gist) {
		return json(res, {
			id: gist[1],
			files: {
				[MOMENTS_FILE]: { content: "[]", filename: MOMENTS_FILE },
				[NOTEBOOKS_FILE]: { content: "{}", filename: NOTEBOOKS_FILE },
			},
		});
	}

	return json(res, { error: "预览模式没有这个接口：" + p }, 404);
}

const server = http.createServer((req, res) => {
	const url = new URL(req.url, `http://${HOST}`);
	if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
	serveStatic(req, res);
});

// ---------- 可选：自动截图验收 ----------
const EDGE = [
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shotPages() {
	if (!EDGE) {
		console.log("没找到 Edge，跳过截图。");
		return;
	}
	const CDP = 9333;
	const OUT = path.join(WWPPL, "..", "_gen", "admin-shots");
	// 每次重新截，清掉上一轮的图，免得新旧混在一起看不出哪张是最新的
	fs.rmSync(OUT, { recursive: true, force: true });
	fs.mkdirSync(OUT, { recursive: true });

	const proc = spawn(
		EDGE,
		[
			"--headless=new",
			`--remote-debugging-port=${CDP}`,
			"--user-data-dir=" + path.join(os.tmpdir(), "wwppl-shot-profile"),
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-gpu",
			"about:blank",
		],
		{ stdio: "ignore" },
	);

	let version = null;
	for (let i = 0; i < 40; i++) {
		try {
			version = await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json();
			break;
		} catch {
			await sleep(400);
		}
	}
	if (!version) {
		console.log("浏览器调试端口没起来，跳过截图。");
		proc.kill();
		return;
	}
	console.log("截图浏览器:", version.Browser);

	const created = await (
		await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: "PUT" })
	).json();
	const ws = new WebSocket(created.webSocketDebuggerUrl);
	const pending = new Map();
	let msgId = 0;
	const send = (method, params = {}) =>
		new Promise((resolve, reject) => {
			const id = ++msgId;
			pending.set(id, { resolve, reject });
			ws.send(JSON.stringify({ id, method, params }));
		});
	ws.addEventListener("message", (ev) => {
		const m = JSON.parse(ev.data);
		if (m.id && pending.has(m.id)) {
			const { resolve, reject } = pending.get(m.id);
			pending.delete(m.id);
			m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
		}
	});
	await new Promise((r) => ws.addEventListener("open", r));
	await send("Page.enable");
	await send("Runtime.enable");
	await send("Page.addScriptToEvaluateOnNewDocument", {
		source: `
			window.__errs = [];
			window.addEventListener('error', (e) => window.__errs.push(String(e.message)));
			window.addEventListener('unhandledrejection', (e) => window.__errs.push('rejection: ' + String(e.reason)));
		`,
	});

	const pages = [
		["login", "/admin/"],
		["posts", "/admin/posts/"],
		["moments", "/admin/moments/"],
		["notebooks", "/admin/notebooks/"],
	];

	const PROBE = `(() => {
		const de = document.documentElement;
		const cs = getComputedStyle(de);
		return JSON.stringify({
			title: document.title,
			url: location.pathname,
			scrollW: de.scrollWidth,
			innerW: window.innerWidth,
			hue: cs.getPropertyValue('--hue').trim(),
			font: cs.getPropertyValue('--font-ui').trim().slice(0, 60),
			themeCssLoaded: !!document.querySelector('link[href="/admin/theme.css"]'),
			primary: getComputedStyle(de).getPropertyValue('--primary-strong').trim(),
			bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 50),
			errors: (window.__errs || []).slice(0, 6),
		});
	})()`;

	const results = [];
	for (const [name, route] of pages) {
		for (const scheme of ["light", "dark"]) {
			// 登录页有两种样子：访客打开时是登录表单，登录后是功能入口。
			// 只截其中一种会看不出另一半改成了什么样。
			const variants =
				name === "login"
					? [
							["guest", false],
							["authed", true],
						]
					: [["", true]];

			for (const [tag, authed] of variants) {
				mockAuthed = authed;
				await send("Emulation.setDeviceMetricsOverride", {
					width: 1440,
					height: 1000,
					deviceScaleFactor: 1,
					mobile: false,
				});
				await send("Emulation.setEmulatedMedia", {
					features: [{ name: "prefers-color-scheme", value: scheme }],
				});
				// 先清掉页面自己存的明暗偏好，再重新打开，让它是干净的首访状态
				await send("Page.navigate", { url: `http://${HOST}:${PORT}${route}` });
				await sleep(1500);
				await send("Runtime.evaluate", {
					expression: `(() => { try { localStorage.removeItem('theme'); localStorage.removeItem('admin_auth'); } catch(e){} })()`,
				});
				await send("Page.navigate", { url: `http://${HOST}:${PORT}${route}` });
				await sleep(2000);

				const probe = await send("Runtime.evaluate", { expression: PROBE, returnByValue: true });
				const info = JSON.parse(probe.result.value);
				const overflow = info.scrollW > info.innerW + 1;
				const label = name + (tag ? "-" + tag : "");
				results.push({ name: label, scheme, route, overflow, ...info });

				const shot = await send("Page.captureScreenshot", {
					format: "png",
					// 整页截图会把 sticky 元素按「视口底边」画在页面中间，看着像布局断了。
					// 默认只截首屏，更接近打开时的真实观感；要看全貌再加 --full。
					captureBeyondViewport: args.includes("--full"),
				});
				fs.writeFileSync(
					path.join(OUT, `${label}-${scheme}.png`),
					Buffer.from(shot.data, "base64"),
				);
				console.log(
					`  ${label}-${scheme}: ${info.title} | 落到 ${info.url} | ` +
						`溢出 ${overflow ? "⚠ " + (info.scrollW - info.innerW) + "px" : "无"} | ` +
						`主题表 ${info.themeCssLoaded ? "已载" : "未载"} | hue=${info.hue} | 报错 ${info.errors.length}`,
				);
				if (info.errors.length) for (const e of info.errors) console.log("      ·", e);
			}
		}
	}
	mockAuthed = true;

	console.log("\n截图目录:", OUT);
	ws.close();
	proc.kill();
	// 清掉刚才那个标签页
	try {
		await fetch(`http://127.0.0.1:${CDP}/json/close/${created.id}`);
	} catch {
		/* 浏览器已经退了，无所谓 */
	}
	return results;
}

// ---------- 起服务 ----------
const REQUESTED_PORT = PORT;

async function onReady() {
	console.log("后台本地预览已启动");
	console.log("  地址：http://" + HOST + ":" + PORT + "/admin/");
	console.log("  产物：" + DIST_INFO);
	console.log("  文章：" + postFiles.size + " 篇（读自 " + POSTS_PATH + "）");
	console.log("  说明：这是假接口，能看能点，但保存不会写入仓库。按 Ctrl+C 结束。\n");

	if (WANT_SHOT) {
		console.log("开始截图验收…");
		const results = await shotPages();
		const bad = (results || []).filter((r) => r.overflow);
		console.log(
			bad.length
				? `\n有 ${bad.length} 张页面存在横向溢出，需要处理。`
				: "\n四个页面在亮/暗两色下都没有横向溢出。",
		);
		server.close();
		process.exit(0);
	}
}

// 端口被占（比如上次的预览还没关）就往后顺延，不直接报错退出
server.on("error", (e) => {
	if (e.code === "EADDRINUSE" && PORT < REQUESTED_PORT + 20) {
		PORT++;
		server.listen(PORT, HOST, onReady);
	} else {
		console.error("无法启动预览服务：", e.message);
		process.exit(1);
	}
});

server.listen(PORT, HOST, onReady);

process.on("SIGINT", () => {
	server.close();
	process.exit(0);
});
