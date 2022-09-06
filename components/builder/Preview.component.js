import { Modal } from "react-bootstrap";
import PollComponent from "../poll/PollComponent";

export default function PreviewComponent(props) {
    const { show, handleClose, pollObject } = props;

    return (
        <>
            <Modal size="xl" show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Preview</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <PollComponent isPreview="true" pollObject={pollObject} resultsByPosition={{}} />
                </Modal.Body>
            </Modal>
        </>
    )
}