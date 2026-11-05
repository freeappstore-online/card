import { expect, it } from "vitest";
import { EXAMPLE, cleanContact, vcard } from "./contact";
it("only publishes known fields and rejects dangerous links and field injection", () => {
	expect(
		cleanContact({ ...EXAMPLE, token: "private" } as typeof EXAMPLE),
	).not.toHaveProperty("token");
	expect(() =>
		cleanContact({ ...EXAMPLE, website: "javascript:alert(1)" }),
	).toThrow();
	expect(() =>
		cleanContact({ ...EXAMPLE, email: "test@example.com\r\nURL:evil" }),
	).toThrow();
	expect(() => cleanContact({ ...EXAMPLE, name: "" })).toThrow("name");
});
it("exports escaped Unicode vCard fields, folded at 75 UTF-8 octets", () => {
	const result = vcard({
		...EXAMPLE,
		name: "林, Example; \\ " + "你好".repeat(45),
	});
	expect(result).toContain("VERSION:3.0\r\n");
	expect(result).toContain("FN:林\\, Example\\; \\\\");
	expect(result).toMatch(/\r\nEND:VCARD\r\n$/);
	for (const line of result.trimEnd().split("\r\n"))
		expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
	expect(result.replace(/\r\n /g, "")).toContain("你好".repeat(45));
});
