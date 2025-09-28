import { useState } from "react";
import { Dropdown, OverlayTrigger, Tooltip } from "react-bootstrap";
import {
    formStacksExplorerUrl,
    openFacebookUrl,
    openLinkedinUrl,
    openRedditUrl,
    openTelegramUrl,
    openTwitterUrl,
    openWhatsappUrl
} from "../../services/utils";
import QRCodePopup from "./QRCodePopup";
import styles from "../../styles/Poll.module.css";

export default function ModernPollHeader({ pollObject, publicUrl, txStatus }) {
    const [copyText, setCopyText] = useState("Copy");
    const [showQRCodePopup, setShowQRCodePopup] = useState(false);

    const copyToClipBoard = () => {
        if (pollObject?.id && publicUrl) {
            setCopyText("Copied");
            navigator.clipboard.writeText(publicUrl);
            setTimeout(() => setCopyText("Copy"), 2000);
        }
    };

    const convertToHrefLink = (text) => {
        if (!text) return "";
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return text.replace(urlRegex, function (url) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    };

    const getStatusInfo = () => {
        if (!txStatus) return null;

        if (txStatus === "pending") {
            return { label: "Contract Pending", className: styles.status_pending };
        }
        
        if (txStatus !== "success") {
            return { label: "Contract Failed", className: styles.status_closed };
        }

        if (pollObject?.status === "draft") {
            return { label: "Draft", className: styles.status_draft };
        }

        const now = new Date();
        const endDate = pollObject?.endAtDateUTC ? 
            new Date(pollObject.endAtDateUTC) : 
            new Date(pollObject?.endAtDate);

        if (endDate && endDate < now) {
            return { label: "Closed", className: styles.status_closed };
        }

        return { label: "Active", className: styles.status_active };
    };

    const statusInfo = getStatusInfo();

    return (
        <>
            <div className={`${styles.poll_header} ${styles.fade_in}`}>
                <div className={styles.card_content}>
                    {/* Poll Title */}
                    <h1 className={styles.poll_title}>{pollObject?.title}</h1>
                    
                    {/* Poll Meta Information */}
                    <div className={styles.poll_meta}>
                        <div className={styles.poll_meta_left}>
                            {/* Creator Info */}
                            <div className={styles.creator_info}>
                                <span>Created by</span>
                                {pollObject?.userStxAddress && (
                                    <a 
                                        className="ballot_link" 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        href={formStacksExplorerUrl(pollObject.userStxAddress, 'address')}
                                    >
                                        {pollObject.userStxAddress.substring(0, 10)}...
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 12 12"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            style={{ marginLeft: "4px" }}
                                        >
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z"
                                                fill="currentColor"
                                            />
                                        </svg>
                                    </a>
                                )}
                            </div>
                            
                            {/* Status Badge */}
                            {statusInfo && (
                                <span className={`${styles.status_badge} ${statusInfo.className}`}>
                                    {statusInfo.label}
                                </span>
                            )}
                        </div>
                        
                        <div className={styles.poll_meta_right}>
                            {/* Copy Link */}
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>{copyText}</Tooltip>}
                            >
                                <button
                                    className={styles.action_button}
                                    onClick={copyToClipBoard}
                                    onMouseEnter={() => setCopyText("Copy")}
                                    disabled={!publicUrl}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path 
                                            d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z" 
                                            fill="currentColor"
                                        />
                                    </svg>
                                </button>
                            </OverlayTrigger>
                            
                            {/* QR Code */}
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>QR Code</Tooltip>}
                            >
                                <button
                                    className={styles.action_button}
                                    onClick={() => setShowQRCodePopup(true)}
                                    disabled={!publicUrl}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path 
                                            d="M3 11V3h8v8H3zm2-2h4V5H5v4zm-2 8v-6h8v6H3zm2-2h4v-2H5v2zm8-12V3h8v8h-8zm2 2h4V5h-4v4zm4 12v-2h2v2h-2zm-6-6v2h2v-2h-2zm2 2v2h-2v-2h2zm-2 2h2v2h-2v-2zm4-2v2h2v-2h-2zm0-4h2v2h-2v-2zm2 2h2v2h-2v-2z" 
                                            fill="currentColor"
                                        />
                                    </svg>
                                </button>
                            </OverlayTrigger>
                            
                            {/* Share Dropdown */}
                            <Dropdown>
                                <Dropdown.Toggle className={styles.action_button} variant="light">
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip>Share</Tooltip>}
                                    >
                                        <div>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path 
                                                    d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" 
                                                    fill="currentColor"
                                                />
                                            </svg>
                                        </div>
                                    </OverlayTrigger>
                                </Dropdown.Toggle>
                                
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => openTwitterUrl(publicUrl, pollObject?.title)}>
                                        Twitter
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openFacebookUrl(publicUrl, pollObject?.title)}>
                                        Facebook
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openLinkedinUrl(publicUrl, pollObject?.title)}>
                                        LinkedIn
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openWhatsappUrl(publicUrl, pollObject?.title)}>
                                        WhatsApp
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openTelegramUrl(publicUrl, pollObject?.title)}>
                                        Telegram
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openRedditUrl(publicUrl, pollObject?.title)}>
                                        Reddit
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>
                    
                    {/* Poll Description */}
                    {pollObject?.description && (
                        <div 
                            className={styles.poll_description}
                            dangerouslySetInnerHTML={{ 
                                __html: convertToHrefLink(pollObject.description) 
                            }}
                        />
                    )}
                </div>
            </div>
            
            <QRCodePopup 
                pollObject={pollObject}
                publicUrl={publicUrl}
                showQRCodePopupFlag={showQRCodePopup}
                setShowQRCodePopupFlag={setShowQRCodePopup}
            />
        </>
    );
}