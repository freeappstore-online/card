import {
	getRecord,
	openStore,
	withTransaction,
} from "@freeappstore/sdk/persist";
export const FIELDS = [
	"name",
	"role",
	"company",
	"email",
	"phone",
	"website",
	"note",
] as const;
export type Contact = Record<(typeof FIELDS)[number], string>;
export const EMPTY: Contact = {
	name: "",
	role: "",
	company: "",
	email: "",
	phone: "",
	website: "",
	note: "",
};
export const EXAMPLE: Contact = {
	name: "Avery Example",
	role: "Designer & maker",
	company: "Studio Example",
	email: "avery@example.com",
	phone: "",
	website: "https://example.com",
	note: "Good conversations start with a hello.",
};
export function isContact(v: unknown): v is Contact {
	return (
		!!v &&
		typeof v === "object" &&
		FIELDS.every(
			(k) =>
				typeof (v as Contact)[k] === "string" &&
				(v as Contact)[k].length <= 1000,
		)
	);
}
export function cleanContact(v: Contact): Contact {
	const result = Object.fromEntries(
		FIELDS.map((k) => [k, v[k].trim()]),
	) as Contact;
	if (!result.name) throw new Error("Enter a name for your card.");
	for (const k of FIELDS)
		if (result[k].length > 1000 || /[\x00-\x1f\x7f]/.test(result[k]))
			throw new Error("Use a single line of up to 1,000 characters per field.");
	if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))
		throw new Error("Enter a valid email address.");
	if (result.phone && !/^[+\d\s().-]{3,40}$/.test(result.phone))
		throw new Error("Use a phone number with digits, spaces or + ( ) - .");
	if (result.website) {
		let u: URL;
		try {
			u = new URL(result.website);
		} catch {
			throw new Error("Enter a full website URL, starting with https://.");
		}
		if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
			throw new Error(
				"Use an http or https website without a username or password.",
			);
		result.website = u.href;
	}
	return result;
}
export function vcard(contact: Contact): string {
	const c = cleanContact(contact);
	const escape = (s: string) =>
		s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
	const lines = [
		"BEGIN:VCARD",
		"VERSION:3.0",
		`FN:${escape(c.name)}`,
		`N:;${escape(c.name)};;;`,
		...(c.role ? [`TITLE:${escape(c.role)}`] : []),
		...(c.company ? [`ORG:${escape(c.company)}`] : []),
		...(c.email ? [`EMAIL;TYPE=INTERNET:${escape(c.email)}`] : []),
		...(c.phone ? [`TEL;TYPE=CELL:${escape(c.phone)}`] : []),
		...(c.website ? [`URL:${escape(c.website)}`] : []),
		...(c.note ? [`NOTE:${escape(c.note)}`] : []),
		"END:VCARD",
	];
	// Fold at 75 UTF-8 octets without splitting a Unicode character.
	return (
		lines
			.map((line) => {
				let out = "",
					bytes = 0;
				for (const char of line) {
					const length = new TextEncoder().encode(char).length;
					if (bytes + length > 75) {
						out += "\r\n ";
						bytes = 1;
					}
					out += char;
					bytes += length;
				}
				return out;
			})
			.join("\r\n") + "\r\n"
	);
}
export function downloadContact(c: Contact) {
	const link = document.createElement("a");
	const url = URL.createObjectURL(
		new Blob([vcard(c)], { type: "text/vcard;charset=utf-8" }),
	);
	link.href = url;
	link.download = "contact.vcf";
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function database() {
	const result = await openStore({
		namespace: "card-private-draft",
		version: 1,
	});
	if (!result.ok)
		throw new Error(
			"Device storage is unavailable. Keep a copy before leaving.",
		);
	return result.value;
}
export async function loadDraft(): Promise<Contact> {
	const db = await database();
	try {
		const result = await getRecord(db, "draft", isContact);
		if (!result.ok)
			throw new Error(
				"Your saved draft could not be read. Existing data has been kept.",
			);
		return result.value ?? { ...EMPTY };
	} finally {
		db.close();
	}
}
export async function saveDraft(c: Contact) {
	const value = cleanContact(c),
		db = await database();
	try {
		const result = await withTransaction(db, "readwrite", async (tx) => {
			await tx.put("draft", value);
		});
		if (!result.ok)
			throw new Error("Could not save this draft. Your text is still here.");
	} finally {
		db.close();
	}
}
