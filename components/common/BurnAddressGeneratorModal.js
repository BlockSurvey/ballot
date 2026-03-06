import { useState, useEffect, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { c32address } from "c32check";
import bs58check from "bs58check";
import { putFileToGaia, getFileFromGaia } from "../../services/auth";
import styles from "../../styles/Dashboard.module.css";

const VERSION_SP_MAINNET = 22;
const STORAGE_FILE = "burn_addresses_ballot.json";

function makeHashHex(msg) {
    const encoder = new TextEncoder();
    const ascii = encoder.encode(msg);
    if (ascii.length > 20) {
        throw new Error(`Message too long for 20-byte embed: ${msg}`);
    }
    const buf = new Uint8Array(20);
    buf.set(ascii, 20 - ascii.length);
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function btcAddressFromHashHex(hashHex) {
    const payload = new Uint8Array(21);
    payload[0] = 0x00; // P2PKH mainnet
    const hashBytes = hashHex.match(/.{2}/g).map(h => parseInt(h, 16));
    payload.set(hashBytes, 1);
    return bs58check.encode(Buffer.from(payload));
}

function stacksAddressFromHashHex(hashHex) {
    return c32address(VERSION_SP_MAINNET, hashHex);
}

function generateBurnAddresses(label) {
    const yesMsg = `yes-${label}`;
    const noMsg = `no-${label}`;

    const yesHashHex = makeHashHex(yesMsg);
    const noHashHex = makeHashHex(noMsg);

    return {
        label,
        createdAt: new Date().toISOString(),
        yes: {
            message: yesMsg,
            btc: btcAddressFromHashHex(yesHashHex),
            stx: stacksAddressFromHashHex(yesHashHex),
        },
        no: {
            message: noMsg,
            btc: btcAddressFromHashHex(noHashHex),
            stx: stacksAddressFromHashHex(noHashHex),
        },
    };
}

export default function BurnAddressGeneratorModal({ show, onHide }) {
    const [label, setLabel] = useState("");
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    useEffect(() => {
        if (show) {
            loadFromStorage();
        }
    }, [show]);

    const loadFromStorage = async () => {
        setIsLoading(true);
        try {
            const response = await getFileFromGaia(STORAGE_FILE);
            if (response) {
                const data = JSON.parse(response);
                setSavedAddresses(data?.addresses || []);
            } else {
                setSavedAddresses([]);
            }
        } catch (err) {
            if (err?.code === "does_not_exist") {
                setSavedAddresses([]);
            } else {
                console.error("Error loading burn addresses:", err);
                setError("Failed to load saved addresses");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const saveToStorage = async (addresses) => {
        setIsSaving(true);
        try {
            await putFileToGaia(
                STORAGE_FILE,
                JSON.stringify({ addresses }),
                { encrypt: false }
            );
        } catch (err) {
            console.error("Error saving burn addresses:", err);
            setError("Failed to save. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = useCallback(async () => {
        const trimmed = label.trim();
        if (!trimmed) {
            setError("Please enter a label");
            return;
        }
        if (trimmed.length > 12) {
            setError("Label must be 12 characters or less");
            return;
        }
        if (new TextEncoder().encode(`yes-${trimmed}`).length > 20) {
            setError("Label too long for burn address encoding");
            return;
        }

        const exists = savedAddresses.some(a => a.label === trimmed);
        if (exists) {
            setError("This label already exists");
            return;
        }

        try {
            const result = generateBurnAddresses(trimmed);
            const updated = [result, ...savedAddresses];
            setSavedAddresses(updated);
            setLabel("");
            setError("");
            setExpandedIndex(0);
            await saveToStorage(updated);
        } catch (e) {
            setError(e.message);
        }
    }, [label, savedAddresses]);

    const handleDelete = useCallback(async (index) => {
        const updated = savedAddresses.filter((_, i) => i !== index);
        setSavedAddresses(updated);
        if (expandedIndex === index) setExpandedIndex(null);
        else if (expandedIndex > index) setExpandedIndex(expandedIndex - 1);
        await saveToStorage(updated);
    }, [savedAddresses, expandedIndex]);

    const handleCopy = useCallback(async (text, field) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            const el = document.createElement("textarea");
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        }
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleGenerate();
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className={styles.minimal_modal}>
            <div className={styles.minimal_modal_content}>
                {/* Header */}
                <div className={styles.minimal_modal_header}>
                    <div>
                        <h2 className={styles.minimal_modal_title}>Burn Address Generator</h2>
                        <p className={styles.burn_subtitle}>
                            Generate deterministic burn addresses for on-chain voting
                        </p>
                    </div>
                    <button className={styles.minimal_close_btn} onClick={onHide} aria-label="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                {/* Generator Input */}
                <div className={styles.burn_input_section}>
                    <div className={styles.burn_input_row}>
                        <div className={styles.burn_input_wrapper}>
                            <label className={styles.burn_input_label}>Label</label>
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => { setLabel(e.target.value); setError(""); }}
                                onKeyDown={handleKeyDown}
                                placeholder="e.g., sip-33"
                                className={styles.burn_input}
                                maxLength={12}
                            />
                            <span className={styles.burn_input_hint}>
                                Generates: yes-{label || "..."} / no-{label || "..."}
                            </span>
                        </div>
                        <button
                            onClick={handleGenerate}
                            className={styles.burn_generate_btn}
                            disabled={!label.trim() || isSaving}
                        >
                            {isSaving ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" className={styles.spinner_rotate}>
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4"/>
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 5v14M5 12h14"/>
                                </svg>
                            )}
                            {isSaving ? "Saving..." : "Generate"}
                        </button>
                    </div>
                    {error && <p className={styles.burn_error}>{error}</p>}
                </div>

                {/* Saved Addresses List */}
                <div className={styles.minimal_modal_body}>
                    {isLoading ? (
                        <div className={styles.minimal_loading_state}>
                            <div className={styles.minimal_spinner}>
                                <svg width="40" height="40" viewBox="0 0 24 24">
                                    <circle
                                        cx="12" cy="12" r="10"
                                        stroke="currentColor" strokeWidth="2" fill="none"
                                        strokeDasharray="31.4 31.4"
                                        className={styles.spinner_rotate}
                                    />
                                </svg>
                            </div>
                            <p className={styles.loading_text}>Loading saved addresses...</p>
                        </div>
                    ) : savedAddresses.length === 0 ? (
                        <div className={styles.burn_empty_state}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25">
                                <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <h3 className={styles.burn_empty_title}>No Burn Addresses Yet</h3>
                            <p className={styles.burn_empty_desc}>
                                Enter a label above to generate your first set of burn addresses
                            </p>
                        </div>
                    ) : (
                        <div className={styles.burn_list}>
                            {savedAddresses.map((entry, index) => {
                                const isExpanded = expandedIndex === index;
                                return (
                                    <div key={`${entry.label}-${entry.createdAt}`} className={styles.burn_card}>
                                        <div
                                            className={styles.burn_card_header}
                                            onClick={() => setExpandedIndex(isExpanded ? null : index)}
                                        >
                                            <div className={styles.burn_card_info}>
                                                <div className={styles.burn_card_label_row}>
                                                    <span className={styles.burn_card_label}>{entry.label}</span>
                                                    <span className={styles.burn_card_date}>
                                                        {new Date(entry.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className={styles.burn_card_preview}>
                                                    <span className={styles.burn_tag_yes}>YES</span>
                                                    <span className={styles.burn_tag_no}>NO</span>
                                                    <span className={styles.burn_card_addr_preview}>
                                                        {entry.yes.stx.substring(0, 16)}...
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={styles.burn_card_actions_row}>
                                                <button
                                                    className={styles.burn_delete_btn}
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                                                    title="Delete"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                                    </svg>
                                                </button>
                                                <svg
                                                    width="20" height="20" viewBox="0 0 24 24" fill="currentColor"
                                                    className={`${styles.burn_chevron} ${isExpanded ? styles.burn_chevron_open : ''}`}
                                                >
                                                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                                                </svg>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className={styles.burn_card_body}>
                                                {/* Yes Addresses */}
                                                <div className={styles.burn_address_group}>
                                                    <div className={styles.burn_group_header}>
                                                        <span className={styles.burn_tag_yes}>YES</span>
                                                        <span className={styles.burn_group_msg}>{entry.yes.message}</span>
                                                    </div>
                                                    <AddressRow
                                                        label="BTC"
                                                        address={entry.yes.btc}
                                                        fieldKey={`${index}-yes-btc`}
                                                        copiedField={copiedField}
                                                        onCopy={handleCopy}
                                                    />
                                                    <AddressRow
                                                        label="STX"
                                                        address={entry.yes.stx}
                                                        fieldKey={`${index}-yes-stx`}
                                                        copiedField={copiedField}
                                                        onCopy={handleCopy}
                                                    />
                                                </div>

                                                {/* No Addresses */}
                                                <div className={styles.burn_address_group}>
                                                    <div className={styles.burn_group_header}>
                                                        <span className={styles.burn_tag_no}>NO</span>
                                                        <span className={styles.burn_group_msg}>{entry.no.message}</span>
                                                    </div>
                                                    <AddressRow
                                                        label="BTC"
                                                        address={entry.no.btc}
                                                        fieldKey={`${index}-no-btc`}
                                                        copiedField={copiedField}
                                                        onCopy={handleCopy}
                                                    />
                                                    <AddressRow
                                                        label="STX"
                                                        address={entry.no.stx}
                                                        fieldKey={`${index}-no-stx`}
                                                        copiedField={copiedField}
                                                        onCopy={handleCopy}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

function AddressRow({ label, address, fieldKey, copiedField, onCopy }) {
    const isCopied = copiedField === fieldKey;
    return (
        <div className={styles.burn_address_row}>
            <span className={styles.burn_address_type}>{label}</span>
            <code className={styles.burn_address_value}>{address}</code>
            <button
                className={`${styles.burn_copy_btn} ${isCopied ? styles.burn_copy_btn_copied : ''}`}
                onClick={() => onCopy(address, fieldKey)}
                title={isCopied ? "Copied!" : "Copy address"}
            >
                {isCopied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                )}
            </button>
        </div>
    );
}
