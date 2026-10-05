/**
 * 后台页面共用的小工具（骨架屏）
 * ============================================================
 * 2026-10-05 新增（docs/后台改造参考.md 第六批第 6 条「列表加载还是转圈」）。
 *
 * 为什么单独一个文件：后台每页的脚本都是 `is:inline`，**不能 import 模块**，
 * 共用逻辑只能挂到 window 上 —— 这与 `admin-github.js`（WBGitHub）、
 * `admin-media.js`（WBMedia）、`editor-commons.js`（WBEditor）同一个套路。
 *
 * 骨架屏本身的样子在 `src/styles/admin.css`（`.skeleton-list` / `.skeleton-row` /
 * `.sk-thumb` / `.sk-lines` / `.sk-line`）—— 那个文件才是样式的唯一来源，
 * 这里只负责"生成几行"。
 */
(function (global) {
	"use strict";

	var ROW =
		'<div class="skeleton-row">' +
		'<i class="sk-thumb"></i>' +
		'<i class="sk-lines"><i class="sk-line"></i><i class="sk-line short"></i></i>' +
		"</div>";

	var UI = global.WBUI || (global.WBUI = {});

	/**
	 * 生成 n 行骨架。
	 * @param {number} [n=5] 行数，封顶 12 —— 再多就该改用分页/虚拟滚动了，
	 *   摆 20 行灰条只会让人等得更久。
	 * @returns {string} 可直接塞进 innerHTML 的 HTML
	 *
	 * `aria-hidden="true"`：骨架是纯装饰，读屏软件读它只会念一堆空 div。
	 * 「正在加载」这句话由调用方自己写（页面上原来那句提示可以留着）。
	 */
	UI.skeleton = function (n) {
		var rows = Math.max(1, Math.min(Number(n) || 5, 12));
		var html = '<div class="skeleton-list" aria-hidden="true">';
		for (var i = 0; i < rows; i++) html += ROW;
		return html + "</div>";
	};
})(typeof window !== "undefined" ? window : this);
