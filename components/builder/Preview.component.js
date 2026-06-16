import { useState } from "react";
import { Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import PollComponent from "../poll/PollComponent";
import styles from "../../styles/PreviewModal.module.css";

export default function PreviewComponent(props) {
    const {
        show,
        handleClose,
        pollObject,
        previewUrl,
        currentBitcoinBlockHeight,
        currentStacksBlockHeight,
    } = props;

    const [copied, setCopied] = useState(false);

    const copyUrl = () => {
        if (!previewUrl) return;
        try {
            navigator.clipboard.writeText(previewUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Error copying preview link:", error);
        }
    };

    const openInNewTab = () => {
        if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
    };

    return (
        <Modal
            show={show}
            onHide={handleClose}
            fullscreen
            contentClassName={styles.preview_content}
        >
            {/* Sticky toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.toolbar_left}>
                    <span className={styles.toolbar_title}>Preview</span>
                    <span className={styles.draft_badge}>Draft</span>
                </div>

                {previewUrl && (
                    <div className={styles.url_bar}>
                        <svg className={styles.url_icon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        <input
                            className={styles.url_input}
                            value={previewUrl}
                            readOnly
                            onFocus={(e) => e.target.select()}
                            aria-label="Shareable preview link"
                        />
                        <OverlayTrigger placement="bottom" overlay={<Tooltip>{copied ? "Copied!" : "Copy link"}</Tooltip>}>
                            <button className={styles.url_btn} onClick={copyUrl} aria-label="Copy preview link">
                                {copied ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                )}
                            </button>
                        </OverlayTrigger>
                        <OverlayTrigger placement="bottom" overlay={<Tooltip>Open in new tab</Tooltip>}>
                            <button className={styles.url_btn} onClick={openInNewTab} aria-label="Open preview in new tab">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </button>
                        </OverlayTrigger>
                    </div>
                )}

                <button className={styles.close_btn} onClick={handleClose} aria-label="Close preview">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Preview body */}
            <div className={styles.body}>
                <PollComponent
                    isPreview="true"
                    pollObject={pollObject}
                    resultsByPosition={{}}
                    currentBitcoinBlockHeight={currentBitcoinBlockHeight}
                    currentStacksBlockHeight={currentStacksBlockHeight}
                />
            </div>
        </Modal>
    );
}
