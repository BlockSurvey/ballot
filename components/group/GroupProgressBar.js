import { useEffect, useRef } from "react";
import styles from "../../styles/GroupProgressBar.module.css";

function CheckIcon() {
    return (
        <svg className={styles.glyph} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const STATUS_WORD = {
    done: "voted",
    closed: "voting closed",
    skipped: "skipped",
    active: "current",
    todo: "not yet voted",
};

/**
 * Sticky bottom progress toolbar for the grouped-poll wizard — dark themed
 * horizontal stepper (matches the product prototype).
 *
 * @param {Array<{pollId:string,title?:string,label?:string}>} polls
 * @param {number} activeIndex
 * @param {Object<string,'done'|'closed'|'skipped'|'todo'>} completion
 * @param {string} statusEyebrow - e.g. "Voting window · Open now"
 */
export default function GroupProgressBar({ polls, activeIndex, completion, onJump, onNext, statusEyebrow }) {
    const total = polls.length;
    const stepperRef = useRef(null);
    const activeNodeRef = useRef(null);

    const statusOf = (pollId) => completion[pollId] || "todo";

    const votedCount = polls.filter((p) => statusOf(p.pollId) === "done").length;
    const handledCount = polls.filter((p) => statusOf(p.pollId) !== "todo").length;
    const pct = total > 0 ? Math.round((handledCount / total) * 100) : 0;
    const isLast = activeIndex >= total - 1;

    // Center the active node WITHIN the stepper only — never scroll the window
    // (scrollIntoView on a fixed bar makes the whole page jump).
    useEffect(() => {
        const container = stepperRef.current;
        const node = activeNodeRef.current;
        if (!container || !node) return;
        if (container.scrollWidth <= container.clientWidth) return; // nothing to scroll
        const cRect = container.getBoundingClientRect();
        const nRect = node.getBoundingClientRect();
        const delta = (nRect.left + nRect.width / 2) - (cRect.left + cRect.width / 2);
        container.scrollLeft += delta;
    }, [activeIndex]);

    const nodeStateClass = (status, isActive) => {
        if (isActive) return `${styles.node} ${styles.nodeActive}`;
        if (status === "done") return `${styles.node} ${styles.nodeDone}`;
        if (status === "closed") return `${styles.node} ${styles.nodeClosed}`;
        if (status === "skipped") return `${styles.node} ${styles.nodeSkipped}`;
        return `${styles.node} ${styles.nodeTodo}`;
    };

    return (
        <div className={styles.bar} role="navigation" aria-label="Poll progress">
            <div className={styles.inner}>
                {/* Left: status + voted count */}
                <div className={styles.status}>
                    {statusEyebrow ? <div className={styles.eyebrow}>{statusEyebrow}</div> : null}
                    <div className={styles.count}>
                        <span className={styles.countTotal}>{total} poll{total === 1 ? "" : "s"}</span>
                        <span className={styles.countSep}> · </span>
                        <span className={styles.countVoted}>{votedCount} of {total} voted</span>
                    </div>
                </div>

                {/* Center: horizontal stepper */}
                <div className={styles.stepper} ref={stepperRef}>
                    {polls.map((p, i) => {
                        const status = statusOf(p.pollId);
                        const isActive = i === activeIndex;
                        const label = p.label || p.title || `Poll ${i + 1}`;
                        const prevDone = i > 0 && statusOf(polls[i - 1].pollId) === "done";
                        return (
                            <div className={styles.stepGroup} key={p.pollId}>
                                {i > 0 && (
                                    <span className={`${styles.connector} ${prevDone ? styles.connectorDone : ""}`} aria-hidden="true" />
                                )}
                                <div className={styles.nodeCol}>
                                    <button
                                        type="button"
                                        ref={isActive ? activeNodeRef : null}
                                        className={nodeStateClass(status, isActive)}
                                        onClick={() => onJump(i)}
                                        aria-current={isActive ? "step" : undefined}
                                        aria-label={`Poll ${i + 1}, ${STATUS_WORD[isActive ? "active" : status]}${label ? `: ${label}` : ""}`}
                                        title={label}
                                    >
                                        {status === "done" && !isActive ? <CheckIcon /> : i + 1}
                                    </button>
                                    <span className={`${styles.nodeLabel} ${isActive ? styles.nodeLabelActive : ""}`}>
                                        {label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right: progress + next */}
                <div className={styles.right}>
                    <div className={styles.progressBlock} aria-hidden="true">
                        <div className={styles.progressTrack}>
                            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                        </div>
                        <div className={styles.progressText}>{handledCount} of {total} complete</div>
                    </div>
                    <button type="button" className={styles.nextBtn} onClick={onNext}>
                        {isLast ? "Finish" : "Next vote"} <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
