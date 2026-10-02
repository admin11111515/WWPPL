/**
 * 后台图片能力（共用）：上传、从图片库选一张、给编辑器接上拖拽与粘贴。
 *
 * 为什么要抽出来（2026-10-02）：
 *   文章页自己写了一份 compressImage + uploadImage（够用），而**说说、笔记两个
 *   编辑器一份都没有** —— 那两页要插图只能手填「/images/…」的地址，站长说的
 *   「功能点不够完善」就有这一块。与其在两个页面里各抄一遍，不如共用一份。
 *
 * 参照 git 型 CMS（decap-cms ★1.9万）的媒体库做法：上传前在本机压，
 * 插入时只往正文写**路径**，图片本身归到 public/images/ 下。
 *
 * 用法（在各页面的 is:inline 脚本里）：
 *   WBMedia.init({ owner, repo, branch, uploadDir, listRoot, icons })
 *   WBMedia.upload(file).then(r => ...)                  // r.url
 *   WBMedia.openPicker({ onPick: url => ... })           // 浮层里选一张
 *   WBMedia.wireEditor(el, { onInsert: text => ... })    // 拖拽 + Ctrl+V 粘贴 → 自动上传
 *   WBMedia.insertAtCursor(el, '![](/images/…)')
 *
 * ⚠️ 它是普通 <script src>，拿不到页面里构建期生成的图标，所以图标由
 *    init() 传进来（可选）：没传就只出文字，不会出空白框。
 */
