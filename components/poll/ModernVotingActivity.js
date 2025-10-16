import { useState } from "react";
import { formStacksExplorerUrl } from "../../services/utils";
import { getIndividualResultByStartAndEndPosition } from "./PollService";
import styles from "../../styles/Poll.module.css";

export default function ModernVotingActivity({
    pollObject,
    optionsMap,
    resultsByPosition,
    setResultsByPosition,
    totalUniqueVotes,
    noOfResultsLoaded,
    setNoOfResultsLoaded
}) {
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const generateUserAvatar = (address) => {
        if (!address) return "?";
        return address.substring(0, 2).toUpperCase();
    };

    const formatAddress = (address) => {
        if (!address) return "";
        if (address.length <= 16) return address;
        return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
    };

    const loadMoreResults = async () => {
        if (!pollObject?.publishedInfo?.contractAddress || !pollObject?.publishedInfo?.contractName) {
            return;
        }

        if (isLoadingMore) {
            return; // Prevent multiple simultaneous loads
        }

        setIsLoadingMore(true);

        const contractAddress = pollObject.publishedInfo.contractAddress;
        const contractName = pollObject.publishedInfo.contractName;

        // Calculate start and end positions
        const start = totalUniqueVotes - noOfResultsLoaded;
        let end = start - 10;

        if (end < 0) {
            end = 0;
        }

        try {
            // Load next batch of results
            await getIndividualResultByStartAndEndPosition(
                start,
                end,
                totalUniqueVotes,
                contractAddress,
                contractName,
                resultsByPosition,
                setResultsByPosition,
                noOfResultsLoaded,
                setNoOfResultsLoaded
            );
        } finally {
            // Always clear loading state after completion or error
            setIsLoadingMore(false);
        }
    };

    const hasMoreResults = () => {
        return totalUniqueVotes > Object.keys(resultsByPosition).length;
    };

    return (
        <div className={`${styles.card} ${styles.fade_in}`}>
            <div className={styles.card_header}>
                <h2 className={styles.section_title}>
                    Voting Activity
                    {totalUniqueVotes >= 0 && (
                        <span style={{
                            fontWeight: 'normal',
                            fontSize: '1rem',
                            color: 'var(--color-tertiary)',
                            marginLeft: 'var(--space-2)'
                        }}>
                            ({totalUniqueVotes} {totalUniqueVotes === 1 ? 'voter' : 'voters'})
                        </span>
                    )}
                </h2>
            </div>

            <div className={styles.activity_table}>
                {/* Table Header */}
                <div
                    className={`${styles.activity_header} ${
                        pollObject?.votingStrategyFlag && pollObject?.strategyTokenType === "ft" && pollObject?.votingSystem === "fptp" 
                            ? styles.activity_header_with_lock 
                            : styles.activity_header_default
                    }`}
                >
                    <span>Voter</span>
                    <span>Choice</span>
                    <span>Votes</span>
                    <span>Power</span>
                    {pollObject?.votingStrategyFlag && pollObject?.strategyTokenType === "ft" && pollObject?.votingSystem === "fptp" && (
                        <span>Lock Status</span>
                    )}
                </div>

                {/* Activity Rows */}
                <div>
                    {totalUniqueVotes >= 0 ? (
                        totalUniqueVotes > 0 ? (
                            Object.keys(resultsByPosition)
                                .sort((a, b) => parseInt(b) - parseInt(a)) // Sort by position descending (newest first)
                                .map((position, index) => {
                                    const result = resultsByPosition[position];
                                    const username = result?.username || formatAddress(result?.address);

                                    return (
                                        <div
                                            key={index}
                                            className={`${styles.activity_row} ${
                                                pollObject?.votingStrategyFlag && pollObject?.strategyTokenType === "ft" && pollObject?.votingSystem === "fptp" 
                                                    ? styles.activity_row_with_lock 
                                                    : styles.activity_row_default
                                            }`}
                                        >
                                            {/* User Info */}
                                            <div className={styles.user_info}>
                                                <div
                                                    className={styles.user_avatar}
                                                    style={{
                                                        background: `hsl(${(result?.address?.charCodeAt(0) || 0) * 7}, 50%, 45%)`
                                                    }}
                                                >
                                                    {generateUserAvatar(result?.address)}
                                                </div>
                                                <div>
                                                    {result?.address ? (
                                                        <a
                                                            className={styles.user_address}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            href={formStacksExplorerUrl(result.address, 'address')}
                                                        >
                                                            {username}
                                                        </a>
                                                    ) : (
                                                        <span className={styles.user_address}>Unknown</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Vote Options */}
                                            <div className={styles.vote_option}>
                                                {Object.keys(result?.vote || {}).map((optionId, voteIndex) => (
                                                    <div key={voteIndex} style={{ marginBottom: voteIndex < Object.keys(result.vote).length - 1 ? '2px' : '0' }}>
                                                        {optionsMap[optionId] || `Option ${optionId}`}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Vote Counts */}
                                            <div className={styles.vote_count}>
                                                {Object.values(result?.vote || {}).map((value, voteIndex) => (
                                                    <div key={voteIndex} style={{ marginBottom: voteIndex < Object.values(result.vote).length - 1 ? '2px' : '0' }}>
                                                        {value}
                                                        {pollObject?.votingStrategyFlag && pollObject?.strategyTokenType === "ft" && pollObject?.strategyTokenName && (
                                                            <span style={{
                                                                marginLeft: '4px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                color: 'var(--color-tertiary)'
                                                            }}>
                                                                {pollObject.strategyTokenName}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Voting Power */}
                                            <div className={styles.voting_power_display}>
                                                {result?.votingPower || 0}

                                                {pollObject?.votingStrategyFlag && pollObject?.strategyTokenType === "ft" && (
                                                    // Show strategy token name
                                                    <span style={{
                                                        marginLeft: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: 'var(--color-tertiary)'
                                                    }}>
                                                        {pollObject.strategyTokenName}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Locked/Unlocked Status */}
                                            {pollObject?.votingStrategyFlag && pollObject?.strategyTokenType === "ft" && pollObject?.votingSystem === "fptp" && (
                                                <div className={styles.lock_status}>
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '4px',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            <div style={{
                                                                width: '6px',
                                                                height: '6px',
                                                                borderRadius: '50%',
                                                                background: '#F59E0B',
                                                                flexShrink: 0
                                                            }} />
                                                            <span style={{
                                                                fontWeight: '600',
                                                                color: 'var(--color-primary)'
                                                            }}>
                                                                {result?.lockedStx}
                                                                <span style={{
                                                                    marginLeft: '4px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '600',
                                                                    color: 'var(--color-tertiary)'
                                                                }}>
                                                                    {pollObject.strategyTokenName}
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            <div style={{
                                                                width: '6px',
                                                                height: '6px',
                                                                borderRadius: '50%',
                                                                background: '#10B981',
                                                                flexShrink: 0
                                                            }} />
                                                            <span style={{
                                                                fontWeight: '600',
                                                                color: 'var(--color-primary)'
                                                            }}>
                                                                {result?.unlockedStx}
                                                                <span style={{
                                                                    marginLeft: '4px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '600',
                                                                    color: 'var(--color-tertiary)'
                                                                }}>
                                                                    {pollObject.strategyTokenName}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                        ) : (
                            <div className={styles.loading_row}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    padding: 'var(--space-8)',
                                    color: 'var(--color-tertiary)'
                                }}>
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                                    </svg>
                                    <div>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>No votes yet</div>
                                        <div style={{ fontSize: '0.875rem' }}>Be the first to participate!</div>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className={styles.loading_row}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-2)',
                                padding: 'var(--space-4)'
                            }}>
                                <div className={styles.pulse}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <circle cx="12" cy="12" r="10" opacity="0.3" />
                                    </svg>
                                </div>
                                Loading voting activity...
                            </div>
                        </div>
                    )}

                    {/* Loading More Results */}
                    {isLoadingMore && (
                        <div className={styles.loading_row}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-2)',
                                padding: 'var(--space-4)',
                                borderTop: '1px solid var(--color-border-light)'
                            }}>
                                <div className={styles.pulse}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <circle cx="12" cy="12" r="10" opacity="0.3" />
                                    </svg>
                                </div>
                                <span style={{ fontSize: '0.875rem', color: 'var(--color-tertiary)' }}>
                                    Loading more results...
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Load More Button */}
                    {!isLoadingMore && hasMoreResults() && (
                        <div style={{ padding: 'var(--space-4)', textAlign: 'center', borderTop: '1px solid var(--color-border-light)' }}>
                            <button
                                className={styles.load_more_button}
                                onClick={loadMoreResults}
                            >
                                Load More Results
                                <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                                    ({Object.keys(resultsByPosition).length} of {totalUniqueVotes})
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}