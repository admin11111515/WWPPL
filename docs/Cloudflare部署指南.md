# Cloudflare Pages 部署指南

> 最后更新：2026-09-21
> 适用项目：WWPPL / Firefly 主题个人博客
> 正式域名：`https://wwppl.dpdns.org`

---

## 一、线上实际状态核验（2026-09-21 实测）

| 检查项 | 实测结果 | 结论 |
|---|---|---|
| `https://wwppl.dpdns.org/` | 200，标题「WWPPL Blog - 记录生活，也写一点代码」，带自定义 wallpaper 配置 | 前端已上线，且是**个人化内容**，不是主题 demo |
| `https://wwppl.dpdns.org/admin/` | 200，18898 字节，「后台管理」页 | 后台**前端**已上线 |
| `https://wwppl.dpdns.org/api/allPostMeta.json` | 200，返回文章元数据 | Astro **静态产物**的接口路由正常 |
| `https://wwppl.dpdns.org/api/auth/status` | **404**（空 body，Cloudflare 静态 404） | ❌ **后端没跑起来** |
| `https://wwppl.dpdns.org/api/auth/login` | **404** | ❌ 同上 |
| `https://yxx.wwppl.dpdns.org/` | **403 「Edge IP Restricted｜Cloudflare」** | ❌ 这个子域解析配错，请求根本没到项目 |

**一句话总结**：前端全好，静态资源正常；**只有 `functions/` 里的后端没有被部署**，所以后台登录不上。

---

## 二、根因（已定位）

仓库根目录的 `wrangler.jsonc` 原本是 **Workers 写法**：

```jsonc
{
  "name": "firefly",
  "assets": { "directory": "./dist" }   // ← Workers 的静态资源声明
}
```

问题在于：**Cloudflare Pages 检测到仓库里有 wrangler 配置文件时，会以它为准**。而这份配置里没有 `pages_build_output_dir` 字段 —— 它不是一份 Pages 配置。结果是 Cloudflare 不把仓库根下的 `functions/` 当作 Pages Functions 来部署，`/api/*` 自然全部落到静态 404。

这不是代码问题，**后端代码是完整且写得不差的**（HMAC 签名会话、HttpOnly Cookie、GitHub token 只在服务端）。

### 附带的两个干扰项（模板遗留，已标注）

1. `.github/workflows/deploy.yml` —— 部署到 **GitHub Pages**（纯静态，天然不支持 functions）。
   已改为**仅手动触发**，不再自动跑，避免和 Cloudflare 抢部署。
