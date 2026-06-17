import { useState } from "react";
import { Modal } from "react-bootstrap";
import { getFileFromGaia, putFileToGaia, deleteFileToGaia } from "../../services/auth";
import ModalCloseButton from "./ModalCloseButton";
import styles from "../../styles/ArchiveConfirmationModal.module.css";

export default function DeleteDraftConfirmationModal({ show, onHide, poll, onDeleteSuccess }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!poll?.id) return;

        setIsDeleting(true);
        try {
            // Remove the draft from the poll index (the dashboard's source of truth).
            const pollIndex = JSON.parse(await getFileFromGaia("pollIndex.json"));
            if (pollIndex?.ref && pollIndex.ref[poll.id]) {
                delete pollIndex.ref[poll.id];
            }
            if (Array.isArray(pollIndex?.list)) {
                pollIndex.list = pollIndex.list.filter((id) => id !== poll.id);
            }
            await putFileToGaia("pollIndex.json", JSON.stringify(pollIndex));

            // Best-effort removal of the draft file (no-op on BlockSurvey storage).
            try {
                await deleteFileToGaia(`${poll.id}.json`);
            } catch (e) {
                // ignore — the index removal already hides the draft
            }

            if (onDeleteSuccess) onDeleteSuccess(poll.id);
            onHide();
        } catch (error) {
            console.error("Error deleting draft:", error);
            alert("Failed to delete draft: " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const noteItems = [
        "Removed from your dashboard",
        "Not published — no on-chain data is affected",
        "This can't be undone",
    ];

    return (
        <Modal show={show} onHide={onHide} centered contentClassName={styles.content}>
            <div className={styles.body}>
                <ModalCloseButton onClick={onHide} disabled={isDeleting} />

                <div className={styles.header}>
                    <div className={styles.icon_badge}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                    </div>
                    <h3 className={styles.title}>Delete draft</h3>
                </div>

                <p className={styles.question}>
                    Are you sure you want to delete{" "}
                    <span className={styles.poll_name}>&ldquo;{poll?.title || "Untitled Poll"}&rdquo;</span>?
                </p>

                <div className={styles.note}>
                    <div className={styles.note_label}>What happens</div>
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
                    <button className={styles.btn_cancel} onClick={onHide} disabled={isDeleting}>
                        Cancel
                    </button>
                    <button className={styles.btn_danger} onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? (
                            <>
                                <span className={styles.spinner} role="status" aria-hidden="true"></span>
                                Deleting…
                            </>
                        ) : (
                            "Delete draft"
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
