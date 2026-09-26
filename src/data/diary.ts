// 日记数据配置
// 用于管理日记页面的数据

export interface DiaryItem {
	id: number;
	content: string;
	date: string;
	images?: string[];
	video?: string;
	location?: string;
	locationUrl?: string;
	mood?: string;
	tags?: string[];
	avatar?: string;
	// 图片展示配置
	imageDisplay?: {
		type: "carousel" | "grid"; // 显示类型：轮播图或网格布局
		autoPlay?: boolean; // 是否自动播放（仅carousel模式），默认 true
		interval?: number; // 自动播放间隔（毫秒），默认 4000ms
		showIndicator?: boolean; // 是否显示位置指示器（仅carousel模式），默认 true
		showControls?: boolean; // 是否显示控制按钮（仅carousel模式），默认 true
	};
}

// 日记数据
const diaryData: DiaryItem[] = [
	{
		id: 1,
		content:
			"凌晨两点，终于把那个困扰了我三天的 bug 修掉了。原因是一个异步函数没有 await，就这么简单。关掉电脑的那一刻，窗外刚好开始下雨，突然觉得这个世界还是挺温柔的。",
		date: "2026-07-06T02:15:00Z",
		mood: "😌",
		tags: ["深夜", "debug", "雨夜"],
	},
	{
		id: 2,
		content:
			"今天把博客主题从头到尾改了一遍，删掉了一堆不属于我的东西。看着干净的代码库，有种断舍离的快感。\n\n留下来的，才是自己的。",
		date: "2026-07-05T16:30:00Z",
		mood: "✨",
		tags: ["博客", "折腾", "断舍离"],
	},
	{
		id: 3,
		content:
			"周末在家看了一整天的番，从早上睁眼到晚上闭眼。不是逃避，只是偶尔需要让大脑完全放空。\n\n治愈系动画真的是精神良药。",
		date: "2026-07-04T22:00:00Z",
		mood: "🍿",
		tags: ["追番", "周末", "治愈"],
	},
	{
		id: 4,
		content:
			"食堂的麻辣烫越来越难吃了，但还是排了二十分钟的队。有时候坚持一件事，不是因为它好，只是因为习惯了。\n\n明天换个窗口试试。",
		date: "2026-07-03T12:45:00Z",
		mood: "🍜",
		tags: ["日常", "食堂", "习惯"],
	},
	{
		id: 5,
		content:
			"写代码的时候突然想到一个绝妙的点子，兴奋地打开编辑器准备大干一场。结果发现是个已知问题，三年前就有人在 GitHub 上提过 issue。\n\n人类的创造力，大概就是在重复发明轮子中消耗殆尽的吧。",
		date: "2026-07-02T20:10:00Z",
		mood: "😂",
		tags: ["编程", "灵感", "GitHub"],
	},
	{
		id: 6,
		content:
			"耳机里单曲循环了一首歌四个小时，直到旋律完全融进了背景噪音里。\n\n有些歌不是用来听的，是用来陪的。",
		date: "2026-07-01T23:30:00Z",
		mood: "🎵",
		tags: ["音乐", "深夜", "独处"],
	},
	{
		id: 7,
		content:
			"傍晚出去跑步，跑到一半开始走，走着走着就坐路边了。\n\n不是累，是夕阳太好看了，不坐下来欣赏一下对不起这个天气。",
		date: "2026-06-30T18:20:00Z",
		location: "家门口的那条路",
		mood: "🌅",
		tags: ["跑步", "夕阳", "放空"],
	},
	{
		id: 8,
		content:
			"帮朋友修了一下午的电脑，最后发现是内存条松了。\n\n朋友说我是天才，我说我只是运气好。但被夸的感觉确实不错，嘿嘿。",
		date: "2026-06-28T15:00:00Z",
		mood: "😎",
		tags: ["修电脑", "朋友", "日常"],
	},
	{
		id: 9,
		content:
			"翻到去年写的一段代码，完全看不懂了。注释写着「这里逻辑很复杂，以后再优化」。\n\n以后的我：你礼貌吗？",
		date: "2026-06-25T14:30:00Z",
		mood: "🤦",
		tags: ["代码", "历史", "优化"],
	},
	{
		id: 10,
		content:
			"凌晨四点醒来，发现手机没电了。充上电打开一看，零条消息。\n\n不知道该庆幸没人找我，还是该难过没人找我。算了，继续睡吧。",
		date: "2026-06-22T04:15:00Z",
		mood: "😴",
		tags: ["深夜", "失眠", "独处"],
	},
];

// 获取日记列表（按时间倒序）
export const getDiaryList = (limit?: number) => {
	const sortedData = [...diaryData].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	if (limit && limit > 0) {
		return sortedData.slice(0, limit);
	}

	return sortedData;
};

// 获取所有标签
export const getAllTags = () => {
	const tags = new Set<string>();
	diaryData.forEach((item) => {
		if (item.tags) {
			item.tags.forEach((tag) => {
				tags.add(tag);
			});
		}
	});
	return Array.from(tags).sort();
};
