import { openSTXTransfer } from '@stacks/connect';
import { getNonce } from '@stacks/transactions';
import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { getMyStxAddress, getNetworkType } from '../../services/auth';
import styles from '../../styles/Builder.module.css';

export default function SendTxModal({
    show,
    onHide,
    selectedOptions,
    pollObject,
    onTransactionSuccess,
    onVoteDirectly
}) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [dustTransactions, setDustTransactions] = useState([]);
    const [transactionTimeout, setTransactionTimeout] = useState(null);

    useEffect(() => {
        if (show && selectedOptions && pollObject?.options) {
            // Calculate dust transactions needed
            const transactions = [];
            Object.keys(selectedOptions).forEach(optionId => {
                const option = pollObject.options.find(opt => opt.id === optionId);
                if (option?.dustAddress && option?.dustAmount) {
                    transactions.push({
                        optionId,
                        optionName: option.value,
                        address: option.dustAddress,
                        amount: option.dustAmount,
                        votes: selectedOptions[optionId]
                    });
                }
            });
            setDustTransactions(transactions);
            setErrorMessage('');
        }
    }, [show, selectedOptions, pollObject]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (transactionTimeout) {
                clearTimeout(transactionTimeout);
            }
        };
    }, [transactionTimeout]);

    const calculateTotalAmount = () => {
        return dustTransactions.reduce((total, tx) => total + tx.amount, 0);
    };

    const handleSendTransactions = async () => {
        if (dustTransactions.length === 0) {
            setErrorMessage('No dust transactions to send');
            return;
        }

        setIsProcessing(true);
        setErrorMessage('');

        // Set a timeout to detect stuck transactions
        const timeout = setTimeout(() => {
            if (isProcessing) {
                setIsProcessing(false);
                setErrorMessage(
                    'Transaction timed out. Please try again. If the wallet popup did not appear, make sure your wallet extension is unlocked and try again.'
                );
            }
        }, 60000); // 60 second timeout
        setTransactionTimeout(timeout);

        try {
            // Since it's always one transaction, get the first (and only) transaction
            const dustTx = dustTransactions[0];

            // Fetch the current nonce for the user's address
            const network = getNetworkType();

            let senderAddress;
            try {
                senderAddress = getMyStxAddress();
            } catch (addressError) {
                console.error('Failed to get sender address:', addressError);
                clearTimeout(timeout);

                // Check for extension context invalidated error
                if (addressError.message && addressError.message.includes('Extension context invalidated')) {
                    throw new Error('Extension context invalidated');
                }
                throw new Error('Could not retrieve wallet address. Please make sure you are logged in.');
            }

            let nonce;
            try {
                const fetchedNonce = await getNonce(senderAddress, network);
                // Convert BigInt to Number
                nonce = Number(fetchedNonce);
            } catch (nonceError) {
                console.warn('Failed to fetch nonce, letting Stacks Connect handle it:', nonceError);
                // If nonce fetch fails, let Stacks Connect handle it
            }

            const txOptions = {
                recipient: dustTx.address,
                amount: Math.floor(dustTx.amount * 1000000), // Convert to microSTX
                memo: `Vote for: ${dustTx.optionName}`,
                network: network,
                appDetails: {
                    name: "Ballot",
                    icon: window.location.origin + "/images/logo/ballot.png"
                },
                onFinish: (data) => {
                    console.log('Transaction successfully sent:', data);
                    clearTimeout(timeout);

                    // Create completed transaction with proper ID and URL
                    const completedTx = {
                        ...dustTx,
                        txId: data.txId,
                        explorerUrl: network.coreApiUrl.includes('testnet')
                            ? `https://explorer.stacks.co/txid/${data.txId}?chain=testnet`
                            : `https://explorer.stacks.co/txid/${data.txId}?chain=mainnet`
                    };

                    setIsProcessing(false);
                    onHide();

                    // Call success callback after modal is closed
                    setTimeout(() => {
                        if (onTransactionSuccess) {
                            onTransactionSuccess(completedTx);
                        }
                    }, 100);
                },
                onCancel: () => {
                    console.log('Transaction cancelled by user');
                    clearTimeout(timeout);
                    setIsProcessing(false);
                    setErrorMessage('Transaction was cancelled. You can try again or cast your vote directly without dust transactions.');
                }
            };

            // 3. Only set nonce if you are *sure* it's correct (no pending TXs, network state is up to date)
            if (nonce !== undefined) {
                console.log('Setting nonce:', nonce);
                txOptions.nonce = nonce;
            }

            console.log('Initiating STX transfer with options:', txOptions);

            // Initialize the transaction
            await openSTXTransfer(txOptions);
        } catch (error) {
            console.error('Error sending dust voting transaction:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            clearTimeout(timeout);

            let errorMsg = 'Failed to initiate transaction. ';

            // Provide more specific error messages based on error type
            if (error.message) {
                if (error.message.includes('Extension context invalidated')) {
                    errorMsg = 'Wallet extension was reloaded. Please refresh this page and try again. ';
                } else if (error.message.includes('wallet') || error.message.includes('extension')) {
                    errorMsg = 'Wallet connection error. Please make sure your Hiro Wallet extension is installed and unlocked. ';
                } else if (error.message.includes('insufficient')) {
                    errorMsg = 'Insufficient balance. Please make sure you have enough STX to complete this transaction (including network fees). ';
                } else if (error.message.includes('network')) {
                    errorMsg = 'Network error. Please check your internet connection and try again. ';
                } else {
                    errorMsg += error.message + '. ';
                }
            }

            // Add refresh instruction for extension context errors
            if (error.message && error.message.includes('Extension context invalidated')) {
                errorMsg += 'Refreshing the page will re-establish the connection with your wallet.';
            } else {
                errorMsg += 'You can try again or cast your vote directly without dust transactions.';
            }

            setErrorMessage(errorMsg);
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        if (transactionTimeout) {
            clearTimeout(transactionTimeout);
        }
        setIsProcessing(false);
        setErrorMessage('');
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="md" className={styles.dust_modal}>
            <Modal.Header closeButton className={styles.modal_header}>
                <Modal.Title className={styles.modal_title}>
                    <div>
                        <h4>Send Dust Transactions</h4>
                        <p>Confirm your dust voting transactions</p>
                    </div>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className={styles.modal_body}>
                <div className={styles.modal_form}>
                    {dustTransactions.length > 0 ? (
                        <>
                            <div className={styles.modal_info} style={{ marginBottom: 'var(--space-4)' }}>
                                <div className={styles.info_icon}>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" fill="currentColor" />
                                        <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" fill="currentColor" />
                                    </svg>
                                </div>
                                <p>
                                    You're about to send dust transactions to the selected options.
                                    These small STX amounts will be sent to the option creators.
                                </p>
                            </div>

                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <h6 style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: 'var(--color-primary)',
                                    marginBottom: 'var(--space-3)'
                                }}>
                                    Transactions Summary:
                                </h6>

                                {dustTransactions.map((tx, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: 'var(--space-3)',
                                            marginBottom: 'var(--space-2)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <div style={{
                                                fontWeight: '600',
                                                color: 'var(--color-primary)',
                                                fontSize: '0.875rem'
                                            }}>
                                                {tx.optionName}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--color-tertiary)',
                                                fontFamily: 'monospace'
                                            }}>
                                                {tx.address.substring(0, 8)}...{tx.address.substring(tx.address.length - 8)}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontWeight: '700',
                                            color: 'var(--color-primary)',
                                            fontSize: '0.875rem'
                                        }}>
                                            {tx.amount} STX
                                        </div>
                                    </div>
                                ))}

                                <div style={{
                                    borderTop: '2px solid var(--color-border)',
                                    paddingTop: 'var(--space-3)',
                                    marginTop: 'var(--space-3)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                                        Total Amount:
                                    </span>
                                    <span style={{
                                        fontWeight: '700',
                                        fontSize: '1.1rem',
                                        color: 'var(--color-primary)'
                                    }}>
                                        {calculateTotalAmount()} STX
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.modal_info}>
                            <div className={styles.info_icon}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" fill="currentColor" />
                                    <path d="M8 4a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3A.5.5 0 0 1 8 4zM8 8a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3A.5.5 0 0 1 8 8z" fill="currentColor" />
                                </svg>
                            </div>
                            <p>
                                No dust transactions are configured for your selected options.
                            </p>
                        </div>
                    )}

                    {errorMessage && (
                        <div className={styles.field_error} style={{
                            marginTop: 'var(--space-3)',
                            padding: 'var(--space-3)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderLeft: '3px solid rgb(239, 68, 68)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.875rem',
                            lineHeight: '1.5'
                        }}>
                            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>⚠️ Transaction Error</strong>
                            {errorMessage}
                            
                            {/* Vote Directly or Refresh Page button inside error box */}
                            {errorMessage.includes('Extension context invalidated') ? (
                                <div style={{ 
                                    marginTop: 'var(--space-3)',
                                    paddingTop: 'var(--space-3)',
                                    borderTop: '1px solid rgba(239, 68, 68, 0.2)'
                                }}>
                                    <Button
                                        onClick={() => window.location.reload()}
                                        style={{
                                            width: '100%',
                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                            border: 'none',
                                            color: 'white',
                                            padding: 'var(--space-2) var(--space-3)',
                                            borderRadius: 'var(--radius-md)',
                                            fontWeight: '600',
                                            fontSize: '0.875rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                                        </svg>
                                        Refresh Page
                                    </Button>
                                </div>
                            ) : onVoteDirectly ? (
                                <div style={{ 
                                    marginTop: 'var(--space-3)',
                                    paddingTop: 'var(--space-3)',
                                    borderTop: '1px solid rgba(239, 68, 68, 0.2)'
                                }}>
                                    <Button
                                        onClick={() => {
                                            handleClose();
                                            onVoteDirectly();
                                        }}
                                        className="action_primary_btn"
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-2) var(--space-3)',
                                            fontSize: '0.875rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                        </svg>
                                        Vote Directly
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </Modal.Body>

            <Modal.Footer className={styles.modal_footer}>
                <div className={styles.modal_actions} style={{ width: '100%' }}>
                    <div className={styles.modal_main_actions} style={{ display: 'flex', gap: 'var(--space-2)', width: '100%' }}>
                        <Button
                            onClick={handleClose}
                            className="action_secondary_btn"
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={handleSendTransactions}
                            className="action_primary_btn"
                            disabled={isProcessing || dustTransactions.length === 0}
                            style={{ flex: 1 }}
                        >
                            {isProcessing ? (
                                <>
                                    <div className={styles.pulse}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="12" r="10" opacity="0.3" />
                                            <path d="M12 2C17.523 2 22 6.477 22 12s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" opacity="0.6" />
                                        </svg>
                                    </div>
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    Send Dust Transaction
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal.Footer>
        </Modal>
    );
}