import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { authenticate, userSession, getMyStxAddress } from "../../services/auth";
import { castMyVoteContractCall } from "../../services/contract";
import { formatNumber } from "../../services/utils";
import styles from "../../styles/Poll.module.css";
import SendTxModal from "../common/SendTxModal";
import CountdownTimer from "../common/CountdownTimer";

export default function ModernVotingInterface({
    pollObject,
    gaiaAddress,
    isPreview,
    alreadyVoted,
    userVoteData,
    noHoldingToken,
    holdingTokenIdsArray,
    votingPower,
    dns,
    currentBitcoinBlockHeight,
    currentStacksBlockHeight,
    stacksBalance,
    dustVotingMap,
    userDustVotingStatus,
    dustVotingResults,
    onVoteSuccess
}) {
    const [selectedOptions, setSelectedOptions] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUserSignedIn, setIsUserSignedIn] = useState(false);
    const [showSendTxModal, setShowSendTxModal] = useState(false);
    const [enableDustVoting, setEnableDustVoting] = useState(false);
    const [dustTransactionsCompleted, setDustTransactionsCompleted] = useState(false);
    const [dustVoteTransaction, setDustVoteTransaction] = useState(null);

    useEffect(() => {
        if (userSession && userSession.isUserSignedIn()) {
            setIsUserSignedIn(true);
        }
    }, []);

    // Pre-select user's previous votes when already voted
    useEffect(() => {
        if (alreadyVoted && userVoteData && Object.keys(userVoteData).length > 0) {
            setSelectedOptions(userVoteData);
        }
    }, [alreadyVoted, userVoteData]);

    const handleOptionSelect = (optionId, optionValue) => {
        if (isDisabled()) return;

        const newSelectedOptions = { ...selectedOptions };

        if (pollObject?.votingSystem === "fptp") {
            // First-past-the-post: only one option
            setSelectedOptions({ [optionId]: votingPower || 1 });
        } else {
            // Block voting: multiple options
            if (newSelectedOptions[optionId]) {
                delete newSelectedOptions[optionId];
            } else {
                newSelectedOptions[optionId] = votingPower || 1;
            }
            setSelectedOptions(newSelectedOptions);
        }

        // Clear any error messages when user makes a selection
        if (errorMessage) {
            setErrorMessage("");
        }
    };

    const handleVoteValueChange = (optionId, value) => {
        const numValue = parseInt(value) || 0;
        const newSelectedOptions = { ...selectedOptions };

        if (numValue <= 0) {
            delete newSelectedOptions[optionId];
        } else {
            newSelectedOptions[optionId] = numValue;
        }

        setSelectedOptions(newSelectedOptions);
    };

    const isDisabled = () => {
        return (
            isPreview ||
            !holdingTokenIdsArray ||
            alreadyVoted ||
            dustTransactionsCompleted || // Disable after dust voting is completed
            isProcessing ||
            noHoldingToken ||
            (!currentBitcoinBlockHeight || currentBitcoinBlockHeight < pollObject?.startAtBlock) ||
            (!currentBitcoinBlockHeight || currentBitcoinBlockHeight > pollObject?.endAtBlock)
        );
    };

    const validateVote = () => {
        if (!selectedOptions || Object.keys(selectedOptions).length === 0) {
            setErrorMessage("Please select at least one option to vote");
            return false;
        }

        // For quadratic and weighted voting, check if total votes don't exceed voting power
        if (pollObject?.votingSystem === "quadratic" || pollObject?.votingSystem === "weighted") {
            const totalVotes = Object.values(selectedOptions).reduce((sum, votes) => {
                return sum + (parseInt(votes) || 0);
            }, 0);

            if (totalVotes > (votingPower || 1)) {
                setErrorMessage(`Total votes (${totalVotes}) cannot exceed your voting power (${votingPower || 1})`);
                return false;
            }
        }

        return true;
    };

    const handleVote = async () => {
        if (enableDustVoting && hasDustOptionsSelected()) {
            // Show dust transaction modal first
            setShowSendTxModal(true);
        } else {
            // Regular voting
            await handleRegularVote();
        }
    };

    // For snapshot polls, fetch the server-signed voting power (balance at the
    // snapshot block) which the contract verifies on-chain (replaces at-block).
    const fetchSnapshotSignature = async () => {
        try {
            const voterAddress = getMyStxAddress();
            // Prefer the gaiaAddress passed down as a prop — it's the poll's own
            // storage address and is correct in every context. Only fall back to
            // deriving it from a single-poll URL (/{pollId}/{gaiaAddress}); that
            // path parse is WRONG inside a grouped poll (/group/{groupId}/{gaia}),
            // where segment [1] is the groupId, not the gaia.
            let resolvedGaia = gaiaAddress;
            if (!resolvedGaia && typeof window !== "undefined") {
                resolvedGaia = window.location.pathname.split("/").filter(Boolean)[1];
            }
            if (!voterAddress || !resolvedGaia) return null;

            const resp = await fetch("/api/snapshot/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pollId: pollObject?.id, gaiaAddress: resolvedGaia, voterAddress })
            });
            if (!resp.ok) return null;
            const data = await resp.json();
            if (!data?.signature) return null;
            // `scheme` tells the contract call which args the deployed contract
            // expects: "power" (legacy, single arg) or "split" (locked+unlocked).
            return {
                scheme: data.scheme || "split",
                locked: data.locked,
                unlocked: data.unlocked,
                power: data.power,
                signature: data.signature,
            };
        } catch (error) {
            console.error("Snapshot signature fetch failed:", error);
            return null;
        }
    };

    const handleRegularVote = async () => {
        if (!validateVote()) return;

        setIsProcessing(true);
        setErrorMessage("");

        try {
            const contractAddress = pollObject?.publishedInfo?.contractAddress;
            const contractName = pollObject?.publishedInfo?.contractName;

            let snapshot;
            if (pollObject?.usesSnapshotOracle) {
                snapshot = await fetchSnapshotSignature();
                if (!snapshot) {
                    setErrorMessage("Could not verify your snapshot voting power. Please try again.");
                    setIsProcessing(false);
                    return;
                }
            }

            await castMyVoteContractCall(
                contractAddress,
                contractName,
                selectedOptions,
                dns,
                holdingTokenIdsArray,
                (data) => {
                    if (data?.txId && onVoteSuccess) {
                        onVoteSuccess(data, selectedOptions);
                    }
                    setIsProcessing(false);
                },
                snapshot
            );
        } catch (error) {
            console.error("Vote failed:", error);
            // Show the real reason so wallet/serialization issues are diagnosable.
            const detail = error?.message || String(error);
            setErrorMessage(`Failed to cast vote: ${detail}`);
            setIsProcessing(false);
        }
    };
    const getVotingSystemDescription = () => {
        switch (pollObject?.votingSystem) {
            case "fptp":
                return "Select one option";
            case "block":
                return "Select one or more options";
            case "quadratic":
                return "Distribute your votes across options (quadratic cost)";
            case "weighted":
                return "Distribute your votes across options";
            default:
                return "";
        }
    };

    const isPollActive = () => {
        if (!currentBitcoinBlockHeight) return false;
        return currentBitcoinBlockHeight >= pollObject?.startAtBlock &&
            currentBitcoinBlockHeight <= pollObject?.endAtBlock;
    };

    // Block height is the source of truth: a poll is closed once the current
    // Bitcoin height passes its end block, regardless of the tentative end date.
    // In preview, always render the poll as if it were live so the full voting
    // UI (dust toggle, options, vote button) is shown regardless of block height.
    const isPollClosed = () => {
        if (isPreview) return false;
        return !!currentBitcoinBlockHeight && currentBitcoinBlockHeight > pollObject?.endAtBlock;
    };

    // Not started yet: current height is still below the start block.
    const isPollNotStarted = () => {
        if (isPreview) return false;
        return !!currentBitcoinBlockHeight && currentBitcoinBlockHeight < pollObject?.startAtBlock;
    };

    // Title that reflects the poll's lifecycle state.
    const getVotingSectionTitle = () => {
        if (alreadyVoted) return "Your Vote";
        if (isPollClosed()) return "Voting Closed";
        if (isPollNotStarted()) return "Voting Opens Soon";
        return "Cast Your Vote";
    };

    const getPollStatusMessage = () => {
        if (!currentBitcoinBlockHeight) return "";

        if (currentBitcoinBlockHeight < pollObject?.startAtBlock) {
            return "Poll has not started yet";
        }
        if (currentBitcoinBlockHeight > pollObject?.endAtBlock) {
            return "Poll has ended";
        }
        return "";
    };

    // Check if any options have dust settings
    const hasDustOptions = () => {
        return pollObject?.options?.some(option =>
            option.dustAddress && option.dustAmount && option.dustAmount > 0
        );
    };

    // Check if any selected options have dust settings
    const hasDustOptionsSelected = () => {
        return Object.keys(selectedOptions).some(optionId => {
            const option = pollObject?.options?.find(opt => opt.id === optionId);
            return option?.dustAddress && option?.dustAmount && option.dustAmount > 0;
        });
    };

    // Handle transaction success for dust voting
    const handleTransactionSuccess = (transaction) => {
        setDustTransactionsCompleted(true);
        setDustVoteTransaction(transaction);

        // Call the parent success callback to show voting completion
        if (onVoteSuccess) {
            const dustVoteData = {
                type: 'dust-vote',
                transaction: transaction,
                selectedOptions: selectedOptions,
                txId: transaction.txId
            };
            onVoteSuccess(dustVoteData, selectedOptions);
        }
    };

    // Handle direct voting when user wants to skip dust transactions
    const handleVoteDirectly = async () => {
        // Disable dust voting
        setEnableDustVoting(false);

        // Close the send transaction modal
        setShowSendTxModal(false);

        // Handle the regular vote
        await handleRegularVote();
    };

    return (
        <div className={`${styles.card} ${styles.fade_in}`}>
            <div className={styles.card_content}>
                <div className={styles.voting_section} style={alreadyVoted ? {

                    pointerEvents: 'none',
                    position: 'relative'
                } : {}}>
                    {/* Overlay for already voted */}
                    {alreadyVoted && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(240,240,240,0.6) 100%)',
                            borderRadius: 'var(--radius-md)',
                            zIndex: 1,
                            pointerEvents: 'none'
                        }} />
                    )}

                    <h2 className={styles.section_title}>
                        {getVotingSectionTitle()}
                        {/* Countdown Timer - Show for active polls regardless of voting status */}
                        {isPollActive() && (
                            <CountdownTimer
                                endAtBlock={pollObject?.endAtBlock}
                                currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                                showTimer={true}
                            />
                        )}
                    </h2>

                    {/* Poll Closed Banner - block height is the source of truth */}
                    {isPollClosed() && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-4)',
                            marginBottom: 'var(--space-4)',
                            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            boxShadow: '0 4px 6px -1px rgba(17, 24, 39, 0.3)',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '1rem' }}>Poll Closed</div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '2px' }}>
                                    Voting ended at block {formatNumber(pollObject?.endAtBlock)}. This poll is no longer accepting votes.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Not Started Banner - poll opens at the start block */}
                    {isPollNotStarted() && (
                        <div style={{
                            padding: 'var(--space-4)',
                            marginBottom: 'var(--space-4)',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-primary)',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M12 7v5l3 2" />
                                </svg>
                                <span style={{ fontWeight: '700', fontSize: '1rem' }}>Voting hasn’t started yet</span>
                                <CountdownTimer
                                    endAtBlock={pollObject?.startAtBlock}
                                    currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                                    showTimer={true}
                                />
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-tertiary)', marginTop: 'var(--space-1)', paddingLeft: 'calc(22px + var(--space-2))' }}>
                                Voting opens at block {formatNumber(pollObject?.startAtBlock)}. Check back once it’s reached.
                            </div>
                        </div>
                    )}

                    {/* Already Voted Banner */}
                    {alreadyVoted && (
                        <div style={{
                            padding: 'var(--space-4)',
                            marginBottom: 'var(--space-4)',
                            background: userDustVotingStatus ?
                                'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            boxShadow: userDustVotingStatus ?
                                '0 4px 6px -1px rgba(245, 158, 11, 0.3)' :
                                '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                marginBottom: 'var(--space-2)'
                            }}>
                                {userDustVotingStatus ? (
                                    <span style={{ fontSize: '1.5rem' }}></span>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                )}
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                                        {userDustVotingStatus ? 'You Have Already Voted via Dust Transactions' : 'Vote Successfully Recorded'}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '4px' }}>
                                        {userDustVotingStatus ?
                                            'Your dust transaction votes have been detected and recorded' :
                                            'Your vote has been recorded on the chain and is displayed below'
                                        }
                                    </div>
                                </div>
                            </div>

                            {/* Show dust voting details if user voted via dust */}
                            {userDustVotingStatus && (
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-3)',
                                    marginTop: 'var(--space-3)'
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr',
                                        gap: 'var(--space-3)',
                                        fontSize: '0.8125rem',
                                        marginBottom: 'var(--space-3)'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ opacity: 0.8, marginBottom: '4px' }}>Total STX</div>
                                            <div style={{ fontWeight: '700', fontSize: '1rem' }}>{formatNumber(userDustVotingStatus.stxBalance)}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ opacity: 0.8, marginBottom: '4px' }}>Locked</div>
                                            <div style={{ fontWeight: '600' }}>{formatNumber(userDustVotingStatus.lockedStx || 0)}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ opacity: 0.8, marginBottom: '4px' }}>Unlocked</div>
                                            <div style={{ fontWeight: '600' }}>{formatNumber(userDustVotingStatus.unlockedStx || 0)}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ opacity: 0.8, fontSize: '0.75rem', marginBottom: '6px' }}>You voted for:</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {userDustVotingStatus.votedOptions?.map((option, index) => (
                                                <span key={index} style={{
                                                    background: 'rgba(255, 255, 255, 0.2)',
                                                    padding: '4px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {option.optionValue}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Dust Voting Success Banner */}
                    {dustTransactionsCompleted && (
                        <div style={{
                            padding: 'var(--space-4)',
                            marginBottom: 'var(--space-4)',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                marginBottom: 'var(--space-3)'
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>💰</span>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                                        Dust Vote Successfully Completed!
                                    </div>
                                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '4px' }}>
                                        Your STX transactions have been sent to the option creators
                                    </div>
                                </div>
                            </div>

                            {/* Transaction Details */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-3)',
                                marginTop: 'var(--space-3)'
                            }}>
                                <div style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    marginBottom: 'var(--space-2)'
                                }}>
                                    Transaction Details:
                                </div>
                                {dustVoteTransaction && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.8125rem',
                                        marginBottom: 'var(--space-2)',
                                        opacity: 0.9
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{dustVoteTransaction.optionName}</div>
                                            {dustVoteTransaction.txId && (
                                                <a
                                                    href={dustVoteTransaction.explorerUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        color: 'rgba(255, 255, 255, 0.8)',
                                                        fontSize: '0.75rem',
                                                        textDecoration: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        marginTop: '2px'
                                                    }}
                                                    onMouseOver={(e) => e.target.style.color = 'white'}
                                                    onMouseOut={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.8)'}
                                                >
                                                    🔗 View Transaction
                                                </a>
                                            )}
                                        </div>
                                        <span style={{ fontWeight: '700' }}>{formatNumber(dustVoteTransaction.amount)} STX</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Dust Voting Toggle - only while the poll is open for voting */}
                    {hasDustOptions() && !alreadyVoted && !isPollClosed() && !isPollNotStarted() && pollObject?.votingSystem === 'fptp' && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.05) 100%)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-4)',
                            marginBottom: 'var(--space-4)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 'var(--space-2)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)'
                                }}>
                                    <div>
                                        <div style={{
                                            fontWeight: '700',
                                            color: 'var(--color-primary)',
                                            fontSize: '1rem'
                                        }}>
                                            Dust Voting Available
                                        </div>
                                        <div style={{
                                            fontSize: '0.8125rem',
                                            color: 'var(--color-secondary)',
                                            marginTop: '2px'
                                        }}>
                                            Send small STX amounts to option creators
                                        </div>
                                    </div>
                                </div>
                                <label style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    width: '44px',
                                    height: '24px'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={enableDustVoting}
                                        onChange={(e) => setEnableDustVoting(e.target.checked)}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute',
                                        cursor: 'pointer',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: enableDustVoting ? '#f59e0b' : '#cbd5e1',
                                        borderRadius: '24px',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        <span style={{
                                            position: 'absolute',
                                            content: '',
                                            height: '18px',
                                            width: '18px',
                                            left: enableDustVoting ? '23px' : '3px',
                                            bottom: '3px',
                                            background: 'white',
                                            borderRadius: '50%',
                                            transition: 'all 0.3s ease'
                                        }} />
                                    </span>
                                </label>
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--color-tertiary)',
                                lineHeight: '1.4'
                            }}>
                                When enabled, voting for options with dust settings will also send the specified STX amount to the option creators.
                            </div>
                        </div>
                    )}

                    {/* Voting System Description */}
                    <div className={styles.voting_power}>
                        <div className={styles.voting_power_title}>
                            {alreadyVoted ? 'You voted with:' : getVotingSystemDescription()}
                        </div>
                        {votingPower && (
                            <div className={styles.voting_power_value}>
                                Voting Power:
                                {formatNumber(
                                    pollObject?.votingStrategyFlag &&
                                        pollObject?.strategyTokenType === "ft" &&
                                        pollObject?.votingStrategyTemplate === "stx" &&
                                        stacksBalance && stacksBalance > 0 ? (stacksBalance / 1000000) : votingPower
                                )}

                                {/* Show strategy token name */}
                                {pollObject?.votingStrategyFlag && pollObject?.strategyTokenType === "ft" && pollObject?.votingSystem === "fptp" && (
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
                        )}
                    </div>

                    {/* Voting Options */}
                    <div className={styles.voting_options}>
                        {pollObject?.options?.map((option, index) => {
                            const isSelected = selectedOptions[option.id];
                            const isOptionDisabled = isDisabled();

                            return (
                                <div
                                    key={index}
                                    className={`${styles.voting_option} ${isSelected ? styles.selected : ''
                                        } ${isOptionDisabled ? styles.disabled : ''}`}
                                    onClick={() => {
                                        if ((pollObject?.votingSystem === "fptp" || pollObject?.votingSystem === "block") && !isOptionDisabled) {
                                            handleOptionSelect(option.id, option.value);
                                        }
                                    }}
                                >
                                    <div className={styles.option_content}>
                                        {/* Radio/Checkbox for FPTP and Block Voting */}
                                        {(pollObject?.votingSystem === "fptp" || pollObject?.votingSystem === "block") && (
                                            <div
                                                className={`${pollObject?.votingSystem === "fptp"
                                                    ? styles.option_radio
                                                    : styles.option_checkbox
                                                    } ${isSelected ? styles.checked : ''}`}
                                            />
                                        )}

                                        {/* Option Label */}
                                        <div className={styles.option_label}>
                                            {option.value}
                                            {/* Dust voting indicator - only show when dust voting is enabled */}
                                            {enableDustVoting && option.dustAddress && option.dustAmount > 0 && (
                                                <span style={{
                                                    marginLeft: 'var(--space-2)',
                                                    padding: '2px 6px',
                                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                    color: 'white',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: '700',
                                                    borderRadius: '8px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.025em',
                                                    animation: 'fadeIn 0.3s ease'
                                                }}>
                                                    {option.dustAmount} STX
                                                </span>
                                            )}
                                        </div>

                                        {/* Number Input for Quadratic and Weighted Voting */}
                                        {(pollObject?.votingSystem === "quadratic" || pollObject?.votingSystem === "weighted") && (
                                            <input
                                                type="number"
                                                min="0"
                                                max={votingPower || 1}
                                                value={selectedOptions[option.id] || ""}
                                                onChange={(e) => handleVoteValueChange(option.id, e.target.value)}
                                                className={styles.option_input}
                                                placeholder="0"
                                                disabled={isOptionDisabled}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Voting Criteria */}
                    {pollObject?.votingStrategyFlag && pollObject?.strategyTokenName && (
                        <div className={styles.warning_message}>
                            <strong>Voting Requirement:</strong> You must hold {pollObject.strategyTokenName} tokens to participate in this poll.
                        </div>
                    )}

                    {/* Error Messages */}
                    {errorMessage && (
                        <div className={styles.error_message}>
                            {errorMessage}
                        </div>
                    )}

                    {/* Status Messages */}
                    {noHoldingToken && !alreadyVoted && (
                        <div className={styles.error_message}>
                            You must hold {pollObject?.strategyTokenName || "the required tokens"} to vote in this poll.
                        </div>
                    )}

                    {/* Vote Button - only while the poll is open and not yet voted */}
                    {!isPollClosed() && !isPollNotStarted() && !alreadyVoted && (
                    <div style={{ marginTop: "var(--space-6)" }}>
                        {isUserSignedIn ? (
                            <Button
                                className="action_primary_btn w-100"
                                disabled={isDisabled()}
                                onClick={handleVote}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className={styles.pulse}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="12" cy="12" r="10" opacity="0.3" />
                                                <path d="M12 2C17.523 2 22 6.477 22 12s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" opacity="0.6" />
                                            </svg>
                                        </div>
                                        Processing Vote...
                                    </>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                        </svg>
                                        {enableDustVoting && hasDustOptionsSelected() ? 'Vote with Dust' : 'Vote Now'}
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                className="action_primary_btn w-100"
                                onClick={() => authenticate(window?.location?.href)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                                Connect Wallet to Vote
                            </Button>
                        )}
                    </div>
                    )}
                </div>
            </div>

            {/* Send Transaction Modal */}
            <SendTxModal
                show={showSendTxModal}
                onHide={() => setShowSendTxModal(false)}
                selectedOptions={selectedOptions}
                pollObject={pollObject}
                onTransactionSuccess={handleTransactionSuccess}
                onVoteDirectly={handleVoteDirectly}
            />
        </div>
    );
}
