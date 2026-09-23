// GitHub 动态：近一年贡献热力图 + 博客仓库最近提交。
//
// 这是公开接口 —— 贡献数据在 GitHub 上本来就是公开的，任何访客都能看；
// 令牌只留在服务端，浏览器拿到的只是画图要用的数字。
// 不放在 /api/github 下面，那样会被登录中间件拦住。
import { json } from "./_lib/session.js";

// 不想依赖环境变量时可以直接改这两个默认值
const DEFAULT_USER = "admin11111515";
const DEFAULT_REPO = "WWPPL";

/**
 * 贡献日历只有 GraphQL 接口上有。
 * 细粒度 PAT 对 GraphQL 的支持有限，取不到是可能的 —— 所以这一块单独兜住，
 * 失败也不影响下面的提交列表（那个走 REST，Contents 读权限就够）。
 */
async function fetchCalendar(headers, username) {
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
	try {
		const res = await fetch("https://api.github.com/graphql", {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				query,
				variables: { login: username, from: from.toISOString(), to: to.toISOString() },
			}),
		});
		const body = await res.json();
		if (body.errors?.length) return { error: body.errors[0].message || "GitHub 返回了错误" };
		const calendar = body.data?.user?.contributionsCollection?.contributionCalendar;
		if (!calendar || !Array.isArray(calendar.weeks)) return { error: "贡献数据为空" };
		return {
			total: calendar.totalContributions,
			days: calendar.weeks
				.flatMap((w) => w.contributionDays)
				.map((d) => ({ date: d.date, count: d.contributionCount })),
		};
	} catch (e) {
		return { error: e.message || String(e) };
	}
}

/** 博客仓库最近几次提交：和后台写文章用的是同一个令牌和权限 */
async function fetchCommits(headers, username, repo) {
	try {
		const res = await fetch(
			`https://api.github.com/repos/${username}/${repo}/commits?per_page=5`,
			{ headers },
		);
		if (!res.ok) return { error: `HTTP ${res.status}` };
		const list = await res.json();
		return {
			commits: list.map((c) => ({
				sha: c.sha,
				url: c.html_url,
				message: (c.commit?.message || "").split("\n")[0],
				date: c.commit?.author?.date || "",
			})),
		};
	} catch (e) {
		return { error: e.message || String(e) };
	}
}

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

	// 两块数据并行取，互不拖累
	const [calendar, commits] = await Promise.all([
		fetchCalendar(headers, username),
		fetchCommits(headers, username, repo),
	]);

	// 两边都拿不到才算真的失败；只要有一边成，就还能显示点东西
	if (calendar.error && commits.error) {
		return json({ error: `GitHub 数据获取失败：${calendar.error}` }, 502);
	}

	return new Response(
		JSON.stringify({
			username,
			repo,
			total: calendar.total ?? null,
			days: calendar.days || [],
			commits: commits.commits || [],
			// 便于排查是哪一块没取到；前端只靠上面两个数组决定画什么
			calendarError: calendar.error || null,
			commitsError: commits.error || null,
		}),
		{
			headers: {
				"Content-Type": "application/json",
				// 贡献数字 5 分钟内都算新鲜，让 CDN 顶住重复访问；
				// 有块缺数据时缓短一点，好让它早点恢复
				"Cache-Control": calendar.error || commits.error ? "public, max-age=60" : "public, max-age=300",
			},
		},
	);
}
