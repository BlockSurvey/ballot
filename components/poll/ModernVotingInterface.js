import { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { authenticate, userSession } from "../../services/auth";
import { castMyVoteContractCall } from "../../services/contract";
import styles from "../../styles/Poll.module.css";

export default function ModernVotingInterface({
    pollObject,
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
    onVoteSuccess
}) {
    const [selectedOptions, setSelectedOptions] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUserSignedIn, setIsUserSignedIn] = useState(false);

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
        if (!validateVote()) return;

        setIsProcessing(true);
        setErrorMessage("");

        try {
            const contractAddress = pollObject?.publishedInfo?.contractAddress;
            const contractName = pollObject?.publishedInfo?.contractName;

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
                }
            );
        } catch (error) {
            setErrorMessage("Failed to cast vote. Please try again.");
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
                        {alreadyVoted ? 'Your Vote' : 'Cast Your Vote'}
                    </h2>

                    {/* Already Voted Banner */}
                    {alreadyVoted && (
                        <div style={{
                            padding: 'var(--space-4)',
                            marginBottom: 'var(--space-4)',
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                marginBottom: 'var(--space-2)'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                                        Vote Successfully Recorded
                                    </div>
                                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '4px' }}>
                                        Your vote has been recorded on the chain and is displayed below
                                    </div>
                                </div>
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
                                {
                                    pollObject?.votingStrategyFlag &&
                                        pollObject?.strategyTokenType === "ft" &&
                                        pollObject?.votingStrategyTemplate === "stx" &&
                                        stacksBalance && stacksBalance > 0 ? (stacksBalance / 1000000) : votingPower
                                }

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

                    {!alreadyVoted && !isPollActive() && getPollStatusMessage() && (
                        <div className={styles.warning_message}>
                            <strong>Poll Status:</strong> {getPollStatusMessage()}
                        </div>
                    )}

                    {/* Vote Button */}
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
                                        Vote Now
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                className="action_secondary_btn w-100"
                                onClick={() => authenticate(window?.location?.href)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                                Connect Wallet to Vote
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}