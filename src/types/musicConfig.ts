// 音乐播放器配置
export type MusicPlayerConfig = {
	// 使用方式：'local' = 用 local.playlist 里的本地列表
	// ⚠️ 主题原有的 'meting'（运行时拉第三方 Meting API）已于 2026-10-01 删除：
	// 站长要求「音乐只要 music.json 那一套」，全站音源统一为 src/data/music.json。
	mode?: "local";

	// 默认音量 (0-1)
	volume?: number;

	// 播放模式：'list'=列表循环, 'one'=单曲循环, 'random'=随机播放
	playMode?: "list" | "one" | "random";

	// 是否显示歌词
	showLyrics?: boolean;

	// 是否在导航栏显示音乐播放器
	showInNavbar?: boolean;

	// 是否显示迷你播放器
	showMiniPlayer?: boolean;

	// 是否同步全局播放器（当进入 /music 页面时）
	// 设置为 true：侧边栏播放器完全同步 /music 页面的播放列表
	// 设置为 false：侧边栏使用独立的本地配置（默认）
	syncWithGlobalPlayer?: boolean;

	// 本地音乐配置（当 mode 为 'local' 时使用）
	local?: {
		playlist?: Array<{
			name: string; // 歌曲名称
			artist: string; // 艺术家
			url: string; // 音乐文件路径（相对于 public 目录）
			cover?: string; // 封面图片路径（相对于 public 目录）
			lrc?: string; // 歌词内容，支持 LRC 格式
		}>;
	};
};
