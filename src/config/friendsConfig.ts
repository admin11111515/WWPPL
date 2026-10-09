import type { FriendLink, FriendsPageConfig } from "../types/friendsConfig";

// 可以在src/content/spec/friends.md中编写友链页面下方的自定义内容

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "友链墙",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 是否显示底部自定义内容（friends.mdx 中的内容）
	showCustomContent: true,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 是否开启随机排序配置，如果开启，就会忽略权重，构建时进行一次随机排序
	randomizeSort: false,
};

// 友链：**接口在 types 里，数据在 src/data/friends.json**
//
// ⚠️ 为什么数据不写在这个文件里：写在 `.ts` 里**后台就改不了** ——
//    2026-10-09 的核查发现友链墙一直是空的，根子就是这个（第三个同类的坑：
//    项目页、相册页、友链页全是"数据写在 .ts 里 + 后台没入口"）。
//    现在后台 `/admin/friends/` 直接改 `src/data/friends.json`。
//
// ⚠️ 加字段：改 types/friendsConfig.ts 的 FriendLink + friends.json 的数据
//    + 后台页的表单（三处一起改）。
import friendsJson from "../data/friends.json";

// 友链配置
export const friendsConfig: FriendLink[] = friendsJson as FriendLink[];

// 获取启用的友链并进行排序
export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);

	if (friendsPageConfig.randomizeSort) {
		return friends.sort(() => Math.random() - 0.5);
	}

	return friends.sort((a, b) => b.weight - a.weight);
};
