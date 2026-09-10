#!/usr/bin/env node
/**
 * Smoke — modo marketing-lab (:3000) + redirect B2C para S1 (:5000)
 *
 * Uso: node tests/e2e/marketing-lab-smoke.js
 * Env: RSV_SMOKE_SITE_PUBLICO_URL (default http://localhost:3000)
 *      RSV_SMOKE_PRIMARY_SITE_URL (default http://localhost:5000)
 */

"use strict";

const lab = process.env.RSV_SMOKE_SITE_PUBLICO_URL || "http://localhost:3000";
const s1 = process.env.RSV_SMOKE_PRIMARY_SITE_URL || "http://localhost:5000";

function fail(message) {
	console.error(`FAIL: ${message}`);
	process.exit(1);
}

async function head(url) {
	const res = await fetch(url, { method: "GET", redirect: "manual" });
	return { status: res.status, location: res.headers.get("location") || "" };
}

async function getStatus(url) {
	const res = await fetch(url, { redirect: "follow" });
	return res.status;
}

async function main() {
	console.log("=== Marketing Lab smoke ===");

	const root = await head(`${lab}/`);
	if (![301, 302, 307, 308].includes(root.status)) {
		fail(`Expected redirect from /, got ${root.status}`);
	}
	if (!root.location.includes("/lab")) {
		fail(`Expected /lab redirect, got ${root.location}`);
	}
	console.log(`OK / -> ${root.location}`);

	const hoteis = await head(`${lab}/hoteis`);
	if (![301, 302, 307, 308].includes(hoteis.status)) {
		fail(`Expected redirect from /hoteis, got ${hoteis.status}`);
	}
	if (!hoteis.location.includes(":5000/hoteis")) {
		fail(`Expected :5000/hoteis, got ${hoteis.location}`);
	}
	console.log(`OK /hoteis -> ${hoteis.location}`);

	const labStatus = await getStatus(`${lab}/lab`);
	if (labStatus !== 200) {
		fail(`/lab returned ${labStatus}`);
	}
	console.log("OK /lab -> 200");

	const analyticsHtml = await (await fetch(`${lab}/analytics`)).text();
	if (!analyticsHtml.includes("B2C e reservas")) {
		fail("/analytics missing LabShell banner");
	}
	console.log("OK /analytics has LabShell");

	const marketingHtml = await (await fetch(`${lab}/marketing`)).text();
	if (marketingHtml.includes("Em construção")) {
		fail("/marketing still shows stub");
	}
	if (!marketingHtml.includes("Campanhas")) {
		fail("/marketing missing hub modules");
	}
	console.log("OK /marketing hub MVP");

	const campaignsStatus = await getStatus(`${lab}/marketing/campaigns`);
	if (campaignsStatus !== 200) {
		fail(`/marketing/campaigns returned ${campaignsStatus}`);
	}
	console.log("OK /marketing/campaigns -> 200");

	const pricingHtml = await (await fetch(`${lab}/pricing`)).text();
	if (pricingHtml.includes("Em construção")) {
		fail("/pricing still shows stub");
	}
	if (!pricingHtml.includes("Dashboard")) {
		fail("/pricing missing hub modules");
	}
	console.log("OK /pricing hub MVP");

	const pricingDashStatus = await getStatus(`${lab}/pricing/dashboard`);
	if (pricingDashStatus !== 200) {
		fail(`/pricing/dashboard returned ${pricingDashStatus}`);
	}
	console.log("OK /pricing/dashboard -> 200");

	const calendarHtml = await (await fetch(`${lab}/pricing/calendar`)).text();
	if (calendarHtml.includes("Em construção")) {
		fail("/pricing/calendar still shows stub");
	}
	console.log("OK /pricing/calendar MVP");

	const rulesStatus = await getStatus(`${lab}/pricing/rules`);
	if (rulesStatus !== 200) {
		fail(`/pricing/rules returned ${rulesStatus}`);
	}
	console.log("OK /pricing/rules -> 200");

	const crmStatus = await getStatus(`${lab}/crm`);
	if (crmStatus !== 200) {
		fail(`/crm returned ${crmStatus}`);
	}
	console.log("OK /crm -> 200");

	const crmDash = await (await fetch(`${lab}/api/crm/dashboard`)).json();
	if (!crmDash.success) {
		fail(`/api/crm/dashboard: ${crmDash.error || "not success"}`);
	}
	console.log("OK /api/crm/dashboard -> success");

	const analyticsForecast = await (await fetch(`${lab}/api/analytics/revenue-forecast?months=6`)).json();
	if (!analyticsForecast.success) {
		fail(`/api/analytics/revenue-forecast: ${analyticsForecast.error || "not success"}`);
	}
	console.log("OK /api/analytics/revenue-forecast -> success");

	if (process.env.SSO_DEV_MOCK !== "false") {
		const handoff = await head(
			`${lab}/api/auth/sso/dev-handoff?return=/lab&email=test@local.dev`,
		);
		if (handoff.status === 404) {
			console.log("WARN SSO dev-handoff disabled (set SSO_DEV_MOCK=true)");
		} else if (handoff.status === 403 || handoff.status === 502) {
			// CI compose often lacks OAUTH_BFF_SECRET/SSO_BFF_SECRET → upstream 403.
			console.log(
				`WARN SSO dev-handoff unavailable (${handoff.status}) — configure SSO_BFF_SECRET`,
			);
		} else if (![301, 302, 307, 308].includes(handoff.status)) {
			fail(`SSO dev-handoff expected redirect, got ${handoff.status}`);
		} else if (!handoff.location.includes("/auth/sso/callback")) {
			fail(`SSO dev-handoff missing callback, got ${handoff.location}`);
		} else {
			console.log(`OK SSO dev-handoff -> ${handoff.location.split("?")[0]}`);
		}
	}

	try {
		const s1Res = await fetch(`${s1}/health`, { signal: AbortSignal.timeout(3000) });
		if (s1Res.status === 200) {
			console.log("OK S1 health -> 200");
		} else {
			console.log(`WARN S1 :5000 health -> ${s1Res.status}`);
		}
	} catch {
		console.log("WARN S1 :5000 not reachable (start Crm-RSV-360)");
	}

	console.log("=== All checks passed ===");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
