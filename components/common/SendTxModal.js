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
    onTransactionSuccess
}) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [dustTransactions, setDustTransactions] = useState([]);

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
                    setIsProcessing(false);
                    setErrorMessage('Transaction was cancelled.');
                }
            };

            console.log('Opening STX transfer with options:', {
                ...txOptions,
                network: 'NetworkObject',
                appDetails: txOptions.appDetails
            });

            await openSTXTransfer(txOptions);
        } catch (error) {
            console.error('Error sending dust voting transaction:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            let errorMsg = 'Failed to send transaction. ';
            if (error.message) {
                errorMsg += error.message;
            } else {
                errorMsg += 'Please try again or check your wallet connection.';
            }

            setErrorMessage(errorMsg);
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
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
                        <div className={styles.field_error} style={{ marginTop: 'var(--space-3)' }}>
                            {errorMessage}
                        </div>
                    )}
                </div>
            </Modal.Body>

            <Modal.Footer className={styles.modal_footer}>
                <div className={styles.modal_actions}>
                    <div className={styles.modal_main_actions}>
                        <Button
                            onClick={handleClose}
                            className="action_secondary_btn"
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={handleSendTransactions}
                            className="action_primary_btn"
                            disabled={isProcessing || dustTransactions.length === 0}
                        >
                            {isProcessing ? (
                                <>
                                    <div className={styles.pulse}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="12" r="10" opacity="0.3" />
                                            <path d="M12 2C17.523 2 22 6.477 22 12s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" opacity="0.6" />
                                        </svg>
                                    </div>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4.5 1a.5.5 0 0 0-.5.5V2H2a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1h-2v-.5a.5.5 0 0 0-.5-.5h-7zM11 2H5v.5a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5V2z" fill="currentColor" />
                                        <path d="M15.354 3.354A.5.5 0 0 0 15 3H1a.5.5 0 0 0-.5.5v11a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-11a.5.5 0 0 0-.146-.354z" fill="currentColor" />
                                    </svg>
                                    Send Transactions ({dustTransactions.length})
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal.Footer>
        </Modal>
    );
}