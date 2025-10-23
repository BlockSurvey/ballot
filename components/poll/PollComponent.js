import { useState } from "react";
import { Modal } from "react-bootstrap";
import { getFileFromGaia, getMyStxAddress, putFileToGaia, userSession } from "../../services/auth";
import { formStacksExplorerUrl, formatNumber } from "../../services/utils";
import styles from "../../styles/Poll.module.css";
import ModernInformationPanel from "./ModernInformationPanel";
import ModernPollHeader from "./ModernPollHeader";
import ModernVotingActivity from "./ModernVotingActivity";
import ModernVotingInterface from "./ModernVotingInterface";

export default function PollComponent(props) {
    const {
        pollObject,
        isPreview,
        optionsMap,
        resultsByOption,
        resultsByPosition,
        setResultsByPosition,
        totalVotes,
        totalUniqueVotes,
        dns,
        alreadyVoted,
        userVoteData,
        noHoldingToken,
        holdingTokenIdsArray,
        votingPower,
        publicUrl,
        txStatus,
        noOfResultsLoaded,
        setNoOfResultsLoaded,
        currentBitcoinBlockHeight,
        currentStacksBlockHeight,
        stacksBalance,
        dustVotingMap,
        userDustVotingStatus,
        dustVotingResults,
        dustVotersList,
        dustVotingLoading,
        btcVotingMap,
        userBtcVotingStatus,
        btcVotingResults,
        btcVotersList,
        btcVotingLoading,
    } = props;

    const [txId, setTxId] = useState();
    const [show, setShow] = useState(false);
    const [voteObject, setVoteObject] = useState({});

    const handleShow = () => setShow(true);
    const handleClose = () => {
        setShow(false);
        // Refresh the page to show latest voting data
        window.location.reload();
    };

    const handleVoteSuccess = (data, selectedOptions) => {
        if (data?.txId) {
            setTxId(data.txId);
            setVoteObject(selectedOptions);
            processMyVote(data, selectedOptions);
            handleShow();
        }
    };

    const processMyVote = (data, selectedOptions) => {
        getFileFromGaia("my_votes_ballot.json").then(
            (response) => {
                if (response) {
                    const myVotesObj = JSON.parse(response);
                    if (myVotesObj && myVotesObj.votes) {
                        saveMyVoteToGaia(myVotesObj, data, selectedOptions);
                    }
                }
            },
            (error) => {
                if (error && error.code == "does_not_exist") {
                    const myVotesObj = { votes: [] };
                    saveMyVoteToGaia(myVotesObj, data, selectedOptions);
                }
            }
        );
    };

    const saveMyVoteToGaia = (myVotesObj, data, selectedOptions) => {
        myVotesObj.votes.push({
            title: pollObject?.title,
            url: publicUrl,
            voteObject: selectedOptions,
            optionsMap: optionsMap,
            votedAt: Date.now(),
            txId: data.txId,
            txRaw: data.txRaw
        });

        putFileToGaia(
            "my_votes_ballot.json",
            JSON.stringify(myVotesObj),
            { dangerouslyIgnoreEtag: true }
        );
    };

    return (
        <>
            <div className={styles.poll_container}>
                {pollObject && pollObject.id ? (
                    <div className={styles.poll_layout}>
                        {/* Main Content */}
                        <div>
                            {/* Modern Poll Header */}
                            <ModernPollHeader
                                pollObject={pollObject}
                                publicUrl={publicUrl}
                                txStatus={txStatus}
                            />

                            {/* Modern Voting Interface */}
                            <ModernVotingInterface
                                pollObject={pollObject}
                                isPreview={isPreview}
                                alreadyVoted={alreadyVoted}
                                userVoteData={userVoteData}
                                noHoldingToken={noHoldingToken}
                                holdingTokenIdsArray={holdingTokenIdsArray}
                                votingPower={votingPower}
                                dns={dns}
                                currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                                currentStacksBlockHeight={currentStacksBlockHeight}
                                stacksBalance={stacksBalance}
                                dustVotingMap={dustVotingMap}
                                userDustVotingStatus={userDustVotingStatus}
                                dustVotingResults={dustVotingResults}
                                btcVotingMap={btcVotingMap}
                                userBtcVotingStatus={userBtcVotingStatus}
                                btcVotingResults={btcVotingResults}
                                onVoteSuccess={handleVoteSuccess}
                            />

                            {/* Modern Information Panel - Mobile Only (after Cast Your Vote) */}
                            <div className={styles.mobile_only}>
                                <ModernInformationPanel
                                    pollObject={pollObject}
                                    resultsByOption={resultsByOption}
                                    currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                                    currentStacksBlockHeight={currentStacksBlockHeight}
                                    totalVotes={totalVotes}
                                    totalUniqueVotes={totalUniqueVotes}
                                    dustVotingResults={dustVotingResults}
                                    dustVotersList={dustVotersList}
                                    dustVotingLoading={dustVotingLoading}
                                    btcVotingResults={btcVotingResults}
                                    btcVotersList={btcVotersList}
                                    btcVotingLoading={btcVotingLoading}
                                />
                            </div>

                            {/* Modern Voting Activity */}
                            <ModernVotingActivity
                                pollObject={pollObject}
                                optionsMap={optionsMap}
                                resultsByPosition={resultsByPosition}
                                setResultsByPosition={setResultsByPosition}
                                totalUniqueVotes={totalUniqueVotes}
                                noOfResultsLoaded={noOfResultsLoaded}
                                setNoOfResultsLoaded={setNoOfResultsLoaded}
                            />

                            {/* STX Dust Transaction Activity - Loading State */}
                            {(dustVotingLoading) && (
                                <div className={`${styles.card} ${styles.fade_in} ${styles.btc_loading_card}`} style={{ marginTop: 'var(--space-4)' }}>
                                    <div className={styles.card_header}>
                                        <h2 className={styles.section_title}>
                                            STX Dust Transactions
                                            <span className={styles.loading_badge}>
                                                <div className={styles.loading_dot}></div>
                                                <div className={styles.loading_dot}></div>
                                                <div className={styles.loading_dot}></div>
                                            </span>
                                        </h2>
                                        <div className={styles.loading_subtitle}>Processing STX dust transactions...</div>
                                    </div>

                                    <div className={styles.activity_table}>
                                        {/* Table Header */}
                                        <div className={`${styles.activity_header} ${styles.activity_header_with_lock} ${styles.loading_header}`}>
                                            <span className={styles.shimmer_text}>Voter</span>
                                            <span className={styles.shimmer_text}>Choice</span>
                                            <span className={styles.shimmer_text}>Votes</span>
                                            <span className={styles.shimmer_text}>Power</span>
                                            <span className={styles.shimmer_text}>Lock Status</span>
                                        </div>

                                        {/* Loading Content */}
                                        <div className={styles.loading_table_content}>
                                            <div className={`${styles.activity_row} ${styles.loading_simple_row}`}>
                                                <div className={styles.loading_simple_content}>
                                                    <div className={styles.loading_simple_text}>
                                                        Analyzing STX dust transactions...
                                                    </div>
                                                    <div className={styles.loading_simple_time}>
                                                        This may take 1-2 minutes
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Dust Transaction Activity */}
                            {dustVotersList && dustVotersList.length > 0 && (
                                <div className={`${styles.card} ${styles.fade_in}`} style={{ marginTop: 'var(--space-4)' }}>
                                    <div className={styles.card_header}>
                                        <h2 className={styles.section_title}>
                                            STX Dust Transactions
                                            <span className={styles.section_title_count}>
                                                ({dustVotersList.length} {dustVotersList.length === 1 ? 'transaction' : 'transactions'})
                                            </span>
                                        </h2>
                                    </div>

                                    <div className={styles.activity_table}>
                                        {/* Table Header */}
                                        <div className={`${styles.activity_header} ${styles.activity_header_with_lock}`}>
                                            <span>Voter</span>
                                            <span>Choice</span>
                                            <span>Votes</span>
                                            <span>Power</span>
                                            <span>Lock Status</span>
                                        </div>

                                        {/* Transaction Rows */}
                                        <div>
                                            {dustVotersList.map((voter, index) => {
                                                const generateUserAvatar = (address) => {
                                                    if (!address) return "?";
                                                    return address.substring(0, 2).toUpperCase();
                                                };

                                                const formatAddress = (address) => {
                                                    if (!address) return "";
                                                    if (address.length <= 16) return address;
                                                    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
                                                };

                                                return (
                                                    <div
                                                        key={voter.address}
                                                        className={`${styles.activity_row} ${styles.activity_row_with_lock}`}
                                                    >
                                                        {/* User Info */}
                                                        <div className={styles.user_info}>
                                                            <div
                                                                className={styles.user_avatar}
                                                                style={{
                                                                    background: `hsl(${(voter.address?.charCodeAt(0) || 0) * 7}, 50%, 45%)`
                                                                }}
                                                            >
                                                                {generateUserAvatar(voter.address)}
                                                            </div>
                                                            <div>
                                                                <a
                                                                    className={styles.user_address}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    href={formStacksExplorerUrl(voter.address, 'address')}
                                                                >
                                                                    {formatAddress(voter.address)}
                                                                </a>
                                                                {voter.isCurrentUser && (
                                                                    <div style={{
                                                                        background: '#10B981',
                                                                        color: 'white',
                                                                        padding: '1px 6px',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.625rem',
                                                                        fontWeight: '700',
                                                                        textTransform: 'uppercase',
                                                                        marginTop: '2px',
                                                                        display: 'inline-block'
                                                                    }}>
                                                                        You
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Vote Options */}
                                                        <div className={styles.vote_option}>
                                                            {voter.votedOptions.map((option, voteIndex) => (
                                                                <div key={voteIndex} className={styles.vote_item}>
                                                                    {option.optionValue}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Vote Counts (Dust Amount) */}
                                                        <div className={styles.vote_count}>
                                                            {voter.votedOptions.map((option, voteIndex) => (
                                                                <div key={voteIndex} className={styles.vote_item}>
                                                                    {formatNumber(option.dustAmount)}
                                                                    <span className={styles.token_name}>
                                                                        STX
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Voting Power */}
                                                        <div className={styles.voting_power_display}>
                                                            {formatNumber(voter.stxBalance || 0)}
                                                            <span className={styles.token_name}>
                                                                STX
                                                            </span>
                                                        </div>

                                                        {/* Locked/Unlocked Status */}
                                                        <div className={styles.lock_status}>
                                                            <div className={styles.lock_status_container}>
                                                                <div className={styles.status_indicator}>
                                                                    <div className={`${styles.status_dot} ${styles.status_dot_locked}`} />
                                                                    <span className={styles.status_text}>
                                                                        {formatNumber(voter.lockedStx || 0)}
                                                                        <span className={styles.token_name}>
                                                                            STX
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                                <div className={styles.status_indicator}>
                                                                    <div className={`${styles.status_dot} ${styles.status_dot_unlocked}`} />
                                                                    <span className={styles.status_text}>
                                                                        {formatNumber(voter.unlockedStx || 0)}
                                                                        <span className={styles.token_name}>
                                                                            STX
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BTC Address Votes - Loading State */}
                            {(btcVotingLoading) && (
                                <div className={`${styles.card} ${styles.fade_in} ${styles.btc_loading_card}`} style={{ marginTop: 'var(--space-4)' }}>
                                    <div className={styles.card_header}>
                                        <h2 className={styles.section_title}>
                                            Bitcoin Address Votes
                                            <span className={styles.loading_badge}>
                                                <div className={styles.loading_dot}></div>
                                                <div className={styles.loading_dot}></div>
                                                <div className={styles.loading_dot}></div>
                                            </span>
                                        </h2>
                                        <div className={styles.loading_subtitle}>Analyzing blockchain data across PoX cycles...</div>
                                    </div>

                                    <div className={styles.activity_table}>
                                        {/* Table Header */}
                                        <div className={`${styles.activity_header} ${styles.activity_header_with_lock} ${styles.loading_header}`}>
                                            <span className={styles.shimmer_text}>STX Voter</span>
                                            <span className={styles.shimmer_text}>Choice</span>
                                            <span className={styles.shimmer_text}>BTC Address</span>
                                            <span className={styles.shimmer_text}>Power</span>
                                            <span className={styles.shimmer_text}>Lock Status</span>
                                        </div>

                                        {/* Loading Content */}
                                        <div className={styles.loading_table_content}>
                                            <div className={`${styles.activity_row} ${styles.loading_simple_row}`}>
                                                <div className={styles.loading_simple_content}>
                                                    <div className={styles.loading_simple_text}>
                                                        Processing Bitcoin dust transactions...
                                                    </div>
                                                    <div className={styles.loading_simple_time}>
                                                        This may take 2-4 minutes
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BTC Voting Activity */}
                            {btcVotersList && btcVotersList.length > 0 && (
                                <div className={`${styles.card} ${styles.fade_in}`} style={{ marginTop: 'var(--space-4)' }}>
                                    <div className={styles.card_header}>
                                        <h2 className={styles.section_title}>
                                            Bitcoin Address Votes
                                            <span className={styles.section_title_count}>
                                                ({btcVotersList.length} {btcVotersList.length === 1 ? 'vote' : 'votes'})
                                            </span>
                                        </h2>
                                    </div>

                                    <div className={styles.activity_table}>
                                        {/* Table Header */}
                                        <div className={`${styles.activity_header} ${styles.activity_header_with_lock}`}>
                                            <span>STX Voter</span>
                                            <span>Choice</span>
                                            <span>BTC Address</span>
                                            <span>Power</span>
                                            <span>Lock Status</span>
                                        </div>

                                        {/* BTC Vote Rows */}
                                        <div>
                                            {btcVotersList.map((voter, index) => {
                                                const generateUserAvatar = (address) => {
                                                    if (!address) return "?";
                                                    return address.substring(0, 2).toUpperCase();
                                                };

                                                const formatAddress = (address) => {
                                                    if (!address) return "";
                                                    if (address.length <= 16) return address;
                                                    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
                                                };

                                                const currentUserAddress = userSession?.isUserSignedIn() ? getMyStxAddress() : null;
                                                const isCurrentUser = currentUserAddress && voter.address === currentUserAddress;

                                                return (
                                                    <div
                                                        key={voter.address || index}
                                                        className={`${styles.activity_row} ${styles.activity_row_with_lock}`}
                                                    >
                                                        {/* User Info */}
                                                        <div className={styles.user_info}>
                                                            <div
                                                                className={styles.user_avatar}
                                                                style={{
                                                                    background: `hsl(${(voter.address?.charCodeAt(0) || 0) * 7}, 50%, 45%)`
                                                                }}
                                                            >
                                                                {generateUserAvatar(voter.address)}
                                                            </div>
                                                            <div>
                                                                <a
                                                                    className={styles.user_address}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    href={formStacksExplorerUrl(voter.address, 'address')}
                                                                >
                                                                    {formatAddress(voter.address)}
                                                                </a>
                                                                {isCurrentUser && (
                                                                    <div style={{
                                                                        background: '#10B981',
                                                                        color: 'white',
                                                                        padding: '1px 6px',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.625rem',
                                                                        fontWeight: '700',
                                                                        textTransform: 'uppercase',
                                                                        marginTop: '2px',
                                                                        display: 'inline-block'
                                                                    }}>
                                                                        You
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Vote Options */}
                                                        <div className={styles.vote_option}>
                                                            {voter.votedOptions.map((option, voteIndex) => (
                                                                <div key={voteIndex} className={styles.vote_item}>
                                                                    {option.optionValue}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* BTC Address Info */}
                                                        <div className={styles.vote_count}>
                                                            {voter.votedOptions.map((option, voteIndex) => (
                                                                <div key={voteIndex} className={styles.vote_item}>
                                                                    <a
                                                                        href={`https://mempool.space/address/${option.btcAddress}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        style={{
                                                                            color: '#F7931A',
                                                                            textDecoration: 'none',
                                                                            fontSize: '0.75rem'
                                                                        }}
                                                                    >
                                                                        {formatAddress(option.btcAddress)}
                                                                    </a>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Voting Power */}
                                                        <div className={styles.voting_power_display}>
                                                            {formatNumber(voter.stxBalance || 0)}
                                                            <span className={styles.token_name}>
                                                                STX
                                                            </span>
                                                        </div>

                                                        {/* Locked/Unlocked Status */}
                                                        <div className={styles.lock_status}>
                                                            <div className={styles.lock_status_container}>
                                                                <div className={styles.status_indicator}>
                                                                    <div className={`${styles.status_dot} ${styles.status_dot_locked}`} />
                                                                    <span className={styles.status_text}>
                                                                        {formatNumber(voter.lockedStx || 0)}
                                                                        <span className={styles.token_name}>
                                                                            STX
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                                <div className={styles.status_indicator}>
                                                                    <div className={`${styles.status_dot} ${styles.status_dot_unlocked}`} />
                                                                    <span className={styles.status_text}>
                                                                        {formatNumber(voter.unlockedStx || 0)}
                                                                        <span className={styles.token_name}>
                                                                            STX
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar - Desktop Only */}
                        <div className={styles.desktop_only}>
                            <ModernInformationPanel
                                pollObject={pollObject}
                                resultsByOption={resultsByOption}
                                currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                                currentStacksBlockHeight={currentStacksBlockHeight}
                                totalVotes={totalVotes}
                                totalUniqueVotes={totalUniqueVotes}
                                dustVotingResults={dustVotingResults}
                                dustVotersList={dustVotersList}
                                dustVotingLoading={dustVotingLoading}
                                btcVotingResults={btcVotingResults}
                                btcVotersList={btcVotersList}
                                btcVotingLoading={btcVotingLoading}
                            />
                        </div>
                    </div>
                ) : (
                    <div className={styles.loading_row}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--space-2)',
                            minHeight: '50vh'
                        }}>
                            <div className={styles.pulse}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="10" opacity="0.3" />
                                </svg>
                            </div>
                            Loading poll data...
                        </div>
                    </div>
                )}
            </div>

            {/* Success Modal */}
            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton style={{ border: 'none', paddingBottom: 0 }}>
                    <Modal.Title style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: 'var(--color-primary)'
                    }}>
                        Vote Submitted Successfully!
                        <span style={{ fontSize: '1.5rem', marginLeft: '8px' }}>🎉</span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '0 24px 24px', fontSize: '1rem', lineHeight: '1.6' }}>
                    <div style={{ marginBottom: '16px', color: 'var(--color-secondary)' }}>
                        Your vote has been successfully recorded on the Stacks blockchain.
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <a
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '14px 20px',
                                background: '#000000',
                                color: '#ffffff',
                                textDecoration: 'none',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #000000',
                                fontSize: '15px',
                                fontWeight: '500',
                                textAlign: 'center',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer'
                            }}
                            href={formStacksExplorerUrl(txId)}
                            target="_blank"
                            rel="noreferrer"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#333333';
                                e.currentTarget.style.borderColor = '#333333';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#000000';
                                e.currentTarget.style.borderColor = '#000000';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                View Transaction on Explorer
                            </span>
                        </a>
                        <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--color-tertiary)',
                                marginBottom: '6px',
                                fontWeight: '500',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Transaction ID
                            </div>
                            <div style={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                color: 'var(--color-secondary)',
                                wordBreak: 'break-all',
                                lineHeight: '1.4'
                            }}>
                                {txId}
                            </div>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
}