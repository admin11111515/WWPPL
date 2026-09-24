/**
 * 后台四个页面与 GitHub 代理之间的共用一层
 * ============================================================
 * 页面用法：<script is:inline src="/js/admin-github.js"></script>，
 * 再从 window.WBGitHub 取用。与 editor-commons.js 同一套做法 ——
 * 后台页的脚本都是内联的，彼此不能 import，只能靠挂在 window 上共用。
 *
 * 为什么要单独抽一层，而不是各页各写一遍 fetch：
 *
 *   1. 原先四个页面都在自己拼 URL、自己判断 r.ok，**并且把 GitHub 返回的
 *      message 丢掉了**。于是同一个故障在不同页面有不同说法：
 *        文章页   保存失败 HTTP 403
 *        说说页   发布失败：HTTP 404
 *        删除说说 网络错误
 *      而「HTTP 403 / 404」恰恰是令牌少配一项权限时最常见的症状，
 *      「网络错误」更是指错了方向。把 GitHub 的原话带出来，一眼就能对上号。
 *
 *   2. Gist 那条路有个单独的坑：读不到时 GitHub 返回 {"message":"Not Found"}，
 *      响应里**没有 files 字段**。旧代码直接 gist.files[FILE_NAME] 会抛
 *      「Cannot read properties of undefined」，被 catch 成「网络错误」。
 *      gistFile() 在这里统一兜住，直接说明白是"读不到这个 Gist"。
 *
 * 令牌只存在于服务端（/api/github 那个代理里），这一层拿到的响应永远不含令牌。
 */
