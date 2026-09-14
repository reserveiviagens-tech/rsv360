#!/usr/bin/env node
/**
 * tests/e2e/route-smoke.js
 *
 * Route smoke for RSV360 monorepo:
 *   - Pages Router: arquivos em apps/<app>/pages com extensões ts, tsx, js ou jsx
 *     excludes: _app, _document, _error, pages/api/**, any _*
 *   - App Router: apps/site-publico/app pages em segmentos válidos com page.tsx
 *     excludes: segments starting with _ and route groups (…)
 *
 * Dynamic segments require env seed; missing env -> SKIP (reason: dynamic-segment-no-seed):
 *   [id]        -> RSV_SMOKE_ID
 *   [slug]      -> RSV_SMOKE_SLUG
 *   [...slug]   -> RSV_SMOKE_CATCHALL
 *
 * Other env:
 *   RSV_SMOKE_CONSOLE_IGNORE  - "|"-separated substrings to ignore in console errors
 *                               default: "chrome-extension://|ERR_BLOCKED_BY_CLIENT"
 *
 * Auth: redirect to /login is treated as OK and increments redirectedToLogin.
 * Retry: 1x only on playwright.errors.TimeoutError.
 * Exit: 0 if failed===0, else 1.
 *
 * Artifacts: tests/e2e/artifacts/route-smoke_<YYYYMMDD_HHMMSS>/report.{json,md}
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { chromium, errors: pwErrors } = require("playwright");

const ROOT = path.resolve(__dirname, "..", "..");
const ARTIFACTS_DIR = path.resolve(ROOT, "tests", "e2e", "artifacts");

const APPS = {
	"site-publico": {
		baseUrl: process.env.RSV_SMOKE_SITE_PUBLICO_URL || "http://localhost:3000",
		routers: ["pages", "app"],
	},
	admin: {
		baseUrl: process.env.RSV_SMOKE_ADMIN_URL || "http://localhost:3004",
		routers: ["pages"],
	},
	turismo: {
		baseUrl: process.env.RSV_SMOKE_TURISMO_URL || "http://localhost:3005",
		routers: ["pages"],
	},
	guest: {
		baseUrl: process.env.RSV_SMOKE_GUEST_URL || "http://localhost:3006",
		routers: ["pages"],
	},
};

const MARKETING_LAB_MODE =
	process.env.RSV360_APP_MODE === "marketing-lab" ||
	process.env.NEXT_PUBLIC_APP_MODE === "marketing-lab" ||
	process.env.RSV_SMOKE_MARKETING_LAB === "true";

/** Mirrors apps/site-publico/lib/app-mode.ts allowlist */
const LAB_ROUTE_PREFIXES = [
	"/lab",
	"/analytics",
	"/marketing",
	"/crm",
	"/admin",
	"/pricing",
	"/dashboard-estatisticas",
	"/dashboard",
	"/login",
	"/auth/sso",
	"/recuperar-senha",
	"/redefinir-senha",
	"/proposta",
	"/cotacao",
];

/** Mirrors apps/site-publico/lib/app-mode.ts THEATER_ROUTE_PREFIXES (Aruanda C4) */
const THEATER_ROUTE_PREFIXES = [
	"/leiloes",
	"/insurance",
	"/marketplace",
	"/ui-demo",
	"/admin/ui-demo",
	"/admin/pwa-demo",
	"/flash-deals",
];

function isLabUiPath(pathname) {
	return LAB_ROUTE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

function isTheaterUiPath(pathname) {
	return THEATER_ROUTE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

function shouldSkipMarketingLabB2c(appName, routePath) {
	if (appName !== "site-publico" || !MARKETING_LAB_MODE) return null;
	if (routePath === "/") return null;
	if (isLabUiPath(routePath)) return null;
	return "marketing-lab-b2c-external";
}

function shouldSkipTheaterPublic(appName, routePath) {
	if (appName !== "site-publico" || MARKETING_LAB_MODE) return null;
	if (isTheaterUiPath(routePath)) return "theater-hidden-in-public-mode";
	return null;
}

const RSV_SMOKE_ID = process.env.RSV_SMOKE_ID || "";
const RSV_SMOKE_SLUG = process.env.RSV_SMOKE_SLUG || "";
const RSV_SMOKE_CATCHALL = process.env.RSV_SMOKE_CATCHALL || "";

const CONSOLE_IGNORE_RAW =
	process.env.RSV_SMOKE_CONSOLE_IGNORE ||
	[
		"chrome-extension://",
		"ERR_BLOCKED_BY_CLIENT",
		// Chromium console noise in CI when optional endpoints return 4xx
		"Failed to load resource: the server responded with a status of 400",
		// Turismo uses WS notifications locally; CI stack doesn't expose it.
		"ws://localhost:8000/ws/notifications",
	].join("|");
const CONSOLE_IGNORE = CONSOLE_IGNORE_RAW.split("|")
	.map((s) => s.trim())
	.filter(Boolean);

const NAV_TIMEOUT_MS = 30_000;

// ---------- enumeration ----------

function walk(dir) {
	const out = [];
	if (!fs.existsSync(dir)) return out;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...walk(full));
		} else if (entry.isFile()) {
			out.push(full);
		}
	}
	return out;
}

