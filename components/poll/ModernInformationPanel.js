import { useMemo } from "react";
import { Constants } from "../../common/constants";
import {
    calculateDateFromBitcoinBlockHeight,
    convertToDisplayDateFormat,
    formStacksExplorerUrl,
    formatLocalDateTime
} from "../../services/utils";
import styles from "../../styles/Poll.module.css";

export default function ModernInformationPanel({ pollObject, resultsByOption, currentBitcoinBlockHeight, totalVotes, totalUniqueVotes, dustVotingResults, dustVotersList, btcVotingResults, btcVotersList }) {
    const votingSystemInfo = useMemo(() => {
        return Constants.VOTING_SYSTEMS.find(system => system.id === pollObject?.votingSystem);
    }, [pollObject?.votingSystem]);

    const formatAddress = (address) => {
        if (!address) return "";
        return `${address.substring(0, 10)}...${address.substring(address.length - 4)}`;
    };

    const getContractLink = (contractName, txId) => {
        return (
            <a
                className="ballot_link"
                target="_blank"
                rel="noreferrer"
                href={formStacksExplorerUrl(txId)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)'
                }}
            >
                {formatAddress(contractName)}
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z"
                        fill="currentColor"
                    />
                </svg>
            </a>
        );
    };

    const getIpfsLink = (ipfsLocation) => {
        return (
            <a
                className="ballot_link"
                target="_blank"
                rel="noreferrer"
                href={`${Constants.IPFS_GATEWAY}${ipfsLocation}`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)'
                }}
            >
                #{ipfsLocation.substring(0, 8)}...
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z"
                        fill="currentColor"
                    />
                </svg>
            </a>
        );
    };

    return (
        <div className={styles.info_panel}>
            {/* Poll Information Card */}
            <div className={`${styles.info_card} ${styles.fade_in}`}>
                <div className={styles.info_card_header}>
                    <h3 className={styles.info_card_title}>Poll Information</h3>
                </div>
                <div className={styles.info_card_content}>
                    {/* Contract */}
                    {pollObject?.publishedInfo?.contractAddress &&
                        pollObject?.publishedInfo?.contractName &&
                        pollObject?.publishedInfo?.txId && (
                            <div className={styles.info_item}>
                                <span className={styles.info_label}>Contract</span>
                                <span className={styles.info_value}>
                                    {getContractLink(pollObject.publishedInfo.contractName, pollObject.publishedInfo.txId)}
                                </span>
                            </div>
                        )}

                    {/* IPFS */}
                    {/* {pollObject?.ipfsLocation && (
                        <div className={styles.info_item}>
                            <span className={styles.info_label}>IPFS</span>
                            <span className={styles.info_value}>
                                {getIpfsLink(pollObject.ipfsLocation)}
                            </span>
                        </div>
                    )} */}

                    {/* Strategy Contract */}
                    {pollObject?.strategyContractName && (
                        <div className={styles.info_item}>
                            <span className={styles.info_label}>Token Strategy</span>
                            <span className={styles.info_value}>
                                <a
                                    className="ballot_link"
                                    target="_blank"
                                    rel="noreferrer"
                                    href={formStacksExplorerUrl(pollObject.strategyContractName)}
                                >
                                    {formatAddress(pollObject.strategyContractName)}
                                </a>
                            </span>
                        </div>
                    )}

                    {/* Voting System */}
                    <div className={styles.info_item}>
                        <span className={styles.info_label}>Voting System</span>
                        <span className={styles.info_value}>
                            {votingSystemInfo?.name || "Unknown"}
                        </span>
                    </div>

                    {/* Start Date */}
                    <div className={styles.info_item}>
                        <span className={styles.info_label}>Start Date</span>
                        <span className={styles.info_value}>
                            {pollObject?.startAtDateUTC
                                ? formatLocalDateTime(pollObject.startAtDateUTC)
                                : pollObject?.startAtBlock && currentBitcoinBlockHeight
                                    ? formatLocalDateTime(calculateDateFromBitcoinBlockHeight(currentBitcoinBlockHeight, pollObject.startAtBlock).toISOString())
                                    : convertToDisplayDateFormat(pollObject?.startAtDate)
                            }
                        </span>
                    </div>

                    {/* End Date */}
                    <div className={styles.info_item}>
                        <span className={styles.info_label}>End Date</span>
                        <span className={styles.info_value}>
                            {pollObject?.endAtDateUTC
                                ? formatLocalDateTime(pollObject.endAtDateUTC)
                                : pollObject?.endAtBlock && currentBitcoinBlockHeight
                                    ? formatLocalDateTime(calculateDateFromBitcoinBlockHeight(currentBitcoinBlockHeight, pollObject.endAtBlock).toISOString())
                                    : convertToDisplayDateFormat(pollObject?.endAtDate)
                            }
                        </span>
                    </div>

                    {/* Block Heights */}
                    <div className={styles.info_item}>
                        <span className={styles.info_label}>Start Block</span>
                        <span className={styles.info_value}>{pollObject?.startAtBlock}</span>
                    </div>

                    <div className={styles.info_item}>
                        <span className={styles.info_label}>End Block</span>
                        <span className={styles.info_value}>{pollObject?.endAtBlock}</span>
                    </div>

                    <div className={styles.info_item}>
                        <span className={styles.info_label}>Current Block</span>
                        <span className={styles.info_value}>{currentBitcoinBlockHeight}</span>
                    </div>
                </div>
            </div>

            {/* Comprehensive Poll Results Card */}
            <div className={`${styles.info_card} ${styles.fade_in}`}>
                <div className={styles.info_card_header}>
                    <h3 className={styles.info_card_title}>Poll Results</h3>
                </div>
                <div className={styles.info_card_content}>
                    {/* Results Summary */}
                    <div className={styles.results_summary} style={{ marginBottom: 'var(--space-4)' }}>
                        <div className={styles.results_stat}>
                            <span className={styles.results_stat_value}>
                                {(() => {
                                    // Calculate total votes from regular results
                                    let regularVotes = 0;
                                    if (resultsByOption && Object.keys(resultsByOption).length > 0) {
                                        regularVotes = Object.values(resultsByOption).reduce((sum, result) => sum + parseInt(result.total || 0), 0);
                                    } else {
                                        regularVotes = totalVotes >= 0 ? totalVotes : 0;
                                    }

                                    // Calculate dust votes
                                    let dustVotes = 0;
                                    if (dustVotingResults && Object.keys(dustVotingResults).length > 0) {
                                        dustVotes = Object.values(dustVotingResults).reduce((sum, result) => sum + (result.totalStx || 0), 0);
                                    }

                                    // Calculate BTC votes
                                    let btcVotes = 0;
                                    if (btcVotingResults && Object.keys(btcVotingResults).length > 0) {
                                        btcVotes = Object.values(btcVotingResults).reduce((sum, result) => sum + (result.totalStx || 0), 0);
                                    }

                                    return regularVotes + dustVotes + btcVotes;
                                })()}
                            </span>
                            <span className={styles.results_stat_label}>Total Votes</span>
                        </div>
                        <div className={styles.results_stat}>
                            <span className={styles.results_stat_value}>
                                {(() => {
                                    // Calculate total unique voters from regular + dust + BTC
                                    const regularVoters = parseInt(totalUniqueVotes) >= 0 ? parseInt(totalUniqueVotes) : 0;
                                    const dustVoters = dustVotersList ? dustVotersList.length : 0;
                                    const btcVoters = btcVotersList ? btcVotersList.length : 0;
                                    return regularVoters + dustVoters + btcVoters;
                                })()}
                            </span>
                            <span className={styles.results_stat_label}>Voters</span>
                        </div>
                    </div>

                    {/* Total Locked/Unlocked Summary */}
                    {(() => {
                        // Calculate regular results totals
                        const regularTotals = { locked: 0, unlocked: 0 };
                        if (resultsByOption && Object.keys(resultsByOption).length > 0) {
                            Object.values(resultsByOption).forEach(result => {
                                regularTotals.locked += parseInt(result.lockedStx) || 0;
                                regularTotals.unlocked += parseInt(result.unlockedStx) || 0;
                            });
                        }

                        // Calculate dust results totals
                        const dustTotals = { locked: 0, unlocked: 0 };
                        if (dustVotingResults && Object.keys(dustVotingResults).length > 0) {
                            Object.values(dustVotingResults).forEach(result => {
                                dustTotals.locked += result.totalLockedStx || 0;
                                dustTotals.unlocked += result.totalUnlockedStx || 0;
                            });
                        }

                        // Calculate BTC results totals
                        const btcTotals = { locked: 0, unlocked: 0 };
                        if (btcVotingResults && Object.keys(btcVotingResults).length > 0) {
                            Object.values(btcVotingResults).forEach(result => {
                                btcTotals.locked += result.totalLockedStx || 0;
                                btcTotals.unlocked += result.totalUnlockedStx || 0;
                            });
                        }

                        // Combine totals
                        const totals = {
                            locked: regularTotals.locked + dustTotals.locked + btcTotals.locked,
                            unlocked: regularTotals.unlocked + dustTotals.unlocked + btcTotals.unlocked
                        };

                        if (totals.locked === 0 && totals.unlocked === 0) return null;

                        return (
                            <div style={{
                                marginBottom: 'var(--space-4)',
                                padding: 'var(--space-3)',
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(0, 0, 0, 0.06)'
                            }}>
                                <div style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: 'var(--color-tertiary)',
                                    marginBottom: 'var(--space-2)',
                                    textAlign: 'center'
                                }}>
                                    Total Voting Power Distribution
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 'var(--space-4)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 'var(--space-1)'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-1)',
                                            fontSize: '0.6875rem',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            color: '#F59E0B'
                                        }}>
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#F59E0B',
                                                boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)'
                                            }} />
                                            Locked
                                        </div>
                                        <div style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '700',
                                            color: 'var(--color-primary)',
                                            letterSpacing: '-0.02em'
                                        }}>
                                            {totals.locked}
                                            <span style={{
                                                marginLeft: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: 'var(--color-tertiary)'
                                            }}>STX</span>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 'var(--space-1)'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-1)',
                                            fontSize: '0.6875rem',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            color: '#10B981'
                                        }}>
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#10B981',
                                                boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
                                            }} />
                                            Unlocked
                                        </div>
                                        <div style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '700',
                                            color: 'var(--color-primary)',
                                            letterSpacing: '-0.02em'
                                        }}>
                                            {totals.unlocked}
                                            <span style={{
                                                marginLeft: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: 'var(--color-tertiary)'
                                            }}>STX</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Results Options with Progress Bars */}
                    <div className={styles.results_options}>
                        {(() => {
                            if (!pollObject?.options || !resultsByOption) {
                                return (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: 'var(--space-4)',
                                        color: 'var(--color-tertiary)',
                                        fontSize: '0.875rem'
                                    }}>
                                        No votes cast yet. Be the first to vote!
                                    </div>
                                );
                            }

                            // Calculate and sort results (merging regular + dust + BTC)
                            const resultsData = pollObject.options.map(option => {
                                // Get regular results
                                const regularResult = resultsByOption[option.id] || { total: 0, percentage: 0, lockedStx: 0, unlockedStx: 0 };

                                // Get dust results for this option
                                const dustResult = dustVotingResults && dustVotingResults[option.id] ? dustVotingResults[option.id] : null;

                                // Get BTC results for this option
                                const btcResult = btcVotingResults && btcVotingResults[option.id] ? btcVotingResults[option.id] : null;

                                // Combine regular, dust, and BTC votes
                                const regularVotes = parseInt(regularResult.total) || 0;
                                const dustVotes = dustResult ? dustResult.totalStx || 0 : 0;
                                const btcVotes = btcResult ? btcResult.totalStx || 0 : 0;
                                const totalVotes = regularVotes + dustVotes + btcVotes;

                                // Combine locked/unlocked STX
                                const regularLockedStx = parseInt(regularResult.lockedStx) || 0;
                                const regularUnlockedStx = parseInt(regularResult.unlockedStx) || 0;
                                const dustLockedStx = dustResult ? dustResult.totalLockedStx || 0 : 0;
                                const dustUnlockedStx = dustResult ? dustResult.totalUnlockedStx || 0 : 0;
                                const btcLockedStx = btcResult ? btcResult.totalLockedStx || 0 : 0;
                                const btcUnlockedStx = btcResult ? btcResult.totalUnlockedStx || 0 : 0;

                                return {
                                    id: option.id,
                                    name: option.value,
                                    votes: totalVotes,
                                    percentage: 0, // Will calculate after getting all totals
                                    lockedStx: regularLockedStx + dustLockedStx + btcLockedStx,
                                    unlockedStx: regularUnlockedStx + dustUnlockedStx + btcUnlockedStx
                                };
                            });

                            // Calculate percentages based on total votes
                            const grandTotalVotes = resultsData.reduce((sum, result) => sum + result.votes, 0);
                            resultsData.forEach(result => {
                                result.percentage = grandTotalVotes > 0 ? ((result.votes / grandTotalVotes) * 100).toFixed(1) : 0;
                            });

                            // Sort by votes (descending)
                            resultsData.sort((a, b) => b.votes - a.votes);

                            return resultsData.map((result, index) => (
                                <div key={result.id} className={styles.result_option} style={{
                                    padding: 'var(--space-3)',
                                    marginBottom: index < resultsData.length - 1 ? 'var(--space-2)' : '0'
                                }}>
                                    <div className={styles.result_header}>
                                        <div className={styles.result_option_name} style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600'
                                        }}>
                                            {result.name.length > 25 ? result.name.substring(0, 25) + "..." : result.name}
                                        </div>
                                        <div className={styles.result_percentage} style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '700'
                                        }}>
                                            {result.percentage}%
                                            <span className={styles.result_votes} style={{
                                                fontSize: '0.75rem',
                                                marginLeft: 'var(--space-1)'
                                            }}>
                                                ({result.votes})
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className={styles.progress_bar} style={{ height: '4px' }}>
                                        <div
                                            className={styles.progress_fill}
                                            style={{
                                                width: `${result.percentage}%`,
                                                background: index === 0 && result.votes > 0 ?
                                                    'linear-gradient(90deg, #059669 0%, #047857 100%)' :
                                                    'linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%)'
                                            }}
                                        />
                                    </div>

                                    {/* Locked/Unlocked Breakdown */}
                                    {(result.lockedStx > 0 || result.unlockedStx > 0) && (
                                        <div style={{
                                            marginTop: 'var(--space-3)',
                                            padding: 'var(--space-2)',
                                            background: 'rgba(0, 0, 0, 0.02)',
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: 'var(--space-3)',
                                            fontSize: '0.8125rem'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 'var(--space-1)'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-1)',
                                                    color: 'var(--color-tertiary)',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: '500',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    <div style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: '#F59E0B',
                                                        flexShrink: 0
                                                    }} />
                                                    Locked
                                                </div>
                                                <div style={{
                                                    fontWeight: '700',
                                                    fontSize: '0.875rem',
                                                    color: 'var(--color-primary)',
                                                    letterSpacing: '-0.01em'
                                                }}>
                                                    {result.lockedStx}
                                                    <span style={{
                                                        marginLeft: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: 'var(--color-tertiary)'
                                                    }}>STX</span>
                                                </div>
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 'var(--space-1)'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-1)',
                                                    color: 'var(--color-tertiary)',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: '500',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    <div style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: '#10B981',
                                                        flexShrink: 0
                                                    }} />
                                                    Unlocked
                                                </div>
                                                <div style={{
                                                    fontWeight: '700',
                                                    fontSize: '0.875rem',
                                                    color: 'var(--color-primary)',
                                                    letterSpacing: '-0.01em'
                                                }}>
                                                    {result.unlockedStx}
                                                    <span style={{
                                                        marginLeft: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: 'var(--color-tertiary)'
                                                    }}>STX</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Winner Badge */}
                                    {index === 0 && result.votes > 0 && (
                                        <div style={{
                                            marginTop: 'var(--space-1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-1)',
                                            color: '#059669',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                            Leading
                                        </div>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>

                    {/* Voting System Info */}
                    <div style={{
                        marginTop: 'var(--space-4)',
                        padding: 'var(--space-3)',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        color: 'var(--color-tertiary)'
                    }}>
                        <div style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>
                            Voting System:
                        </div>
                        <div>
                            {(() => {
                                const systems = {
                                    'fptp': 'First Past The Post',
                                    'block': 'Block Voting',
                                    'quadratic': 'Quadratic Voting',
                                    'weighted': 'Weighted Voting'
                                };
                                return systems[pollObject?.votingSystem] || 'Unknown System';
                            })()}
                            {pollObject?.votingStrategyFlag && pollObject?.strategyTokenName && (
                                <>
                                    <br />
                                    <strong>Token:</strong> {pollObject.strategyTokenName}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Token Strategy Info (if applicable) */}
            {pollObject?.votingStrategyFlag && pollObject?.strategyTokenName && (
                <div className={`${styles.info_card} ${styles.fade_in}`}>
                    <div className={styles.info_card_header}>
                        <h3 className={styles.info_card_title}>Voting Requirements</h3>
                    </div>
                    <div className={styles.info_card_content}>
                        <div className={styles.info_item}>
                            <span className={styles.info_label}>Token Required</span>
                            <span className={styles.info_value}>
                                {pollObject.strategyTokenName}
                            </span>
                        </div>

                        {pollObject?.strategyTokenType && (
                            <div className={styles.info_item}>
                                <span className={styles.info_label}>Token Type</span>
                                <span className={styles.info_value} style={{ textTransform: 'uppercase' }}>
                                    {pollObject.strategyTokenType}
                                </span>
                            </div>
                        )}

                        {pollObject?.snapshotBlockHeight && (
                            <div className={styles.info_item}>
                                <span className={styles.info_label}>Snapshot Block</span>
                                <span className={styles.info_value}>
                                    {pollObject.snapshotBlockHeight}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}