(function (global) {
	"use strict";

	var CFG = {
		owner: "",
		repo: "",
		branch: "main",
		uploadDir: "public/images/uploads",
		listRoot: "public/images",
		icons: {},
	};

	function init(opts) {
		Object.keys(opts || {}).forEach(function (k) {
			CFG[k] = opts[k];
		});
		return CFG;
	}

	function opt(p) {
		return { owner: CFG.owner, repo: CFG.repo, branch: CFG.branch, path: p };
	}
	function publicUrl(path) {
		return "/" + String(path).replace(/^public\//, "");
	}
	function isImage(name) {
		return /\.(png|jpe?g|gif|webp|avif|svg|bmp|tiff?)$/i.test(name);
	}

	// ===== 压缩与编码 =====

	/** 压到最长边 max / 质量 q；压不动（svg、gif）就原样返回 */
	function compress(file, max, q) {
		if (!/^image\//.test(file.type) || /svg|gif/.test(file.type)) return Promise.resolve(file);
		return new Promise(function (resolve) {
			var img = new Image();
			var url = URL.createObjectURL(file);
			img.onload = function () {
				var scale = Math.min(1, (max || 1600) / Math.max(img.width, img.height));
				var w = Math.round(img.width * scale);
				var h = Math.round(img.height * scale);
				var canvas = document.createElement("canvas");
				canvas.width = w;
				canvas.height = h;
				canvas.getContext("2d").drawImage(img, 0, 0, w, h);
				URL.revokeObjectURL(url);
				canvas.toBlob(function (b) { resolve(b || file); }, "image/webp", q || 0.82);
			};
			img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
			img.src = url;
		});
	}

	function extOf(blob, fallback) {
		var t = ((blob && blob.type) || "").toLowerCase();
		if (t.indexOf("webp") >= 0) return "webp";
		if (t.indexOf("jpeg") >= 0 || t.indexOf("jpg") >= 0) return "jpg";
		if (t.indexOf("png") >= 0) return "png";
		if (t.indexOf("gif") >= 0) return "gif";
		if (t.indexOf("avif") >= 0) return "avif";
		return String(fallback || "png").replace(/^.*\./, "").replace(/^\./, "");
	}

	function b64FromBytes(bytes) {
		var s = "";
		for (var i = 0; i < bytes.length; i += 0x8000) {
			s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
		}
		return btoa(s);
	}

	function stampName(ext) {
		var d = new Date();
		function p(n) { return (n < 10 ? "0" : "") + n; }
		return "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" +
			p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + "-" +
			Math.random().toString(36).slice(2, 6) + "." + ext;
	}

	/** 上传一张图（自动压缩）。返回 {url, path, name, size} */
	function upload(file, opts) {
		opts = opts || {};
		if (!/^image\//.test(file.type)) return Promise.reject(new Error("不是图片文件：" + file.name));
		var dir = opts.dir || CFG.uploadDir;
		return compress(file, opts.max, opts.quality).then(function (blob) {
			var name = stampName(extOf(blob, file.name));
			var path = dir + "/" + name;
			return blob.arrayBuffer().then(function (buf) {
				return global.WBGitHub.putFile({
					owner: CFG.owner, repo: CFG.repo, branch: CFG.branch,
					path: path, content: b64FromBytes(new Uint8Array(buf)),
					message: (opts.message || "上传图片：") + name,
				}).then(function () {
					return { url: publicUrl(path), path: path, name: name, size: blob.size, blob: blob };
				});
			});
		});
	}

	// ===== 列图片库 =====

	function walk(dir, depth) {
		return global.WBGitHub.listDir(opt(dir)).then(function (items) {
			var out = [];
			var chain = Promise.resolve();
			items.forEach(function (it) {
				if (it.type === "dir") {
					if (depth < 3) {
						chain = chain.then(function () {
							return walk(it.path, depth + 1).then(function (sub) { out = out.concat(sub); });
						});
					}
				} else if (isImage(it.name)) {
					out.push({ name: it.name, path: it.path, url: publicUrl(it.path), size: it.size });
				}
			});
			return chain.then(function () {
				out.sort(function (a, b) { return b.path < a.path ? -1 : b.path > a.path ? 1 : 0; });
				return out;
			});
		});
	}

	// ===== 「从图片库选一张」浮层 =====

	var modalEl = null;
	var cache = null;

	function el(tag, cls, html) {
		var e = document.createElement(tag);
		if (cls) e.className = cls;
		if (html != null) e.innerHTML = html;
		return e;
	}
	function icon(name) {
		var svg = (CFG.icons || {})[name];
		return svg ? '<span class="admin-i">' + svg + "</span>" : "";
	}

	function openPicker(opts) {
		opts = opts || {};
		if (modalEl) return;
		cache = null;

		var wrap = el("div", "wb-picker-mask");
		var box = el("div", "wb-picker");
		box.innerHTML =
			'<div class="wb-picker-head">' +
				'<span class="wb-picker-title">' + (opts.title || "从图片库选一张") + "</span>" +
				'<button type="button" class="btn btn-sm" data-close>' + icon("close") + "关闭</button>" +
			"</div>" +
			'<div class="wb-picker-tools">' +
				'<button type="button" class="btn btn-primary btn-sm" data-upload>' + icon("upload") + "上传新图片</button>" +
				'<input type="file" accept="image/*" multiple hidden data-file />' +
				'<input type="search" class="input-single" placeholder="搜文件名…" data-search />' +
			"</div>" +
			'<div class="wb-picker-body" data-body><div class="empty-state"><p>正在读取图片库…</p></div></div>';

		function close() {
			if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
			modalEl = null;
			document.removeEventListener("keydown", onKey);
		}
		function onKey(e) { if (e.key === "Escape") close(); }
		document.addEventListener("keydown", onKey);
		wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
		box.querySelector("[data-close]").addEventListener("click", close);

		var body = box.querySelector("[data-body]");
		var search = box.querySelector("[data-search]");
		var fileInput = box.querySelector("[data-file]");

		function render(kw) {
			var list = cache || [];
			if (kw) list = list.filter(function (it) { return it.path.toLowerCase().indexOf(kw) >= 0; });
			if (!cache) return;
			if (!cache.length) {
				body.innerHTML = '<div class="empty-state"><p>图片库里还没有图片，点「上传新图片」传一张</p></div>';
				return;
			}
			if (!list.length) {
				body.innerHTML = '<div class="empty-state"><p>没有名字里含「' + kw.replace(/</g, "&lt;") + "」的图片</p></div>";
				return;
			}
			body.innerHTML = '<div class="wb-picker-grid"></div>';
			var grid = body.firstChild;
			list.forEach(function (it) {
				var cell = el("button", "wb-picker-cell");
				cell.type = "button";
				cell.title = publicUrl(it.path);
				cell.innerHTML = '<img src="' + it.url + '" alt="" loading="lazy" /><span>' + it.name + "</span>";
				cell.addEventListener("click", function () {
					close();
					if (opts.onPick) opts.onPick(it.url, it);
				});
				grid.appendChild(cell);
			});
		}

		search.addEventListener("input", function () { render(this.value.trim().toLowerCase()); });
		box.querySelector("[data-upload]").addEventListener("click", function () { fileInput.click(); });
		fileInput.addEventListener("change", function () {
			var files = Array.prototype.slice.call(this.files || []);
			this.value = "";
			if (!files.length) return;
			body.innerHTML = '<div class="empty-state"><p>正在上传 ' + files.length + " 张…</p></div>";
			Promise.all(files.map(function (f) { return upload(f).catch(function () { return null; }); }))
				.then(function (rs) {
					var okOnes = rs.filter(Boolean);
					cache = null;
					return load().then(function () {
						render("");
						// 刚传的第一张直接当成"选中的那张"
						if (okOnes.length && opts.onPick) { close(); opts.onPick(okOnes[0].url, okOnes[0]); }
					});
				});
		});

		function load() {
			return walk(CFG.listRoot, 1).then(function (list) { cache = list; });
		}

		wrap.appendChild(box);
		document.body.appendChild(wrap);
		modalEl = wrap;

		load().then(function () { render(""); }).catch(function (e) {
			body.innerHTML = '<div class="empty-state"><p>图片读不出来：' + ((e && e.message) || e) + "</p></div>";
		});
	}

	// ===== 给编辑器接上拖拽与粘贴 =====

	/** el 收到图片文件时：上传 → 把 onInsert(url) 的结果插进光标处 */
	function wireEditor(el2, opts) {
		if (!el2) return;
		opts = opts || {};
		var insert = opts.onInsert || function (url) { insertAtCursor(el2, "![](" + url + ")"); };

		function handle(file) {
			if (!file) return;
			if (opts.onStatus) opts.onStatus("正在上传 " + (file.name || "粘贴的图片") + " …");
			upload(file, opts)
				.then(function (r) {
					insert(r.url, r);
					if (opts.onStatus) opts.onStatus("插入好了（重建后站上生效）");
				})
				.catch(function (e) {
					if (opts.onStatus) opts.onStatus("上传失败：" + ((e && e.message) || e));
				});
		}

		el2.addEventListener("paste", function (e) {
			var items = e.clipboardData && e.clipboardData.items;
			if (!items) return;
			for (var i = 0; i < items.length; i++) {
				if (items[i].type && items[i].type.indexOf("image/") === 0) {
					var f = items[i].getAsFile();
					if (f) { e.preventDefault(); handle(f); return; }
				}
			}
		});
		el2.addEventListener("dragover", function (e) { e.preventDefault(); });
		el2.addEventListener("drop", function (e) {
			var files = e.dataTransfer && e.dataTransfer.files;
			if (files && files.length) { e.preventDefault(); handle(files[0]); }
		});
	}

	/** 往输入框/文本域的光标处插一段文本 */
	function insertAtCursor(el2, text) {
		if (!el2) return;
		if (el2.selectionStart != null && el2.setRangeText) {
			var s = el2.selectionStart;
			var e2 = el2.selectionEnd;
			el2.setRangeText(text, s, e2, "end");
		} else {
			el2.value = (el2.value || "") + text;
		}
		el2.dispatchEvent(new Event("input", { bubbles: true }));
		el2.focus();
	}

	global.WBMedia = {
		init: init,
		config: CFG,
		upload: upload,
		openPicker: openPicker,
		wireEditor: wireEditor,
		insertAtCursor: insertAtCursor,
		publicUrl: publicUrl,
		walk: walk,
	};
})(window);
