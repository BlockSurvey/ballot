import { formStacksExplorerUrl } from "../../services/utils";
import Tooltip from "react-bootstrap/Tooltip";
import { useState } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import QRCodePopup from "../poll/QRCodePopup";

export default function HeaderComponent(props) {
    // Variables
    const { pollObject, publicUrl } = props;

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

    // Design
    return (
        <>
            {pollObject && pollObject.id &&
                <>
                    {/* Title */}
                    <h4>{pollObject?.title}</h4>

                    {/* Info Bar */}
                    <div style={{ display: "flex", alignItems: "center", columnGap: "20px", fontSize: "14px" }}>
                        {/* Status */}
                        <div>
                            {pollObject?.status == "draft" ? "Draft" : "Active"} {' '}
                        </div>

                        {/* Created by */}
                        <div>
                            <span style={{ color: "#737373" }}>Created by</span> {' '}
                            {pollObject?.userStxAddress &&
                                <a target="_blank" rel="noreferrer" href={formStacksExplorerUrl(pollObject?.userStxAddress)}>
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
                                                fill="#0d6efd"
                                            />
                                        </svg>
                                    </span>
                                </a>
                            }
                        </div>

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
                    </div>

                    {/* Description */}
                    <div style={{ margin: "20px 0", whiteSpace: "pre-wrap" }}>
                        <h5>Description</h5>
                        <p>
                            {pollObject?.description}
                        </p>
                    </div>
                </>
            }

            <QRCodePopup pollObject={pollObject} publicUrl={publicUrl}
                showQRCodePopupFlag={showQRCodePopupFlag} setShowQRCodePopupFlag={setShowQRCodePopupFlag} />
        </>
    );
}