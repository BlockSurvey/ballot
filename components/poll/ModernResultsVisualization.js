import { useMemo } from "react";
import styles from "../../styles/Poll.module.css";

export default function ModernResultsVisualization({ 
    pollObject, 
    resultsByOption, 
    totalVotes, 
    totalUniqueVotes 
}) {
    // Calculate results data for visualization
    const resultsData = useMemo(() => {
        if (!pollObject?.options || !resultsByOption) return [];

        return pollObject.options.map(option => {
            const result = resultsByOption[option.id] || { total: 0, percentage: 0 };
            return {
                id: option.id,
                name: option.value,
                votes: parseInt(result.total) || 0,
                percentage: parseFloat(result.percentage) || 0
            };
        }).sort((a, b) => b.votes - a.votes); // Sort by votes descending
    }, [pollObject?.options, resultsByOption]);

    const highestVoteCount = Math.max(...resultsData.map(r => r.votes), 1);

    return (
        <div className={`${styles.card} ${styles.fade_in}`}>
            <div className={styles.card_header}>
                <h2 className={styles.section_title}>Poll Results</h2>
            </div>
            
            <div className={styles.card_content}>
                {/* Results Summary */}
                <div className={styles.results_summary}>
                    <div className={styles.results_stat}>
                        <span className={styles.results_stat_value}>
                            {totalVotes >= 0 ? totalVotes : '0'}
                        </span>
                        <span className={styles.results_stat_label}>Total Votes</span>
                    </div>
                    <div className={styles.results_stat}>
                        <span className={styles.results_stat_value}>
                            {totalUniqueVotes >= 0 ? totalUniqueVotes : '0'}
                        </span>
                        <span className={styles.results_stat_label}>Voters</span>
                    </div>
                    <div className={styles.results_stat}>
                        <span className={styles.results_stat_value}>
                            {pollObject?.options?.length || 0}
                        </span>
                        <span className={styles.results_stat_label}>Options</span>
                    </div>
                </div>

                {/* Results Options */}
                <div className={styles.results_options}>
                    {resultsData.length > 0 ? (
                        resultsData.map((result, index) => (
                            <div key={result.id} className={styles.result_option}>
                                <div className={styles.result_header}>
                                    <div className={styles.result_option_name}>
                                        {result.name}
                                    </div>
                                    <div className={styles.result_percentage}>
                                        {result.percentage}%
                                        <span className={styles.result_votes}>
                                            ({result.votes} votes)
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className={styles.progress_bar}>
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
                                        marginTop: 'var(--space-2)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 'var(--space-2)',
                                        color: '#059669',
                                        fontSize: '0.875rem',
                                        fontWeight: '600'
                                    }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                        </svg>
                                        Leading Option
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className={styles.loading_row}>
                            No votes cast yet. Be the first to vote!
                        </div>
                    )}
                </div>

                {/* Voting System Info */}
                <div style={{ 
                    marginTop: 'var(--space-6)', 
                    padding: 'var(--space-4)', 
                    background: 'var(--color-surface)', 
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    color: 'var(--color-tertiary)'
                }}>
                    <div style={{ fontWeight: '600', marginBottom: 'var(--space-2)' }}>
                        About this poll:
                    </div>
                    <div>
                        <strong>Voting System:</strong> {getVotingSystemName(pollObject?.votingSystem)}
                        {pollObject?.votingStrategyFlag && pollObject?.strategyTokenName && (
                            <>
                                <br />
                                <strong>Token Requirement:</strong> {pollObject.strategyTokenName}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function getVotingSystemName(systemId) {
    const systems = {
        'fptp': 'First Past The Post',
        'block': 'Block Voting',
        'quadratic': 'Quadratic Voting',
        'weighted': 'Weighted Voting'
    };
    return systems[systemId] || 'Unknown System';
}