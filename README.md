# WWPPL 博客

个人博客。基于 **Astro 6 + Svelte 5** 的 [Firefly](https://github.com/CuteLeaf/Firefly) 主题，
另外自带一套**后台管理系统**（原主题没有）。

- 线上地址：<https://wwppl.dpdns.org>
- 后台入口：<https://wwppl.dpdns.org/admin/>
- 主题自带的中文说明已挪到 [`docs/README.firefly-zh.md`](docs/README.firefly-zh.md)
  （另有 en / ja / ru / zh-TW 几个语言版本），要同步上游时看那一份。

> 这份 README 是给**半年后回来的自己**写的：配置在哪、怎么构建、怎么发布、
> 以及哪些地方一改就会静默坏掉。深水区在 `docs/` 里，这里只给入口和底线。

---

## 一、先看这几份文档

| 想知道什么 | 看哪 |
|---|---|
| 后台的视觉规范、颜色/间距/对比度门槛 | `docs/后台设计系统.md` |
| 后台各个功能是怎么做出来的、踩过什么坑 | `docs/后台改造参考.md` |
| 前台布局的判据与已知坑 | `docs/前台布局体检.md` |
| 部署到 Cloudflare 的步骤 | `docs/Cloudflare部署指南.md` |
| 口令 / 令牌 / 环境变量怎么配、丢了怎么办 | 仓库外 `../后台凭据台账.md`（**不在仓库里，别提交**） |

---

## 二、本地怎么跑

⚠️ **构建必须走 Temp 沙箱，不要在项目目录里直接 build。**
项目目录所在的盘写入极慢（实测 ≈16 次/秒，Temp 盘 ≈4500 次/秒），
整条构建链要写上万个小文件，直接在项目里跑会慢到不可用。

```bash
node dev/sandbox.mjs sync     # 把源码同步进沙箱 %LocalAppData%\Temp\wwppl-dev\WWPPL
node dev/sandbox.mjs build    # 在沙箱里跑完整链条（含字体子集化、搜索索引、OG 图）
```

**预览**（两个端口，用途不同，别搞混）：

| 端口 | 是什么 | `/api/*` |
|---|---|---|
| **4322** | 后台预览（起的是 Worker 那套逻辑） | ✅ 可用 |
| 4399 | 纯静态产物 | ❌ 一律 404 |

→ **凡是带接口的核验、进后台的核验，都用 4322。**

两个容易卡住的点：

- `src/constants/{icons,ui-icons}.ts` 是**构建期生成**的。改了图标相关的东西，
  要在沙箱里跑 `corepack pnpm icons` 重新生成，然后**手动回拷**到项目目录。
- 沙箱里偶发 `CLIENT_ENTRY does not point to an existing file`（vite 的客户端文件被清掉）。
  补装即可，**不要** `rm -rf node_modules`：
  ```bash
  cd "$LOCALAPPDATA/Temp/wwppl-dev/WWPPL" && corepack pnpm install --frozen-lockfile --force
  ```

---

## 三、发布

通道是 **Cloudflare Worker（名字叫 `firefly`）**，不是 Pages。

- `wrangler.jsonc` 里**只写 `main` 和 `assets`**。写 `pages_build_output_dir`、
  或者引入 adapter，CI 会**0 秒失败**。
- 三个变量 `ADMIN_PASSWORD_HASH` / `AUTH_SECRET` / `GITHUB_TOKEN`
  **必须是 Secret，并且 `keep_vars: true`**。
  「本来好好的、推一次就坏」十有八九是这里被覆盖了。
- 建站里**不要加定时任务**（`triggers` / `cron` 一律不加）。

推代码：

```bash
git push
```

**`git push` 撞 502 是常态**（本地到 github.com 的通道不稳）。别改配置、别直连，
隔十几秒重试；几次都不行就走 API 通道：

```bash
WWPPL_GITHUB_TOKEN=xxx python ../verify/2026-09-23/API推送.py
```
（`verify/` 和 `_gen/` 都在**工作区根目录**，不在这个仓库里，所以路径要带 `../`。）

令牌在仓库外 `后台凭据台账.md` 第 6 节的 `GITHUB_TOKEN =` 行。
⚠️ **用环境变量传，不要写进命令行参数**（会进进程列表）。
另外本机的 git 凭据助手**会坏** —— 坏了以后 `git credential fill` 会直接挂住，
于是 `git push` 和上面这个脚本**同时失效**，那时只能靠环境变量这条通道。

判断线上到底有没有生效：查 `check-runs`，**要用完整的 40 位 sha**。

---

## 四、后台（`/admin/`）

十个页面：首页 / 说说 / 笔记 / 文章 / 页面 / 项目 / 图片库 / 站点信息 / 导航菜单 / 站点外观。

- 每个后台页是**独立的 HTML 文档**，不走博客的 `Layout`，所以拿不到前台样式；
  它们统一接在 `src/styles/admin.css` 上。
- 共用逻辑挂在 `window` 上（后台页脚本是 `is:inline`，不能用 import）：
  `WBGitHub` / `WBMedia` / `WBEditor` / `WBUI`。
- 每页 `<html>` 上的 `data-no-swup` **不能删**（删了每次点链接会报 swup 容器不匹配）。
- 导航只有一份来源：`src/components/admin/adminNav.ts`（侧栏和 ⌘K 命令面板共用）。

**可以直接在后台改的 5 份 JSON 数据源**（清单类数据都放这里，别写死进 `src/config/*.ts`
或 `src/data/*.ts` —— 写进去后台就改不了了，这是这个项目反复踩过的一条）：

| 文件 | 管什么 | 后台在哪 |
|---|---|---|
| `src/data/siteInfo.json` | 站点信息 | `/admin/site/` |
| `src/data/navLinks.json` | 导航菜单 | `/admin/nav/` |
| `src/data/appearance.json` | 站点外观（配色、壁纸、页面开关） | `/admin/appearance/` |
| `src/data/notebooks.json` | 笔记本清单（名字 → Gist ID） | `/admin/notebooks/` |
| `src/data/projects.json` | 项目清单（前台 `/projects/`） | `/admin/projects/` |

⚠️ 加一个这样的数据源要**四处一起改**：JSON + 读取器（`.ts` 只留接口与读取）+
后台页 + `adminNav.ts` 加一条（侧栏与 ⌘K 共用那份数据，加一处两处都有）。

---

## 五、内容存在哪

- **文章**：`src/content/posts/<分类>/<slug>.md`，在仓库里。
  页面地址是 `/posts/<分类>/<slug>/`（`/blog/<分类>/<slug>/` 是别名，
  但**没有** `/blog/` 或 `/posts/` 这种列表页 —— 列表走「归档 / 分类 / 标签」）。
- **说说**、**笔记**：**不在仓库里**，各自存在一个 GitHub Gist，前台运行时拉。

⚠️ **Gist 必须和部署令牌同属一个账号**。令牌写不了别人的 Gist：
读得到（secret gist 匿名都能读），一写就 **404**，而且**不报错**——
表现只是「点了保存没反应」。详见 `../后台凭据台账.md` 第 7 节。

⚠️ 文章正文一行已经限到 42 字（`.custom-md`），封面规格统一 **1280×640**。

---

## 六、一改就会静默坏掉的地方（务必先读这段）

这些地方**不报错**，页面还「看着有样式」，只有量了才知道坏了：

1. **`Layout.astro` 顶部那行 `@layer properties, theme, base, components, utilities;` 不能删。**
   删了全站的 margin/padding 一起失效。
2. **`admin.css` 没有分层**，优先级高于 Tailwind 的放后面那一层。
   要盖住工具类的规则必须写在文件末尾的无分层区。
3. **后台页面改内容宽度只能写 `#admin-main > .container { --admin-content-max: … }`**。
   写 `#admin-main { … }` 是死代码（`admin.css` 打包成外链放 `<head>` 最后，
   同特异性后写者胜）。量宽度要用 **1920 视口**，不然会被视口卡住、看起来像没生效。
4. **`uiIcon()` 对不在白名单里的图标名是「静默返回空串」**——按钮渲染出来了，
   里面什么都没有。加图标要改 `scripts/generate-icons.js` 的 `EXPLICIT_ICONS`
   → 沙箱跑 `pnpm icons` → **手动回拷** `src/constants/ui-icons.ts`。
   动图标之后**一定要看一眼截图**。
5. **同一个类在 `admin.css` 里可能有多处定义**，改之前先把它们都 grep 出来，
   否则会「改了但没生效」（只改到低特异性的那条）。
7. **用 `WBGitHub` 的后台页必须引 `<script is:inline src="/js/admin-github.js"></script>`**。
   漏了的表现是「点保存毫无反应、状态栏永远停在『正在读取…』」——
   因为 `WBGitHub.getFile()` 那一刻抛 TypeError，而它在 `.then()` 链里，
   只变成一条**没人接的 rejection**（只有控制台看得到）。
8. **页面 `<html>` 上的 `data-no-swup` 不能删**；后台页的保存按钮 id 必须叫 `save-btn`、
   提示必须是 `dirty-hint`（全局 Ctrl/⌘+S 与悬浮保存条靠这两个 id 找），
   而且**保存按钮在标记里就该带 `disabled`**，读完数据才可能启用。
6. **删一个数据源/组件要顺着「谁引用它」查到底**（import、变量名、配置项都要看）。
   编译器不报错，运行时才炸。

---

## 七、改完必须跑什么

在**工作区根目录**的 `_gen/` 下（不在这个仓库里，是本地工具目录）：

```bash
node _gen/_后台设计缺陷普查.mjs     # 原生控件 / 对比度 / 断行 / 间距 / 焦点 / 空白带
                                    # ⚠️ 一轮跑不完 9 页，分批：
                                    # WW_DQA_ONLY=首页,说说,笔记 node _gen/_后台设计缺陷普查.mjs
node _gen/_后台宽度核验.mjs         # 9 页逐页断言内容宽度 + 查横向溢出
node _gen/_命令面板核验.mjs         # ⌘K 面板
node _gen/_站内内容核验.mjs         # 文章 / 笔记 / 说说 三处内容真的显示出来
node _gen/_后台全页截图.mjs 前|后   # 9 页 × 桌面手机 × 明暗
```

后台的功能回归还有十来支（易用性体检 / 控件体检 / 导航与路由 / 保存条与排序 /
笔记本管理 / 文章页宽度 / 图片库分批 / 批量与拖拽 / 图片库误拖 / 编辑器去重）。
**改了样式也要跑它们** —— 自绘控件和色值改动都可能碰坏点击。

⚠️ 两条环境上的坑：**超过 60~90 秒的命令放后台跑**（前台会被终止）；
**同一个浏览器里连开好几页会累积**，跑多页体检要分批。

---

## 八、内容来源（记一笔，免得以后搞混）

| 来源 | 数量 | 说明 |
|---|---|---|
| 主题自带示例 | 6 篇 | Astro / CSS / TypeScript 那几个技术目录，**不是本站作者写的**（`de55958`） |
| 批量补的文章 | 60 篇 | 2026-09-22 一次性补的、日期回填到 7 月初（`b98dfcd`） |
| 本人真实内容 | 少量 | 之后逐篇写进来 |

真正要做的方向是**把示例内容换成自己的**——空博客比假内容好，
但这件事由作者本人定，不要替谁决定删留。
