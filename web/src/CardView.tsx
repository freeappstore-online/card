import { cleanContact, downloadContact, type Contact } from "./contact";
export function CardView({ contact }: { contact: Contact }) {
	let safe: Contact;
	try {
		safe = cleanContact(contact);
	} catch {
		return <p role="alert">This card contains invalid contact details.</p>;
	}
	return (
		<article className="business-card" aria-label="Contact card">
			<div className="monogram" aria-hidden="true">
				{safe.name.slice(0, 1).toUpperCase()}
			</div>
			<h2>{safe.name}</h2>
			<p className="occupation">
				{[safe.role, safe.company].filter(Boolean).join(" · ")}
			</p>
			{safe.note && <p>{safe.note}</p>}
			<div className="contact-links">
				{safe.email && <a href={`mailto:${safe.email}`}>{safe.email}</a>}
				{safe.phone && (
					<a href={`tel:${safe.phone.replace(/[^+\d]/g, "")}`}>{safe.phone}</a>
				)}
				{safe.website && (
					<a href={safe.website} target="_blank" rel="noopener noreferrer">
						{new URL(safe.website).hostname}
					</a>
				)}
			</div>
			<button
				type="button"
				className="primary"
				onClick={() => downloadContact(safe)}
			>
				Save contact
			</button>
		</article>
	);
}
