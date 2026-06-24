import { useEffect, useMemo, useState } from "react";
import { userSession } from "../../services/auth";
import { getUserVoteForPoll } from "../../services/participation";
import { DashboardNavBarComponent } from "../common/DashboardNavBarComponent";
import PollContainer from "../poll/PollContainer";
import styles from "../../styles/GroupTaking.module.css";
import GroupProgressBar from "./GroupProgressBar";

/** Initial per-poll status from the server-computed closed flag. */
function seedCompletion(pollObjects) {
    const map = {};
    pollObjects.forEach((poll) => {
        map[poll.id] = poll?.isClosedByHeight ? "closed" : "todo";
    });
    return map;
}

function BigCheck() {
    return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/**
 * One-at-a-time grouped-poll wizard. Renders the active poll via the shared
 * PollContainer and tracks per-poll completion in a sticky bottom progress bar.
 */
export default function GroupTaking({ groupObject, pollObjects, currentBitcoinBlockHeight, currentStacksBlockHeight }) {
    const polls = useMemo(() => (pollObjects || []).filter(Boolean), [pollObjects]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [completion, setCompletion] = useState(() => seedCompletion(polls));
    const [showFinish, setShowFinish] = useState(false);

    const steps = useMemo(() => polls.map((p) => ({ pollId: p.id, title: p.title })), [polls]);

    const gaiaByPollId = useMemo(() => {
        const map = {};
        (groupObject?.polls || []).forEach((ref) => {
            map[ref.pollId] = ref.gaiaAddress || groupObject?.creatorGaiaAddress;
        });
        return map;
    }, [groupObject]);

    // Seed participation for every poll in parallel for the connected wallet.
    useEffect(() => {
        if (!userSession.isUserSignedIn() || polls.length === 0) return;
        let cancelled = false;
        Promise.all(
            polls.map(async (poll) => {
                const result = await getUserVoteForPoll(poll);
                return result?.voted ? poll.id : null;
            })
        ).then((votedIds) => {
            if (cancelled) return;
            const voted = votedIds.filter(Boolean);
            if (voted.length === 0) return;
            setCompletion((prev) => {
                const next = { ...prev };
                voted.forEach((id) => { next[id] = "done"; });
                return next;
            });
        });
        return () => { cancelled = true; };
    }, [polls]);

    // Advancing/jumping swaps the visible poll in place, so the viewport stays where
    // it was — start each poll (and the finish screen) from the top.
    useEffect(() => {
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }, [activeIndex, showFinish]);

    const setStatus = (pollId, status) => {
        setCompletion((prev) => {
            if (prev[pollId] === "done" && status !== "done") return prev; // never downgrade a vote
            if (prev[pollId] === status) return prev;
            return { ...prev, [pollId]: status };
        });
    };

    const statusOf = (poll) => completion[poll.id] || "todo";

    // Counts (closed polls are not "votable")
    const closedCount = polls.filter((p) => statusOf(p) === "closed").length;
    const votedCount = polls.filter((p) => statusOf(p) === "done").length;
    const votable = polls.length - closedCount;
    const skippedCount = Math.max(0, votable - votedCount); // votable polls left unvoted at finish
    const isLastIndex = activeIndex >= polls.length - 1;

    const goNext = () => {
        if (isLastIndex) setShowFinish(true);
        else setActiveIndex((i) => Math.min(i + 1, polls.length - 1));
    };

    const jumpTo = (i) => { setShowFinish(false); setActiveIndex(i); };

    const handleVoteSuccess = (pollId) => setStatus(pollId, "done"); // immediate dot feedback
    const handleVoteClose = () => goNext(); // success modal dismissed → advance / finish

    const reviewFirstUnfinished = () => {
        const idx = polls.findIndex((p) => statusOf(p) === "todo");
        if (idx >= 0) jumpTo(idx);
    };

    const active = polls[activeIndex];
    const activeStatus = active ? statusOf(active) : "todo";
    const statusEyebrow = showFinish
        ? "Voting window · Summary"
        : activeStatus === "closed"
            ? "Voting window · Closed"
            : "Voting window · Open now";

    // Title/description live only in the page <Head> (meta), not on screen.

    if (polls.length === 0) {
        return (
            <>
                <DashboardNavBarComponent isPollPage={true} />
                <div className={styles.wrap}>
                    <div className={styles.emptyState}>This bundle has no available polls.</div>
                </div>
            </>
        );
    }

    // ---- Finish screen branches ----
    const renderFinish = () => {
        // 1. Everything was already closed — never claim completion.
        if (votable === 0) {
            return (
                <div className={styles.finishBox}>
                    <h2 className={styles.finishTitle}>Nothing to vote on here</h2>
                    <p className={styles.finishText}>
                        Every poll in this group has already closed. You can still review them above.
                    </p>
                    <button className={styles.finishGhost} onClick={() => jumpTo(0)}>Back to start</button>
                </div>
            );
        }
        // 2. Voted on every votable poll — celebrate.
        if (votedCount === votable) {
            return (
                <div className={styles.finishBox}>
                    <div className={styles.finishBadge}><BigCheck /></div>
                    <h2 className={styles.finishTitle}>You&rsquo;re all done</h2>
                    <p className={styles.finishText}>
                        You voted on all {votable} poll{votable === 1 ? "" : "s"} in &ldquo;{groupObject?.title}&rdquo;.
                        {closedCount > 0 ? ` ${closedCount} poll${closedCount === 1 ? " was" : "s were"} already closed.` : ""}
                    </p>
                </div>
            );
        }
        // 3. Reached the end with votable polls still unfinished.
        return (
            <div className={styles.finishBox}>
                <h2 className={styles.finishTitle}>Almost there</h2>
                <p className={styles.finishText}>
                    You&rsquo;ve voted on {votedCount} of {votable} polls.
                    {skippedCount > 0 ? ` ${skippedCount} skipped.` : ""}
                </p>
                <button className={styles.finishPrimary} onClick={reviewFirstUnfinished}>Review remaining</button>
            </div>
        );
    };

    return (
        <>
            <DashboardNavBarComponent isPollPage={true} />
            <div className={styles.wrap}>
                {showFinish && renderFinish()}

                {/* All polls are mounted (pre-loaded in the background); only the
                    active one is shown, so switching between polls is instant. */}
                {polls.map((poll, i) => {
                    const shown = !showFinish && i === activeIndex;
                    const isClosedPoll = statusOf(poll) === "closed";
                    return (
                        <div key={poll.id} style={{ display: shown ? "block" : "none" }} aria-hidden={!shown}>
                            {shown && isClosedPoll ? (
                                <div className={styles.closedBanner}>
                                    <span className={styles.closedDot} aria-hidden="true" />
                                    <span>
                                        <strong>Voting has ended for this poll.</strong> You can view the results, then continue.
                                    </span>
                                </div>
                            ) : null}
                            <PollContainer
                                pollObject={poll}
                                pollId={poll.id}
                                gaiaAddress={gaiaByPollId[poll.id] || groupObject?.creatorGaiaAddress}
                                currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                                currentStacksBlockHeight={currentStacksBlockHeight}
                                embedded={true}
                                onVoteSuccess={handleVoteSuccess}
                                onVoteClose={handleVoteClose}
                                onParticipationChange={setStatus}
                            />
                        </div>
                    );
                })}
            </div>

            <GroupProgressBar
                polls={steps}
                activeIndex={activeIndex}
                completion={completion}
                onJump={jumpTo}
                onNext={goNext}
                statusEyebrow={statusEyebrow}
            />
        </>
    );
}
