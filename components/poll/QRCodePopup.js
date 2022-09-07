import QRCode from "qrcode.react";
import { Modal } from "react-bootstrap";
import styles from "../../styles/QRCodePopup.module.css";

export default function QRCodePopup(props) {
    // Parent parameters
    const { pollObject, showQRCodePopupFlag, publicUrl } = props;

    // Variables
    // Handle close popup
    const handleCloseQrCodePopup = () => {
        props.setShowQRCodePopupFlag(false);
    };

    // Functions
    // Download QR code
    const downloadQRCode = () => {
        const qrCodeURL = document
            .getElementById("qrCodeEl")
            .toDataURL("image/png")
            .replace("image/png", "image/octet-stream");
        let aEl = document.createElement("a");
        aEl.href = qrCodeURL;
        aEl.download = "Ballot_" + (pollObject?.title ? pollObject?.title.replaceAll(".", "_") : "") + ".png";
        document.body.appendChild(aEl);
        aEl.click();
        document.body.removeChild(aEl);
    };

    // View
    return (
        <>
            {/* QR code */}
            <Modal
                show={showQRCodePopupFlag}
                onHide={handleCloseQrCodePopup}
                keyboard={false}
                centered
                size="md"
            >
                {/* Header */}
                <div className={styles.dashboard_modal_header_box}>
                    <div>Ballot QR code</div>
                    <button
                        className={styles.dashboard_modal_close_icon_btn_box}
                        onClick={handleCloseQrCodePopup}
                    >
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M0.898377 0.898804C1.2108 0.586385 1.71733 0.586385 2.02975 0.898804L4.9996 3.86865L7.96945 0.898804C8.28186 0.586385 8.7884 0.586385 9.10082 0.898804C9.41324 1.21122 9.41324 1.71776 9.10082 2.03018L6.13097 5.00002L9.10082 7.96987C9.41324 8.28229 9.41324 8.78882 9.10082 9.10124C8.7884 9.41366 8.28186 9.41366 7.96945 9.10124L4.9996 6.13139L2.02975 9.10124C1.71733 9.41366 1.2108 9.41366 0.898377 9.10124C0.585958 8.78882 0.585958 8.28229 0.898377 7.96987L3.86823 5.00002L0.898377 2.03018C0.585958 1.71776 0.585958 1.21122 0.898377 0.898804Z"
                                fill="black"
                            />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div
                    className={
                        styles.dashboard_modal_body_box +
                        " " +
                        styles.dashboard_transactions_modal_body_box
                    }
                    style={{ padding: "0px", marginBottom: "20px" }}
                >
                    {/* QR code */}
                    <div style={{ padding: "20px", textAlign: "center" }}>
                        {/* QR code */}
                        <QRCode size={220} value={publicUrl} />

                        <div style={{ display: "none" }}>
                            <QRCode
                                id="qrCodeEl"
                                size={600}
                                includeMargin={true}
                                value={publicUrl}
                            />
                        </div>

                        {/* Download button */}
                        <div style={{ margin: "30px 0 0 0" }}>
                            <a style={{ cursor: "pointer" }} onClick={downloadQRCode}>
                                <svg
                                    data-v-2381e482=""
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        data-v-2381e482=""
                                        d="M12.6668 6H10.0002V2H6.00016V6H3.3335L8.00016 10.6667L12.6668 6ZM3.3335 12V13.3333H12.6668V12H3.3335Z"
                                        fill="#394147"
                                    ></path>
                                </svg>
                                Download
                            </a>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}
