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
        currentBlockHeight
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
                                currentBlockHeight={currentBlockHeight}
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
                                currentBlockHeight={currentBlockHeight}
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
                    <div style={{
                        padding: '16px',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-tertiary)', marginBottom: '8px' }}>
                            Transaction ID:
                        </div>
                        <a
                            style={{
                                color: 'var(--color-primary)',
                                textDecoration: 'none',
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            href={formStacksExplorerUrl(txId)}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {txId}
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z"
                                    fill="currentColor"
                                />
                            </svg>
                        </a>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
}