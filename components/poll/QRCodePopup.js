import { useRef } from "react";
import QRCode from "qrcode.react";
import { Modal } from "react-bootstrap";
import styles from "../../styles/QRCodePopup.module.css";

export default function QRCodePopup(props) {
    // Parent parameters
    const { pollObject, showQRCodePopupFlag, publicUrl } = props;

    // Ref for the QR code canvas
    const qrCodeRef = useRef(null);

    // Handle close popup
    const handleCloseQrCodePopup = () => {
        props.setShowQRCodePopupFlag(false);
    };

    // Download QR code as PNG
    const downloadQRCode = () => {
        const canvas = document.getElementById("qrCodeCanvas");
        if (!canvas) return;

        try {
            const pngUrl = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            const fileName = pollObject?.title
                ? `${pollObject.title.replace(/[^a-zA-Z0-9]/g, "_")}_QRCode.png`
                : "Ballot_QRCode.png";
            downloadLink.download = fileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        } catch (error) {
            console.error("Error downloading QR code:", error);
        }
    };

    // View
    return (
        <>
            <Modal
                show={showQRCodePopupFlag}
                onHide={handleCloseQrCodePopup}
                keyboard={false}
                centered
                size="md"
                dialogClassName={styles.modal_dialog}
            >
                <div className={styles.modal_container}>
                    {/* Close Button */}
                    <button
                        className={styles.close_button}
                        onClick={handleCloseQrCodePopup}
                        aria-label="Close"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    {/* Content */}
                    <div className={styles.content}>
                        {/* Poll Title */}
                        <h2 className={styles.poll_title}>
                            {pollObject?.title || "Untitled Poll"}
                        </h2>

                        {/* QR Code */}
                        <div className={styles.qr_wrapper}>
                            <div className={styles.qr_code_box}>
                                <QRCode
                                    id="qrCodeCanvas"
                                    value={publicUrl}
                                    size={280}
                                    level="H"
                                    includeMargin={true}
                                    renderAs="canvas"
                                />
                            </div>
                        </div>

                        {/* Instruction Text */}
                        <p className={styles.instruction_text}>
                            Scan this QR code to access the poll
                        </p>

                        {/* Download Button */}
                        <button
                            className={styles.download_button}
                            onClick={downloadQRCode}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download QR Code
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