function enumeratePagesRouter(appDir) {
	const pagesDir = path.join(appDir, "pages");
	if (!fs.existsSync(pagesDir)) return [];
	const results = [];
	for (const file of walk(pagesDir)) {
		const rel = path.relative(pagesDir, file).replace(/\\/g, "/");
		if (rel.startsWith("api/")) continue; // exclude pages/api/**
		if (!/\.(tsx?|jsx?)$/.test(rel)) continue;
		const base = rel.replace(/\.(tsx?|jsx?)$/, "");
		// Exclude Next's special 404 page from route-smoke set.
		// Visiting "/404" should return 404, not 200-399.
		if (base === "404") continue;
		const segments = base.split("/");
		// Exclude any segment starting with _ (covers _app, _document, _error, and any _private)
		if (segments.some((s) => s.startsWith("_"))) continue;
		let routePath;
		if (segments[segments.length - 1] === "index") {
			segments.pop();
			routePath = "/" + segments.join("/");
		} else {
			routePath = "/" + segments.join("/");
		}
		routePath = routePath.replace(/\/+$/, "") || "/";
		// Filenames with spaces don't map to valid Next.js routes; ignore them.
		if (/\s/.test(routePath)) continue;
		results.push({ sourceFile: "pages/" + rel, routePath });
	}
	return results;
}

function enumerateAppRouter(appDir) {
	const appRouterDir = path.join(appDir, "app");
	if (!fs.existsSync(appRouterDir)) return [];
	const results = [];
	for (const file of walk(appRouterDir)) {
		const rel = path.relative(appRouterDir, file).replace(/\\/g, "/");
		if (rel !== "page.tsx" && !rel.endsWith("/page.tsx")) continue;
		const withoutPage = rel.replace(/\/?page\.tsx$/, "");
		const segments = withoutPage.split("/").filter(Boolean);
		if (segments.some((s) => s.startsWith("_"))) continue;
		// Remove route groups like (marketing)
		const urlSegments = segments.filter(
			(s) => !(s.startsWith("(") && s.endsWith(")")),
		);
		const routePath = "/" + urlSegments.join("/");
		results.push({
			sourceFile: "app/" + rel,
			routePath: routePath.replace(/\/+$/, "") || "/",
		});
	}
	return results;
}

// ---------- dynamic segment resolution ----------

function resolveDynamicSegments(routePath) {
	let out = routePath;
	if (/\[\.\.\.[^\]]+\]/.test(out)) {
		if (!RSV_SMOKE_CATCHALL)
			return { resolved: null, skipReason: "dynamic-segment-no-seed" };
		out = out.replace(/\[\.\.\.[^\]]+\]/g, RSV_SMOKE_CATCHALL);
	}
	if (/\[slug\]/.test(out)) {
		if (!RSV_SMOKE_SLUG)
			return { resolved: null, skipReason: "dynamic-segment-no-seed" };
		out = out.replace(/\[slug\]/g, RSV_SMOKE_SLUG);
	}
	if (/\[id\]/.test(out)) {
		if (!RSV_SMOKE_ID)
			return { resolved: null, skipReason: "dynamic-segment-no-seed" };
		out = out.replace(/\[id\]/g, RSV_SMOKE_ID);
	}
	if (/\[[^\]]+\]/.test(out)) {
		// Any unresolved dynamic segment -> SKIP
		return { resolved: null, skipReason: "dynamic-segment-no-seed" };
	}
	return { resolved: out, skipReason: null };
}

