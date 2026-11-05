import { useCallback, useEffect, useRef, useState } from "react";
import { initApp } from "@freeappstore/sdk";
import { useAuth } from "@freeappstore/sdk/hooks";
import { Shell, PageHeader, Modal, type NavItem } from "@freeappstore/sdk/ui";
import QRCode from "qrcode";
import { CardView } from "./CardView";
import {
	EMPTY,
	EXAMPLE,
	FIELDS,
	cleanContact,
	downloadContact,
	isContact,
	loadDraft,
	saveDraft,
	type Contact,
} from "./contact";
import { pwa } from "./fas-capabilities/pwa";
export const fas = initApp({ appId: "card" });
const collection = fas.collections.collection("cards", {
	visibility: "public-read",
});
type Published = Contact & { id: string };
const NAV: NavItem[] = [
	{ label: "Your card", href: "/", title: "Card" },
	{ label: "How to use", href: "/help", title: "How to use — Card" },
];
const here = () => window.location.pathname + window.location.search;
const LABELS: Record<keyof Contact, string> = {
	name: "Name",
	role: "Role",
	company: "Company",
	email: "Email",
	phone: "Phone",
	website: "Website",
	note: "A short introduction",
};
export default function App() {
	const [path, setPath] = useState(here);
	const [draft, setDraft] = useState<Contact>({ ...EMPTY });
	const [loaded, setLoaded] = useState(false),
		[dirty, setDirty] = useState(false),
		[error, setError] = useState(""),
		[notice, setNotice] = useState("");
	const [saving, setSaving] = useState(false);
	const busy = useRef(false),
		editGeneration = useRef(0);
	const writes = useRef(0);
	const onWrite = useCallback((value: boolean) => {
		writes.current = Math.max(0, writes.current + (value ? 1 : -1));
	}, []);
	const { user } = useAuth(fas);
	busy.current = dirty || saving;
	useEffect(() => {
		let active = true;
		const generation = editGeneration.current;
		void loadDraft()
			.then((value) => {
				if (active && generation === editGeneration.current) setDraft(value);
			})
			.catch((e) => {
				if (active) setError(e.message);
			})
			.finally(() => {
				if (active) setLoaded(true);
			});
		return () => {
			active = false;
		};
	}, []);
	useEffect(() => {
		const sync = () => setPath(here());
		window.addEventListener("popstate", sync);
		const remove = pwa.addBusyGuard(() => busy.current || writes.current > 0);
		return () => {
			window.removeEventListener("popstate", sync);
			remove();
		};
	}, []);
	useEffect(() => {
		const guard = (e: BeforeUnloadEvent) => {
			if (busy.current || writes.current > 0) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", guard);
		return () => window.removeEventListener("beforeunload", guard);
	}, []);
	function navigate(href: string) {
		history.pushState(null, "", href);
		setPath(here());
	}
	const url = new URL(path, window.location.origin);
	const publicId = url.pathname.startsWith("/c/")
		? decodeURIComponent(url.pathname.slice(3))
		: null;
	function change(next: Contact) {
		editGeneration.current++;
		setDraft(next);
		setDirty(true);
		setNotice("");
	}
	async function store() {
		if (saving) return;
		setSaving(true);
		setError("");
		const generation = editGeneration.current;
		try {
			await saveDraft(draft);
			if (generation === editGeneration.current) setDirty(false);
			setNotice("Draft saved on this device.");
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setSaving(false);
		}
	}
	return (
		<Shell app={fas} appName="Card" nav={NAV} onNavigate={navigate}>
			<div className="card-page">
				{publicId ? (
					<PublicCard key={publicId} id={publicId} />
				) : url.pathname === "/example" ? (
					<>
						<PageHeader
							title="An introduction, ready to share"
							description="A fictional example. Your card can look like this."
						/>
						<CardView contact={EXAMPLE} />
						<button type="button" onClick={() => navigate("/")}>
							Make your card
						</button>
					</>
				) : url.pathname === "/help" ? (
					<>
						<PageHeader
							title="A good hello travels"
							description="Your details, easy to keep."
						/>
						<section className="panel">
							<h2>Make it yours</h2>
							<ol>
								<li>Enter the contact details you want to share.</li>
								<li>
									Save your private draft on this device, or download a contact
									file.
								</li>
								<li>
									To share a public page, sign in from Profile and confirm
									publication.
								</li>
								<li>
									Send the link or let someone scan its QR code. They can save
									your contact without an account.
								</li>
							</ol>
							<p>
								Published details are publicly readable, including by people
								without the link. Only publish contact information you intend to
								make public. Removing a card stops access to its page;
								downloaded copies cannot be recalled.
							</p>
							<p>
								Private drafts and contact downloads work offline after the
								first successful load. Publishing and loading public cards need
								a connection. Drafts stay on this browser and do not sync when
								you sign in.
							</p>
							<button
								className="primary"
								type="button"
								onClick={() => navigate("/example")}
							>
								See an example
							</button>
						</section>
					</>
				) : (
					<>
						<PageHeader
							title="A simple way to stay in touch"
							description="Make a contact card. Share a hello."
							actions={
								<button type="button" onClick={() => navigate("/example")}>
									See an example
								</button>
							}
						/>
						<div className="editor-grid">
							<section className="panel">
								<p className="eyebrow">PRIVATE DRAFT · THIS DEVICE</p>
								<h2>Your introduction</h2>
								{!loaded && <p role="status">Opening your draft…</p>}
								<form
									noValidate
									onSubmit={(e) => {
										e.preventDefault();
										void store();
									}}
								>
									{FIELDS.map((field) => (
										<label key={field} htmlFor={`contact-${field}`}>
											{LABELS[field]}
											{field === "name" ? " *" : ""}
											<input
												id={`contact-${field}`}
												type={
													field === "email"
														? "email"
														: field === "website"
															? "url"
															: field === "phone"
																? "tel"
																: "text"
												}
												autoComplete={
													field === "name"
														? "name"
														: field === "email"
															? "email"
															: field === "phone"
																? "tel"
																: "off"
												}
												maxLength={1000}
												value={draft[field]}
												disabled={!loaded}
												onChange={(e) =>
													change({ ...draft, [field]: e.target.value })
												}
											/>
										</label>
									))}
									{error && (
										<p role="alert" className="error">
											{error}
										</p>
									)}
									{notice && <p role="status">{notice}</p>}
									<div className="actions">
										<button
											className="primary"
											type="submit"
											disabled={!loaded || saving}
										>
											{saving ? "Saving…" : "Save draft"}
										</button>
										<button
											type="button"
											disabled={!loaded}
											onClick={() => {
												try {
													downloadContact(draft);
													setError("");
												} catch (e) {
													setError((e as Error).message);
												}
											}}
										>
											Download contact
										</button>
									</div>
									{dirty && <p className="muted">Unsaved changes</p>}
								</form>
							</section>
							<section className="preview">
								<p className="eyebrow">PREVIEW</p>
								{draft.name.trim() ? (
									<CardView contact={draft} />
								) : (
									<div className="empty-card">
										<span aria-hidden="true">↗</span>
										<h2>Make your first impression</h2>
										<p>
											Your card appears here as you type. Start with your name.
										</p>
									</div>
								)}
							</section>
						</div>
						<Manage
							key={user?.id ?? "signed-out"}
							owner={user?.id ?? null}
							onWrite={onWrite}
							draft={draft}
							navigate={navigate}
						/>
					</>
				)}
			</div>
		</Shell>
	);
}
function Manage({
	onWrite,
	owner,
	draft,
	navigate,
}: {
	onWrite(value: boolean): void;
	owner: string | null;
	draft: Contact;
	navigate(href: string): void;
}) {
	const [cards, setCards] = useState<Published[]>([]),
		[error, setError] = useState(""),
		[loading, setLoading] = useState(false),
		[page, setPage] = useState(0),
		[total, setTotal] = useState(0),
		[refresh, setRefresh] = useState(0);
	const [confirmation, setConfirmation] = useState<Published | Contact | null>(
			null,
		),
		[remove, setRemove] = useState<Published | null>(null),
		[consent, setConsent] = useState(false),
		[pending, setPending] = useState(false);
	const lock = useRef(false),
		active = useRef(true);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
		};
	}, []);
	useEffect(() => {
		if (!owner) return;
		let current = true;
		setLoading(true);
		setError("");
		void collection
			.query<Contact>({
				owner,
				limit: 20,
				offset: page * 20,
				orderBy: "createdAt",
				order: "desc",
			})
			.then((r) => {
				if (current) {
					if (!r.documents.every(isContact))
						throw new Error("Some published cards could not be read.");
					setCards(r.documents);
					setTotal(r.total);
				}
			})
			.catch((e) => {
				if (current) setError(e.message);
			})
			.finally(() => {
				if (current) setLoading(false);
			});
		return () => {
			current = false;
		};
	}, [owner, page, refresh]);
	function propose(value: Contact | Published) {
		try {
			const valid = cleanContact(value);
			setConfirmation("id" in value ? { ...valid, id: value.id } : valid);
			setConsent(false);
			setError("");
		} catch (e) {
			setError((e as Error).message);
		}
	}
	async function publish() {
		if (!confirmation || !consent || lock.current) return;
		lock.current = true;
		onWrite(true);
		setPending(true);
		setError("");
		try {
			const value = cleanContact(confirmation);
			if ("id" in confirmation) await collection.update(confirmation.id, value);
			else await collection.create(value);
			if (active.current) {
				setConfirmation(null);
				setRefresh((v) => v + 1);
			}
		} catch {
			if (active.current)
				setError("Could not publish. Check your connection and sign-in, then try again.");
		} finally {
			lock.current = false;
			onWrite(false);
			if (active.current) setPending(false);
		}
	}
	async function unpublish() {
		if (!remove || lock.current) return;
		lock.current = true;
		onWrite(true);
		setPending(true);
		setError("");
		try {
			await collection.delete(remove.id);
			if (active.current) {
				setRemove(null);
				setPage(0);
				setRefresh((v) => v + 1);
			}
		} catch {
			if (active.current)
				setError("Could not remove this card. Check your connection and sign-in, then try again.");
		} finally {
			lock.current = false;
			onWrite(false);
			if (active.current) setPending(false);
		}
	}
	if (!owner)
		return (
			<section className="panel sharing">
				<h2>Ready to share?</h2>
				<p>
					You can keep a private draft and download a contact without signing
					in. Sign in from Profile when you want to publish a public page and QR
					code.
				</p>
				<button type="button" onClick={() => navigate("/profile?returnTo=%2F")}>
					Open Profile
				</button>
			</section>
		);
	return (
		<section className="panel sharing">
			<h2>Your public cards</h2>
			<p>Publish a copy of this draft. Each new card gets its own link.</p>
			<button type="button" className="primary" onClick={() => propose(draft)}>
				Publish new card
			</button>
			{error && (
				<p role="alert" className="error">
					{error}
				</p>
			)}
			{loading ? (
				<p role="status">Loading published cards…</p>
			) : (
				<>
					<div className="published-list">
						{cards.map((card) => (
							<article key={card.id}>
								<h3>{card.name}</h3>
								<p>{card.role}</p>
								<div className="actions">
									<a
										href={`/c/${encodeURIComponent(card.id)}`}
										onClick={(e) => {
											if (
												!e.ctrlKey &&
												!e.metaKey &&
												!e.shiftKey &&
												!e.altKey
											) {
												e.preventDefault();
												navigate(e.currentTarget.pathname);
											}
										}}
									>
										Open public card
									</a>
									<button
										type="button"
										onClick={() => propose({ ...draft, id: card.id })}
									>
										Replace with draft
									</button>
									<button
										type="button"
										onClick={() => {
											setRemove(card);
											setError("");
										}}
									>
										Remove public card
									</button>
								</div>
							</article>
						))}
					</div>
					{total > 20 && (
						<div className="actions">
							<button
								type="button"
								disabled={page === 0}
								onClick={() => setPage((v) => v - 1)}
							>
								Previous
							</button>
							<span>Page {page + 1}</span>
							<button
								type="button"
								disabled={(page + 1) * 20 >= total}
								onClick={() => setPage((v) => v + 1)}
							>
								Next
							</button>
						</div>
					)}
					<button type="button" onClick={() => setRefresh((v) => v + 1)}>
						Refresh public cards
					</button>
				</>
			)}
			<Modal
				open={!!confirmation}
				title="Publish these details?"
				onClose={() => {
					if (!lock.current) setConfirmation(null);
				}}
			>
				{confirmation && (
					<>
						<CardView contact={confirmation} />
						<p>
							These details will be publicly readable. The link is not a privacy
							control.
						</p>
						<label className="consent">
							<input
								type="checkbox"
								checked={consent}
								onChange={(e) => setConsent(e.target.checked)}
							/>
							I want these contact details publicly readable.
						</label>
						{error && <p role="alert">{error}</p>}
						<div className="actions">
							<button
								type="button"
								disabled={pending}
								onClick={() => setConfirmation(null)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="primary"
								disabled={!consent || pending}
								onClick={() => void publish()}
							>
								{pending ? "Publishing…" : "Confirm publication"}
							</button>
						</div>
					</>
				)}
			</Modal>
			<Modal
				open={!!remove}
				title="Remove this public card?"
				onClose={() => {
					if (!lock.current) setRemove(null);
				}}
			>
				<p>
					Its public page will stop working. Copies people have downloaded will
					remain with them.
				</p>
				{error && <p role="alert">{error}</p>}
				<div className="actions">
					<button
						type="button"
						disabled={pending}
						onClick={() => setRemove(null)}
					>
						Keep card
					</button>
					<button
						type="button"
						disabled={pending}
						onClick={() => void unpublish()}
					>
						{pending ? "Removing…" : "Remove card"}
					</button>
				</div>
			</Modal>
		</section>
	);
}
function PublicCard({ id }: { id: string }) {
	const [card, setCard] = useState<Published | null>(null),
		[loading, setLoading] = useState(true),
		[error, setError] = useState(""),
		[retry, setRetry] = useState(0),
		[qr, setQr] = useState(""),
		[notice, setNotice] = useState("");
	const link = `${window.location.origin}/c/${encodeURIComponent(id)}`;
	useEffect(() => {
		let active = true;
		setLoading(true);
		setError("");
		void collection
			.get<Contact>(id)
			.then((value) => {
				if (active) {
					if (value && !isContact(value))
						throw new Error("This card could not be read.");
					setCard(value);
				}
			})
			.catch(() => {
				if (active)
					setError(
						"Could not load this public card. Check your connection and try again.",
					);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [id, retry]);
	useEffect(() => {
		let active = true;
		void QRCode.toDataURL(link, {
			width: 320,
			margin: 4,
			errorCorrectionLevel: "M",
			color: { dark: "#102f2c", light: "#ffffff" },
		})
			.then((value) => {
				if (active) setQr(value);
			})
			.catch(() => {
				if (active)
					setNotice("QR code unavailable. You can still copy the link.");
			});
		return () => {
			active = false;
		};
	}, [link]);
	return (
		<>
			<PageHeader
				title="A good connection starts here"
				description="Save the details. Keep in touch."
			/>
			{loading ? (
				<p role="status">Opening this card…</p>
			) : error ? (
				<p role="alert">
					{error}{" "}
					<button type="button" onClick={() => setRetry((v) => v + 1)}>
						Try again
					</button>
				</p>
			) : !card ? (
				<section className="panel">
					<h2>Card not found</h2>
					<p>
						This card may have been removed. Ask the person who shared it for an
						updated link.
					</p>
				</section>
			) : (
				<div className="editor-grid">
					<CardView contact={card} />
					<section className="panel qr-panel">
						<h2>Pass it on</h2>
						<p>Scan to open this public contact card.</p>
						{qr && (
							<img
								src={qr}
								width="320"
								height="320"
								alt={`QR code for ${card.name}'s public card`}
							/>
						)}
						<label htmlFor="public-link">
							Public link
							<input id="public-link" readOnly value={link} />
						</label>
						<button
							type="button"
							onClick={() => {
								void navigator.clipboard
									?.writeText(link)
									.then(() => setNotice("Link copied."))
									.catch(() =>
										setNotice("Copy the public link from the field above."),
									);
								if (!navigator.clipboard)
									setNotice("Copy the public link from the field above.");
							}}
						>
							Copy link
						</button>
						{notice && <p role="status">{notice}</p>}
					</section>
				</div>
			)}
		</>
	);
}
