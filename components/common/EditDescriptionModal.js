import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { getApiKey, getFileFromGaia, putFileToGaia } from '../../services/auth';
import styles from '../../styles/Dashboard.module.css';
import RichTextEditor, { isEditorEmpty } from './RichTextEditor';

const EditDescriptionModal = ({
    show,
    onHide,
    poll,
    onDescriptionUpdated
}) => {
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Initialize description when modal opens or poll changes
    useEffect(() => {
        if (show && poll) {
            setDescription(poll.description || '');
            setError('');
        }
    }, [show, poll]);

    const handleDescriptionChange = (htmlContent, textContent) => {
        setDescription(htmlContent);
        if (error) setError(''); // Clear error when user starts typing
    };

    const handleSave = async () => {
        if (!poll?.id) {
            setError('Poll ID is missing');
            return;
        }

        // Validate description
        if (isEditorEmpty(description)) {
            setError('Description cannot be empty');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Get user's API key from session
            const apiKey = await getApiKey();

            if (!apiKey) {
                throw new Error('User authentication required');
            }

            const response = await fetch('/api/polls/update-description', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    pollId: poll.id,
                    description: description
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update description');
            }

            // Call the callback to update the parent component
            if (onDescriptionUpdated) {
                onDescriptionUpdated(poll.id, description, result.data.updatedAt);

                // Update the Poll Description in the Poll Index
                const pollIndex = JSON.parse(await getFileFromGaia('pollIndex.json'));
                if (pollIndex) {
                    pollIndex.ref[poll.id].description = description;
                    pollIndex.ref[poll.id].updatedAt = new Date().toISOString();
                    await putFileToGaia('pollIndex.json', JSON.stringify(pollIndex));
                }
            }

            // Close modal
            onHide();
        } catch (err) {
            console.error('Error updating description:', err);
            setError(err.message || 'Failed to update description. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset to original description
        setDescription(poll?.description || '');
        setError('');
        onHide();
    };

    return (
        <Modal
            show={show}
            onHide={handleCancel}
            size="lg"
            centered
            className={styles.minimal_modal}
        >
            <div className={styles.minimal_modal_content}>
                {/* Header */}
                <div className={styles.minimal_modal_header}>
                    <h2 className={styles.minimal_modal_title}>Edit Poll Description</h2>
                    <button
                        className={styles.minimal_close_btn}
                        onClick={handleCancel}
                        aria-label="Close"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className={styles.minimal_modal_body}>
                    {poll && (
                        <div className={styles.edit_poll_info}>
                            <div className={styles.poll_info_main}>
                                <h3 className={styles.poll_info_title}>{poll.title}</h3>
                                <div className={styles.poll_info_meta}>
                                    <span className={styles.poll_info_id}>ID: {poll.id}</span>
                                    <span className={`${styles.poll_status_badge} ${styles[`status_${getPollStatus(poll)}`]}`}>
                                        {getPollStatusLabel(poll)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.editor_container}>
                        <label className={styles.editor_label}>
                            Description <span className={styles.required}>*</span>
                        </label>

                        <RichTextEditor
                            value={description}
                            onChange={handleDescriptionChange}
                            placeholder="Enter your poll description..."
                            error={!!error}
                            disabled={isLoading}
                            className={styles.editor_field}
                        />

                        {error && (
                            <div className={styles.error_message}>
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.edit_modal_footer}>
                    <div className={styles.footer_content}>
                        <div className={styles.footer_info}>
                            <svg className={styles.footer_icon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z"
                                    fill="currentColor"
                                />
                            </svg>
                            <span className={styles.footer_text}>Changes are saved instantly and visible to all voters</span>
                        </div>
                        <div className={styles.footer_actions}>
                            <button
                                onClick={handleCancel}
                                disabled={isLoading}
                                className={styles.minimal_button_secondary}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading || isEditorEmpty(description)}
                                className={`${styles.minimal_button} ${isEditorEmpty(description) ? styles.button_disabled : ''}`}
                            >
                                {isLoading ? (
                                    <>
                                        Saving changes...
                                    </>
                                ) : (
                                    <>
                                        <svg className={styles.save_icon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
                                                fill="currentColor"
                                            />
                                        </svg>
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// Helper functions
const getPollStatus = (poll) => {
    if (poll?.status === "draft") return "draft";
    if (poll?.endAt && new Date(poll?.endAt) < new Date()) return "closed";
    return "active";
};

const getPollStatusLabel = (poll) => {
    const status = getPollStatus(poll);
    return status.charAt(0).toUpperCase() + status.slice(1);
};

export default EditDescriptionModal;