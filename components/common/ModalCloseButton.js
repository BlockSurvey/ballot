// Uniform modal close button used across every popup in the product.
// Renders a quiet ghost "×" anchored top-right of the modal content. Styling
// lives in globals.css under `.ballot_modal_close`. The modal's content/body
// element should be `position: relative` (Bootstrap's `.modal-content` already is).
export default function ModalCloseButton({ onClick, disabled = false, ariaLabel = "Close", className = "" }) {
    return (
        <button
            type="button"
            className={`ballot_modal_close ${className}`.trim()}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
        >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    );
}
