import { useEffect, useState, useMemo } from "react";
import { Modal } from "react-bootstrap";
import { getFileFromGaia } from "../../services/auth";
import { convertToDisplayDateFormat, formStacksExplorerUrl } from "../../services/utils";
import styles from "../../styles/Dashboard.module.css";

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

        return votes.filter(vote =>
            vote?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            Object.keys(vote?.voteObject || {}).some(optionId =>
                vote?.optionsMap?.[optionId]?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }, [votes, searchQuery]);

    const getVotingOptions = (vote) => {
        if (!vote?.voteObject || !vote?.optionsMap) return [];

        return Object.entries(vote.voteObject).map(([optionId, votingPower]) => ({
            option: vote.optionsMap[optionId] || 'Unknown option',
            power: votingPower || 0
        }));
    };

    const getTotalVotingPower = (vote) => {
        if (!vote?.voteObject) return 0;
        return Object.values(vote.voteObject).reduce((sum, power) => sum + (power || 0), 0);
    };

    const VoteCard = ({ vote, index }) => {
        const options = getVotingOptions(vote);
        const totalPower = getTotalVotingPower(vote);
        const isExpanded = selectedVote === index;

        return (
            <div className={styles.vote_card_modern}>
                <div className={styles.vote_card_main} onClick={() => setSelectedVote(isExpanded ? null : index)}>
                    <div className={styles.vote_card_left}>
                        <h3 className={styles.vote_card_title}>
                            {vote?.title || 'Untitled Poll'}
                        </h3>
                        <div className={styles.vote_card_meta}>
                            <span className={styles.vote_card_date}>
                                {convertToDisplayDateFormat(vote?.votedAt) || 'Unknown date'}
                            </span>
                        </div>
                    </div>

                    <div className={styles.vote_card_center}>
                        <div className={styles.vote_options_list}>
                            {options.length > 0 ? (
                                options.slice(0, isExpanded ? undefined : 2).map((opt, idx) => (
                                    <div key={idx} className={styles.vote_option_item}>
                                        <span className={styles.option_text}>{opt.option}</span>
                                        {opt.power > 1 && (
                                            <span className={styles.option_power}>×{opt.power}</span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <span className={styles.no_options}>No options selected</span>
                            )}
                            {!isExpanded && options.length > 2 && (
                                <span className={styles.more_options}>+{options.length - 2} more</span>
                            )}
                        </div>
                    </div>

                    <div className={styles.vote_card_right}>
                        <div className={styles.voting_power_section}>
                            <span className={styles.power_label}>Power</span>
                            <span className={styles.power_number}>{totalPower}</span>
                        </div>
                        <div className={styles.vote_card_actions}>
                            {vote?.url && (
                                <a
                                    href={vote.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.action_link}
                                    onClick={(e) => e.stopPropagation()}
                                    title="View Poll"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                                    </svg>
                                </a>
                            )}
                            {vote?.txId && (
                                <a
                                    href={formStacksExplorerUrl(vote.txId)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.action_link}
                                    onClick={(e) => e.stopPropagation()}
                                    title="View Transaction"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"/>
                                    </svg>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {isExpanded && (
                    <div className={styles.vote_card_expanded}>
                        <div className={styles.expanded_section}>
                            <h4 className={styles.expanded_title}>Complete Voting Details</h4>
                            <div className={styles.expanded_options}>
                                {options.map((opt, idx) => (
                                    <div key={idx} className={styles.expanded_option_row}>
                                        <span className={styles.expanded_option_name}>{opt.option}</span>
                                        <span className={styles.expanded_option_power}>
                                            {opt.power} vote{opt.power !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {vote?.txId && (
                            <div className={styles.transaction_section}>
                                <span className={styles.tx_label}>Transaction ID</span>
                                <a
                                    href={formStacksExplorerUrl(vote.txId)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.tx_link}
                                >
                                    {vote.txId.substring(0, 8)}...{vote.txId.substring(vote.txId.length - 6)}
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                                    </svg>
                                </a>
                            </div>
                        )}
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
            className={styles.minimal_modal}
        >
            <div className={styles.minimal_modal_content}>
                {/* Header */}
                <div className={styles.minimal_modal_header}>
                    <h2 className={styles.minimal_modal_title}>My Votes</h2>
                    <button
                        className={styles.minimal_close_btn}
                        onClick={handleCloseMyVotesPopup}
                        aria-label="Close"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                {/* Search Bar */}
                {!isLoading && votes.length > 0 && (
                    <div className={styles.minimal_search_container}>
                        <div className={styles.minimal_search_box}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                            </svg>
                            <input
                                type="text"
                                placeholder="Search polls..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.minimal_search_input}
                            />
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className={styles.minimal_modal_body}>
                    {isLoading ? (
                        <div className={styles.minimal_loading_state}>
                            <div className={styles.minimal_spinner}>
                                <svg width="40" height="40" viewBox="0 0 24 24">
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        fill="none"
                                        strokeDasharray="31.4 31.4"
                                        className={styles.spinner_rotate}
                                    />
                                </svg>
                            </div>
                            <p className={styles.loading_text}>Loading your votes...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.minimal_error_state}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            </svg>
                            <h3>Unable to Load Votes</h3>
                            <p>{error}</p>
                            <button
                                className={styles.minimal_button}
                                onClick={loadMyVotes}
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filteredVotes.length > 0 ? (
                        <div className={styles.votes_list}>
                            {/* Vote Cards */}
                            <div className={styles.vote_cards_container}>
                                {filteredVotes.map((vote, index) => (
                                    <VoteCard key={index} vote={vote} index={index} />
                                ))}
                            </div>
                        </div>
                    ) : votes.length > 0 && searchQuery ? (
                        <div className={styles.minimal_empty_state}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                            </svg>
                            <h3>No Results Found</h3>
                            <p>No votes match "{searchQuery}"</p>
                            <button
                                className={styles.minimal_button_secondary}
                                onClick={() => setSearchQuery('')}
                            >
                                Clear Search
                            </button>
                        </div>
                    ) : (
                        <div className={styles.minimal_empty_state}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                                <path d="M18 13h-.68l-2 2h1.91L19 17H5l1.78-2h2.05l-2-2H6l-3 3v4c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2v-4l-3-3zm-1-5.05l-4.95 4.95-3.54-3.54 4.95-4.95L17 7.95zm-4.24-5.66L6.39 8.66c-.39.39-.39 1.02 0 1.41l4.95 4.95c.39.39 1.02.39 1.41 0l6.36-6.36c.39-.39.39-1.02 0-1.41L14.16 2.3c-.38-.4-1.01-.4-1.4-.01z"/>
                            </svg>
                            <h3>No Votes Yet</h3>
                            <p>You haven't cast any votes yet</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}