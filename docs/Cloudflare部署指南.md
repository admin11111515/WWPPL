# Cloudflare 部署指南（Worker 形态）

> 最后更新：2026-09-23
> 适用项目：WWPPL / Firefly 主题个人博客
> 正式域名：`https://wwppl.dpdns.org`

---

## 〇、先记住这一条

**本站线上是「Worker + 静态资源」，不是 Cloudflare Pages 项目。**

判断方法（三种都可靠，任选一种）：

| 方法 | Worker 形态的表现 |
|---|---|
| 看推送后的构建记录名 | `Workers Builds: firefly` |
| 看控制台地址 | `dash.cloudflare.com/<账号>/workers/services/view/firefly/production` |
| 看线上 404 的响应 | 不存在的路径返回 **404 + 空 body**（Workers 静态资源层的默认行为） |

> 2026-09-22 曾误判为 Pages，把 `wrangler.jsonc` 改成 Pages 写法，结果从 8/13 起
> 所有提交都没能上线。这个坑的详细复盘见第二节。

**对应的配置约束**：`wrangler.jsonc` 里只能写 Workers 字段（`main` / `assets`），
**绝不能写 `pages_build_output_dir`**。

---

## 一、线上实际状态核验

### 2026-09-23 实测

| 检查项 | 实测结果 | 结论 |
|---|---|---|
| `https://wwppl.dpdns.org/` | 200，个人化内容 | 前端在线 |
| `https://wwppl.dpdns.org/admin/` | 200 | 后台**前端**在线 |
| `https://wwppl.dpdns.org/api/allPostMeta.json` | 200，返回文章元数据 | Astro **静态产物**正常 |
| `https://wwppl.dpdns.org/api/auth/status` | 404，且 body 长度为 0 | ❌ 后端接口没跑 |
| 不存在的任意路径 | 404 + 空 body | 与上面那个 404 完全同形 → 后端确实没接管 |
| `https://yxx.wwppl.dpdns.org/` | 403「Edge IP Restricted」 | ❌ 子域没指向本项目 |

**两个问题**：① 部署链路断了，线上一直是 8/13 的旧版本；② `functions/` 那批后端接口从来没生效过。

---

## 二、根因复盘（已定位并本地复现）

### 2.1 为什么部署断了一个多月

`2c4a146`（2026-08-13，最后一次成功部署）里的 `wrangler.jsonc` 是 Workers 写法：

```jsonc
{
  "name": "firefly",
  "assets": { "directory": "./dist" }
}
```

9/22 把它改成了 Pages 写法（加 `pages_build_output_dir`、删 `assets`）。
但 Cloudflare 上这个项目是 **Worker**，Worker 读不懂 Pages 字段，`wrangler deploy` 在
**配置阶段**就直接退出 —— 表现为「推送后 0 秒失败」。

本地用两条命令就能复现，不需要猜：

```bash
# 用 Pages 写法的旧配置
npx wrangler deploy --dry-run
```

```
▲ [WARNING] It seems that you have run `wrangler deploy` on a Pages project,
  `wrangler pages deploy` should be used instead. Proceeding will likely produce unwanted results.

? Are you sure that you want to proceed?
🤖 Using fallback value in non-interactive context: yes

X [ERROR] Missing entry-point to Worker script or to assets directory
退出码: 1
```

CI 是非交互环境，那句确认会被自动回成 `yes`，然后立刻报错退出 —— 于是构建记录上
只留下「开始时间和结束时间同一秒」的 0 秒失败。构建日志又只在 Cloudflare 控制台可见
（GitHub 侧只回写一个 Build ID），所以从外部很难看出问题在哪。

### 2.2 为什么后端接口从来没生效

`functions/` 目录是 **Pages Functions** 的约定。Worker 形态不会去读它，
所以 `/api/*` 全部落到静态资源层，返回空 404。

也就是说：后台的登录、GitHub 读写代理、贡献数据接口，**在线上一直是死的**。
前端页面能打开，但登录不了。

---

## 三、本次修复（2026-09-23）

| # | 文件 | 改动 | 目的 |
|---|---|---|---|
| 1 | `wrangler.jsonc` | 改回 Workers 写法（`assets.directory`），并补齐注释说明判别依据 | 恢复部署链路（核心） |
| 2 | `wrangler.jsonc` | 新增 `main: "worker/index.js"` 与 `assets.binding: "ASSETS"` | 让 Worker 能接管 `/api/*` |
| 3 | `worker/index.js` | **新增**：把 `/api/*` 交给 `functions/api/` 里已有的处理函数，其余请求交回资源层 | 后端真正生效，且不重复写一份逻辑 |
| 4 | `public/_routes.json` | 删除 | 这是 Pages 专用文件，Worker 形态下完全无用 |
| 5 | `functions/` | 保留，作为 Worker 的处理函数库 | 原有代码质量不差（HMAC 签名会话、HttpOnly Cookie、令牌只在服务端），没必要重写 |

