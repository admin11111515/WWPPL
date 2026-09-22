import type { FontConfig } from "../types/fontConfig";

/**
 * 字体子集化的补充字符集。
 *
 * 子集化只收录「构建时页面上出现过的字符」，评论、昵称这类运行时才产生的内容不在其中，
 * 漏掉的字符会悄悄回退到系统字体，看起来就像字体没生效。这里额外补上三类字符：
 * 拉丁字母与数字、中英文标点、以及高频汉字。
 *
 * 补充的代价很小：加上这一批字符后，子集从 295 KB 变成 343 KB，多出约 48 KB，
 * 换来的是动态内容也能用上同一款字体。
 */
const subsetExtraChars = [
	// 拉丁字母、数字、半角符号
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
	"`~!@#$%^&*()-_=+[]{}\\|;:'\",.<>/? ",
	// 中英文标点与常用符号
	"←↑→↓★☆♥♡✓✗✦✧※§¶†‡•…–—‘’“”「」『』【】（）《》〈〉、。，！？：；·─│┌┐└┘├┤┬┴┼",
	// 高频汉字，覆盖绝大多数评论与短文本
	"的一是了我不人在他有这个上们来到时大地为子中你说生国年着就那和要她出也得里后自以会家可下而过天去能对小多然于心学么之都好看起发当没成只如事把还用第样道想作种开美总从无情己面最女但现前些所同日手又行意动方期它头经长儿回位分爱老因很给名法间斯知世什两次使身者被高已亲其进此话常与活正感见明问力理尔点文几定本公特做外孩相西果走将月十实向声车全信重三机工物气每并别真打太新比才便夫再书部水像眼等体却加电主界门利海受听表德少克代员许先口由死安写性马光白或住难望教命花结乐色更拉东神记处让母父应直字场平报友关放至张认接告入笑内英军候民岁往何度山觉路带万男边风解叫任金快原吃妈变通师立象数四失满战远格士音轻目条呢病始达深完今提求清王化空业思切怎非找片罗钱吗语元喜曾离飞科言干流欢约各即指合反题必该论交终林请医晚制球决传画保读运及则房早院量苦火布品近坐产答星精视五连司巴奇管类未朋且婚台夜青北队久乎越观落尽形影红爸百令周吧识步希亚术留市半热送兴造谈容极随演收首根讲整式取照办强石古华拿计您装似足双妻转诉米称丽客南领节衣站黑刻统断福城故历惊脸选包紧争另建维绝树系伤示愿持千史谁准联妇纪基买志静阿诗独复痛消社算义竟确酒需单治卡幸兰念举仅钟怕共毛句息功官待究跟穿室易游程号居考突皮哪费倒价图具刚脑永歌响商礼细专黄块脚味灵改据般破引食仍存众注笔甚某沉血备习校默务土微娘须试怀料调广苏显赛查密议底列富梦错座参八除跑亮假印设线温虽掉京初养香停际致阳纸李纳验助激够严证帝饭忘趣支春集丈木研班普导顿睡展跳获艺六波察群皇段急庭创区奥器谢弟店否害草排背止组州朝封睛板角况曲馆育忙质河续哥呼若推境遇雨标姐充围案伦护冷警贝著雪索剧啊船险烟依斗值帮汉慢佛肯闻唱沙局伯族低玩资屋击速顾泪洲团圣旁堂兵七露园牛哭旅街劳型烈姑陈莫鱼异抱宝权鲁简态级票怪寻杀律胜份汽右洋范床舞秘午登楼贵吸责例追较职属渐左录丝牙党继托赶章智冲叶胡吉卖坚喝肉遗救修松临藏担戏善卫药悲敢靠伊村戴词森耳差短祖云规窗散迷油旧适乡架恩投弹铁博雷府压超负勒杂醒洗采毫嘴毕九冰既状乱景席珍童顶派素脱农疑练野按犯拍征坏骨余承置臂彩灯巨琴免环姆暗换技翻束增忍餐洛塞缺忆判欧层付阵玛批岛项狗休懂武革良恶恋委拥娜妙探呀营退摇弄桌熟诺宣银势奖宫忽套康供优课鸟喊降夏困刘罪亡鞋健模败伴守挥鲜财孤枪禁恐伙杰迹妹遍盖副坦牌江顺秋萨菜划授归浪凡预奶雄升编典袋莱含盛济蒙棋端腿招释介烧误",
].join("");

