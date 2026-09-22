/** 首页横幅轮播的单条内容 */
export type BannerKind = "quote" | "stat" | "own";

export interface BannerItem {
	kind: BannerKind;
	text: string;
	/** 出处：抽句才有，显示为句尾的极淡小字 */
	from?: string;
}

/** 需要按访客本地时间实时填充的模板 */
export interface BannerLive {
	/** 占位符：{{time}} {{percent}} {{left}} {{greet}} {{date}} {{weekday}} {{dayNo}} */
	template: string;
	/** 构建期就能定下的值，如建站第几天 */
	dayNo?: number;
}
