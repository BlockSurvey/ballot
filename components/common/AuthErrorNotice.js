import { useCallback, useEffect, useState } from "react";
import { AUTH_ERROR_EVENT } from "../../services/auth";
import Toast from "./Toast";

// App-wide listener for wallet sign-in failures. authenticate() is called from
// several buttons (landing, navbar, voting screen); it dispatches one window
// event on failure so none of those call sites need their own error state.
export default function AuthErrorNotice() {
    const [message, setMessage] = useState("");

    useEffect(() => {
        const onError = (event) => setMessage(event?.detail?.message || "");
        window.addEventListener(AUTH_ERROR_EVENT, onError);
        return () => window.removeEventListener(AUTH_ERROR_EVENT, onError);
    }, []);

    const close = useCallback(() => setMessage(""), []);

    return <Toast show={!!message} message={message} onClose={close} duration={9000} variant="error" />;
}
