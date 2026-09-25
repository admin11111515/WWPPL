/**
 * 重新抓取网易云歌单，生成 src/data/music.json。
 *
 *   node scripts/prefetch-music.mjs          # 真的写文件
 *   node scripts/prefetch-music.mjs --dry    # 只报告，不写
 *
 * 为什么要自己写这个脚本：
 *   歌单是「目录」，不是「能不能播」。Meting 接口会把没有音源的歌也照样返回，
 *   抓进来就是一首点了没声音的歌（返回 0 字节），或者只给 30 秒试听片段。
 *   所以每首都必须实测一下音频，不合格的直接剔掉，别让坏歌进仓库。
 *
 * 接口顺序抄自 src/config/musicConfig.ts（主 API + fallbackApis），
 * 逐个试，谁先用谁的。这样全局播放器也就有了备用源。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const DRY = process.argv.includes("--dry");

const UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const HEADERS = { "user-agent": UA, referer: "https://wwppl.dpdns.org/" };

// ── 从 musicConfig.ts 里把接口配置抠出来（这个仓库用 tsx 跑 .ts，纯 .mjs 只能正则取）──
const cfgSrc = readFileSync(join(root, "src/config/musicConfig.ts"), "utf8");
const pick = (re, fb) => {
	const m = cfgSrc.match(re);
	return m ? m[1] : fb;
};
const server = pick(/server:\s*"([^"]+)"/, "netease");
const type = pick(/type:\s*"(playlist|album|song|artist|search)"/, "playlist");
const id = pick(/\bid:\s*"(\d+)"/, "");
const primary = pick(/api:\s*"([^"]+)"/, "");
const fallbacks = [
	...cfgSrc.matchAll(/fallbackApis:\s*\[([\s\S]*?)\]/g),
].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));

if (!id) {
	console.error("没能从 musicConfig.ts 里读到歌单 id，先检查一下文件");
	process.exit(1);
}
const apis = [primary, ...fallbacks]
	.filter(Boolean)
	.map((u) => u.replace(/:server/g, server).replace(/:type/g, type).replace(/:id/g, id).replace(/:r/g, String(Math.random())));

console.log(`歌单：${server} / ${type} / ${id}`);
console.log(`接口顺序（逐个试）：\n${apis.map((a, i) => `  ${i + 1}. ${a}`).join("\n")}\n`);

// 拆成「主机 + 端点」，好让同一首歌的音频/封面/歌词都落在同一个主机上。
// 为什么不直接用接口返回的完整 URL：i-meto 的 pic/lrc 必须带 auth 参数，
// 不带就 401，而那个 auth 是每次请求现算的哈希，写死进文件迟早过期。
const apiParts = apis.map((u) => {
	const m = String(u).match(/^(https?:\/\/[^/]+)([^?]*)/);
	return { raw: u, base: m ? m[1] : "", endpoint: m ? m[2] : "" };
});
const build = (p, kind, songId) =>
	`${p.base}${p.endpoint}?server=${server}&type=${kind}&id=${songId}`;

// ── MP3 帧扫描：算出真实时长，不靠猜比特率 ──
const BPS = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const SR = [44100, 48000, 32000];

function measure(buf) {
	let o = 0;
	if (buf.length > 10 && buf.subarray(0, 3).toString("latin1") === "ID3") {
		const sz =
			((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
		o = 10 + sz;
	}
	let bytes = 0, samples = 0, br = null, sr = null, i = o;
	while (i + 4 <= buf.length) {
		if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
			const v = (buf[i + 1] >> 3) & 3;
			const l = (buf[i + 1] >> 1) & 3;
			const bi = (buf[i + 2] >> 4) & 0xf;
			const si = (buf[i + 2] >> 2) & 3;
			const pad = (buf[i + 2] >> 1) & 1;
			if (v !== 3 || l !== 1 || bi === 0 || bi === 15 || si === 3) {
				i++;
				continue;
			}
			const b = BPS[bi] * 1000;
			const s = SR[si];
			const len = Math.floor((144 * b) / s) + pad;
			if (len < 24) {
				i++;
				continue;
			}
			if (br === null) {
				br = b;
				sr = s;
			}
			bytes += len;
			samples += 1152;
			i += len;
		} else {
			i++;
		}
	}
	return { bytes, dur: sr ? samples / sr : null, br };
}

const timeoutFetch = async (url, opts = {}, ms = 30000) => {
	const ctl = new AbortController();
	const t = setTimeout(() => ctl.abort(), ms);
	try {
		const r = await fetch(url, { signal: ctl.signal, headers: HEADERS, ...opts });
		clearTimeout(t);
		return r;
	} catch (e) {
		clearTimeout(t);
		throw e;
	}
};

// ── 1. 取歌单 ──
let list = null;
for (const api of apis) {
	try {
		const r = await timeoutFetch(api);
		if (!r.ok) {
			console.log(`  歌单接口 ${r.status}  ${api.slice(0, 60)}`);
			continue;
		}
		const j = await r.json();
		if (Array.isArray(j) && j.length) {
			list = j;
			console.log(`  歌单取到 ${j.length} 首（用第 ${apis.indexOf(api) + 1} 个接口）`);
			break;
		}
	} catch (e) {
		console.log(`  歌单接口失败：${e.message.slice(0, 40)}`);
	}
}
if (!list) {
	console.error("所有接口都取不到歌单，先别改文件");
	process.exit(1);
}

// 不同接口字段命名不一样：i-meto 是 title/author，injahow、moeyao 是 name/artist
const norm = (s) => ({
	title: s.title || s.name || "",
	artist: s.artist || s.author || "",
	picId: String(s.pic || s.cover || "").match(/id=(\d+)/)?.[1] || "",
	url: s.url || "",
});

// ── 2. 逐首实测音频，不合格的剔掉 ──
const songId = (u) => String(u).match(/id=(\d+)/)?.[1] || "";

const keep = [];
const drop = [];
console.log("\n逐首实测（少于 60 秒或拿不到音频的会被剔掉）：");
for (let i = 0; i < list.length; i++) {
	const s = norm(list[i]);
	const sid = songId(s.url);
	if (!sid) {
		drop.push({ title: s.title, why: "没有歌曲 id" });
		continue;
	}

	// 播放地址逐个接口试，用第一个真能播的；封面和歌词跟着落在同一个主机上
	let picked = null;
	for (const p of apiParts) {
		const url = build(p, "url", sid);
		try {
			const r = await timeoutFetch(url, { headers: { ...HEADERS, range: "bytes=0-307199" } }, 25000);
			const buf = Buffer.from(await r.arrayBuffer());
			const total = Number(
				r.headers.get("content-range")?.split("/")[1] || r.headers.get("content-length") || buf.length,
			);
			const m = measure(buf);
			if (!m.dur || !m.bytes) continue;
			const dur = total > buf.length ? m.dur * (total / m.bytes) : m.dur;
			if (dur >= 60) {
				picked = { part: p, url, dur, size: total, br: m.br };
				break;
			}
			// 记下来，最后好告诉用户为什么被剔掉
			if (!picked) picked = { tooShort: Math.round(dur), size: total };
		} catch {
			/* 换下一个接口 */
		}
	}

	if (picked && picked.url) {
		const cover = s.picId ? build(picked.part, "pic", s.picId) : "";
		// 封面顺手验一下，拿不到图的宁可留空也别写个会 401 的地址
		let coverOk = false;
		if (cover) {
			try {
				const cr = await timeoutFetch(cover, {}, 15000);
				coverOk = cr.ok && /image/i.test(cr.headers.get("content-type") || "");
			} catch {
				coverOk = false;
			}
		}
		keep.push({
			title: s.title,
			artist: s.artist,
			cover: coverOk ? cover : "",
			url: picked.url,
			lrc: build(picked.part, "lrc", sid),
		});
		console.log(
			`  ${String(i + 1).padStart(3)} ✓ ${(s.title || "").slice(0, 24).padEnd(26)} ` +
				`${Math.floor(picked.dur / 60)}:${String(Math.round(picked.dur % 60)).padStart(2, "0")}  ` +
				`${String(Math.round(picked.size / 1024)).padStart(6)}KB  ${coverOk ? "" : "封面拿不到"}`,
		);
	} else {
		const why = picked?.tooShort ? `只有 ${picked.tooShort} 秒` : "拿不到音频";
		drop.push({ title: s.title, why });
		console.log(`  ${String(i + 1).padStart(3)} ✗ ${(s.title || "").slice(0, 24).padEnd(26)} ${why}`);
	}
}

console.log(`\n留下 ${keep.length} 首，剔掉 ${drop.length} 首：`);
for (const d of drop) console.log(`  ✗ ${d.title} —— ${d.why}`);

const out = { songs: keep };
const json = JSON.stringify(out, null, 2) + "\n";

if (DRY) {
	console.log(`\n--dry：不写文件。真要写就去掉 --dry（约 ${Math.round(json.length / 1024)}KB）`);
	process.exit(0);
}

const target = join(root, "src/data/music.json");
const before = JSON.parse(readFileSync(target, "utf8"));
const beforeCount = (before.songs || []).length;
writeFileSync(target, json, "utf8");
console.log(`\n已写入 ${target}`);
console.log(`  ${beforeCount} 首 → ${keep.length} 首`);
