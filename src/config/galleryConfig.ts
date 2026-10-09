import type { GalleryConfig } from "@/types/galleryConfig";

// 相册配置
// 相册：**接口在 types 里，数据在 src/data/gallery.json**
//
// ⚠️ 为什么数据不写在这个文件里：写在 `.ts` 里**后台就改不了** ——
//    这正是这个项目反复踩过的一条（"清单类数据别写进 src/config/*.ts"）。
//    原来 `albums: []` 写在这儿，结果就是相册页一直是空的、而没有任何入口能填。
//    现在后台 `/admin/gallery/` 直接改 `src/data/gallery.json`。
//
// ⚠️ 加字段：改 types/galleryConfig.ts 的 GalleryAlbum + gallery.json 的数据
//    + 后台页的表单（三处一起改）。
// ⚠️ 照片除了在这里列出来，**仍然支持**原主题那套"往 public/gallery/<id>/ 放文件"，
//    两种方式并存，见 utils/gallery-utils.ts 的 getAlbumPhotos。

import galleryJson from "../data/gallery.json";
import type { GalleryConfig } from "../types/galleryConfig";

export const galleryConfig: GalleryConfig = galleryJson as GalleryConfig;
