import { useState } from "react";
import { Modal } from "react-bootstrap";
import { getApiKey, getFileFromGaia, putFileToGaia } from "../../services/auth";
import styles from "../../styles/ArchiveConfirmationModal.module.css";

export default function ArchiveConfirmationModal({ show, onHide, poll, onArchiveSuccess }) {
    const [isArchiving, setIsArchiving] = useState(false);

    const handleArchive = async () => {
        if (!poll?.id) return;

        setIsArchiving(true);
        try {
            // Get the API key
            const apiKey = await getApiKey();

            // Make API call to archive the poll
            const response = await fetch("/api/polls/archive", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    pollId: poll.id,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to archive poll");
            }

            const result = await response.json();

            // Update the Poll Index
            const pollIndex = JSON.parse(await getFileFromGaia('pollIndex.json'));
            if (pollIndex) {
                pollIndex.ref[poll.id].archived = true;
                pollIndex.ref[poll.id].status = "closed";
                pollIndex.ref[poll.id].updatedAt = new Date().toISOString();
                await putFileToGaia('pollIndex.json', JSON.stringify(pollIndex));
            }

            // Call the success callback with the updated poll data
            if (onArchiveSuccess) {
                onArchiveSuccess(poll.id, result.data.updatedAt);
            }

            // Close the modal
            onHide();
        } catch (error) {
            console.error("Error archiving poll:", error);
            alert("Failed to archive poll: " + error.message);
        } finally {
            setIsArchiving(false);
        }
    };

    const noteItems = [
        "Automatically closed to new votes",
        "Hidden from the main dashboard",
        "Still accessible via direct link",
    ];

    return (
        <Modal show={show} onHide={onHide} centered contentClassName={styles.content}>
            <div className={styles.body}>
                <button className={styles.close} onClick={onHide} aria-label="Close" disabled={isArchiving}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className={styles.header}>
                    <div className={styles.icon_badge}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="4" rx="1" />
                            <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
                            <line x1="10" y1="12" x2="14" y2="12" />
                        </svg>
                    </div>
                    <h3 className={styles.title}>Archive poll</h3>
                </div>

                <p className={styles.question}>
                    Are you sure you want to archive{" "}
                    <span className={styles.poll_name}>&ldquo;{poll?.title || "Untitled Poll"}&rdquo;</span>?
                </p>

                <div className={styles.note}>
                    <div className={styles.note_label}>What happens next</div>
                    <ul className={styles.note_list}>
                        {noteItems.map((item) => (
                            <li key={item}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={styles.footer}>
                    <button className={styles.btn_cancel} onClick={onHide} disabled={isArchiving}>
                        Cancel
                    </button>
                    <button className={styles.btn_danger} onClick={handleArchive} disabled={isArchiving}>
                        {isArchiving ? (
                            <>
                                <span className={styles.spinner} role="status" aria-hidden="true"></span>
                                Archiving…
                            </>
                        ) : (
                            "Archive Poll"
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}