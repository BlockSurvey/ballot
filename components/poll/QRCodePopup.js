import { useState } from "react";
import QRCode from "qrcode.react";
import { Modal } from "react-bootstrap";
import styles from "../../styles/QRCodePopup.module.css";

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Wrap `text` to fit `maxWidth`, capped at `maxLines` (last line ellipsised).
function wrapLines(ctx, text, maxWidth, maxLines) {
    const words = (text || "").trim().split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
        lines.length = maxLines;
        let last = lines[maxLines - 1];
        while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
            last = last.slice(0, -1);
        }
        lines[maxLines - 1] = `${last}…`;
    }
    return lines.length ? lines : [""];
}

function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

export default function QRCodePopup(props) {
    // Parent parameters
    const { pollObject, showQRCodePopupFlag, publicUrl } = props;

    const [copied, setCopied] = useState(false);

    // Handle close popup
    const handleCloseQrCodePopup = () => {
        props.setShowQRCodePopupFlag(false);
    };

    // Compose a clean, printable poster (title + QR + instruction + URL + brand)
    // and download it as a PNG so the printout is self-explanatory.
    const downloadQRCode = () => {
        const qrCanvas =
            document.getElementById("qrCodeCanvasHiRes") ||
            document.getElementById("qrCodeCanvas");
        if (!qrCanvas) return;

        try {
            const SCALE = 2; // crisp on retina / when printed
            const W = 520;
            const PAD = 44;
            const CW = W - PAD * 2;
            const QR = 372;
            const title = pollObject?.title || "Untitled Poll";

            // Measure title to figure out the canvas height
            const measure = document.createElement("canvas").getContext("2d");
            measure.font = `700 27px ${FONT_STACK}`;
            const titleLines = wrapLines(measure, title, CW, 3);

            const EYEBROW_H = 15, GAP_EYEBROW = 14;
            const TITLE_LH = 34, GAP_TITLE = 18;
            const GAP_QR = 22;
            const INSTR_H = 20, GAP_INSTR = 24;
            const DIV_GAP = 18;
            const FOOT_H = 15;

            const H =
                PAD +
                EYEBROW_H + GAP_EYEBROW +
                titleLines.length * TITLE_LH + GAP_TITLE +
                QR + GAP_QR +
                INSTR_H + GAP_INSTR +
                1 + DIV_GAP +
                FOOT_H +
                PAD;

            const out = document.createElement("canvas");
            out.width = W * SCALE;
            out.height = H * SCALE;
            const ctx = out.getContext("2d");
            ctx.scale(SCALE, SCALE);

            // Background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, W, H);

            // Subtle frame so the printed edge is defined
            ctx.strokeStyle = "#e6e6e6";
            ctx.lineWidth = 1;
            roundRectPath(ctx, 0.5, 0.5, W - 1, H - 1, 22);
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            const cx = W / 2;
            let y = PAD;

            // Eyebrow
            ctx.font = `700 13px ${FONT_STACK}`;
            ctx.fillStyle = "#999999";
            ctx.fillText("SCAN TO OPEN THIS POLL", cx, y);
            y += EYEBROW_H + GAP_EYEBROW;

            // Title
            ctx.font = `700 27px ${FONT_STACK}`;
            ctx.fillStyle = "#000000";
            for (const line of titleLines) {
                ctx.fillText(line, cx, y);
                y += TITLE_LH;
            }
            y += GAP_TITLE;

            // QR
            const qrX = (W - QR) / 2;
            ctx.drawImage(qrCanvas, qrX, y, QR, QR);
            y += QR + GAP_QR;

            // Instruction
            ctx.font = `500 15px ${FONT_STACK}`;
            ctx.fillStyle = "#666666";
            ctx.fillText("Point your phone camera at the code to vote", cx, y);
            y += INSTR_H + GAP_INSTR;

            // Divider
            ctx.strokeStyle = "#f0f0f0";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PAD, y + 0.5);
            ctx.lineTo(W - PAD, y + 0.5);
            ctx.stroke();
            y += 1 + DIV_GAP;

            // Footer / branding
            ctx.font = `600 12px ${FONT_STACK}`;
            ctx.fillStyle = "#999999";
            ctx.fillText("Powered by Ballot · ballot.gg", cx, y);

            // Download
            const pngUrl = out.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            const fileName = pollObject?.title
                ? `${pollObject.title.replace(/[^a-zA-Z0-9]/g, "_")}_Ballot_QR.png`
                : "Ballot_QR.png";
            downloadLink.download = fileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        } catch (error) {
            console.error("Error downloading QR code:", error);
        }
    };

    // Copy the public poll link
    const copyLink = () => {
        if (!publicUrl) return;
        try {
            navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Error copying link:", error);
        }
    };

    // View
    return (
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* Content */}
                <div className={styles.content}>
                    {/* Eyebrow + Title */}
                    <span className={styles.eyebrow}>Poll QR Code</span>
                    <h2 className={styles.poll_title}>
                        {pollObject?.title || "Untitled Poll"}
                    </h2>

                    {/* QR Code */}
                    <div className={styles.qr_code_box}>
                        <QRCode
                            id="qrCodeCanvas"
                            value={publicUrl}
                            size={232}
                            level="H"
                            includeMargin={true}
                            renderAs="canvas"
                        />
                    </div>

                    {/* Hi-res QR (off-screen) used only for a crisp printable download */}
                    <div className={styles.offscreen} aria-hidden="true">
                        <QRCode
                            id="qrCodeCanvasHiRes"
                            value={publicUrl}
                            size={560}
                            level="H"
                            includeMargin={true}
                            renderAs="canvas"
                        />
                    </div>

                    {/* Instruction Text */}
                    <p className={styles.instruction_text}>
                        Scan with any phone camera to open the poll
                    </p>

                    {/* Link preview */}
                    {publicUrl && (
                        <div className={styles.url_chip} title={publicUrl}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            <span className={styles.url_text}>{publicUrl}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className={styles.actions}>
                        <button
                            className={styles.copy_button}
                            onClick={copyLink}
                            disabled={!publicUrl}
                        >
                            {copied ? (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Link copied!
                                </>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                    Copy link
                                </>
                            )}
                        </button>
                        <button
                            className={styles.download_button}
                            onClick={downloadQRCode}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
