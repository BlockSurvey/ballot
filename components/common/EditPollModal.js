import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { getFileFromGaia, putFileToGaia } from '../../services/auth';
import { Constants } from '../../common/constants';
import { updatePollConfigContractCall } from '../../services/contract';
import { calculateDateFromBitcoinBlockHeight } from '../../services/utils';
import styles from '../../styles/EditPollModal.module.css';
import RichTextEditor from './RichTextEditor';
import ModalCloseButton from './ModalCloseButton';

const EditPollModal = ({ show, onHide, poll, currentBitcoinBlockHeight, onUpdated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [note, setNote] = useState('');
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
            // Seed the note from the (possibly curated) index entry first…
            setNote(poll.note || '');
            setStartAtBlock(poll.startAtBlock ?? '');
            setEndAtBlock(poll.endAtBlock ?? '');
            setSnapshotBlockHeight(poll.snapshotBlockHeight ?? '');
            setError('');
            setStatusText('');

            // …then reconcile against the authoritative poll JSON. The dashboard
            // passes the index `ref` entry, which can lag the stored file (e.g. a
            // note added by an older build). Loading the true value here prevents
            // the save path from deleting a note the index simply didn't carry.
            // Guarded by `cancelled` so a slow fetch can't clobber the user's typing
            // after they've started editing or closed the modal.
            let cancelled = false;
            getFileFromGaia(poll.id + '.json', {})
                .then((raw) => {
                    if (cancelled || !raw) return;
                    const full = JSON.parse(raw);
                    setNote((current) => (current === (poll.note || '') ? (full.note || '') : current));
                })
                .catch(() => { /* keep the index-seeded value on failure */ });
            return () => { cancelled = true; };
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
        // Note is plain text; store trimmed, and drop the key entirely when empty
        // so the poll screen banner doesn't render for a blank note.
        const trimmedNote = (note || '').trim().slice(0, Constants.POLL_NOTE_MAX_LENGTH);
        if (trimmedNote) {
            full.note = trimmedNote;
        } else {
            delete full.note;
        }

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
                idx.ref[poll.id].note = full.note || '';
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
                <ModalCloseButton onClick={handleCancel} />
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

                {/* Note — short plain-text notice shown to voters as a highlighted
                    banner above the options. Off-chain metadata: saves instantly,
                    no wallet transaction. Editable for every existing poll. */}
                <div className={styles.group}>
                    <label className={styles.label}>Note</label>
                    <textarea
                        className={styles.textarea}
                        rows={2}
                        value={note}
                        onChange={(e) => { setNote(e.target.value.slice(0, Constants.POLL_NOTE_MAX_LENGTH)); if (error) setError(''); }}
                        maxLength={Constants.POLL_NOTE_MAX_LENGTH}
                        placeholder="A short, important message shown to voters as a highlighted banner above the options."
                        disabled={isLoading}
                    />
                    <span className={styles.note_counter}>{note.length}/{Constants.POLL_NOTE_MAX_LENGTH}</span>
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
