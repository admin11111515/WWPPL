// 项目数据：**接口在这里，数据在 projects.json**
//
// 为什么拆成两个文件：JSON 才能被后台读写。
// 原来 `projectsData` 直接写在这个 .ts 里，结果就是「项目页一直是空的、
// 而后台没有任何地方能填」—— 数据源和后台是两套东西，根本填不进去。
// 现在后台 `/admin/projects/` 直接改 projects.json。
//
// ⚠️ **别把数据挪回这个文件里**。要加字段：改下面的接口 + `projects.json` 的数据
//    + 后台页的表单（三处一起改，少一处就会出现「存了但前台不显示」）。
//
// 下面三个 getter（按分类 / 精选 / 全部技术栈）目前没人调用，
// 但它们是这个数据源的自然查询接口，留着不碍事 —— 页面用的是 projectsData。

import projectsJson from "./projects.json";

export interface Project {
	id: string;
	title: string;
	description: string;
	image: string;
	category: "web" | "mobile" | "desktop" | "other";
	techStack: string[];
	status: "completed" | "in-progress" | "planned";
	liveDemo?: string;
	sourceCode?: string;
	visitUrl?: string;
	startDate: string;
	endDate?: string;
	featured?: boolean;
	tags?: string[];
	showImage?: boolean;
}

/**
 * 项目清单。JSON 里字段可能填不全（后台允许只填一部分），
 * 这里补默认值 —— 免得 ProjectCard 拿到 undefined 直接渲染成 "undefined"。
 */
export const projectsData: Project[] = (projectsJson as Project[]).map((p) => ({
	...p,
	techStack: Array.isArray(p.techStack) ? p.techStack : [],
	description: p.description ?? "",
	image: p.image ?? "",
	showImage: p.showImage !== false,
}));

// Get projects by category
export const getProjectsByCategory = (category?: string) => {
	if (!category || category === "all") {
		return projectsData;
	}
	return projectsData.filter((p) => p.category === category);
};

// Get featured projects
export const getFeaturedProjects = () => {
	return projectsData.filter((p) => p.featured);
};

// Get all tech stacks
export const getAllTechStack = () => {
	const techSet = new Set<string>();
	projectsData.forEach((project) => {
		project.techStack.forEach((tech) => {
			techSet.add(tech);
		});
	});
	return Array.from(techSet).sort();
};
