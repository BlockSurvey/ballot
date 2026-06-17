import { useEffect, useState, useMemo } from "react";
import { Modal } from "react-bootstrap";
import { getFileFromGaia } from "../../services/auth";
import { convertToDisplayDateFormat, formStacksExplorerUrl, truncateMiddle } from "../../services/utils";
import IconTooltip from "./IconTooltip";
import ModalCloseButton from "./ModalCloseButton";
import styles from "../../styles/MyVotesModal.module.css";

const CalendarIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const ExternalIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

const TxIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
    </svg>
);

export default function ModernMyVotesModal({ showMyVotesPopup, handleCloseMyVotesPopup }) {
    const [votes, setVotes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedVote, setSelectedVote] = useState(null);

    useEffect(() => {
        if (showMyVotesPopup) {
            loadMyVotes();
        }
    }, [showMyVotesPopup]);

    const loadMyVotes = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await getFileFromGaia("my_votes_ballot.json");
            if (response) {
                const myVotesObj = JSON.parse(response);
                const votesArray = myVotesObj?.votes || [];
                setVotes(votesArray.reverse());
            } else {
                setVotes([]);
            }
        } catch (error) {
            if (error?.code === "does_not_exist") {
                setVotes([]);
            } else {
                setError("Failed to load your voting history. Please try again.");
                console.error("Error loading votes:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const filteredVotes = useMemo(() => {
        if (!searchQuery) return votes;
        const q = searchQuery.toLowerCase();
        return votes.filter(vote =>
            vote?.title?.toLowerCase().includes(q) ||
            Object.keys(vote?.voteObject || {}).some(optionId =>
                vote?.optionsMap?.[optionId]?.toLowerCase().includes(q)
            )
        );
    }, [votes, searchQuery]);

    const getVotingOptions = (vote) => {
        if (!vote?.voteObject || !vote?.optionsMap) return [];
        return Object.entries(vote.voteObject).map(([optionId, votingPower]) => ({
            option: vote.optionsMap[optionId] || "Unknown option",
            power: votingPower || 0
        }));
    };

    const getTotalVotingPower = (vote) =>
        vote?.voteObject
            ? Object.values(vote.voteObject).reduce((sum, power) => sum + (power || 0), 0)
            : 0;

    const VoteRow = ({ vote, index }) => {
        const options = getVotingOptions(vote);
        const totalPower = getTotalVotingPower(vote);
        const isExpanded = selectedVote === index;
        const visible = isExpanded ? options : options.slice(0, 2);
        const hidden = options.length - visible.length;

        return (
            <div className={styles.row}>
                <div className={styles.row_main} onClick={() => setSelectedVote(isExpanded ? null : index)}>
                    <div className={styles.row_head}>
                        <h3 className={styles.poll_title}>{vote?.title || "Untitled Poll"}</h3>
                        <div className={styles.poll_date}>
                            {CalendarIcon}
                            {convertToDisplayDateFormat(vote?.votedAt) || "Unknown date"}
                        </div>
                    </div>

                    <div className={styles.options}>
                        {options.length > 0 ? (
                            <>
                                {visible.map((opt, idx) => (
                                    <span key={idx} className={styles.chip}>
                                        {opt.option}
                                        {opt.power > 1 && <span className={styles.chip_power}>×{opt.power}</span>}
                                    </span>
                                ))}
                                {!isExpanded && hidden > 0 && (
                                    <span className={styles.more}>+{hidden} more</span>
                                )}
                            </>
                        ) : (
                            <span className={styles.no_options}>No options selected</span>
                        )}
                    </div>

                    <div className={styles.row_right}>
                        <div className={styles.power}>
                            <span className={styles.power_label}>Power</span>
                            <span className={styles.power_value}>{totalPower}</span>
                        </div>
                        <div className={styles.actions}>
                            {vote?.url && (
                                <IconTooltip label="View poll">
                                    <a
                                        href={vote.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.icon_btn}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {ExternalIcon}
                                    </a>
                                </IconTooltip>
                            )}
                            {vote?.txId && (
                                <IconTooltip label="View transaction">
                                    <a
                                        href={formStacksExplorerUrl(vote.txId)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.icon_btn}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {TxIcon}
                                    </a>
                                </IconTooltip>
                            )}
                        </div>
                    </div>
                </div>

                {isExpanded && (
                    <div className={styles.expanded}>
                        <div className={styles.expanded_inner}>
                            <div className={styles.expanded_label}>Voting details</div>
                            {options.map((opt, idx) => (
                                <div key={idx} className={styles.expanded_row}>
                                    <span className={styles.expanded_name}>{opt.option}</span>
                                    <span className={styles.expanded_power}>
                                        {opt.power} vote{opt.power !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            ))}
                            {vote?.txId && (
                                <div className={styles.tx_row}>
                                    <span className={styles.tx_label}>Transaction</span>
                                    <a
                                        href={formStacksExplorerUrl(vote.txId)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.tx_link}
                                    >
                                        {truncateMiddle(vote.txId, 8, 6)}
                                        {ExternalIcon}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Modal
            show={showMyVotesPopup}
            onHide={handleCloseMyVotesPopup}
            size="lg"
            centered
            contentClassName={styles.content}
        >
            <div className={styles.header}>
                <div className={styles.header_left}>
                    <h2 className={styles.title}>My Votes</h2>
                    {!isLoading && votes.length > 0 && (
                        <span className={styles.count}>{votes.length}</span>
                    )}
                </div>
                <ModalCloseButton onClick={handleCloseMyVotesPopup} />
            </div>

            {!isLoading && votes.length > 0 && (
                <div className={styles.search_wrap}>
                    <div className={styles.search}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search polls..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <div className={styles.body}>
                {isLoading ? (
                    <div className={styles.state}>
                        <div className={styles.spinner}></div>
                        <p>Loading your votes…</p>
                    </div>
                ) : error ? (
                    <div className={styles.state}>
                        <svg className={styles.state_icon} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <h3>Unable to load votes</h3>
                        <p>{error}</p>
                        <button className={styles.state_btn} onClick={loadMyVotes}>Try again</button>
                    </div>
                ) : filteredVotes.length > 0 ? (
                    filteredVotes.map((vote, index) => (
                        <VoteRow key={index} vote={vote} index={index} />
                    ))
                ) : votes.length > 0 && searchQuery ? (
                    <div className={styles.state}>
                        <svg className={styles.state_icon} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <h3>No results found</h3>
                        <p>No votes match &ldquo;{searchQuery}&rdquo;</p>
                        <button className={styles.state_btn} onClick={() => setSearchQuery("")}>Clear search</button>
                    </div>
                ) : (
                    <div className={styles.state}>
                        <svg className={styles.state_icon} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <h3>No votes yet</h3>
                        <p>Polls you vote on will appear here.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
