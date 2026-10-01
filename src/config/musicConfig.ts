import type { MusicPlayerConfig } from "../types/musicConfig";

// 音乐播放器配置
export const musicPlayerConfig: MusicPlayerConfig = {
	// 禁用音乐播放器方法：
	// 模板默认侧边栏和导航栏两个都显示
	// 1. 侧边栏：在sidebarConfig.ts侧边栏配置把音乐组件enable设为false禁用即可
	// 2. 导航栏：在本配置文件把showInNavbar设为false禁用即可

	// 是否在导航栏显示音乐播放器入口
	showInNavbar: true,

	// 是否显示迷你播放器
	showMiniPlayer: true,

	// 使用方式：只用 'local'（读下面的 local.playlist）
	// ⚠️ 2026-10-01 站长要求「音乐只要 music.json 那一套」：主题原有的
	// `mode: "meting"` 与 `meting` 配置块（三个第三方主机 + 备用源）**已删除**。
	// 全站音源统一为 `src/data/music.json`（`/music` 页、全站播放、侧边栏卡片都读它）——
	// 侧边栏本来就是「优先同步 GlobalAudio 的歌单」，那段拉第三方的兜底实际是死代码。
	mode: "local",

	// 默认音量 (0-1)
	volume: 0.7,

	// 播放模式：'list'=列表循环, 'one'=单曲循环, 'random'=随机播放
	playMode: "list",

	// 是否显启用歌词
	showLyrics: true,

	// 是否同步全局播放器（当进入 /music 页面时）
	// 设置为 true：侧边栏播放器完全同步 /music 页面的播放列表
	// 设置为 false：侧边栏使用独立的本地配置（默认）
	syncWithGlobalPlayer: true,

	// ⚠️ 这里原来放着 `meting: { api / fallbackApis }`（i-meto → injahow → moeyao
	// 三个第三方主机，用来在运行时拉歌单）。2026-10-01 已整块删除：站点只有
	// music.json 一套音源，不再依赖任何运行时第三方接口。
	// 需要更新歌单仍走 `pnpm prefetch:music`（那个脚本自带源列表，与本配置无关）。

	// 本地音乐配置（当 mode 为 'local' 时使用）
	// 1. 支持传入歌词文件的路径
	// lrc: "/assets/music/lrc/使一颗心免于哀伤-哼唱.lrc",
	// 2. 或者直接填入歌词字符串内容
	// lrc: "[00:00.00]歌词内容...",
	//
	// ⚠️ 2026-09-26 清空过：这里原来放着一首《迷途羔羊》（mp3 4.46 MB + lrc），
	// 但本站音源已统一走 music.json，这段 local 列表在运行时不会被加载，
	// 等于白占 4.46 MB 的部署体积（线上实测这个 mp3 是 200，但没有任何页面引用它）。
	// 音频与歌词已删，原文件备份在仓库外的 .backup/2026-09-26-0802/。
	// 哪天真要切到本地音源，把音频放回 public/assets/music/ 再在这里补条目即可。
	local: {
		playlist: [],
	},
};
