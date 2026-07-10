import { useEffect, useMemo, useState } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { QRCodeCanvas } from "qrcode.react"; // v4: default export removed
import { getFileFromGaia } from "../../services/auth";
import { enrichPollIndexBlockHeights, getCurrentBlockHeights, getPollLifecycleStatus } from "../../services/utils";
import {
    createGroup, deleteGroup, getGroupIndex, getGroupPublicUrl, getOwnGaiaAddress, getOwnGroup, updateGroup
} from "../../services/group-storage";
import ModalCloseButton from "../common/ModalCloseButton";
import styles from "../../styles/CreateGroupModal.module.css";

function CheckIcon({ size = 12 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function recency(ref) {
    return new Date(ref?.updatedAt || ref?.createdAt || 0).getTime();
}
function fmtDate(d) {
    try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return ""; }
}

/**
 * Groups manager (opened from the profile dropdown). Three views:
 *  list   — existing groups with copy / edit / delete + a "New group" action
 *  builder— create or edit a group (title, polls, order)
 *  share  — success screen with the link + QR
 */
export default function GroupsModal({ show, onClose }) {
    const [view, setView] = useState("list");

    // data
    const [groupIndex, setGroupIndex] = useState({ list: [], ref: {} });
    const [allPolls, setAllPolls] = useState(null);
    const [ownGaia, setOwnGaia] = useState("");
    const [loading, setLoading] = useState(false);
    // Current Bitcoin height drives the same height-based status the dashboard uses.
    const [currentBitcoinBlockHeight, setCurrentBitcoinBlockHeight] = useState(0);

    // list interactions
    const [deletingId, setDeletingId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    // builder fields
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [selected, setSelected] = useState([]);
    const [query, setQuery] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // share
    const [shareUrl, setShareUrl] = useState("");
    const [copied, setCopied] = useState(false);

    const loadList = async () => {
        setLoading(true);
        try {
            const [idx, gaia, heights] = await Promise.all([
                getGroupIndex(),
                getOwnGaiaAddress(),
                getCurrentBlockHeights().catch(() => null),
            ]);
            setGroupIndex(idx);
            setOwnGaia(gaia);
            if (heights?.bitcoinHeight) setCurrentBitcoinBlockHeight(heights.bitcoinHeight);
        } catch (e) {
            setGroupIndex({ list: [], ref: {} });
        } finally {
            setLoading(false);
        }
    };

    const ensurePolls = async () => {
        if (allPolls?.list) return;
        try {
            const res = await getFileFromGaia("pollIndex.json", {});
            const parsed = res ? JSON.parse(res) : { list: [], ref: {} };
            // Enrich with block heights (read-only) so status matches the dashboard,
            // even if the dashboard's persisted backfill hasn't completed yet.
            const { index } = await enrichPollIndexBlockHeights(parsed);
            setAllPolls({ ...index });
        } catch (e) {
            setAllPolls({ list: [], ref: {} });
        }
    };

    useEffect(() => {
        if (!show) return;
        setView("list");
        setEditingId(null);
        setDeletingId(null);
        setShareUrl("");
        setError("");
        loadList();
    }, [show]);

    // ---- builder helpers ----
    const publishedIds = useMemo(() => {
        if (!allPolls?.list) return [];
        return allPolls.list
            .filter((id) => {
                const ref = allPolls.ref?.[id];
                // Match the dashboard: only published, non-archived polls. Drafts can't
                // be grouped; archived polls are hidden there, so exclude them here too.
                return ref && ref.status !== "draft" && ref.archived !== true;
            })
            .sort((a, b) => recency(allPolls.ref[b]) - recency(allPolls.ref[a]));
    }, [allPolls]);

    const showSearch = publishedIds.length > 8;
    const visibleIds = useMemo(() => {
        if (!query.trim()) return publishedIds;
        const q = query.trim().toLowerCase();
        return publishedIds.filter((id) => (allPolls.ref[id]?.title || "").toLowerCase().includes(q));
    }, [publishedIds, query, allPolls]);

    const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
    const move = (i, dir) => setSelected((p) => {
        const n = [...p]; const t = i + dir;
        if (t < 0 || t >= n.length) return p;
        [n[i], n[t]] = [n[t], n[i]]; return n;
    });
    const removeSel = (id) => setSelected((p) => p.filter((x) => x !== id));

    const titleFor = (id) => allPolls?.ref?.[id]?.title || "Untitled poll";

    // ---- view transitions ----
    const openCreate = async () => {
        await ensurePolls();
        setEditingId(null);
        setTitle(""); setDescription(""); setSelected([]); setQuery(""); setError("");
        setView("builder");
    };

    const openEdit = async (groupId) => {
        await ensurePolls();
        setError("");
        const g = await getOwnGroup(groupId);
        setEditingId(groupId);
        setTitle(g?.title || groupIndex.ref[groupId]?.title || "");
        setDescription(g?.description || "");
        setSelected((g?.polls || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((p) => p.pollId));
        setQuery("");
        setView("builder");
    };

    const canSave = title.trim().length > 0 && selected.length > 0 && !busy;

    const handleSave = async () => {
        setError(""); setBusy(true);
        try {
            const polls = selected.map((pollId) => ({ pollId, title: titleFor(pollId) }));
            if (editingId) {
                await updateGroup({ id: editingId, title, description, polls });
                await loadList();
                setView("list");
            } else {
                const { url } = await createGroup({ title, description, polls });
                setShareUrl(url);
                setCopied(false);
                setView("share");
            }
        } catch (e) {
            setError(e?.message || "Couldn't save the group. Check your connection and try again.");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (groupId) => {
        setBusy(true);
        try {
            const idx = await deleteGroup(groupId);
            setGroupIndex(idx);
        } catch (e) {
            // ignore — keep row
        } finally {
            setBusy(false);
            setDeletingId(null);
        }
    };

    const copyText = async (text, markId) => {
        try {
            await navigator.clipboard.writeText(text);
            if (markId) { setCopiedId(markId); setTimeout(() => setCopiedId(null), 1800); }
            else { setCopied(true); setTimeout(() => setCopied(false), 2000); }
        } catch (e) { /* ignore */ }
    };

    const requestClose = () => { if (!busy) onClose(); };

    const headerTitle = view === "share" ? "Group created"
        : view === "builder" ? (editingId ? "Edit group" : "Create a grouped poll")
            : "Your groups";

    return (
        <Modal show={show} onHide={requestClose} keyboard={!busy} backdrop={busy ? "static" : true} centered size="lg" scrollable>
            <div className={styles.header}>
                <div className={styles.headerTitle}>{headerTitle}</div>
                <ModalCloseButton onClick={requestClose} />
            </div>

            {/* ================= LIST ================= */}
            {view === "list" && (
                <>
                    <div className={styles.body}>
                        {loading ? (
                            <div className={styles.loadingBlock}>
                                <Spinner animation="border" variant="secondary" size="sm" />
                                <span>Loading your groups…</span>
                            </div>
                        ) : groupIndex.list.length === 0 ? (
                            <div className={styles.emptyGroups}>
                                <div className={styles.emptyIllo} aria-hidden="true">
                                    <span className={styles.illoCard} />
                                    <span className={styles.illoCard} />
                                    <span className={styles.illoCardFront}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                            <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                            <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                            <path d="M17.5 14v7M14 17.5h7" />
                                        </svg>
                                    </span>
                                </div>
                                <h3 className={styles.emptyHeading}>No groups yet</h3>
                                <p className={styles.emptyBody}>
                                    Bundle several published polls into one shareable link — respondents
                                    complete them all in one place, one after another.
                                </p>
                                <button className={styles.btnPrimary} onClick={openCreate}>＋ Create your first group</button>
                            </div>
                        ) : (
                            <div className={styles.groupList}>
                                {groupIndex.list.slice().reverse().map((id) => {
                                    const g = groupIndex.ref[id];
                                    if (!g) return null;
                                    const url = getGroupPublicUrl(id, ownGaia);
                                    const confirming = deletingId === id;
                                    return (
                                        <div key={id} className={styles.groupRow}>
                                            <div className={styles.groupInfo}>
                                                <div className={styles.groupTitle}>{g.title || "Untitled group"}</div>
                                                <div className={styles.groupMeta}>{g.pollCount || 0} poll{g.pollCount === 1 ? "" : "s"} · {fmtDate(g.createdAt)}</div>
                                            </div>
                                            {confirming ? (
                                                <div className={styles.confirmRow}>
                                                    <span className={styles.confirmText}>Delete?</span>
                                                    <button className={styles.iconBtnDanger} onClick={() => handleDelete(id)} disabled={busy}>Yes</button>
                                                    <button className={styles.iconBtn} onClick={() => setDeletingId(null)}>No</button>
                                                </div>
                                            ) : (
                                                <div className={styles.rowActions}>
                                                    <button className={styles.iconBtn} onClick={() => copyText(url, id)} title="Copy link">
                                                        {copiedId === id ? "Copied" : "Copy"}
                                                    </button>
                                                    <a className={styles.iconBtn} href={url} target="_blank" rel="noopener noreferrer" title="Open">Open</a>
                                                    <button className={styles.iconBtn} onClick={() => openEdit(id)} title="Edit">Edit</button>
                                                    <button className={styles.iconBtn} onClick={() => setDeletingId(id)} title="Delete" aria-label="Delete group">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {!loading && groupIndex.list.length > 0 && (
                        <div className={styles.footer}>
                            <button className={styles.btnPrimary} onClick={openCreate}>＋ New group</button>
                        </div>
                    )}
                </>
            )}

            {/* ================= BUILDER ================= */}
            {view === "builder" && (
                <>
                    <div className={styles.body}>
                        <div className={styles.section}>
                            <label className={styles.label} htmlFor="group-title">Group title</label>
                            <input id="group-title" className={styles.input} value={title}
                                onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q3 Governance Bundle" maxLength={120} aria-required="true" />
                        </div>

                        <div className={styles.section}>
                            <label className={styles.label} htmlFor="group-desc">Description <span className={styles.labelMuted}>(optional)</span></label>
                            <textarea id="group-desc" className={styles.textarea} value={description}
                                onChange={(e) => setDescription(e.target.value)} placeholder="A short note shown to respondents" maxLength={300} />
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionHead}>
                                <span className={styles.label} style={{ margin: 0 }}>Choose polls</span>
                                <span className={styles.countLive} aria-live="polite">{selected.length > 0 ? `${selected.length} selected` : ""}</span>
                            </div>

                            {showSearch && (
                                <input className={styles.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search polls" aria-label="Search polls" />
                            )}

                            {!allPolls ? (
                                <div className={styles.loadingBlock}><Spinner animation="border" variant="secondary" size="sm" /><span>Loading your polls…</span></div>
                            ) : publishedIds.length === 0 ? (
                                <div className={styles.emptyBlock}>
                                    <div className={styles.emptyBadge} aria-hidden="true">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="4" y="3" width="16" height="18" rx="2" />
                                            <path d="M8 8h8M8 12h8M8 16h5" />
                                        </svg>
                                    </div>
                                    <div className={styles.emptyTitle}>No published polls yet</div>
                                    <div className={styles.emptyText}>Only published polls can be grouped. Publish a poll, then come back to bundle it.</div>
                                </div>
                            ) : visibleIds.length === 0 ? (
                                <div className={styles.noMatch}>No polls match &ldquo;{query}&rdquo;.</div>
                            ) : (
                                <div className={styles.pollList} role="group" aria-label="Available polls">
                                    {visibleIds.map((pollId) => {
                                        const ref = allPolls.ref[pollId];
                                        const on = selected.includes(pollId);
                                        // Same height-based source of truth as the dashboard.
                                        const status = getPollLifecycleStatus(ref, currentBitcoinBlockHeight);
                                        const closed = status === "closed";
                                        const statusLabel = status === "closed" ? "Closed"
                                            : status === "not_started" ? "Not started" : "Active";
                                        return (
                                            <div key={pollId} className={`${styles.pollRow} ${on ? styles.selected : ""}`}
                                                role="checkbox" aria-checked={on} tabIndex={0}
                                                onClick={() => toggle(pollId)}
                                                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(pollId); } }}>
                                                <span className={`${styles.checkbox} ${on ? styles.on : ""}`}>{on ? <CheckIcon /> : null}</span>
                                                <span className={styles.pollMeta}><span className={styles.pollTitle}>{ref?.title || "Untitled poll"}</span></span>
                                                <span className={styles.statusPill}>
                                                    <span className={`${styles.statusDot} ${closed ? styles.statusDotClosed : ""}`} aria-hidden="true" />
                                                    {statusLabel}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {selected.length > 0 && (
                            <div className={styles.section}>
                                <span className={styles.label}>Order · {selected.length} poll{selected.length === 1 ? "" : "s"}</span>
                                {selected.map((pollId, i) => (
                                    <div key={pollId} className={styles.orderRow}>
                                        <span className={styles.orderIndex}>{i + 1}</span>
                                        <span className={styles.pollMeta}><span className={styles.pollTitle}>{titleFor(pollId)}</span></span>
                                        <span className={styles.orderArrows}>
                                            <button className={styles.arrowBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                                            <button className={styles.arrowBtn} disabled={i === selected.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                                            <button className={styles.arrowBtn} onClick={() => removeSel(pollId)} aria-label="Remove from group">✕</button>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {error ? <div className={styles.errorBlock} role="alert">{error}</div> : null}
                    </div>

                    <div className={styles.footer}>
                        <button className={styles.btnGhost} onClick={() => setView("list")} disabled={busy}>Back</button>
                        <button className={styles.btnPrimary} onClick={handleSave} disabled={!canSave}>
                            {busy ? "Saving…" : editingId ? "Save changes" : "Create group"}
                        </button>
                    </div>
                </>
            )}

            {/* ================= SHARE ================= */}
            {view === "share" && (
                <div className={styles.share}>
                    <div className={styles.shareBadge}><CheckIcon size={26} /></div>
                    <h2 className={styles.shareTitle}>Your group is ready</h2>
                    <p className={styles.shareSub}>Share one link — respondents complete all {selected.length} poll{selected.length === 1 ? "" : "s"} in order, on a single page.</p>

                    <div className={styles.qrWrap} role="img" aria-label="QR code for the group link">
                        <QRCodeCanvas value={shareUrl} size={160} level="M" />
                    </div>

                    <div className={styles.linkRow}>
                        <span className={styles.linkText} title={shareUrl}>{shareUrl}</span>
                        <button className={styles.linkCopy} onClick={() => copyText(shareUrl)}>{copied ? "Copied" : "Copy"}</button>
                    </div>

                    <button className={styles.sharePrimary} onClick={() => copyText(shareUrl)}>
                        {copied ? <><CheckIcon /> Copied</> : "Copy link"}
                    </button>

                    <div className={styles.shareSecondaryRow}>
                        <a className={styles.shareGhost} href={shareUrl} target="_blank" rel="noopener noreferrer">Open link</a>
                        <button className={styles.shareGhost} onClick={onClose}>Done</button>
                    </div>

                    <button className={styles.shareTertiary} onClick={() => { loadList(); setView("list"); }}>← Back to groups</button>
                    <span className={styles.srOnly} aria-live="polite">{copied ? "Link copied to clipboard" : ""}</span>
                </div>
            )}
        </Modal>
    );
}
