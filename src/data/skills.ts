// Skill data configuration file
// Used to manage data for the skill display page

/**
 * ⚠️ 2026-10-13：**数据搬到 `src/data/skills.json`**，这个文件只剩"接口 + 读取"。
 *
 * 为什么：数据写在 `.ts` 里后台就改不了 —— 项目页、相册页、友链页、公告
 * 都踩过同一个坑（一模一样的症状："这页看着有内容，但站长自己改不了"）。
 * 现在后台 `/admin/skills/` 直接读写 `skills.json`，是它唯一的编辑入口。
 *
 * ⚠️ 加字段：改下面的 `Skill` 接口 + `skills.json` 的数据 + 后台页的表单
 * （三处一起改；漏一处不会报错，只会静默不生效）。
 *
 * ⚠️ 图标名（`icon`）是 **iconify** 的名字（如 `logos:python`），而且它是
 * **构建期内联**的：名字不在 `src/data/skillIcons.json` 里，卡片上就是一块空白。
 * 后台保存时会去 iconify 把缺的 SVG 拉下来一起提交；拉不到就不让保存。
 */
export interface Skill {
	id: string;
	name: string;
	description: string;
	icon: string; // Iconify icon name
	category: "frontend" | "backend" | "database" | "tools" | "other";
	level: "beginner" | "intermediate" | "advanced" | "expert";
	experience: {
		years: number;
		months: number;
	};
	projects?: string[]; // Related project IDs
	certifications?: string[];
	color?: string; // Skill card theme color
}

import skillsJson from "./skills.json";

export const skillsData: Skill[] = skillsJson as Skill[];
