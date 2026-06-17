import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { getFileFromGaia, putFileToGaia } from '../../services/auth';
import { updatePollConfigContractCall } from '../../services/contract';
import { calculateDateFromBitcoinBlockHeight } from '../../services/utils';
import styles from '../../styles/EditPollModal.module.css';
import RichTextEditor from './RichTextEditor';

const EditPollModal = ({ show, onHide, poll, currentBitcoinBlockHeight, onUpdated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startAtBlock, setStartAtBlock] = useState('');
    const [endAtBlock, setEndAtBlock] = useState('');
    const [snapshotBlockHeight, setSnapshotBlockHeight] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState('');

    // Only polls deployed with the editable contract expose on-chain config edits
    const canEditConfig = poll?.supportsConfigUpdate === true;
    // Snapshot height is only meaningful for fungible-token gated polls (incl. STX)
    const isFtGated = poll?.votingStrategyFlag && poll?.strategyTokenType === 'ft';

    useEffect(() => {
        if (show && poll) {
            setTitle(poll.title || '');
            setDescription(poll.description || '');
            setStartAtBlock(poll.startAtBlock ?? '');
            setEndAtBlock(poll.endAtBlock ?? '');
            setSnapshotBlockHeight(poll.snapshotBlockHeight ?? '');
            setError('');
            setStatusText('');
        }
    }, [show, poll]);

    const validate = () => {
        if (!title.trim()) return 'Poll title cannot be empty';
        // Description is optional — polls can legitimately have none.
        if (canEditConfig) {
            const s = parseInt(startAtBlock);
            const e = parseInt(endAtBlock);
            if (!s || !e) return 'Start and end block heights are required';
            if (e <= s) return 'End block must be greater than start block';
            if (isFtGated && !parseInt(snapshotBlockHeight)) {
                return 'Snapshot block height is required for token-gated polls';
            }
        }
        return '';
    };

    // Load the full poll JSON, merge the edits, and persist (poll JSON + index)
    const persistJsonAndIndex = async () => {
        const raw = await getFileFromGaia(poll.id + '.json', {});
        const full = raw ? JSON.parse(raw) : { id: poll.id };

        full.title = title.trim();
        full.description = description;

        if (canEditConfig) {
            const s = parseInt(startAtBlock);
            const e = parseInt(endAtBlock);
            full.startAtBlock = s;
            full.endAtBlock = e;
            if (isFtGated) full.snapshotBlockHeight = parseInt(snapshotBlockHeight);

            // Keep the tentative display dates in sync with the new block heights
            if (currentBitcoinBlockHeight) {
                const startDate = calculateDateFromBitcoinBlockHeight(currentBitcoinBlockHeight, s);
                const endDate = calculateDateFromBitcoinBlockHeight(currentBitcoinBlockHeight, e);
                full.startAtDate = startDate;
                full.endAtDate = endDate;
                full.startAtDateUTC = new Date(startDate).toISOString();
                full.endAtDateUTC = new Date(endDate).toISOString();
            }
        }

        await putFileToGaia(poll.id + '.json', JSON.stringify(full), { encrypt: false });

        // Reflect the changes in the dashboard index
        const indexRaw = await getFileFromGaia('pollIndex.json', {});
        if (indexRaw) {
            const idx = JSON.parse(indexRaw);
            if (idx?.ref?.[poll.id]) {
                idx.ref[poll.id].title = full.title;
                idx.ref[poll.id].description = full.description;
                idx.ref[poll.id].updatedAt = new Date().toISOString();
                if (canEditConfig) {
                    idx.ref[poll.id].startAtBlock = full.startAtBlock;
                    idx.ref[poll.id].endAtBlock = full.endAtBlock;
                    idx.ref[poll.id].snapshotBlockHeight = full.snapshotBlockHeight;
                    idx.ref[poll.id].startAt = full.startAtDate;
                    idx.ref[poll.id].endAt = full.endAtDate;
                }
                await putFileToGaia('pollIndex.json', JSON.stringify(idx), { encrypt: false });
            }
        }

        return full;
    };

    const finishSuccess = async () => {
        const full = await persistJsonAndIndex();
        if (onUpdated) onUpdated(poll.id, full);
        setIsLoading(false);
        onHide();
    };

    const handleSave = async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const heightsChanged = canEditConfig && (
                parseInt(startAtBlock) !== parseInt(poll.startAtBlock) ||
                parseInt(endAtBlock) !== parseInt(poll.endAtBlock) ||
                (isFtGated && parseInt(snapshotBlockHeight) !== parseInt(poll.snapshotBlockHeight))
            );

            const contractAddress = poll?.publishedInfo?.contractAddress;
            const contractName = poll?.publishedInfo?.contractName;

            if (heightsChanged && contractAddress && contractName) {
                // On-chain change first; only persist the display JSON once the
                // wallet has submitted the update-config transaction.
                setStatusText('Confirm the update in your wallet…');
                await updatePollConfigContractCall(
                    contractAddress,
                    contractName,
                    parseInt(startAtBlock),
                    parseInt(endAtBlock),
                    isFtGated ? parseInt(snapshotBlockHeight) : (parseInt(poll.snapshotBlockHeight) || 0),
                    async (data) => {
                        if (data?.txId) {
                            setStatusText('Saving…');
                            try {
                                await finishSuccess();
                            } catch (e) {
                                console.error(e);
                                setError('On-chain update submitted, but saving the display data failed. Refresh and retry.');
                                setIsLoading(false);
                            }
                        } else {
                            setIsLoading(false);
                            setStatusText('');
                        }
                    },
                    () => {
                        // Wallet dismissed — keep the modal open
                        setIsLoading(false);
                        setStatusText('');
                    }
                );
            } else {
                // Title/description only (or no on-chain capability)
                await finishSuccess();
            }
        } catch (err) {
            console.error('Error updating poll:', err);
            setError(err.message || 'Failed to update the poll. Please try again.');
            setIsLoading(false);
            setStatusText('');
        }
    };

    const handleCancel = () => {
        if (isLoading) return;
        setError('');
        onHide();
    };

    return (
        <Modal
            show={show}
            onHide={handleCancel}
            centered
            dialogClassName={styles.dialog}
            contentClassName={styles.content}
        >
            {/* Header */}
            <div className={styles.header}>
                <h2 className={styles.title}>Edit Poll</h2>
                <button className={styles.close} onClick={handleCancel} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Body */}
            <div className={styles.body}>
                {/* Poll Title */}
                <div className={styles.group}>
                    <label className={styles.label}>
                        Poll Title<span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); if (error) setError(''); }}
                        placeholder="Enter the poll title"
                        disabled={isLoading}
                    />
                </div>

                {/* Description */}
                <div className={styles.group}>
                    <label className={styles.label}>
                        Description<span className={styles.required}>*</span>
                    </label>
                    <RichTextEditor
                        value={description}
                        onChange={(html) => { setDescription(html); if (error) setError(''); }}
                        placeholder="Enter your poll description…"
                        error={!!error}
                        disabled={isLoading}
                    />
                </div>

                {/* On-chain config (only for polls deployed with the editable contract) */}
                {canEditConfig ? (
                    <div className={styles.config_section}>
                        <div className={styles.config_header}>
                            <h3 className={styles.config_title}>Voting Window &amp; Token Gating</h3>
                            <p className={styles.config_subtitle}>
                                Stored on-chain — changing these requires a wallet transaction.
                            </p>
                        </div>

                        <div className={styles.grid}>
                            <div className={styles.group}>
                                <label className={styles.label}>
                                    Start Block (Bitcoin)<span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={startAtBlock}
                                    onChange={(e) => { setStartAtBlock(e.target.value); if (error) setError(''); }}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className={styles.group}>
                                <label className={styles.label}>
                                    End Block (Bitcoin)<span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={endAtBlock}
                                    onChange={(e) => { setEndAtBlock(e.target.value); if (error) setError(''); }}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    disabled={isLoading}
                                />
                            </div>

                            {isFtGated && (
                                <div className={`${styles.group} ${styles.full}`}>
                                    <label className={styles.label}>
                                        Snapshot Block (Stacks)<span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        value={snapshotBlockHeight}
                                        onChange={(e) => { setSnapshotBlockHeight(e.target.value); if (error) setError(''); }}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        disabled={isLoading}
                                    />
                                    <span className={styles.hint}>
                                        Token balances are measured at this Stacks block.
                                    </span>
                                </div>
                            )}
                        </div>

                        {currentBitcoinBlockHeight ? (
                            <div className={styles.config_footnote}>
                                Current Bitcoin block height: <strong>{currentBitcoinBlockHeight}</strong>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className={styles.legacy_note}>
                        This poll was published before on-chain editing was supported, so only the
                        title and description can be changed.
                    </div>
                )}

                {error && <div className={styles.error}>{error}</div>}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <span className={styles.footer_note}>
                    {statusText || (canEditConfig
                        ? 'Title & description save instantly; block-height changes need a wallet transaction.'
                        : 'Changes save instantly and are visible to all voters.')}
                </span>
                <div className={styles.footer_actions}>
                    <button onClick={handleCancel} disabled={isLoading} className={styles.btn_secondary}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isLoading} className={styles.btn_primary}>
                        {isLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default EditPollModal;
