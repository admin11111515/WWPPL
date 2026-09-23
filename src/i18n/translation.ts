import { siteConfig } from "../config";
import type I18nKey from "./i18nKey";
import { en } from "./languages/en";
import { ja } from "./languages/ja";
import { ru } from "./languages/ru";
import { zh_CN } from "./languages/zh_CN";
import { zh_TW } from "./languages/zh_TW";

export type Translation = {
	[K in I18nKey]: string;
};

/**
 * 除中文外的语言包允许缺键。
 * i18n() 对缺键本来就有兜底（先回落中文、再回落英文），所以「不完整」是设计内的状态，
 * 类型上也就不该强制每种语言都写全 —— 否则中文新增一个键，另外四种语言就各报一个
 * 类型错误，而运行时其实完全正常。中文仍是 Translation，作为兜底源头必须完整。
 * 注：这里用 Partial 只是放开「少键」，写错键名仍会按多余属性报错。
 */
export type LanguagePack = Partial<Translation>;

const defaultTranslation: LanguagePack = en;

const map: { [key: string]: LanguagePack } = {
	en: en,
	en_us: en,
	en_gb: en,
	en_au: en,
	zh_cn: zh_CN,
	zh_tw: zh_TW,
	ja: ja,
	ja_jp: ja,
	ru: ru,
	ru_ru: ru,
};

export function getTranslation(lang: string): LanguagePack {
	return map[lang.toLowerCase()] || defaultTranslation;
}

export function i18n(key: I18nKey): string {
	const lang = siteConfig.lang || "en";
	const currentLang = getTranslation(lang);
	const value = currentLang[key];

	// 如果当前语言没有翻译（或为空），则使用中文作为备选
	if (!value && lang.toLowerCase() !== "zh_cn") {
		const chineseValue = zh_CN[key];
		if (chineseValue) {
			return chineseValue;
		}
	}

	// 最后回落英文；万一连英文也没有，把键名返回出去，
	// 至少界面上能看出是哪一条没翻译，而不是显示成空白
	return value || defaultTranslation[key] || String(key);
}
