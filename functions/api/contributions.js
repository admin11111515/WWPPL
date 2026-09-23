// GitHub 提交动态：近一年贡献热力图 + 博客仓库最近提交。
//
// 这是公开接口 —— 贡献数据在 GitHub 上本来就是公开的，任何访客都能看；
// 令牌只留在服务端，浏览器拿到的只是画图要用的数字。
// 不放在 /api/github 下面，那样会被登录中间件拦住。
import { json } from "./_lib/session.js";

// 不想依赖环境变量时可以直接改这两个默认值
const DEFAULT_USER = "admin11111515";
const DEFAULT_REPO = "WWPPL";

export async function onRequest(context) {
	const { env } = context;
	if (!env.GITHUB_TOKEN) {
		return json({ error: "服务端未配置 GITHUB_TOKEN" }, 503);
	}
	const username = env.GITHUB_USERNAME || DEFAULT_USER;
	const repo = env.GITHUB_REPO || DEFAULT_REPO;

	const headers = {
		Authorization: `Bearer ${env.GITHUB_TOKEN}`,
		Accept: "application/vnd.github+json",
		"User-Agent": "ppl-blog",
		"X-GitHub-Api-Version": "2022-11-28",
	};

	// 贡献日历只在 GraphQL 接口上有，取近一年
	const to = new Date();
	const from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);
	const query = `
		query($login: String!, $from: DateTime!, $to: DateTime!) {
			user(login: $login) {
				contributionsCollection(from: $from, to: $to) {
					contributionCalendar {
						totalContributions
						weeks {
							contributionDays {
								date
								contributionCount
							}
						}
					}
				}
			}
		}`;

	let calendar;
	try {
		const gqlRes = await fetch("https://api.github.com/graphql", {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				query,
				variables: { login: username, from: from.toISOString(), to: to.toISOString() },
			}),
		});
		const gql = await gqlRes.json();
		if (gql.errors || !gql.data?.user) {
			throw new Error(gql.errors?.[0]?.message || "GitHub 返回为空");
		}
		calendar = gql.data.user.contributionsCollection?.contributionCalendar;
	} catch (e) {
		return json({ error: "贡献数据获取失败：" + (e.message || e) }, 502);
	}
	if (!calendar || !Array.isArray(calendar.weeks)) {
		return json({ error: "贡献数据为空" }, 502);
	}

	// 最近提交：博客仓库自己的提交记录，展示"自动同步"这条链路的成果。
	// 它失败不该连累热力图，所以单独兜住。
	let commits = [];
	try {
		const r = await fetch(
			`https://api.github.com/repos/${username}/${repo}/commits?per_page=5`,
			{ headers },
		);
		if (r.ok) {
			commits = (await r.json()).map((c) => ({
				sha: c.sha,
				url: c.html_url,
				message: (c.commit?.message || "").split("\n")[0],
				date: c.commit?.author?.date || "",
			}));
		}
	} catch {
		/* 提交列表拿不到就留空，前端只隐藏这一块 */
	}

	return new Response(
		JSON.stringify({
			username,
			repo,
			total: calendar.totalContributions,
			days: calendar.weeks
				.flatMap((w) => w.contributionDays)
				.map((d) => ({ date: d.date, count: d.contributionCount })),
			commits,
		}),
		{
			headers: {
				"Content-Type": "application/json",
				// 贡献数字 5 分钟内都算新鲜，让 CDN 顶住重复访问
				"Cache-Control": "public, max-age=300",
			},
		},
	);
}
