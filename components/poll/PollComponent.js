import { useState } from "react";
import { Modal } from "react-bootstrap";
import { getFileFromGaia, putFileToGaia } from "../../services/auth";
import { formStacksExplorerUrl } from "../../services/utils";
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
        noHoldingToken,
        holdingTokenIdsArray,
        votingPower,
        publicUrl,
        txStatus,
        noOfResultsLoaded,
        setNoOfResultsLoaded,
        currentBitcoinBlockHeight,
        currentStacksBlockHeight
    } = props;

    const [txId, setTxId] = useState();
    const [show, setShow] = useState(false);
    const [voteObject, setVoteObject] = useState({});

    const handleShow = () => setShow(true);
    const handleClose = () => setShow(false);

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
                                noHoldingToken={noHoldingToken}
                                holdingTokenIdsArray={holdingTokenIdsArray}
                                votingPower={votingPower}
                                dns={dns}
                                currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                                currentStacksBlockHeight={currentStacksBlockHeight}
                                onVoteSuccess={handleVoteSuccess}
                            />


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
                        </div>

                        {/* Sidebar */}
                        <div>
                            <ModernInformationPanel
                                pollObject={pollObject}
                                resultsByOption={resultsByOption}
                                currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                                currentStacksBlockHeight={currentStacksBlockHeight}
                                totalVotes={totalVotes}
                                totalUniqueVotes={totalUniqueVotes}
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