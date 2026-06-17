import { OverlayTrigger, Tooltip } from "react-bootstrap";

// Clean, monochrome tooltip for icon buttons. Wraps a single focusable element
// (e.g. a <button> or <a>). Styling lives in globals.css under `.ballot_tooltip`.
export default function IconTooltip({ label, placement = "top", children }) {
    const id = `tt-${String(label).replace(/\s+/g, "-").toLowerCase()}`;
    return (
        <OverlayTrigger
            placement={placement}
            delay={{ show: 200, hide: 0 }}
            overlay={<Tooltip id={id} className="ballot_tooltip">{label}</Tooltip>}
        >
            {children}
        </OverlayTrigger>
    );
}