(function (global) {
	"use strict";

	var API = "/api/github";

	/**
	 * 把一次失败的响应翻成能看懂的一句话。
	 *
	 * 优先用响应体里我们自己的 error 字段 —— 那是服务端（Worker 入口）写的
	 * 可读说明，例如「服务端未配置 GITHUB_TOKEN」，比任何猜测都准。
	 * 没有的话再按状态码补，并尽量带上 GitHub 原话。
	 */
	function explain(status, data) {
		if (data && typeof data.error === "string" && data.error) return data.error;

		var detail = data && typeof data.message === "string" && data.message ? data.message : "";

		var byStatus = {
			401: "登录已过期，重新登录后台再试",
			403: "令牌权限不足（这一步需要的权限没给）",
			404: "找不到，或令牌看不到这个仓库／Gist",
			409: "内容在别处被改过，刷新页面重新打开再保存",
			422: "GitHub 不接受这次请求的内容",
			429: "请求太频繁，被 GitHub 限流了，等一会儿再试",
		};
		var head = byStatus[status] || (status >= 500 ? "GitHub 那边出错了" : "请求失败");

		return detail ? head + "（HTTP " + status + "：" + detail + "）" : head + "（HTTP " + status + "）";
	}

	/**
	 * 发一次请求。成功返回解析后的响应体；失败抛出的 Error 里带 status 与 data，
	 * 消息已经是上面 explain 翻过的人话。
	 *
	 * 注意：代理只接管 /api/github 下面的路径，其余请求不会被转发。
	 */
	function request(path, init) {
		var opts = init || {};
		var headers = Object.assign({}, opts.headers || {});
		// 代理只把请求的 Content-Type 透传给 GitHub；带 body 时必须自己声明
		if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

		return fetch(API + path, {
			method: opts.method || "GET",
			headers: headers,
			body: opts.body,
		}).then(function (r) {
			return r.text().then(function (text) {
				var data = null;
				if (text) {
					try {
						data = JSON.parse(text);
					} catch (e) {
						// 不是 JSON（比如平台返回的错误页）就留 null，交给 explain
					}
				}
				if (!r.ok) {
					var err = new Error(explain(r.status, data));
					err.status = r.status;
					err.data = data;
					throw err;
				}
				return data;
			});
		});
	}

	/** 路径里的每一段单独编码 —— 整串编码会把斜杠也编掉 */
	function encPath(p) {
		return String(p)
			.split("/")
			.map(encodeURIComponent)
			.join("/");
	}

	function contentsUrl(owner, repo, path) {
		return "/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo) + "/contents/" + encPath(path);
	}

	/**
	 * 读一个文件。文件不存在返回 null（不是错误）—— 调用方靠它决定"新建"还是"更新"。
	 */
	function getFile(opts) {
		var url = contentsUrl(opts.owner, opts.repo, opts.path) + "?ref=" + encodeURIComponent(opts.branch || "main");
		return request(url, { method: "GET" }).catch(function (e) {
			if (e.status === 404) return null;
			throw e;
		});
	}

	/**
	 * 写一个文件（新建或更新）。
	 *
	 * sha 是"我要覆盖的那一版"：更新时不带 sha 会被 GitHub 用 409 挡下来，
	 * 这正是用来防止把别人刚推的内容覆盖掉的。新建时不要传。
	 */
	function putFile(opts) {
		var body = {
			message: opts.message || "更新文件",
			content: opts.content,
			branch: opts.branch,
		};
		if (opts.sha) body.sha = opts.sha;

		return request(contentsUrl(opts.owner, opts.repo, opts.path), {
			method: "PUT",
			body: JSON.stringify(body),
		});
	}

	/** 删除一个文件，必须带 sha */
	function deleteFile(opts) {
		return request(contentsUrl(opts.owner, opts.repo, opts.path), {
			method: "DELETE",
			body: JSON.stringify({
				message: opts.message || "删除文件",
				sha: opts.sha,
				branch: opts.branch,
			}),
		});
	}

	/** 列一个目录；目录不存在返回空数组 */
	function listDir(opts) {
		var url = contentsUrl(opts.owner, opts.repo, opts.path) + "?ref=" + encodeURIComponent(opts.branch || "main");
		return request(url, { method: "GET" })
			.then(function (data) {
				return Array.isArray(data) ? data : [];
			})
			.catch(function (e) {
				if (e.status === 404) return [];
				throw e;
			});
	}

	/** 读一个 Gist */
	function readGist(id) {
		if (!id) throw new Error("没有配置 Gist 编号，先在配置里补上再写内容");
		return request("/gists/" + encodeURIComponent(id), { method: "GET" });
	}

	/**
	 * 从 Gist 对象里取出某个文件的内容。
	 *
	 * 两种情况分开对待，因为它们不是一回事：
	 *   · Gist 本身读不到（响应里没有 files 字段）→ **抛错**。多半是令牌没有
	 *     Gist 权限，或 Gist 编号写错了。旧代码在这里会撞成
	 *     「Cannot read properties of undefined」，被上层 catch 成「网络错误」，
	 *     方向指错得离谱。
	 *   · Gist 读得到、但里面还没有这个文件 → 返回空串。这是"还没写过内容"，
	 *     属于正常状态，不该报错。
	 */
	function gistText(gist, name) {
		if (!gist || !gist.files) {
			throw new Error("读不到这个 Gist（多半是令牌没有 Gist 权限，或 Gist 编号不对）");
		}
		var file = gist.files[name];
		return file && file.content ? file.content : "";
	}

	/** 改 Gist 里的文件内容 */
	function patchGist(id, name, content) {
		var files = {};
		files[name] = { content: content };
		return request("/gists/" + encodeURIComponent(id), {
			method: "PATCH",
			body: JSON.stringify({ files: files }),
		});
	}

	/**
	 * 新建一个 Gist（笔记那种"还没配 Gist 就先写，写完自动建一个"的流程用）。
	 * 返回体里带新 Gist 的 id，调用方要提示用户填回配置。
	 */
	function createGist(description, name, content) {
		var files = {};
		files[name] = { content: content };
		return request("/gists", {
			method: "POST",
			body: JSON.stringify({ description: description, public: false, files: files }),
		});
	}

	/** 问 GitHub 的 GraphQL（贡献日历走这里；细粒度令牌权限不够时它会失败） */
	function graphql(query, variables) {
		return request("/graphql", {
			method: "POST",
			body: JSON.stringify({ query: query, variables: variables || {} }),
		});
	}

	global.WBGitHub = {
		API: API,
		explain: explain,
		request: request,
		encPath: encPath,
		getFile: getFile,
		putFile: putFile,
		deleteFile: deleteFile,
		listDir: listDir,
		readGist: readGist,
		gistText: gistText,
		patchGist: patchGist,
		createGist: createGist,
		graphql: graphql,
	};
})(window);
