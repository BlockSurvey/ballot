import {
    formStacksExplorerUrl,
    openFacebookUrl,
    openLinkedinUrl,
    openRedditUrl,
    openTelegramUrl,
    openTwitterUrl,
    openWhatsappUrl
} from "../../services/utils";
import Tooltip from "react-bootstrap/Tooltip";
import { useState } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import QRCodePopup from "../poll/QRCodePopup";
import { Dropdown } from "react-bootstrap";
import styles from "../../styles/Dashboard.module.css";

export default function HeaderComponent(props) {
    // Variables
    const { pollObject, publicUrl, txStatus } = props;

    const [copyText, setCopyText] = useState("Copy");
    const [showQRCodePopupFlag, setShowQRCodePopupFlag] = useState(false);

    // Function
    const copyToClipBoard = () => {
        if (pollObject?.id) {
            // Update tooltip message
            setCopyText("Copied");

            navigator.clipboard.writeText(publicUrl);
        }
    };

    const convertToHrefLink = (text) => {
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return text.replace(urlRegex, function (url) {
            return '<a href="' + url + '" target="_blank">' + url + '</a>';
        });
    }

    // Design
    return (
        <>
            {pollObject && pollObject.id &&
                <>
                    {/* Title */}
                    <h1 style={{ fontSize: "24px", fontWeight: "600" }}>{pollObject?.title}</h1>

                    {/* Info Bar */}
                    <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", columnGap: "20px",
                        rowGap: "6px", fontSize: "14px", marginBottom: "24px", flexWrap: "wrap"
                    }}>
                        <div className="d-flex align-items-center" style={{ columnGap: "10px" }}>
                            {/* Created by */}
                            <div>
                                <span style={{ color: "rgba(0,0,0, 0.7)" }}>Created by</span> {' '}
                                {pollObject?.userStxAddress &&
                                    <a className="ballot_link" target="_blank" rel="noreferrer" href={formStacksExplorerUrl(pollObject?.userStxAddress)}>
                                        <span>
                                            {pollObject?.userStxAddress?.substring(0, 10)} { }
                                            <svg
                                                width="10"
                                                height="10"
                                                viewBox="0 0 12 12"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z"
                                                    fill="initial"
                                                />
                                            </svg>
                                        </span>
                                    </a>
                                }
                            </div>

                            {/* Status */}
                            {(txStatus && txStatus == "success") &&
                                <div className={pollObject?.status == "draft" ? styles.all_polls_status_box_draft : ((pollObject?.endAtDate && (new Date(pollObject?.endAtDate) < new Date()))) ? styles.all_polls_status_box_closed : styles.all_polls_status_box_active}>
                                    {
                                        pollObject?.status == "draft" ? "Draft" :
                                            ((pollObject?.endAtDate && (new Date(pollObject?.endAtDate) < new Date())) ? "Closed" : "Active")
                                    }
                                </div>
                            }
                            {(txStatus && txStatus == "pending") &&
                                <div className={styles.all_polls_status_box_draft}>
                                    Contract pending
                                </div>
                            }
                            {(txStatus && txStatus != "success" && txStatus != "pending") &&
                                <div className={styles.all_polls_status_box_closed}>
                                    Contract failed
                                </div>
                            }
                        </div>

                        <div className="d-flex align-items-center" style={{ columnGap: "10px" }}>
                            {/* Copy link */}
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>{copyText}</Tooltip>}>
                                <button style={{ padding: "0px", border: "0px", background: "none" }}
                                    onClick={copyToClipBoard}
                                    onMouseEnter={() => setCopyText("Copy")}
                                    disabled={!publicUrl}>
                                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14.0625 21.25H8.75C7.02083 21.25 5.54688 20.6406 4.32813 19.4219C3.10938 18.2031 2.5 16.7292 2.5 15C2.5 13.2708 3.10938 11.7969 4.32813 10.5781C5.54688 9.35937 7.02083 8.75 8.75 8.75H14.0625V10.625H8.75C7.54167 10.625 6.51042 11.0521 5.65625 11.9062C4.80208 12.7604 4.375 13.7917 4.375 15C4.375 16.2083 4.80208 17.2396 5.65625 18.0938C6.51042 18.9479 7.54167 19.375 8.75 19.375H14.0625V21.25ZM10.1562 15.9375V14.0625H19.8438V15.9375H10.1562ZM15.9375 21.25V19.375H21.25C22.4583 19.375 23.4896 18.9479 24.3438 18.0938C25.1979 17.2396 25.625 16.2083 25.625 15C25.625 13.7917 25.1979 12.7604 24.3438 11.9062C23.4896 11.0521 22.4583 10.625 21.25 10.625H15.9375V8.75H21.25C22.9792 8.75 24.4531 9.35937 25.6719 10.5781C26.8906 11.7969 27.5 13.2708 27.5 15C27.5 16.7292 26.8906 18.2031 25.6719 19.4219C24.4531 20.6406 22.9792 21.25 21.25 21.25H15.9375Z" fill="black" />
                                    </svg>
                                </button>
                            </OverlayTrigger>

                            {/* QR code */}
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>QR code</Tooltip>}>
                                <button style={{ padding: "0px", border: "0px", background: "none" }}
                                    disabled={!publicUrl} onClick={() => { setShowQRCodePopupFlag(true) }}>
                                    <svg width="26" height="26" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3.75 14.0625V3.75H14.0625V14.0625H3.75ZM5.625 12.1875H12.1875V5.625H5.625V12.1875ZM3.75 26.25V15.9375H14.0625V26.25H3.75ZM5.625 24.375H12.1875V17.8125H5.625V24.375ZM15.9375 14.0625V3.75H26.25V14.0625H15.9375ZM17.8125 12.1875H24.375V5.625H17.8125V12.1875ZM23.6875 26.25V23.6875H26.25V26.25H23.6875ZM15.9375 18.5312V15.9375H18.5V18.5312H15.9375ZM18.5 21.0938V18.5312H21.0938V21.0938H18.5ZM15.9375 23.6875V21.0938H18.5V23.6875H15.9375ZM18.5 26.25V23.6875H21.0938V26.25H18.5ZM21.0938 23.6875V21.0938H23.6875V23.6875H21.0938ZM21.0938 18.5312V15.9375H23.6875V18.5312H21.0938ZM23.6875 21.0938V18.5312H26.25V21.0938H23.6875Z" fill="black" />
                                    </svg>
                                </button>
                            </OverlayTrigger>

                            {/* Share icon */}
                            <Dropdown>
                                <Dropdown.Toggle
                                    id="user-account-dropdown"
                                    className={styles.share_dropdown}
                                    variant="light">
                                    <OverlayTrigger
                                        placement="auto"
                                        overlay={<Tooltip>Share</Tooltip>}>
                                        <div>
                                            <svg width="28" height="28" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M21.3 3.29999C19.1568 3.29999 17.4 5.05673 17.4 7.19999C17.4 7.61541 17.4655 8.02359 17.5875 8.39999L11.1469 11.9812C10.4759 11.4363 9.62566 11.1 8.70005 11.1C6.55681 11.1 4.80005 12.8567 4.80005 15C4.80005 17.1432 6.55681 18.9 8.70005 18.9C9.62566 18.9 10.4759 18.573 11.1469 18.0281L17.5969 21.6094C17.4743 21.9867 17.4 22.3834 17.4 22.8C17.4 24.9432 19.1568 26.7 21.3 26.7C23.4433 26.7 25.2 24.9432 25.2 22.8C25.2 20.6567 23.4433 18.9 21.3 18.9C20.2237 18.9 19.2423 19.3498 18.5344 20.0625L12.2625 16.575C12.4768 16.0933 12.6 15.5583 12.6 15C12.6 14.4385 12.479 13.9087 12.2625 13.425L18.525 9.93749C19.2336 10.6557 20.2189 11.1 21.3 11.1C23.4433 11.1 25.2 9.34324 25.2 7.19999C25.2 5.05673 23.4433 3.29999 21.3 3.29999ZM21.3 5.09999C22.4705 5.09999 23.4 6.02953 23.4 7.19999C23.4 8.37044 22.4705 9.29999 21.3 9.29999C20.1296 9.29999 19.2 8.37044 19.2 7.19999C19.2 6.02953 20.1296 5.09999 21.3 5.09999ZM8.70005 12.9C9.87049 12.9 10.8 13.8295 10.8 15C10.8 16.1704 9.87049 17.1 8.70005 17.1C7.52961 17.1 6.60005 16.1704 6.60005 15C6.60005 13.8295 7.52961 12.9 8.70005 12.9ZM21.3 20.7C22.4705 20.7 23.4 21.6295 23.4 22.8C23.4 23.9704 22.4705 24.9 21.3 24.9C20.1296 24.9 19.2 23.9704 19.2 22.8C19.2 21.6295 20.1296 20.7 21.3 20.7Z" fill="black" />
                                            </svg>
                                        </div>
                                    </OverlayTrigger>
                                </Dropdown.Toggle>

                                <Dropdown.Menu>
                                    <Dropdown.Item
                                        onClick={() => {
                                            openTwitterUrl(
                                                publicUrl,
                                                pollObject?.title
                                            );
                                        }}
                                    >
                                        Twitter
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => {
                                            openFacebookUrl(
                                                publicUrl,
                                                pollObject?.title
                                            );
                                        }}
                                    >
                                        Facebook
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => {
                                            openLinkedinUrl(
                                                publicUrl,
                                                pollObject?.title
                                            );
                                        }}
                                    >
                                        LinkedIn
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => {
                                            openWhatsappUrl(
                                                publicUrl,
                                                pollObject?.title
                                            );
                                        }}
                                    >
                                        WhatsApp
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => {
                                            openTelegramUrl(
                                                publicUrl,
                                                pollObject?.title
                                            );
                                        }}
                                    >
                                        Telegram
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => {
                                            openRedditUrl(
                                                publicUrl,
                                                pollObject?.title
                                            );
                                        }}
                                    >
                                        Reddit
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: "24px", whiteSpace: "pre-wrap" }}>
                        <p style={{ lineHeight: "1.7", wordWrap: "break-word" }}
                            dangerouslySetInnerHTML={{ __html: pollObject?.description ? convertToHrefLink(pollObject?.description) : "" }}>
                        </p>
                    </div>
                </>
            }

            <QRCodePopup pollObject={pollObject} publicUrl={publicUrl}
                showQRCodePopupFlag={showQRCodePopupFlag} setShowQRCodePopupFlag={setShowQRCodePopupFlag} />
        </>
    );
}