### 关于 `functions/` 与原 Pages 约定的关系

`functions/api/*.js` 里的函数入参形状就是 `{ request, env, params, data, next }`，
与 Pages Functions 一致。`worker/index.js` 只做三件事：

1. 精确匹配 `/api/auth/{login,logout,status}`、`/api/contributions` → 直接调用对应处理函数；
2. `/api/github` 前缀 → 先过登录中间件（`_middleware.js`），再转发给 GitHub 代理；
3. 其余请求 → `env.ASSETS.fetch()` 交回静态资源层。

> ⚠️ **不能笼统地拦 `/api/*`**：`/api/allPostMeta.json` 是构建出来的**静态**文件
> （`dist/api/allPostMeta.json`，被侧栏日历和推荐阅读用到）。拦下来会把它变成 404。
> `worker/index.js` 的接口表只列精确路径，正是为了避开这个坑；
> `verify/2026-09-23/worker入口核验.mjs` 里有对应的回归断言。

### 附带发现

- `astro.config.mjs` **不启用** Cloudflare adapter（`CF_WORKERS` 开关保留但默认关闭）。
  产物是纯静态 `dist/`，换任何静态托管都能跑 —— 这个约定继续有效。
- `.cnb.yml`（CNB → 腾讯 EdgeOne，末尾会把仓库同步到主题作者仓库 `Seasir-Hyde/Firefly-hyde`）已整个移除。
- `.github/workflows/deploy.yml`（GitHub Pages）已改为仅手动触发。

---

## 四、在 Cloudflare 上的操作步骤

### 4.1 确认 Worker 连的是 Git 仓库

控制台 → **Workers & Pages** → 选 `firefly` → **Settings → Builds**，确认：

| 配置项 | 应填 |
|---|---|
| Git repository | 本仓库 |
| Production branch | `main` |
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | 仓库根（`WWPPL/` 的上一级，即仓库根） |
| 环境变量 | `NODE_VERSION` = `22`（仓库里也有 `.nvmrc`，内容为 `22`） |

> Workers 的构建配置里**没有**「输出目录」这一项 —— 产物目录由 `wrangler.jsonc` 里的
> `assets.directory` 决定（当前为 `./dist`）。这正是 Worker 与 Pages 的一个明显区别。

### 4.2 配置后端环境变量（必须，否则接口返回 503）

**Worker `firefly` → Settings → Variables and Secrets**，添加：

| 变量名 | 说明 | 必填 |
|---|---|---|
| `ADMIN_PASSWORD_HASH` | 后台登录密码的 **SHA-256 十六进制小写**。密码只存这一处，前端不再留哈希副本 | ✅ |
| `AUTH_SECRET` | 任意长随机串，用于给会话 Cookie 做 HMAC 签名 | ✅ 建议 |
| `GITHUB_TOKEN` | GitHub **Fine-grained PAT**，权限：目标仓库的 `Contents: Read and write`，用于后台通过 `/api/github/*` 读写文章 | ✅（后台发文需要） |
| `GITHUB_USERNAME` | 可选，默认 `admin11111515` | 否 |
| `GITHUB_REPO` | 可选，默认 `WWPPL` | 否 |

生成 SHA-256：

```bash
# Node（Windows Git Bash / 任意终端）
node -e "const c=require('crypto');console.log(c.createHash('sha256').update('你的密码','utf8').digest('hex'))"
```

```powershell
# PowerShell
$s=[System.Text.Encoding]::UTF8.GetBytes('你的密码')
([System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash($s))).Replace('-','').ToLower()
```

生成 `AUTH_SECRET`：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ 变量改动后需要**重新部署**才生效：Worker → Deployments → 对最新版本选 Retry deployment，
> 或者推一个新提交。

### 4.3 修 `yxx` 子域

`yxx.wwppl.dpdns.org` 报 `Edge IP Restricted`，说明它的 DNS 记录没指向这个 Worker：

- **想保留**：Worker `firefly` → **Settings → Domains & Routes → Add → Custom domain**，
  填 `yxx.wwppl.dpdns.org`，让 Cloudflare 自己建 CNAME（不要手写 A/CNAME 记录）。
- **不需要**：删掉该子域的 DNS 记录，统一用 `wwppl.dpdns.org`。

### 4.4 用命令行部署（不用 Git 集成时）

```bash
cd WWPPL
pnpm build
npx wrangler deploy
```

> ⚠️ **必须在 `WWPPL/` 下执行** —— `wrangler` 从当前工作目录读 `wrangler.jsonc`，
> 在上级目录执行会读不到配置。

