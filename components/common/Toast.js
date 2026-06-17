import { useEffect } from "react";
import styles from "../../styles/Toast.module.css";

// Lightweight bottom-center toast. Auto-dismisses after `duration` ms.
export default function Toast({ show, message, onClose, duration = 3000 }) {
    useEffect(() => {
        if (!show) return undefined;
        const timer = setTimeout(() => onClose && onClose(), duration);
        return () => clearTimeout(timer);
    }, [show, message, duration, onClose]);

    if (!show) return null;

    return (
        <div className={styles.wrap} role="status" aria-live="polite">
            <div className={styles.toast}>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>{message}</span>
            </div>
        </div>
    );
}
