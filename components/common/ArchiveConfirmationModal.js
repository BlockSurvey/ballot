import { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { getApiKey, getFileFromGaia, putFileToGaia } from "../../services/auth";

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

    return (
        <Modal show={show} onHide={onHide} centered size="sm">
            <Modal.Header closeButton>
                <Modal.Title>Archive Poll</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>
                    Are you sure you want to archive the poll "{poll?.title || 'Untitled Poll'}"?
                </p>
                <div style={{ 
                    background: "#f8f9fa", 
                    padding: "12px", 
                    borderRadius: "6px", 
                    marginTop: "12px",
                    fontSize: "14px",
                    color: "#6c757d"
                }}>
                    <strong>Note:</strong> Archived polls will be:
                    <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
                        <li>Automatically closed to new votes</li>
                        <li>Hidden from the main dashboard</li>
                        <li>Still accessible via direct link</li>
                    </ul>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button 
                    variant="secondary" 
                    onClick={onHide}
                    disabled={isArchiving}
                >
                    Cancel
                </Button>
                <Button 
                    variant="danger" 
                    onClick={handleArchive}
                    disabled={isArchiving}
                >
                    {isArchiving ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Archiving...
                        </>
                    ) : (
                        "Archive Poll"
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}