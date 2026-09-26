import { siteConfig } from "../config";
import type I18nKey from "./i18nKey";
import { zh_CN } from "./languages/zh_CN";

export type Translation = {
	[K in I18nKey]: string;
};

/**
 * 本站只做简体中文（2026-09-27 定案）。
 *
 * 这里原先挂着 en / ja / ru / zh_TW 四份语言包，但站点语言是构建期常量
 * （siteConfig.ts 的 SITE_LANG = "zh_CN"），**访客没有任何切换入口** —— 那四份永远
 * 到不了访客眼前。留着它们的实际后果只有一个：每新增一个文案键都要跟着维护五份。
 * 也就是说「支持多语言」这句话本身不准确，因此四份已删除，只留 zh_CN。
 *
 * 以后真要加语言：在 languages/ 下补一份、在这里 import 并注册进 map，
 * **并先给访客一个能点的切换入口** —— 否则又是一份死语言包。
 */
const map: { [key: string]: Translation } = {
	zh_cn: zh_CN,
	// 繁体也指向简体：站点内容本身就是简体，繁体访客看到简体，也好过看到英文兜底。
	zh_tw: zh_CN,
};

export function getTranslation(lang: string): Translation {
	return map[lang.toLowerCase()] || zh_CN;
}

export function i18n(key: I18nKey): string {
	const lang = siteConfig.lang || "zh_CN";
	const value = getTranslation(lang)[key];

	// 只有一份语言包，正常情况下不会缺键；万一缺了，就把键名显示出来，
	// 至少界面上能看出是哪一条漏了，而不是显示成空白
	return value || String(key);
}
