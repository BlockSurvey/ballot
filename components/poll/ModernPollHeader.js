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
                                    aria-label="Copy link"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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
                                    aria-label="Show QR code"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="7" height="7" />
                                        <rect x="14" y="3" width="7" height="7" />
                                        <rect x="3" y="14" width="7" height="7" />
                                        <rect x="14" y="14" width="2" height="2" />
                                        <rect x="19" y="14" width="2" height="2" />
                                        <rect x="14" y="19" width="2" height="2" />
                                        <rect x="19" y="19" width="2" height="2" />
                                    </svg>
                                </button>
                            </OverlayTrigger>

                            {/* Share Dropdown */}
                            <Dropdown>
                                <Dropdown.Toggle className={styles.action_button} variant="light" aria-label="Share options">
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip>Share</Tooltip>}
                                    >
                                        <div>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="18" cy="5" r="3" />
                                                <circle cx="6" cy="12" r="3" />
                                                <circle cx="18" cy="19" r="3" />
                                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                            </svg>
                                        </div>
                                    </OverlayTrigger>
                                </Dropdown.Toggle>

                                <Dropdown.Menu align="end">
                                    <Dropdown.Item onClick={() => openTwitterUrl(publicUrl, pollObject?.title)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                        </svg>
                                        Twitter
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openFacebookUrl(publicUrl, pollObject?.title)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                                            <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 3.667h-3.533v7.98H9.101z"/>
                                        </svg>
                                        Facebook
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openLinkedinUrl(publicUrl, pollObject?.title)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                        </svg>
                                        LinkedIn
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openWhatsappUrl(publicUrl, pollObject?.title)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                        </svg>
                                        WhatsApp
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openTelegramUrl(publicUrl, pollObject?.title)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                        </svg>
                                        Telegram
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => openRedditUrl(publicUrl, pollObject?.title)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                                            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                                        </svg>
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