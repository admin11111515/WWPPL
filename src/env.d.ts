/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare global {
	interface ImportMetaEnv {
		readonly MEILI_MASTER_KEY: string;
	}

	interface ITOCManager {
		init: () => void;
		cleanup: () => void;
	}

	interface Window {
		SidebarTOC: {
			manager: ITOCManager | null;
		};
		FloatingTOC: {
			btn: HTMLElement | null;
			panel: HTMLElement | null;
			manager: ITOCManager | null;
			isPostPage: () => boolean;
		};
		toggleFloatingTOC: () => void;
		tocInternalNavigation: boolean;
		// swup is defined in global.d.ts
		// biome-ignore lint/suspicious/noExplicitAny: External library without types
		spine: any;
		closeAnnouncement: () => void;
		// __fireflyMusic type is defined in global.d.ts
		semifullScrollHandler?: (() => void) | undefined;
		initSemifullScrollDetection?: () => void;

		/* ──────────────────────────────────────────────────────────────
		 * 「只初始化一次」标记。
		 *
		 * 站内跳转用的是 swup：它会把页面内容换掉，并（对没标
		 * data-swup-ignore-script 的脚本）把脚本重跑一遍。而挂在 document /
		 * window 上的监听器**不会**随节点消失 —— 于是同一个初始化跑第二遍时，
		 * 监听器就叠了一层。跳 N 次之后，一次滚动/点击要跑 N 个回调。
		 * 带这些标记的组件都需要在重跑时保持幂等，所以在这一处集中声明类型，
		 * 而不用在每个脚本里写 `as any`（那样等于把类型检查关掉）。
		 * ────────────────────────────────────────────────────────────── */
		__wwpplAnnouncementBound?: boolean;
		__wwpplAnnouncementSwupBound?: boolean;
		__wwpplAnnouncementSwupListenBound?: boolean;
		__wwpplBackToCommentBound?: boolean;
		__wwpplBannerRotatorBound?: boolean;
		__wwpplTypewriterBound?: boolean;
		__wwpplUmamiStatsBound?: boolean;
		__wwpplGithubActivityBound?: boolean;
		__wwpplBackToHomeBound?: boolean;
		__wwpplBackToTopInited?: boolean;
		__wwpplCategoryBarBound?: boolean;
		__wwpplDeviceClassBound?: boolean;
		__wwpplDropdownKeynavBound?: boolean;
		__wwpplFloatingTOCAutoCloseBound?: boolean;
		__wwpplImagesFadeBound?: boolean;
		__wwpplMobileMenuBound?: boolean;
		__wwpplRecommendedPostBound?: boolean;
		__wwpplScheduleCleanupBound?: boolean;
		__wwpplScheduleDayTimer?: ReturnType<typeof setTimeout>;
		__wwpplScrollProgressBound?: boolean;
		__wwpplSiteInfoBound?: boolean;
		__wwpplSiteInfoTimer?: ReturnType<typeof setInterval>;
		__wwpplSiteStatsBound?: boolean;
		__wwpplTitleChangeBound?: boolean;
	}
}

export {};
