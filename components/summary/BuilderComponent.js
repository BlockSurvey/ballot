import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { Constants } from "../../common/constants";
import { getFileFromGaia, getMyStxAddress, getStacksAPIPrefix, getUserData, putFileToGaia, userSession } from "../../services/auth";
import { convertToDisplayDateFormat } from "../../services/utils";
import styles from "../../styles/Builder.module.css";
import dashboardStyles from "../../styles/Dashboard.module.css";
import ChoosePollsPopup from "./ChoosePollsPopup";

export default function SummaryBuilderComponent(props) {
    // Variables

    // Gaia address
    const [gaiaAddress, setGaiaAddress] = useState();

    // Summary object
    const [summaryObject, setSummaryObject] = useState();

    // Processing flag
    const [isProcessing, setIsProcessing] = useState(false);

    // Error message
    const [errorMessage, setErrorMessage] = useState("");

    // Show/Hide ChoosePolls Popup
    const [showChoosePollsPopupFlag, setShowChoosePollsPopupFlag] = useState(false);

    const [urlSuffix, setUrlSuffix] = useState();

    // Functions
    useEffect(() => {
        let isCancelled = false;

        // Get Summary object
        getFileFromGaia("summary.json", { decrypt: false }).then(
            (response) => {
                if (response && !isCancelled) {
                    setSummaryObject(JSON.parse(response));
                }
            },
            (error) => {
                // File does not exit in gaia
                if (error && error.code == "does_not_exist" && !isCancelled) {
                    // Initialize new poll
                    setSummaryObject(initializeNewSummary());
                }
            });

        // Get gaia address
        if (userSession && userSession.isUserSignedIn()) {
            setGaiaAddress(getUserData()?.gaiaHubConfig?.address);
        }

        // Get .btc address
        getBTCDomainFromBlockchain();

        return () => {
            isCancelled = true;
        }
    }, []);

    const getBTCDomainFromBlockchain = async () => {
        // Get btc domain for logged in user
        const response = await fetch(
            getStacksAPIPrefix() + "/v1/addresses/stacks/" + getMyStxAddress()
        );
        const responseObject = await response.json();

        // Testnet code
        if (Constants.STACKS_MAINNET_FLAG == false) {
            setUrlSuffix(getUserData()?.gaiaHubConfig?.address);
            return;
        }

        // Get btc dns
        if (responseObject?.names?.length > 0) {
            const btcDNS = responseObject.names.filter((bns) =>
                bns.endsWith(".btc")
            );

            // Check does BTC dns is available
            if (btcDNS && btcDNS.length > 0) {
                const _dns = btcDNS[0];

                setUrlSuffix(_dns);
            } else {
                setUrlSuffix(getUserData()?.gaiaHubConfig?.address);
            }
        } else {
            setUrlSuffix(getUserData()?.gaiaHubConfig?.address);
        }
    };

    function initializeNewSummary() {
        return {
            "title": "",
            "description": "",
            "polls": {
                "list": [],
                "ref": {}
            }
        }
    }

    const handleChange = e => {
        const { name, value } = e.target;

        // If value is empty, then delete key from previous state
        if (!value && summaryObject) {
            // Delete key from JSON
            delete summaryObject[name];
        } else {
            // Update the value
            summaryObject[name] = value;
        }

        setSummaryObject({ ...summaryObject });
    };

    function openChoosePollsPopup() {
        setShowChoosePollsPopupFlag(true);
    }

    function publishSummary() {
        // Start processing
        setIsProcessing(true);

        // Clear message
        setErrorMessage("");

        // Save to gaia
        putFileToGaia("summary.json", JSON.stringify(summaryObject), { "encrypt": false }).then(response => {
            // Saved successfully message
            setErrorMessage("Summary page is published.");

            // Stop processing
            setIsProcessing(false);
        });
    }

    function getEachRow(pollIndexObject) {
        const gaiaAddress = getUserData()?.gaiaHubConfig?.address;

        return (
            <div>
                {/* Title */}
                <div className="d-flex align-items-center" style={{ marginBottom: "10px", columnGap: "10px", width: "100%" }}>
                    <div className="text-truncate" style={{ fontSize: "18px", fontWeight: 600 }}>
                        {pollIndexObject?.title ? pollIndexObject?.title : "..."}
                    </div>

                    {/* Status */}
                    <div className={pollIndexObject?.status == "draft" ? dashboardStyles.all_polls_status_box_draft : ((pollIndexObject?.endAt && (new Date(pollIndexObject?.endAt) < new Date()))) ? dashboardStyles.all_polls_status_box_closed : dashboardStyles.all_polls_status_box_active}>
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
                        <p className={"text_truncate_2" + ' ' + dashboardStyles.all_polls_description}>
                            {pollIndexObject?.description ? pollIndexObject?.description : "..."}
                        </p>
                        : <></>
                }

                <div style={{ fontSize: "14px", color: "#737373" }}>
                    <span>
                        Last Modified : {convertToDisplayDateFormat(pollIndexObject?.updatedAt)}
                    </span>
                </div>

                {/* <div>
                            <Button variant="danger" onClick={(event) => { event.stopPropagation(); deletePoll(pollIndexObject, setAllPolls) }}
                                disabled={isDeleting}>
                                Delete
                            </Button>
                        </div> */}
            </div>
        )
    }

    // Design
    return (
        <>
            {summaryObject ?
                <>
                    <div className={styles.builder_container}>
                        {/* Left side */}
                        <div className={styles.builder_left} style={{ marginBottom: "100px" }}>
                            {/* Title */}
                            <h5 style={{ fontSize: "20px", fontWeight: "600" }}>Summary</h5>

                            {/* Fields */}
                            <Form style={{ margin: "20px 0 20px 0" }}>
                                <Form.Group className="mb-3">
                                    <Form.Label className='ballot_labels'>Title</Form.Label>
                                    <Form.Control type="text" name="title" value={summaryObject.title} onChange={handleChange}
                                        className="ballot_input" />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className='ballot_labels'>Description</Form.Label>
                                    <Form.Control as="textarea" name="description" value={summaryObject.description} rows={5} onChange={handleChange} className="ballot_input" />
                                </Form.Group>

                                <Form.Group>
                                    <div style={{ display: "flex", marginTop: "10px" }}>
                                        <Button style={{ width: "100%" }} className="action_dashed_btn" onClick={() => { openChoosePollsPopup(); }}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="12" cy="12" r="12" fill="#ECEFF1" />
                                                <path d="M12 8V12M12 16V12M12 12H16M12 12H8" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>

                                            Choose polls
                                        </Button>
                                    </div>
                                </Form.Group>
                            </Form>

                            {/* List of polls */}
                            <div className={dashboardStyles.all_polls_list_outline_box}>
                                {summaryObject?.polls?.list.map(
                                    (pollId, i) => (
                                        <div key={i} className={dashboardStyles.all_polls_list_box}>
                                            {getEachRow(summaryObject?.polls?.ref[pollId])}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Right side */}
                        <div className={styles.builder_right}>
                            <div style={{ position: "sticky", top: "119px" }}>
                                <div className={styles.builder_right_section}>

                                    <a href={"/" + urlSuffix} target="_blank" style={{ textDecoration: "none" }}>
                                        <Button style={{ width: "100%", marginBottom: "10px" }} className="action_secondary_btn">
                                            Preview
                                            <svg style={{ marginLeft: "6px" }}
                                                width="8"
                                                height="8"
                                                viewBox="0 0 12 12"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z"
                                                    fill="initial"
                                                />
                                            </svg>
                                        </Button>
                                    </a>

                                    <Button variant="dark" style={{ width: "100%" }}
                                        onClick={() => { publishSummary() }} disabled={isProcessing}>
                                        Publish
                                    </Button>

                                    {/* Error Message */}
                                    {errorMessage &&
                                        <div style={{ marginTop: "10px" }}>
                                            <span style={{ fontSize: "14px" }}>{errorMessage}</span>
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </>
                :
                <>
                    <div style={{ width: "100%", maxWidth: "52px", height: "17px", marginBottom: "20px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                    <div style={{ width: "100px", height: "22px", marginBottom: "8px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                    <div style={{ width: "100%", height: "36px", marginBottom: "16px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                    <div style={{ width: "130px", height: "22px", marginBottom: "8px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                    <div style={{ width: "100%", height: "132px", marginBottom: "16px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                    <div style={{ width: "150px", height: "22px", marginBottom: "8px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                    <div style={{ width: "100%", height: "36px", marginBottom: "16px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                    <div style={{ width: "170px", height: "22px", marginBottom: "8px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                    <div style={{ width: "100%", height: "36px", marginBottom: "16px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                </>
            }

            {/* Choose polls popup */}
            <ChoosePollsPopup summaryObject={summaryObject} handleSummaryChange={handleChange}
                showChoosePollsPopupFlag={showChoosePollsPopupFlag} setShowChoosePollsPopupFlag={setShowChoosePollsPopupFlag} />
        </>
    );
}