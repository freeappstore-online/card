import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
	testDir: "./tests",
	timeout: 60000,
	workers: 1,
	use: {
		baseURL: process.env.CARD_BASE_URL ?? "http://127.0.0.1:4188",
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "desktop", use: devices["Desktop Chrome"] },
		{
			name: "mobile",
			use: { ...devices["iPhone SE"], defaultBrowserType: "chromium" },
		},
		{ name: "webkit", use: devices["iPhone 14"] },
	],
	webServer: process.env.CARD_BASE_URL
		? undefined
		: {
				command: "pnpm preview --host 127.0.0.1 --port 4188 --strictPort",
				url: "http://127.0.0.1:4188",
				reuseExistingServer: false,
			},
});
