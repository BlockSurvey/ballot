import { useMemo } from "react";
import { Constants } from "../../common/constants";
import {
    calculateDateByBlockHeight,
    convertToDisplayDateFormat,
    formStacksExplorerUrl,
    formatLocalDateTime
} from "../../services/utils";
import styles from "../../styles/Poll.module.css";

export default function ModernInformationPanel({ pollObject, resultsByOption, currentBitcoinBlockHeight, totalVotes, totalUniqueVotes }) {
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
                                : convertToDisplayDateFormat(pollObject?.startAtDate)
                            }
                        </span>
                    </div>

                    {/* End Date */}
                    <div className={styles.info_item}>
                        <span className={styles.info_label}>End Date</span>
                        <span className={styles.info_value}>
                            {pollObject?.endAtBlock && currentBitcoinBlockHeight < pollObject?.endAtBlock ? (
                                formatLocalDateTime(calculateDateByBlockHeight(currentBitcoinBlockHeight, pollObject.endAtBlock))
                            ) : (
                                pollObject?.endAtDateUTC
                                    ? formatLocalDateTime(pollObject.endAtDateUTC)
                                    : convertToDisplayDateFormat(pollObject?.endAtDate)
                            )}
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
                                    // Calculate total votes from all options
                                    if (resultsByOption && Object.keys(resultsByOption).length > 0) {
                                        return Object.values(resultsByOption).reduce((sum, result) => sum + parseInt(result.total || 0), 0);
                                    }
                                    return totalVotes >= 0 ? totalVotes : '0';
                                })()}
                            </span>
                            <span className={styles.results_stat_label}>Total Votes</span>
                        </div>
                        <div className={styles.results_stat}>
                            <span className={styles.results_stat_value}>
                                {totalUniqueVotes >= 0 ? totalUniqueVotes : '0'}
                            </span>
                            <span className={styles.results_stat_label}>Voters</span>
                        </div>
                    </div>

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

                            // Calculate and sort results
                            const resultsData = pollObject.options.map(option => {
                                const result = resultsByOption[option.id] || { total: 0, percentage: 0 };
                                return {
                                    id: option.id,
                                    name: option.value,
                                    votes: parseInt(result.total) || 0,
                                    percentage: parseFloat(result.percentage) || 0
                                };
                            }).sort((a, b) => b.votes - a.votes);

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