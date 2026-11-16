import { useEffect } from "react";
import styles from "../../styles/Toast.module.css";

// Lightweight bottom-center toast. Auto-dismisses after `duration` ms.
// variant="error": wraps long text (375px safe), announces assertively and
// offers a dismiss button, since error copy takes longer to read.
export default function Toast({ show, message, onClose, duration = 3000, variant = "success" }) {
    useEffect(() => {
        if (!show) return undefined;
        const timer = setTimeout(() => onClose && onClose(), duration);
        return () => clearTimeout(timer);
    }, [show, message, duration, onClose]);

    if (!show) return null;

    const isError = variant === "error";

    return (
        <div className={styles.wrap} role={isError ? "alert" : "status"} aria-live={isError ? "assertive" : "polite"}>
            <div className={`${styles.toast} ${isError ? styles.toast_error : ""}`}>
                {isError ? (
                    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v5M12 16.5v.01" />
                    </svg>
                ) : (
                    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                )}
                <span>{message}</span>
                {isError && onClose && (
                    <button type="button" className={styles.close} onClick={onClose} aria-label="Dismiss">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
