/**
 * 后台写作页共用的小工具集
 *
 * 后台的文章页与说说页都是独立页面，各自靠内联脚本驱动，彼此没法 import，
 * 所以把两边都要用的几件事集中放在这一份里：字数统计、本地草稿、快捷键、
 * 未保存提醒。页面用普通 script 标签引入，再从 window.WBEditor 取用。
 *
 * 放在 public 下而不是走打包，是因为后台页的脚本本来就是内联的，
 * 多引一个文件比把同一段逻辑抄两遍更省事，也更好改。
 */
(function (global) {
	"use strict";

	// 中日韩文字按"字"计，拉丁字母与数字按"词"计
	var CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;
	var LATIN_RE = /[A-Za-z0-9]+(?:['\u2019-][A-Za-z0-9]+)*/g;

	/**
	 * 统计一段 Markdown 正文的实际篇幅。
	 *
	 * 统计前先剔掉代码块、行内代码、图片地址、链接地址与行首符号，
	 * 否则一行代码会被当成正文，链接的路径也会被算成一大串单词。
	 *
	 * 返回：字数（中文字数 + 英文词数）、中文字数、英文词数、预计阅读分钟数。
	 */
	function summarize(text) {
		if (!text) return { chars: 0, cjk: 0, words: 0, minutes: 1 };
		var clean = String(text)
			.replace(/```[\s\S]*?```/g, " ")
			.replace(/~~~[\s\S]*?~~~/g, " ")
			.replace(/`[^`\n]*`/g, " ")
			.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
			.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
			.replace(/^\s{0,3}(?:[#>]+|[-*+]|\d+\.)\s?/gm, "");
		var cjk = (clean.match(CJK_RE) || []).length;
		var words = (clean.match(LATIN_RE) || []).length;
		// 中文阅读速度约每分钟 400 字、英文约每分钟 200 词，各自折算后相加
		var minutes = Math.max(1, Math.round(cjk / 400 + words / 200));
		return { chars: cjk + words, cjk: cjk, words: words, minutes: minutes };
	}

	/**
	 * 本地草稿存取。
	 *
	 * 只存在浏览器本地，用来兜住"写到一半断电、误关标签页、页面被刷新"
	 * 这类情况 —— 草稿不会上传到任何地方，正式内容仍以保存到仓库的为准。
	 */
	function createDraftStore(name) {
		var key = "wb-draft:" + name;
		return {
			key: key,
			save: function (data) {
				try {
					localStorage.setItem(key, JSON.stringify({ at: Date.now(), data: data }));
					return true;
				} catch (e) {
					// 本地存储写满或被禁用时静默放弃，不影响正常写作
					return false;
				}
			},
			load: function () {
				try {
					var raw = localStorage.getItem(key);
					if (!raw) return null;
					var parsed = JSON.parse(raw);
					if (!parsed || !parsed.data) return null;
					return parsed;
				} catch (e) {
					return null;
				}
			},
			clear: function () {
				try {
					localStorage.removeItem(key);
				} catch (e) {
					/* 忽略 */
				}
			},
		};
	}

	/**
	 * 把文本写回输入框，并让它进入浏览器原生的撤销栈。
	 *
	 * 优先走 insertText 命令：它由浏览器原生处理，撤销（Ctrl+Z）能一路退回去。
	 * 直接改 textarea.value 会把撤销历史清空 —— 对一个写作框来说这不能接受。
	 */
function replaceSelection(textarea, text, selectFrom, selectTo) {
	textarea.focus();
	var start = textarea.selectionStart;
	var end = textarea.selectionEnd;
	var ok = false;
	try {
		ok = document.execCommand("insertText", false, text);
	} catch (e) {
		ok = false;
	}
	if (!ok) {
		textarea.value =
			textarea.value.slice(0, start) + text + textarea.value.slice(end);
	}
	// execCommand 会把光标丢在插入内容的末尾，所以这里统一按调用方给的偏移定位。
	// 否则「选中一段字→点加粗」之后选区就没了，接着打字会跑到 ** 后面去。
	var from = start + (selectFrom == null ? text.length : selectFrom);
	var to = start + (selectTo == null ? text.length : selectTo);
	textarea.setSelectionRange(from, to);
	textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

	/**
	 * 让 Tab 键用来缩进，而不是把光标弹出输入框。
	 *
	 * 选中多行时整体缩进或回退；没选中时在光标处插入两个空格。
	 * Shift+Tab 做反向操作。
	 */
	function installTabIndent(textarea, unit) {
		var indent = unit || "  ";
		textarea.addEventListener("keydown", function (e) {
			if (e.key !== "Tab" || e.ctrlKey || e.metaKey || e.altKey) return;
			e.preventDefault();
			var value = textarea.value;
			var start = textarea.selectionStart;
			var end = textarea.selectionEnd;
			var multiline = value.slice(start, end).indexOf("\n") !== -1;

			if (!multiline) {
				if (!e.shiftKey) {
					replaceSelection(textarea, indent);
					return;
				}
				// 回退：吃掉光标前最多一个缩进单位
				var lineStart = value.lastIndexOf("\n", start - 1) + 1;
				var before = value.slice(lineStart, start);
				var strip = 0;
				while (strip < indent.length && before.charAt(before.length - 1 - strip) === " ") strip++;
				if (!strip) return;
				textarea.setSelectionRange(start - strip, start);
				replaceSelection(textarea, "");
				textarea.setSelectionRange(start - strip, start - strip);
				return;
			}

			// 多行：逐行处理，整块替换后重新选中同一片区域
			var blockStart = value.lastIndexOf("\n", start - 1) + 1;
			var blockEnd = value.indexOf("\n", end);
			if (blockEnd === -1) blockEnd = value.length;
			var block = value.slice(blockStart, blockEnd);
			var lines = block.split("\n").map(function (line) {
				if (e.shiftKey) {
					var dropped = 0;
					while (dropped < indent.length && line.charAt(0) === " ") {
						line = line.slice(1);
						dropped++;
					}
					return line;
				}
				return line.length || line === "" ? indent + line : line;
			});
			var next = lines.join("\n");
			textarea.setSelectionRange(blockStart, blockEnd);
			replaceSelection(textarea, next);
			textarea.setSelectionRange(blockStart, blockStart + next.length);
		});
	}

	/**
	 * 绑一组写作快捷键。
	 *
	 * Ctrl/Cmd+B 加粗、I 斜体、K 链接、S 保存、Enter 提交。
	 * actions 里没给的那项就自动跳过，不报错。
	 */
	function installShortcuts(textarea, actions) {
		var map = {
			b: actions.bold,
			i: actions.italic,
			k: actions.link,
			s: actions.save,
			enter: actions.submit,
		};
		textarea.addEventListener("keydown", function (e) {
			if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
			var key = e.key === "Enter" ? "enter" : String(e.key || "").toLowerCase();
			var fn = map[key];
			if (typeof fn !== "function") return;
			e.preventDefault();
			fn();
		});
	}

	/**
	 * 有未保存改动时，关标签页或刷新前弹一次系统确认。
	 *
	 * isDirty 是实时求值的函数，不是布尔值 —— 用它来判断"此刻"是否还有改动。
	 */
	function guardUnsavedChanges(isDirty, message) {
		window.addEventListener("beforeunload", function (e) {
			var dirty = false;
			try {
				dirty = !!isDirty();
			} catch (err) {
				dirty = false;
			}
			if (!dirty) return;
			e.preventDefault();
			e.returnValue = message || "";
			return message || "";
		});
	}

	/**
	 * HTML → Markdown（2026-10-03 加）。
	 *
	 * 干什么用的：站长说「我自己并不想编写 md 格式，有没有办法变简单易用」。
	 * 最省事的路径不是把编辑器改成所见即所得（那种往返转换很容易把格式弄丢），
	 * 而是**让他在别处写、粘过来就是干净的 Markdown**：Word、Notion、网页、
	 * 公众号，选中复制，粘进正文即自动转换。
	 *
	 * 只处理博客会用到的那一档语法，宁可少认几种，也不乱猜：
	 *   块级：h1~h6 → #、p → 空行分段、ul/ol → - 与 1.、blockquote → >、
	 *        pre → 围栏代码块、hr → ---、table → GFM 表格
	 *   行内：strong/b → **、em/i → *、del/s → ~~、code → `、a → [文字](链接)、
	 *        img → ![alt](src)
	 * 其它一律丢掉（style/script/注释、Word 的 mso-* 垃圾、内联样式）。
	 */
	function htmlToMarkdown(html) {
		if (!html) return "";
		var doc;
		try {
			doc = new DOMParser().parseFromString(html, "text/html");
		} catch (e) {
			return "";
		}
		if (!doc || !doc.body) return "";

		var BLOCK = "address,article,aside,div,dl,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,header,hr,li,main,nav,ol,p,pre,section,table,blockquote,tr";

		function kids(node) {
			return Array.prototype.slice.call(node.childNodes || []);
		}
		/** 行内 */
		function inline(node) {
			if (node.nodeType === 3) {
				return String(node.nodeValue || "").replace(/\s+/g, " ");
			}
			if (node.nodeType !== 1) return "";
			var tag = node.nodeName.toLowerCase();
			if (tag === "script" || tag === "style" || tag === "head" || tag === "title") return "";
			if (tag === "br") return "\n";
			var inner = kids(node).map(inline).join("");
			if (!inner.trim() && tag !== "img") return inner;
			if (tag === "strong" || tag === "b") return "**" + inner.trim() + "**";
			if (tag === "em" || tag === "i") return "*" + inner.trim() + "*";
			if (tag === "del" || tag === "s" || tag === "strike") return "~~" + inner.trim() + "~~";
			if (tag === "code") return "`" + inner.replace(/\n+/g, " ") + "`";
			if (tag === "img") {
				var src = node.getAttribute("src") || "";
				var alt = node.getAttribute("alt") || "";
				return src ? "![" + alt + "](" + src + ")" : "";
			}
			if (tag === "a") {
				var href = node.getAttribute("href") || "";
				if (!href || /^javascript:/i.test(href)) return inner;
				return "[" + inner.trim() + "](" + href + ")";
			}
			return inner;
		}

		/** 块级：返回若干行 */
		function block(node) {
			if (node.nodeType === 3) {
				var t = String(node.nodeValue || "").replace(/\s+/g, " ").trim();
				return t ? [t] : [];
			}
			if (node.nodeType !== 1) return [];
			var tag = node.nodeName.toLowerCase();
			if (tag === "script" || tag === "style" || tag === "head" || tag === "title") return [];
			if (/^h[1-6]$/.test(tag)) {
				var lv = Math.min(4, Number(tag.slice(1))); // 博客只到 h4
				var ht = kids(node).map(inline).join("").trim();
				return ht ? [new Array(lv + 1).join("#") + " " + ht] : [];
			}
			if (tag === "hr") return ["---"];
			if (tag === "pre") {
				var code = node.textContent.replace(/\n+$/, "");
				return ["```", code, "```"];
			}
			if (tag === "blockquote") {
				return flatten(kids(node)).map(function (l) { return l ? "> " + l : ">"; });
			}
			if (tag === "ul" || tag === "ol") {
				var out = [];
				var n = 1;
				kids(node).forEach(function (li) {
					if (li.nodeType !== 1 || li.nodeName.toLowerCase() !== "li") return;
					// li 里可能还有嵌套列表：第一段当内容，其余原样接在后面
					var sub = [];
					var parts = [];
					kids(li).forEach(function (ch) {
						if (ch.nodeType === 1 && /^(ul|ol)$/.test(ch.nodeName.toLowerCase())) sub.push(ch);
						else parts.push(ch);
					});
					var text = parts.map(inline).join("").trim().replace(/\n+/g, " ");
					if (text) out.push((tag === "ol" ? ++n - 1 + ". " : "- ") + text);
					sub.forEach(function (s) {
						flatten([s]).forEach(function (l) {
							if (l) out.push("  " + l);
						});
					});
				});
				return out;
			}
			if (tag === "table") {
				var rows = [];
				Array.prototype.forEach.call(node.querySelectorAll("tr"), function (tr) {
					var cells = Array.prototype.map.call(tr.children, function (td) {
						return kids(td).map(inline).join("").trim().replace(/\|/g, "\\|").replace(/\n+/g, " ");
					});
					if (cells.length) rows.push("| " + cells.join(" | ") + " |");
				});
				if (!rows.length) return [];
				var sep = "| " + rows[0].split("|").slice(1, -1).map(function () { return "---"; }).join(" | ") + " |";
				return [rows[0], sep].concat(rows.slice(1));
			}
			if (tag === BLOCK || tag === "div" || tag === "section" || tag === "article") {
				return flatten(kids(node));
			}
			var it = kids(node).map(inline).join("").trim();
			return it ? [it] : [];
		}

		function flatten(nodes) {
			var out = [];
			nodes.forEach(function (n) {
				var lines = block(n);
				if (lines.length) out = out.concat(lines);
			});
			return out;
		}

		var lines = flatten(kids(doc.body));
		// 收尾：去掉行尾空格、压缩连续空行、去掉首尾空行
		var text = lines
			.join("\n")
			.replace(/[ \t]+\n/g, "\n")
			.replace(/\n{3,}/g, "\n\n")
			.replace(/^\n+|\n+$/g, "");
		return text;
	}

	/**
	 * 粘贴富文本时自动转成 Markdown。
	 *
	 * ⚠️ 只在剪贴板**真的有 HTML** 且转换结果里含 Markdown 标记时才接管；
	 *    纯文本粘贴、或转换出来是空的，一律放过去走浏览器默认行为 —— 否则
	 *    会把"粘贴一段普通文字"也弄坏（缩进、换行全变）。
	 */
	function installRichPaste(textarea, opts) {
		opts = opts || {};
		textarea.addEventListener("paste", function (e) {
			var cb = e.clipboardData || window.clipboardData;
			if (!cb) return;
			// 剪贴板里有图片就不管（交给 admin-media 的粘贴上传）
			var items = cb.items;
			if (items) {
				for (var i = 0; i < items.length; i++) {
					if (items[i].type && items[i].type.indexOf("image/") === 0) return;
				}
			}
			var html = "";
			try { html = cb.getData("text/html") || ""; } catch (err) { html = ""; }
			if (!html) return;
			// 纯文本已经很"干净"（没有标签结构）时不必插手
			if (!/<(p|div|h[1-6]|ul|ol|li|table|blockquote|pre|strong|b|em|i|a|img)\b/i.test(html)) return;
			var md = htmlToMarkdown(html);
			if (!md || !/[#*>`\-|]|!\[|\[/.test(md)) return;
			e.preventDefault();
			replaceSelection(textarea, md);
			if (opts && opts.onConverted) opts.onConverted(md);
		});
	}

	/**
	 * 回车自动接上列表/引用（2026-10-03 加）。
	 *
	 * 不熟 Markdown 的人最烦的是"打完一条列表，下一行还得自己敲 - "。
	 * 这里只做这一件事：在当前行是 `- ` / `* ` / `1. ` / `> ` 时，回车自动
	 * 补出下一行的标记；**当前行是空列表项时回车，则把标记删掉**（结束列表）。
	 */
	function installAutoList(textarea) {
		textarea.addEventListener("keydown", function (e) {
			if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
			var v = textarea.value;
			var pos = textarea.selectionStart;
			if (pos !== textarea.selectionEnd) return;
			var lineStart = v.lastIndexOf("\n", pos - 1) + 1;
			var line = v.slice(lineStart, pos);
			var m = line.match(/^(\s*)(?:([-*+])\s+(.*)|\d+\.\s+(.*)|(>)\s?(.*))$/);
			if (!m) return;
			e.preventDefault();
			var indent = m[1] || "";
			var rest = (m[3] != null ? m[3] : m[4] != null ? m[4] : m[6]) || "";
			var marker;
			if (m[2]) marker = m[2] + " ";
			else if (m[4] != null) {
				var num = parseInt(line.match(/(\d+)\./)[1], 10) || 1;
				marker = (num + 1) + ". ";
			} else marker = "> ";
			if (rest.trim()) {
				textarea.setRangeText("\n" + indent + marker, pos, pos, "end");
			} else {
				// 空条目再回车 = 结束这个列表：把这一行的标记删掉，光标停在行首
				// （只插一个换行是不够的 —— 会把「- 」那截留在原处）
				textarea.setRangeText("", lineStart, pos, "start");
			}
			textarea.dispatchEvent(new Event("input", { bubbles: true }));
		});
	}

	global.WBEditor = {
		summarize: summarize,
		htmlToMarkdown: htmlToMarkdown,
		installRichPaste: installRichPaste,
		installAutoList: installAutoList,
		// ⚠️ 别再漏掉这一个（2026-10-02 修）：这个函数一直定义在文件里、却**忘了导出**，
		//    而「文章管理」页的工具栏（加粗 / 引用 / 列表 / 表格 / 图片…）全部走
		//    `WBEditor.replaceSelection(...)` —— 于是那些按钮点下去抛
		//    `WBEditor.replaceSelection is not a function`，一个都不生效。
		//    站长说的「文章中间无法插入图片」根因就在这里，不是缺按钮。
		replaceSelection: replaceSelection,
		createDraftStore: createDraftStore,
		installTabIndent: installTabIndent,
		installShortcuts: installShortcuts,
		guardUnsavedChanges: guardUnsavedChanges,
	};
})(window);