2. `.cnb.yml` —— 走 CNB 流水线里的 `npx edgeone pages deploy ./dist`（腾讯 **EdgeOne** Pages，只传静态文件）；
   末尾还有一步「同步仓库到 github」，目标是 `Seasir-Hyde/Firefly-hyde` —— **那是主题作者的仓库，不是你的**。
   **已整个移除该文件**（备份在 `C:\project\ppl_blog\.backup\`），CNB 不再触发，代码不会被推到别人仓库。

---

## 三、本次已做的修复

| # | 文件 | 改动 | 目的 |
|---|---|---|---|
| 1 | `wrangler.jsonc` | 由 Workers 写法改为 **Pages 配置**，增加 `pages_build_output_dir: "./dist"`，去掉 `assets` | **核心修复**：让 Cloudflare 识别这是 Pages 项目，从而部署 `functions/` |
| 2 | `public/_routes.json` | 新增，声明 `include: ["/api/*"]` | 明确边界：只有 `/api/*` 走 Functions，其余走静态资源（更快，也更稳） |
| 3 | `.github/workflows/deploy.yml` | 改为仅 `workflow_dispatch` | 避免 GitHub Pages 与 Cloudflare 双通道冲突 |
| 4 | `.cnb.yml` | 加部署通道警告注释 | 提示 EdgeOne 通道不支持 functions |
| 5 | `astro.config.mjs` | 回滚为原样（**不启用** Cloudflare adapter） | 保持纯静态输出，产物 `dist/` 任何静态托管都能跑 |
| 6 | `package.json` | 移除临时的 `pnpm.overrides` | 恢复与 `pnpm-lock.yaml` 一致，保证 CI 可复现 |
| 7 | `src/pages/api/{auth,github}`、`src/lib/server` | 删除 | 这是上一轮引入的 adapter 方案，与 `functions/` 重复定义同一批路由，必须二选一 |

> **为什么不用 Astro Cloudflare adapter？**
> 项目已有 `functions/` 且写得完整，选它零成本：不需要额外依赖、不需要改构建配置、不影响现有静态部署路径。
> adapter 方案会把产物变成 Workerd 结构（`dist/_worker.js`），一旦换平台（EdgeOne / GitHub Pages / 任意静态 CDN）就跑不了 —— 这正是你担心的「方案不适用」。

---

## 四、在 Cloudflare 上的操作步骤

### 4.1 确认 Pages 项目连的是 Git 仓库（推荐，最省心）

Cloudflare 控制台 → **Workers & Pages** → 选你的 Pages 项目 → **Settings → Builds & deployments**，确认：

| 配置项 | 应填 |
|---|---|
| Production branch | 你的默认分支（`main` 或 `master`，以仓库实际为准） |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | 仓库根（**留空**，因为 `functions/` 和 `dist/` 都在仓库根） |
| Environment variables | `NODE_VERSION` = `22`；`PNPM_VERSION` = `9.14.4` |

> 因为仓库里现在有了正确的 `wrangler.jsonc`，Pages 会以 `pages_build_output_dir` 为准，输出目录会自动对齐到 `dist`。

### 4.2 配置后端环境变量（必须，否则登录 503）

**Pages 项目 → Settings → Variables and Secrets**，添加：

| 变量名 | 说明 | 必填 |
|---|---|---|
| `ADMIN_PASSWORD_HASH` | 后台登录密码的 **SHA-256 十六进制小写**。密码只存这一处，前端配置里不再留哈希副本 | ✅ |
| `AUTH_SECRET` | 任意长随机串，用于给会话 Cookie 做 HMAC 签名 | ✅ 建议 |
| `GITHUB_TOKEN` | GitHub **Fine-grained PAT**，权限：目标仓库的 `Contents: Read and write`，用于后台通过 `/api/github/*` 读写文章 | ✅（后台发文需要） |

生成 SHA-256 的命令（任选其一）：

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

> ⚠️ 环境变量改动后需要 **重新部署** 才生效。

### 4.3 修 `yxx` 子域

`yxx.wwppl.dpdns.org` 报 `Edge IP Restricted`，说明它的 DNS 记录没指向 Pages 项目。两种做法：

- **想保留这个子域**：Cloudflare 控制台 → Pages 项目 → **Custom domains** → 添加 `yxx.wwppl.dpdns.org`，让 Cloudflare 自己建 CNAME（不要手写 A/CNAME 记录）。
- **不需要**：删掉该子域的 DNS 记录，统一用 `wwppl.dpdns.org`。

### 4.4 用命令行部署（可选，不用 Git 集成时）

在项目根目录执行 —— **必须在 `WWPPL/` 下执行**，因为 `wrangler pages deploy` 从当前工作目录读 `functions/`：

```bash
cd WWPPL
pnpm build
npx wrangler pages deploy dist --project-name firefly
```

> 常见坑：在 `WWPPL/` 的**上级目录**执行会找不到 `functions/`，后端又变 404。

---

## 五、部署后验证

```bash
node -e "
const B='https://wwppl.dpdns.org';
(async()=>{
  for (const p of ['/api/auth/status','/api/auth/login']) {
    const r=await fetch(B+p,{method:p.includes('login')?'POST':'GET',headers:{'Content-Type':'application/json'},body:p.includes('login')?'{}':undefined});
    console.log(p,'=>',r.status, (await r.text()).slice(0,120));
  }
})();
"
```

预期结果：

| 路径 | 修复前 | 修复后应为 |
|---|---|---|
| `GET /api/auth/status` | 404 空 body | `200` + `{"authed":false}` |
| `POST /api/auth/login`（空 body） | 404 | `200 {"ok":false,"error":"密码错误"}` 或 `400` |

只要 `status` 返回 JSON（而不是空 404），就说明 **Pages Functions 已生效**。

---

## 六、部署通道约定（重要）

| 通道 | 状态 | 用途 |
|---|---|---|
| **Cloudflare Pages** | ✅ **正式通道** | 静态站 + `functions/` 后端 |
| GitHub Pages（`deploy.yml`） | ⏸ 已改为仅手动 | 备用预览，不支持后端 |
| CNB → EdgeOne Pages（`.cnb.yml`） | ❌ **已整个移除** | 只传静态、不支持后端，且会同步到主题作者仓库 |

**结论：以后只认 Cloudflare Pages 一条路，不要同时开多条，否则「到底哪个是线上版本」会失控。**

---

## 七、这张底座之上能做什么（功能路线，均为 Pages 原生能力）

底座通了以后，下面这些都是**不需要换平台**就能加的：

### 内容与写作
- 后台在线写文章 / 改文章（走 `/api/github` 写回仓库，已有接口）
- 说说、笔记从 Gist 迁到 **Cloudflare D1**（真正的数据库，有并发写保护和查询能力）
- 图片上传到 **Cloudflare R2**（免费额度大，比图床稳）

### 阅读体验
- 中文排版精修（标点挤压、行高、段间距）
- PWA 离线可读（Service Worker，静态站点最擅长）
- 全文搜索已经在用 Pagefind（构建脚本里已有），可加索引预热

### SEO 与分发
- 自动生成 OG 分享图（`siteConfig` 里有 `generateOgImages` 开关，当前关闭）
- 结构化数据、RSS（已有 `@astrojs/rss`）、搜索引擎索引推送

### 差异化个人页
- 此刻页 / 数据看板 / 数字花园 / 自动年报 / 足迹地图
- 评论从 giscus 换成自建（Waline / Twikoo），数据在自己手里

### 安全（按你的要求，放最后）
- 登录改为 **GitHub OAuth** 或 **Passkey（WebAuthn）**
- 密码校验升级为加盐慢哈希（PBKDF2 / scrypt），并清掉仓库里那份明文哈希副本