// 字体配置
export const fontConfig: FontConfig = {
	// 是否启用自定义字体功能
	enable: true,
	// 是否预加载字体文件
	preload: true,
	// 当前选择的字体，支持多个字体组合
	selected: ["Chikushi-A-maru"],

	// 各区域独立字体设置（填写下方 fonts 中的字体 ID，留空则使用全局 selected 字体）
	// 横幅标题字体
	bannerTitleFont: "Chikushi-A-maru",
	// 横幅副标题字体
	bannerSubtitleFont: "Chikushi-A-maru",
	// 导航栏标题字体
	navbarTitleFont: "Chikushi-A-maru",

	// 字体列表
	// 推荐使用可靠的 CDN 服务商提供的字体链接，它天然做了按需分片加载，且性能较好
	//
	// 也可以使用本地字体文件，但必须开启字体子集化处理（subset: true），
	// 否则完整字体会原样进入产物，本站这款字体未子集化时有 9.3 MB，
	// 而且它被全局预加载，等于每次首屏都要多下 9.3 MB。
	fonts: {
		// 本地字体 - Tsukushi A Rd Gothic Bold
		"Chikushi-A-maru": {
			id: "Chikushi-a-maru",
			name: "筑紫A丸",
			src: "/fonts/Chikushi-A-maru.woff2",
			family: "Chikushi A Rd Gothic",
			weight: 700,
			display: "swap" as const,
			// 开启子集化：构建后扫描页面用到的字符，只保留这些字形
			// 实测 9544 KB -> 343 KB（省 96.4%），同时补充字符让评论等动态内容也能正常显示
			subset: true,
			subsetExtraChars,
		},

		// 系统字体
		system: {
			id: "system",
			name: "系统字体",
			src: "", // 系统字体无需 src
			family:
				"system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
		},

		// Google Fonts - Zen Maru Gothic
		"zen-maru-gothic": {
			id: "zen-maru-gothic",
			name: "Zen Maru Gothic",
			src: "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@300;400;500;700;900&display=swap",
			family: "Zen Maru Gothic",
			display: "swap" as const,
		},

		// Google Fonts - Inter
		inter: {
			id: "inter",
			name: "Inter",
			src: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
			family: "Inter",
			display: "swap" as const,
		},

		// 小米字体 - MiSans Normal
		"misans-normal": {
			id: "misans-normal",
			name: "MiSans Normal",
			src: "https://unpkg.com/misans@4.1.0/lib/Normal/MiSans-Normal.min.css",
			family: "MiSans",
			weight: 400,
			display: "swap" as const,
		},

		// 小米字体 - MiSans Regular
		"misans-regular": {
			id: "misans-regular",
			name: "MiSans Regular",
			src: "https://unpkg.com/misans@4.1.0/lib/Normal/MiSans-Regular.min.css",
			family: "MiSans",
			weight: 500,
			display: "swap" as const,
		},

		// 小米字体 - MiSans Semibold
		"misans-semibold": {
			id: "misans-semibold",
			name: "MiSans Semibold",
			src: "https://unpkg.com/misans@4.1.0/lib/Normal/MiSans-Semibold.min.css",
			family: "MiSans",
			weight: 600,
			display: "swap" as const,
		},

		// ========== 本地字体示例（启用子集化） ==========
		// 使用步骤：
		// 1. 将 TTF/OTF/WOFF2 字体文件放在 public/fonts/ 目录下
		// 2. 取消下方注释并填写正确的字体信息
		// 3. 运行 pnpm build，脚本会自动扫描页面字符并生成轻量 woff2 子集
		// 注意：子集化仅包含构建时页面中出现的字符，评论等动态加载内容可能字体缺失
		//       可通过 subsetExtraChars 补充额外字符来缓解
		//
		// "misans-test": {
		// 	id: "misans-test",
		// 	name: "MiSans Test",
		// 	src: "/fonts/MiSans-Test.woff2",
		// 	family: "MiSans",
		// 	weight: 400,
		// 	display: "swap" as const,
		// 	subset: true, // 启用子集化
		// 	subsetExtraChars: "",
		// },
	},

	// 全局字体回退
	fallback: [
		"system-ui",
		"-apple-system",
		"BlinkMacSystemFont",
		"Segoe UI",
		"Roboto",
		"sans-serif",
	],
};