推送前建议先本地校验配置与打包（不会真的部署）：

```bash
cd WWPPL
npx wrangler deploy --dry-run
```

预期看到 `Read N files from the assets directory .../dist`、`env.ASSETS` 绑定，
最后是 `--dry-run: exiting now.`，退出码 0。

---

## 五、部署后验证

```bash
node -e "
const B='https://wwppl.dpdns.org';
(async()=>{
  const s=await fetch(B+'/api/auth/status');
  console.log('/api/auth/status =>', s.status, (await s.text()).slice(0,120));
  const l=await fetch(B+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  console.log('/api/auth/login  =>', l.status, (await l.text()).slice(0,120));
  const h=await fetch(B+'/_headers');
  console.log('/_headers         =>', h.status);
})();
"
```

预期结果：

| 路径 | 修复前 | 修复后应为 |
|---|---|---|
| `GET /api/auth/status` | 404 空 body | `200` + `{"authed":false}` |
| `POST /api/auth/login`（空 body） | 404 | `401`（密码错误）或 `400`（格式错误） |
| `GET /_headers` | 404 | `200` |

只要 `status` 返回的是 JSON、而不是空 404，就说明 **Worker 入口已生效**。

### 构建失败时去哪看日志

Cloudflare 的构建日志**只在控制台**，GitHub 侧只回写一个 Build ID：

```
控制台 → Workers & Pages → firefly → Deployments → 点开失败的那次
```

或者直接用 GitHub 检查记录里的链接：提交 → Checks → `Workers Builds: firefly` → Details。

> 注意：**Cloudflare 只对推送后的 HEAD 触发一次构建**。一次推多个提交，中间那些提交不会
> 各自跑一次；要重跑必须推一个**新提交**或到控制台 Retry。

---

## 六、部署通道约定（重要）

| 通道 | 状态 | 用途 |
|---|---|---|
| **Cloudflare Worker `firefly`** | ✅ **唯一正式通道** | 静态站（`dist/`）+ `worker/index.js` 处理 `/api/*` |
| GitHub Pages（`deploy.yml`） | ⏸ 已改为仅手动 | 备用预览，不带后端 |
| CNB → EdgeOne Pages（`.cnb.yml`） | ❌ 已整个移除 | 只传静态、不支持后端，且会同步到主题作者仓库 |

**结论：只认 Cloudflare Worker 一条路。** 同时开多条会导致「线上到底是哪个版本」失控。

---

## 七、这张底座之上能做什么（功能路线）

### 内容与写作
- 后台在线写文章 / 改文章（走 `/api/github` 写回仓库，接口已通）
- 说说、笔记从 Gist 迁到 **Cloudflare D1**（真正的数据库，有并发写保护和查询能力）
- 图片上传到 **Cloudflare R2**（免费额度大，比图床稳）

### 阅读体验
- 中文排版精修（标点挤压、行高、段间距）
- PWA 离线可读（Service Worker 已配，静态站最擅长）
- 全文搜索已用 Pagefind（构建脚本里已有），可加索引预热

### SEO 与分发
- 自动生成 OG 分享图（`siteConfig.generateOgImages` 当前关闭）
- 结构化数据、RSS（已有 `@astrojs/rss`）、搜索引擎索引推送

### 差异化个人页
- 此刻页 / 数据看板 / 数字花园 / 自动年报 / 足迹地图
- 评论从 giscus 换成自建（Waline / Twikoo），数据在自己手里

### 安全（按你的要求，放最后）
- 登录改为 **GitHub OAuth** 或 **Passkey（WebAuthn）**
- 密码校验升级为加盐慢哈希（PBKDF2 / scrypt）

---

## 八、本地核验脚本

> 下面这些脚本放在**仓库外面的工作区**（`C:\project\ppl_blog\verify\`），不在本仓库里，
> 所以路径是相对工作区根写的，不是相对仓库根。

| 脚本 | 用途 |
|---|---|
| `verify/2026-09-23/worker入口核验.mjs` | 把 `worker/index.js` 的 fetch 直接跑起来，逐条断言接口路由、登录中间件、静态资源不被误伤、404 回落等 23 项（默认读沙箱产物，也可传入 dist 路径） |
| `verify/2026-09-23/站点可达性核验.cjs` | 线上可达性巡检 |
| `verify/2026-09-21/test-pages-functions.mjs` | 直接调 `functions/` 里的处理函数（不起服务、不联网） |

推送前最低限度要跑的两个检查：

```bash
cd WWPPL
node dev/sandbox.mjs sync && node dev/sandbox.mjs build   # 完整构建链路
npx wrangler deploy --dry-run                             # 配置与打包
```
