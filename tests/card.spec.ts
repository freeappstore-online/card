import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(resolve("web/package.json"));
const jsQR = require("jsqr");
test("private draft, validation, profile return, vCard download and offline reload", async ({
	page,
	context,
}) => {
	await page.goto("/");
	await page.getByRole("button", { name: "Save draft", exact: true }).click();
	await expect(page.getByRole("alert")).toContainText("Enter a name");
	await page
		.getByLabel("Name *", { exact: true })
		.pressSequentially("Avery Example");
	await page.getByLabel("Email", { exact: true }).fill("avery@example.com");
	await page.getByLabel("Website", { exact: true }).fill("javascript:alert(1)");
	await page.getByRole("button", { name: "Save draft", exact: true }).click();
	await expect(page.getByRole("alert").first()).toContainText("http or https");
	await page.getByLabel("Website", { exact: true }).fill("https://example.com");
	await page.getByRole("link", { name: "Profile", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Sign in with Google", exact: true }),
	).toBeVisible();
	await page.getByRole("link", { name: "Close profile", exact: true }).click();
	await expect(page.getByLabel("Name *", { exact: true })).toHaveValue(
		"Avery Example",
	);
	await page.getByRole("button", { name: "Save draft", exact: true }).click();
	await expect(
		page.getByRole("status").filter({ hasText: "Draft saved" }),
	).toBeVisible();
	const downloadEvent = page.waitForEvent("download");
	await page
		.getByRole("button", { name: "Download contact", exact: true })
		.click();
	const download = await downloadEvent;
	expect(download.suggestedFilename()).toBe("contact.vcf");
	const data = await readFile((await download.path())!, "utf8");
	expect(data).toContain("FN:Avery Example\r\n");
	expect(data).toContain("EMAIL;TYPE=INTERNET:avery@example.com");
	await page.reload();
	await expect(page.getByLabel("Name *", { exact: true })).toHaveValue(
		"Avery Example",
	);
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await context.setOffline(true);
	await page.reload();
	await expect(page.getByLabel("Name *", { exact: true })).toHaveValue(
		"Avery Example",
	);
	await page.setViewportSize({ width: 320, height: 760 });
	await page.evaluate(() => {
		document.documentElement.dataset.text = "lg";
	});
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
});
test.describe("connected publication", () => {
	test.use({ serviceWorkers: "block" });
	test("explicit publication, anonymous public page, QR round trip and removal", async ({
		page,
		context,
	}) => {
		const records = new Map<string, Record<string, unknown>>();
		let creates = 0;
		let fail = true;
		const contact = {
			name: "Avery Example",
			role: "Designer",
			company: "Example",
			email: "avery@example.com",
			phone: "",
			website: "https://example.com/",
			note: "Hello",
		};
		await context.addInitScript(() => {
			if (!sessionStorage.getItem("anonymous"))
				localStorage.setItem(
					"fas:session",
					JSON.stringify({
						token: "synthetic-token",
						user: {
							id: "test-owner",
							login: "tester",
							avatarUrl: null,
							dateOfBirth: "2000-01-01",
						},
					}),
				);
		});
		await context.route("https://api.freeappstore.online/**", async (route) => {
			const request = route.request(),
				url = new URL(request.url()),
				method = request.method();
			if (url.pathname.endsWith("/analytics.js"))
				return route.fulfill({
					contentType: "application/javascript",
					body: "",
				});
			if (!url.pathname.includes("/db/cards"))
				return route.fulfill({
					json: { value: null, friends: [], requests: [] },
				});
			const id = url.pathname.split("/db/cards/")[1];
			if (method === "GET" && !id)
				return route.fulfill({
					json: { documents: [...records.values()], total: records.size },
				});
			if (method === "GET")
				return route.fulfill(
					records.has(id)
						? { json: records.get(id) }
						: { status: 404, json: { error: "not found" } },
				);
			if (method === "POST") {
				creates++;
				if (fail)
					return route.fulfill({ status: 503, json: { error: "unavailable" } });
				const doc = {
					...request.postDataJSON(),
					id: "public-card",
					_owner: "test-owner",
				};
				records.set("public-card", doc);
				return route.fulfill({ status: 201, json: doc });
			}
			if (method === "DELETE") {
				records.delete(id);
				return route.fulfill({ status: 204, body: "" });
			}
			if (method === "PUT") {
				const doc = { ...request.postDataJSON(), id, _owner: "test-owner" };
				records.set(id, doc);
				return route.fulfill({ json: doc });
			}
		});
		await page.goto("/");
		for (const [field, value] of Object.entries(contact)) {
			const label = {
				name: "Name *",
				role: "Role",
				company: "Company",
				email: "Email",
				phone: "Phone",
				website: "Website",
				note: "A short introduction",
			}[field]!;
			await page.getByLabel(label, { exact: true }).fill(value);
		}
		expect(creates).toBe(0);
		await page
			.getByRole("button", { name: "Publish new card", exact: true })
			.click();
		const dialog = page.getByRole("dialog");
		await expect(
			dialog.getByRole("button", { name: "Confirm publication", exact: true }),
		).toBeDisabled();
		expect(creates).toBe(0);
		await dialog.getByRole("checkbox").check();
		await dialog
			.getByRole("button", { name: "Confirm publication", exact: true })
			.click();
		await expect(dialog.getByRole("alert")).toContainText("Could not publish");
		fail = false;
		await dialog
			.getByRole("button", { name: "Confirm publication", exact: true })
			.click();
		await expect(dialog).not.toBeVisible();
		expect(creates).toBe(2);
		await page
			.getByRole("link", { name: "Open public card", exact: true })
			.click();
		await expect(
			page.getByRole("heading", { name: "Avery Example", exact: true }),
		).toBeVisible();
		const image = page.getByRole("img", { name: /QR code for/ });
		await expect(image).toBeVisible();
		const pixels = await image.evaluate(async (el) => {
			const img = el as HTMLImageElement;
			await img.decode();
			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			const c = canvas.getContext("2d")!;
			c.drawImage(img, 0, 0);
			return {
				data: Array.from(
					c.getImageData(0, 0, canvas.width, canvas.height).data,
				),
				width: canvas.width,
				height: canvas.height,
			};
		});
		expect(
			jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)
				.data,
		).toBe(new URL("/c/public-card", page.url()).href);
		// Remove the synthetic session for this tab; public reads must remain available.
		await page.evaluate(() => {
			sessionStorage.setItem("anonymous", "true");
			localStorage.removeItem("fas:session");
		});
		await page.reload();
		await expect(
			page.getByRole("heading", { name: "Avery Example", exact: true }),
		).toBeVisible();
		await page.evaluate(() =>
			localStorage.setItem(
				"fas:session",
				JSON.stringify({
					token: "synthetic-token",
					user: { id: "test-owner", login: "tester" },
				}),
			),
		);
		await page.goto("/");
		await page
			.getByRole("button", { name: "Remove public card", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Remove card", exact: true })
			.click();
		await page.goto("/c/public-card");
		await expect(
			page.getByRole("heading", { name: "Card not found" }),
		).toBeVisible();
	});
});
