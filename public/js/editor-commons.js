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

	global.WBEditor = {
		summarize: summarize,
		createDraftStore: createDraftStore,
		installTabIndent: installTabIndent,
		installShortcuts: installShortcuts,
		guardUnsavedChanges: guardUnsavedChanges,
	};
})(window);
