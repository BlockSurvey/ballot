import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { getMyStxAddress, getGaiaAddressFromPublicKey } from "../../services/auth";
import { formStacksExplorerUrl, truncateMiddle } from "../../services/utils";
import { Constants } from "../../common/constants";
import ModalCloseButton from "./ModalCloseButton";
import styles from "../../styles/ProfileModal.module.css";

export default function ProfileModal({ show, onHide, displayUsername }) {
    const [stxAddress, setStxAddress] = useState("");
    const [gaiaAddress, setGaiaAddress] = useState("");
    const [copiedField, setCopiedField] = useState("");

    const isMainnet = !!Constants.STACKS_MAINNET_FLAG;
    const networkLabel = isMainnet ? "Mainnet" : "Testnet";

    useEffect(() => {
        if (!show) return;

        try {
            setStxAddress(getMyStxAddress() || "");
        } catch (e) {
            setStxAddress("");
        }

        let active = true;
        getGaiaAddressFromPublicKey()
            .then((addr) => { if (active) setGaiaAddress(addr || ""); })
            .catch(() => { if (active) setGaiaAddress(""); });

        return () => { active = false; };
    }, [show]);

    const copy = async (field, value) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopiedField(field);
            setTimeout(() => setCopiedField(""), 2000);
        } catch (e) {
            // clipboard unavailable — ignore
        }
    };

    // A name to headline with: the BNS name when available, else the address.
    const hasBns = displayUsername && !/^S[0-9A-Z]/.test(displayUsername);
    const headline = hasBns ? displayUsername : (stxAddress ? truncateMiddle(stxAddress, 6, 6) : "Stacks user");
    const initial = (headline || "?").charAt(0).toUpperCase();

    const CopyIcon = (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
    const CheckIcon = (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
        </svg>
    );

    return (
        <Modal show={show} onHide={onHide} centered contentClassName={styles.content}>
            <div className={styles.body}>
                <ModalCloseButton onClick={onHide} />

                <div className={styles.header}>
                    <div className={styles.avatar}>{initial}</div>
                    <div className={styles.identity}>
                        <div className={styles.name} title={headline}>{headline}</div>
                        <span className={styles.network}>
                            <span className={styles.network_dot}></span>
                            {networkLabel}
                        </span>
                    </div>
                </div>

                <div className={styles.details}>
                    <div className={styles.row}>
                        <div className={styles.row_label}>Stacks address</div>
                        <div className={styles.row_value}>
                            <span className={styles.mono}>{stxAddress ? truncateMiddle(stxAddress, 10, 8) : "—"}</span>
                            {stxAddress && (
                                <div className={styles.row_actions}>
                                    <button
                                        className={`${styles.icon_btn} ${copiedField === "stx" ? styles.copied : ""}`}
                                        onClick={() => copy("stx", stxAddress)}
                                        aria-label="Copy Stacks address"
                                        title="Copy address"
                                    >
                                        {copiedField === "stx" ? CheckIcon : CopyIcon}
                                    </button>
                                    <a
                                        className={styles.icon_btn}
                                        href={formStacksExplorerUrl(stxAddress, "address")}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label="View on explorer"
                                        title="View on explorer"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {gaiaAddress && (
                        <div className={styles.row}>
                            <div className={styles.row_label}>Storage address</div>
                            <div className={styles.row_value}>
                                <span className={styles.mono}>{truncateMiddle(gaiaAddress, 10, 8)}</span>
                                <div className={styles.row_actions}>
                                    <button
                                        className={`${styles.icon_btn} ${copiedField === "gaia" ? styles.copied : ""}`}
                                        onClick={() => copy("gaia", gaiaAddress)}
                                        aria-label="Copy storage address"
                                        title="Copy address"
                                    >
                                        {copiedField === "gaia" ? CheckIcon : CopyIcon}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
