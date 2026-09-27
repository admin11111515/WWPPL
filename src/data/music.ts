export interface MusicItem {
	title: string;
	artist: string;
	cover: string;
	url: string;
	lrc?: string;
	duration?: string;
}

/**
 * 此时歌曲数据源于 Meting API 自动生成的 './music.json' 以及配置中的自定义歌单.
 * 运行 `pnpm prefetch:music` 即可自动更新 Meting 歌单数据及自定义音乐时长。
 */
import musicData from "./music.json";

// music.json 由 prefetch:music 生成，有两种形状：
//   · 旧版：直接是一个歌曲数组
//   · 现版：{ songs: [...], playlistCounts: {...}, playlistSongs: {...} }
// 用 unknown 收窄而不是 any —— 保留类型检查，字段名写错时构建就能发现
// （2026-09-28 改成精确类型后，正是靠它确认了下面两个歌单字段的真实形状）。
interface MusicDataFile {
	songs?: MusicItem[];
	playlistCounts?: Record<string, number>;
	playlistSongs?: Record<string, MusicItem[]>;
}

const raw = musicData as unknown as MusicItem[] | MusicDataFile;
const isArrayForm = Array.isArray(raw);

const musicList: MusicItem[] = isArrayForm
	? (raw as MusicItem[])
	: (raw as MusicDataFile).songs || [];

export { musicList };

export const playlistCounts: Record<string, number> = isArrayForm
	? {}
	: (raw as MusicDataFile).playlistCounts || {};

export const playlistSongs: Record<string, MusicItem[]> = isArrayForm
	? {}
	: (raw as MusicDataFile).playlistSongs || {};
