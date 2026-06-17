import { useEffect, useState } from "react";
import { Modal, Spinner, Form, Button } from "react-bootstrap";
import { getFileFromGaia } from "../../services/auth";
import { convertToDisplayDateFormat } from "../../services/utils";
import ModalCloseButton from "../common/ModalCloseButton";
import styles from "../../styles/ChoosePollsPopup.module.css";

export default function ChoosePollsPopup(props) {
    // Parent parameters
    const { showChoosePollsPopupFlag, summaryObject, handleSummaryChange } = props;

    // Variables
    // Handle close popup
    const handleCloseChoosePollsPopup = () => {
        props.setShowChoosePollsPopupFlag(false);
    };

    // Summary polls
    const [summaryPolls, setSummaryPolls] = useState();

    // All polls
    const [allPolls, setAllPolls] = useState();

    // Loading
    const [isLoading, setIsLoading] = useState(false);

    // Functions
    useEffect(() => {
        if (showChoosePollsPopupFlag) {
            // Take summary polls
            setSummaryPolls(JSON.parse(JSON.stringify(summaryObject?.polls)));

            // Start loading
            setIsLoading(true);

            getFileFromGaia("pollIndex.json", {}).then(
                (response) => {
                    if (response) {
                        setAllPolls(JSON.parse(response));
                    }

                    // Stop loading
                    setIsLoading(false);
                },
                (error) => {
                    // File does not exit in gaia
                    if (error && error.code == "does_not_exist") {
                        setAllPolls({
                            list: [],
                            ref: {}
                        });
                    }

                    // Stop loading
                    setIsLoading(false);
                });
        }
    }, [showChoosePollsPopupFlag]);

    function getEachRow(pollIndexObject) {
        return (
            <div>
                {/* Title */}
                <div className="d-flex align-items-center" style={{ marginBottom: "10px", columnGap: "10px", width: "100%" }}>
                    <div className="text-truncate" style={{ fontSize: "18px", fontWeight: 600 }}>
                        {pollIndexObject?.title ? pollIndexObject?.title : "..."}
                    </div>
                    {/* Status */}
                    <div className={pollIndexObject?.status == "draft" ? styles.all_polls_status_box_draft : ((pollIndexObject?.endAt && (new Date(pollIndexObject?.endAt) < new Date()))) ? styles.all_polls_status_box_closed : styles.all_polls_status_box_active}>
                        {
                            pollIndexObject?.status == "draft" ? "Draft" :
                                ((pollIndexObject?.endAt && (new Date(pollIndexObject?.endAt) < new Date())) ?
                                    "Closed" : "Active")
                        }
                    </div>
                </div>

                {/* Description */}
                {
                    pollIndexObject?.description ?
                        <p className={"text_truncate_2" + ' ' + styles.all_polls_description}>
                            {pollIndexObject?.description ? pollIndexObject?.description : "..."}
                        </p>
                        : <></>
                }

                <div style={{ fontSize: "14px", color: "#737373" }}>
                    <span>
                        Last Modified : {convertToDisplayDateFormat(pollIndexObject?.updatedAt)}
                    </span>
                </div>
            </div>
        )
    }

    function onClickOfPolls(pollId) {
        if (!summaryPolls?.ref[pollId]) {
            summaryPolls.list.push(pollId);
            summaryPolls.ref[pollId] = allPolls?.ref?.[pollId];
        } else {
            const summaryIndex = summaryPolls.list.findIndex(item => item == pollId);
            if (summaryIndex >= 0) {
                summaryPolls.list.splice(summaryIndex, 1);
            }
            delete summaryPolls.ref[pollId];
        }

        setSummaryPolls({ ...summaryPolls });
    }

    function saveSummaryPolls() {
        handleSummaryChange({
            target: {
                name: "polls",
                value: { ...summaryPolls }
            }
        });

        handleCloseChoosePollsPopup();
    }

    const handleChange = e => {
        const { name, value } = e.target;
    }

    // View
    return (
        <>
            {/* QR code */}
            <Modal
                show={showChoosePollsPopupFlag}
                onHide={handleCloseChoosePollsPopup}
                keyboard={false}
                centered
                size="xl"
            >
                {/* Header */}
                <div className={styles.summary_modal_header_box}>
                    <div>Choose polls</div>
                    <ModalCloseButton onClick={handleCloseChoosePollsPopup} />
                </div>

                {/* Body */}
                <div className={styles.summary_modal_body_box} >
                    {
                        // Loading
                        isLoading ? (
                            <div style={{ textAlign: "center", padding: "10px" }}>
                                <Spinner animation="border" variant="secondary" size="md" />
                            </div>
                        ) : // Once data found
                            (allPolls && allPolls?.list?.length > 0) ? (
                                <div className={styles.all_polls_list_outline_box}>
                                    {allPolls?.list.map(
                                        (pollId, i) => (
                                            (allPolls?.ref?.[pollId] && allPolls?.ref?.[pollId]?.status != "draft") &&
                                            <div key={i} style={{ display: "flex" }} className={styles.all_polls_list_box} onClick={() => { onClickOfPolls(pollId) }}>
                                                <div>
                                                    <Form.Group className="mb-3">
                                                        <Form.Check
                                                            inline
                                                            type="checkbox"
                                                            name={pollId}
                                                            onChange={handleChange}
                                                            checked={summaryPolls?.ref?.[pollId] ? true : false}
                                                        />
                                                    </Form.Group>
                                                </div>
                                                <div >
                                                    {getEachRow(allPolls.ref[pollId])}
                                                </div>
                                            </div>

                                        )
                                    )}
                                </div>
                            ) : (
                                <div style={{ padding: "0px 20px 10px", fontSize: "14px" }}>
                                    Only published polls will be listed here.
                                </div>
                            )
                    }
                </div>

                {/* Footer */}
                <Modal.Footer>
                    <Button className="action_secondary_btn" onClick={handleCloseChoosePollsPopup}>Close</Button>
                    <Button variant="dark" onClick={() => { saveSummaryPolls() }} disabled={isLoading}>Done</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
