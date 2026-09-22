import { siteConfig } from "../config/siteConfig";
import type { ImageFormat } from "../types/config";
import { GENERATED_COVER_MARKER, isGeneratedCover } from "./generated-cover";

/**
 * 处理文章封面
 *
 * - 封面按文章本地生成时，返回 GENERATED_COVER_MARKER，由渲染层画出来
 * - 其余情况原样返回 frontmatter 里的图片路径
 */
export function processCoverImageSync(image: string | undefined): string {
	if (!image || image === "") {
		return "";
	}

	if (isGeneratedCover(image)) {
		return GENERATED_COVER_MARKER;
	}

	return image;
}

/**
 * 获取图片优化格式配置
 */
export function getImageFormats(): ImageFormat[] {
	const formatConfig = siteConfig.imageOptimization?.formats ?? "both";
	switch (formatConfig) {
		case "avif":
			return ["avif"];
		case "webp":
			return ["webp"];
		default:
			return ["avif", "webp"];
	}
}

/**
 * 获取图片优化质量配置
 */
export function getImageQuality(): number {
	return siteConfig.imageOptimization?.quality ?? 80;
}

/**
 * 获取图片回退格式
 */
export function getFallbackFormat(): "avif" | "webp" {
	const formatConfig = siteConfig.imageOptimization?.formats ?? "both";
	return formatConfig === "avif" ? "avif" : "webp";
}

/**
 * 检查是否需要为图片添加 referrerpolicy="no-referrer" 以解决防盗链 403 问题
 */
export function shouldAddNoReferrer(urlStr: string): boolean {
	if (!urlStr.startsWith("http")) return false;
	const domains = siteConfig.imageOptimization?.noReferrerDomains || [];
	if (domains.length === 0) return false;
	try {
		const hostname = new URL(urlStr).hostname;
		return domains.some((pattern) => {
			const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
			return new RegExp(`^${regexPattern}$`).test(hostname);
		});
	} catch {
		return false;
	}
}