// ---------- visit ----------

async function visitOnce(context, fullUrl) {
	const page = await context.newPage();
	const consoleErrors = [];
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			const text = msg.text();
			if (!CONSOLE_IGNORE.some((sub) => text.includes(sub))) {
				consoleErrors.push(text);
			}
		}
	});
	page.on("pageerror", (err) => {
		consoleErrors.push(`[pageerror] ${err.message}`);
	});
	try {
		const response = await page.goto(fullUrl, {
			waitUntil: "domcontentloaded",
			timeout: NAV_TIMEOUT_MS,
		});
		const httpStatus = response ? response.status() : 0;
		const finalUrl = page.url();
		const redirectedToLogin = /\/login(\?|\/|$)/.test(finalUrl);
		return { httpStatus, finalUrl, consoleErrors, redirectedToLogin };
	} finally {
		await page.close().catch(() => {});
	}
}

async function visitWithRetry(context, fullUrl) {
	try {
		return await visitOnce(context, fullUrl);
	} catch (err) {
		if (err instanceof pwErrors.TimeoutError) {
			return await visitOnce(context, fullUrl);
		}
		throw err;
	}
}

// ---------- main ----------

function timestamp() {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
		d.getHours(),
	)}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function main() {
	const routes = [];
	for (const [appName, cfg] of Object.entries(APPS)) {
		const appDir = path.join(ROOT, "apps", appName);
		if (cfg.routers.includes("pages")) {
			for (const r of enumeratePagesRouter(appDir)) {
				routes.push({ app: appName, baseUrl: cfg.baseUrl, ...r });
			}
		}
		if (cfg.routers.includes("app")) {
			for (const r of enumerateAppRouter(appDir)) {
				routes.push({ app: appName, baseUrl: cfg.baseUrl, ...r });
			}
		}
	}

	// Marketing-lab CI: turismo SSR retorna 500 no Docker; smoke só /api/health
	if (MARKETING_LAB_MODE) {
		const kept = routes.filter((r) => r.app !== "turismo");
		kept.push({
			app: "turismo",
			baseUrl: APPS.turismo.baseUrl,
			sourceFile: "pages/api/health.ts",
			routePath: "/api/health",
		});
		routes.splice(0, routes.length, ...kept);
	}

	console.log(`Found ${routes.length} routes across ${Object.keys(APPS).length} apps.`);

	const browser = await chromium.launch();
	const context = await browser.newContext({ ignoreHTTPSErrors: true });

	const results = [];
	const counters = {
		total: 0,
		ok: 0,
		failed: 0,
		skipped: 0,
		redirectedToLogin: 0,
	};

	for (const route of routes) {
		counters.total++;
		const labSkip = shouldSkipMarketingLabB2c(route.app, route.routePath);
		if (labSkip) {
			counters.skipped++;
			results.push({
				app: route.app,
				sourceFile: route.sourceFile,
				routePath: route.routePath,
				status: "skipped",
				reason: labSkip,
			});
			console.log(
				`  SKIP  ${route.app.padEnd(14)} ${route.routePath}  (${labSkip})`,
			);
			continue;
		}

		const theaterSkip = shouldSkipTheaterPublic(route.app, route.routePath);
		if (theaterSkip) {
			counters.skipped++;
			results.push({
				app: route.app,
				sourceFile: route.sourceFile,
				routePath: route.routePath,
				status: "skipped",
				reason: theaterSkip,
			});
			console.log(
				`  SKIP  ${route.app.padEnd(14)} ${route.routePath}  (${theaterSkip})`,
			);
			continue;
		}

		const { resolved, skipReason } = resolveDynamicSegments(route.routePath);

		if (skipReason) {
			counters.skipped++;
			results.push({
				app: route.app,
				sourceFile: route.sourceFile,
				routePath: route.routePath,
				status: "skipped",
				reason: skipReason,
			});
			console.log(`  SKIP  ${route.app.padEnd(14)} ${route.routePath}  (${skipReason})`);
			continue;
		}

		const fullUrl = route.baseUrl + resolved;
		try {
			const r = await visitWithRetry(context, fullUrl);
			const okStatus = r.httpStatus >= 200 && r.httpStatus < 400;
			const isOk = okStatus && r.consoleErrors.length === 0;
			if (isOk) {
				counters.ok++;
				if (r.redirectedToLogin) counters.redirectedToLogin++;
				results.push({
					app: route.app,
					sourceFile: route.sourceFile,
					routePath: route.routePath,
					resolvedPath: resolved,
					fullUrl,
					status: "ok",
					httpStatus: r.httpStatus,
					finalUrl: r.finalUrl,
					redirectedToLogin: r.redirectedToLogin,
				});
				console.log(
					`  OK    ${route.app.padEnd(14)} ${resolved}  → ${r.httpStatus}${
						r.redirectedToLogin ? "  (→login)" : ""
					}`,
				);
			} else {
				counters.failed++;
				results.push({
					app: route.app,
					sourceFile: route.sourceFile,
					routePath: route.routePath,
					resolvedPath: resolved,
					fullUrl,
					status: "failed",
					httpStatus: r.httpStatus,
					finalUrl: r.finalUrl,
					redirectedToLogin: r.redirectedToLogin,
					consoleErrors: r.consoleErrors,
				});
				console.log(
					`  FAIL  ${route.app.padEnd(14)} ${resolved}  → ${
						r.httpStatus
					}  (${r.consoleErrors.length} console errors)` ,
				);
			}
		} catch (err) {
			counters.failed++;
			results.push({
				app: route.app,
				sourceFile: route.sourceFile,
				routePath: route.routePath,
				resolvedPath: resolved,
				fullUrl,
				status: "failed",
				error: err && err.message ? err.message : String(err),
				errorType: err && err.name ? err.name : "Error",
			});
			console.log(
				`  FAIL  ${route.app.padEnd(14)} ${resolved}  → ERROR ${err.name}: ${err.message}`,
			);
		}
	}

	await context.close();
	await browser.close();

	// Artifacts
	const ts = timestamp();
	const outDir = path.join(ARTIFACTS_DIR, `route-smoke_${ts}`);
	fs.mkdirSync(outDir, { recursive: true });

	const report = {
		timestamp: new Date().toISOString(),
		env: {
			RSV_SMOKE_ID: RSV_SMOKE_ID ? "(set)" : "(unset)",
			RSV_SMOKE_SLUG: RSV_SMOKE_SLUG ? "(set)" : "(unset)",
			RSV_SMOKE_CATCHALL: RSV_SMOKE_CATCHALL ? "(set)" : "(unset)",
			RSV_SMOKE_CONSOLE_IGNORE: CONSOLE_IGNORE_RAW,
			MARKETING_LAB_MODE,
		},
		counters,
		results,
	};
	fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));

	const md = [];
	md.push(`# Route smoke report - ${ts}`);
	md.push("");
	md.push(`- total: **${counters.total}**`);
	md.push(`- ok: **${counters.ok}**`);
	md.push(`- failed: **${counters.failed}**`);
	md.push(`- skipped: **${counters.skipped}**`);
	md.push(`- redirectedToLogin: **${counters.redirectedToLogin}**`);
	md.push("");
	md.push("## Failures");
	const failures = results.filter((r) => r.status === "failed");
	if (failures.length === 0) {
		md.push("_None._");
	} else {
		for (const f of failures) {
			md.push(
				`- **${f.app}** \`${f.routePath}\` -> ${f.httpStatus || "ERROR"} ${
					f.error ? `\`${f.error}\`` : ""
				}`,
			);
			if (f.consoleErrors && f.consoleErrors.length) {
				for (const ce of f.consoleErrors) md.push(`    - \`${ce}\``);
			}
		}
	}
	md.push("");
	md.push("## Skipped");
	const skipped = results.filter((r) => r.status === "skipped");
	if (skipped.length === 0) {
		md.push("_None._");
	} else {
		for (const s of skipped) {
			md.push(`- **${s.app}** \`${s.routePath}\` (${s.reason})`);
		}
	}
	fs.writeFileSync(path.join(outDir, "report.md"), md.join("\n"));

	console.log("");
	console.log(`Report: ${outDir}`);
	console.log(
		`Counters: total=${counters.total} ok=${counters.ok} failed=${counters.failed} skipped=${counters.skipped} redirectedToLogin=${counters.redirectedToLogin}`,
	);

	process.exit(counters.failed === 0 ? 0 : 1);
}

main().catch((err) => {
	console.error("FATAL:", err);
	process.exit(2);
});
