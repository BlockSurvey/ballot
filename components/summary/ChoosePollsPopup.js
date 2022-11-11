import { useEffect, useState } from "react";
import { Modal, Spinner, Form, Button } from "react-bootstrap";
import { getFileFromGaia } from "../../services/auth";
import { convertToDisplayDateFormat } from "../../services/utils";
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
                    <button
                        className={styles.summary_modal_close_icon_btn_box}
                        onClick={handleCloseChoosePollsPopup}
                    >
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M0.898377 0.898804C1.2108 0.586385 1.71733 0.586385 2.02975 0.898804L4.9996 3.86865L7.96945 0.898804C8.28186 0.586385 8.7884 0.586385 9.10082 0.898804C9.41324 1.21122 9.41324 1.71776 9.10082 2.03018L6.13097 5.00002L9.10082 7.96987C9.41324 8.28229 9.41324 8.78882 9.10082 9.10124C8.7884 9.41366 8.28186 9.41366 7.96945 9.10124L4.9996 6.13139L2.02975 9.10124C1.71733 9.41366 1.2108 9.41366 0.898377 9.10124C0.585958 8.78882 0.585958 8.28229 0.898377 7.96987L3.86823 5.00002L0.898377 2.03018C0.585958 1.71776 0.585958 1.21122 0.898377 0.898804Z"
                                fill="black"
                            />
                        </svg>
                    </button>
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
