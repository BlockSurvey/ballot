import { useEffect, useState } from "react";
import { Button, Form, Modal, Table } from "react-bootstrap";
import { authenticate, getFileFromGaia, putFileToGaia, userSession } from "../../services/auth";
import { castMyVoteContractCall } from "../../services/contract";
import { formStacksExplorerUrl } from "../../services/utils";
import styles from "../../styles/Poll.module.css";
import HeaderComponent from "../common/HeaderComponent";
import InformationComponent from "../common/InformationComponent";
import { getIndividualResultByStartAndEndPosition } from "./PollService";

export default function PollComponent(props) {
    // Variables
    const {
        pollObject,
        isPreview,
        optionsMap,
        resultsByOption,
        resultsByPosition,
        setResultsByPosition,
        totalVotes,
        totalUniqueVotes,
        dns,
        alreadyVoted,
        noHoldingToken,
        holdingTokenIdsArray,
        votingPower,
        publicUrl,
        txStatus,
        noOfResultsLoaded,
        setNoOfResultsLoaded,
        currentBlockHeight } = props;
    const [voteObject, setVoteObject] = useState({});
    const [errorMessage, setErrorMessage] = useState();
    const [txId, setTxId] = useState();
    const [isUserSignedIn, setIsUserSignedIn] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Show popup
    const [show, setShow] = useState(false);
    const handleShow = () => setShow(true);
    const handleClose = () => setShow(false);

    // Functions
    useEffect(() => {
        if (userSession && userSession.isUserSignedIn()) {
            setIsUserSignedIn(true)
        }
    }, []);

    const handleChange = e => {
        const { name, value } = e.target;

        if (pollObject?.votingSystem == "fptp") {
            voteObject = {
                [value]: votingPower
            };
        } else {
            if (voteObject?.[value]) {
                delete voteObject[value];
            } else {
                voteObject[value] = votingPower;
            }
        }
        setVoteObject(voteObject);
    };

    const handleChangeVote = (e) => {
        const { name, value } = e.target;

        if (value <= 0) {
            delete voteObject[name];
        } else {
            voteObject[name] = value;
        }
    }

    const callbackFunction = (data) => {
        if (data?.txId) {
            setTxId(data.txId);

            // Store my vote to Gaia
            processMyVote(data);

            // Show information popup
            handleShow();
        }
    }

    const processMyVote = (data) => {
        // Store my vote to Gaia
        getFileFromGaia("my_votes_ballot.json").then(
            (response) => {
                if (response) {
                    const myVotesObj = JSON.parse(response);

                    if (myVotesObj && myVotesObj.votes) {
                        saveMyVoteToGaia(myVotesObj, data);
                    }
                }
            },
            (error) => {
                // File does not exit in gaia
                if (error && error.code == "does_not_exist") {
                    const myVotesObj = {
                        votes: [
                        ],
                    };

                    saveMyVoteToGaia(myVotesObj, data);
                }
            }
        );
    }

    const saveMyVoteToGaia = (myVotesObj, data) => {
        myVotesObj.votes.push({
            title: pollObject?.title,
            url: publicUrl,

            voteObject: voteObject,
            optionsMap: optionsMap,

            votedAt: Date.now(),
            txId: data.txId,
            txRaw: data.txRaw
        });

        // Store on gaia
        putFileToGaia(
            "my_votes_ballot.json",
            JSON.stringify(myVotesObj),
            { dangerouslyIgnoreEtag: true }
        );
    }

    const validate = () => {
        // Reset the error message
        errorMessage = "";

        // Not voted
        if (!voteObject || Object.keys(voteObject)?.length == 0) {
            errorMessage = "Please select option to vote";
        }

        setErrorMessage(errorMessage);
    }

    const castMyVote = () => {
        if (pollObject?.publishedInfo?.contractAddress && pollObject?.publishedInfo?.contractName) {
            // Validation
            validate();
            if (errorMessage) {
                return;
            }

            // Start processing
            setIsProcessing(true);

            const contractAddress = pollObject?.publishedInfo?.contractAddress;
            const contractName = pollObject?.publishedInfo?.contractName;
            castMyVoteContractCall(contractAddress, contractName, voteObject, dns, holdingTokenIdsArray, callbackFunction);
        }
    }

    const loadMore = () => {
        if (pollObject?.publishedInfo?.contractAddress && pollObject?.publishedInfo?.contractName) {
            const contractAddress = pollObject?.publishedInfo?.contractAddress;
            const contractName = pollObject?.publishedInfo?.contractName;

            // Find start and end position
            const start = totalUniqueVotes - noOfResultsLoaded;
            let end = start - 10;

            // If end is greater than totalUniqueVotes
            if (end < 0) {
                end = 0;
            }

            // Load next ten results
            getIndividualResultByStartAndEndPosition(start, end, totalUniqueVotes, contractAddress, contractName,
                resultsByPosition, setResultsByPosition, noOfResultsLoaded, setNoOfResultsLoaded);
        }
    }

    return (
        <>
            <div className={styles.poll_container}>
                {pollObject && pollObject.id ?
                    <>
                        <div style={{ margin: "0px 0 100px 0" }}>
                            <div className="row">
                                {/* Left Side */}
                                <div className="col-sm-12 col-md-8">
                                    {/* Header */}
                                    <HeaderComponent pollObject={pollObject} publicUrl={publicUrl} txStatus={txStatus} />

                                    {/* Cast your vote */}
                                    <div style={{ marginBottom: "24px" }}>
                                        <h5 style={{ fontSize: "18px", fontWeight: "600" }}>Cast your vote</h5>
                                        <div>
                                            <Form>
                                                <Form.Group className="mb-3">
                                                    {/* Title */}
                                                    <Form.Label>{pollObject?.title}</Form.Label>

                                                    {/* FPTP or Block Voting */}
                                                    {(pollObject?.votingSystem == "fptp" || pollObject?.votingSystem == "block") &&
                                                        pollObject?.options.map((option, index) => (
                                                            <Form.Check
                                                                key={index}
                                                                type={pollObject?.votingSystem == "fptp" ? "radio" : "checkbox"}
                                                                name="vote"
                                                                value={option.id}
                                                                label={option.value}
                                                                id={option.id}
                                                                onChange={handleChange}
                                                                disabled={(isPreview || !holdingTokenIdsArray || alreadyVoted || isProcessing ||
                                                                    ((pollObject?.startAtDate || pollObject?.startAtDateUTC) && (new Date(pollObject?.startAtDateUTC ? pollObject?.startAtDateUTC : pollObject?.startAtDate) > new Date())) ||
                                                                    ((pollObject?.endAtDate || pollObject?.endAtDateUTC) && (new Date(pollObject?.endAtDateUTC ? pollObject?.endAtDateUTC : pollObject?.endAtDate) < new Date()))
                                                                )}
                                                            />

                                                            // <div>
                                                            //     <input key={index} id={option.id} value={option.id} name="vote"
                                                            //         type={pollObject?.votingSystem == "fptp" ? "radio" : "checkbox"} onChange={handleChange}
                                                            //         disabled={(isPreview || !holdingTokenIdsArray || alreadyVoted || isProcessing ||
                                                            //             (pollObject?.endAtDate && (new Date(pollObject?.endAtDate) < new Date())))} />
                                                            //     <label for={option.id}>{option.value}</label>
                                                            // </div>
                                                        ))
                                                    }

                                                    {/* Quadratic or Weighted Voting */}
                                                    {(pollObject?.votingSystem == "quadratic" || pollObject?.votingSystem == "weighted") &&

                                                        <Table striped bordered>
                                                            <tbody>
                                                                {pollObject?.options.map((option, index) => (
                                                                    <tr key={index}>
                                                                        <td style={{ width: "80%" }}>
                                                                            <Form.Label>{option.value}</Form.Label>
                                                                        </td>
                                                                        <td>
                                                                            <Form.Control type="number" name={option.id}
                                                                                min="0"
                                                                                onChange={handleChangeVote}
                                                                                style={{ marginLeft: "10px", width: "100px" }} placeholder="0" />
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                                }
                                                            </tbody>
                                                        </Table>
                                                    }

                                                    {/* Voting Criteria */}
                                                    {(pollObject?.votingStrategyFlag && pollObject?.strategyTokenName) &&
                                                        <div style={{ marginTop: "30px" }}>
                                                            <h5 style={{ fontSize: "18px", fontWeight: "600" }}>Voting Criteria</h5>
                                                            <span>
                                                                {`You should hold ${pollObject?.strategyTokenName} to vote.`}
                                                            </span>
                                                        </div>
                                                    }

                                                    {/* Vote button */}
                                                    {isUserSignedIn ?
                                                        <div style={{ display: "flex", alignItems: "center", marginTop: "30px" }}>
                                                            <Button variant="dark"
                                                                disabled={(isPreview || !holdingTokenIdsArray || alreadyVoted || isProcessing ||
                                                                    (!currentBlockHeight || currentBlockHeight < pollObject?.startAtBlock) ||
                                                                    (!currentBlockHeight || currentBlockHeight > pollObject?.endAtBlock)
                                                                ) ? true : false}
                                                                onClick={() => { castMyVote() }}>
                                                                Vote
                                                            </Button>
                                                            {errorMessage &&
                                                                <span style={{ marginLeft: "10px" }}>
                                                                    {errorMessage}
                                                                </span>
                                                            }
                                                        </div>
                                                        :
                                                        <Button variant="dark" style={{ marginTop: "30px" }}
                                                            onClick={() => { authenticate(window?.location?.href) }}>
                                                            Login to Vote
                                                        </Button>
                                                    }

                                                    {/* Holdings Required */}
                                                    {noHoldingToken &&
                                                        <div style={{ fontSize: "14px", color: "red", marginTop: "10px" }}>
                                                            You should have the {" "}
                                                            {pollObject?.strategyTokenName ? pollObject?.strategyTokenName : "strategy token"}
                                                            {" "} to vote.
                                                        </div>
                                                    }

                                                    {/* Already voted */}
                                                    {alreadyVoted &&
                                                        <div style={{ fontSize: "14px", color: "red", marginTop: "10px" }}>
                                                            Your vote has already been cast.
                                                        </div>
                                                    }
                                                </Form.Group>
                                            </Form>
                                        </div>
                                    </div>

                                    {/* Results */}
                                    <div style={{ marginTop: "20px" }}>
                                        <h5 style={{ fontSize: "18px", fontWeight: "600" }}>Votes {totalVotes >= 0 ? <>({totalVotes})</> : ""}</h5>
                                        <div style={{ overflow: "scroll" }}>
                                            <Table striped bordered style={{ height: "100%", width: "100%" }}>
                                                <thead>
                                                    <tr style={{ position: "sticky", top: "0", backgroundColor: "white" }}>
                                                        <th style={{ width: "40%" }}>User name</th>
                                                        <th style={{ width: "30%" }}>Option</th>
                                                        <th style={{ width: "15%" }}>No. of votes</th>
                                                        <th style={{ width: "15%" }}>Voting power</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {totalUniqueVotes >= 0 &&
                                                        (totalUniqueVotes > 0 ?
                                                            Object.keys(resultsByPosition)?.reverse().map((position, index) => (
                                                                <tr key={index}>
                                                                    <td style={{ wordBreak: "break-all" }}>{resultsByPosition[position]?.address &&
                                                                        <a className="ballot_link" target="_blank" rel="noreferrer" href={formStacksExplorerUrl(resultsByPosition[position]?.address, 'address')}>
                                                                            <span>
                                                                                {resultsByPosition[position]?.username ? resultsByPosition[position]?.username : resultsByPosition[position]?.address} { }
                                                                                <svg
                                                                                    width="10"
                                                                                    height="10"
                                                                                    viewBox="0 0 12 12"
                                                                                    fill="none"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path
                                                                                        fillRule="evenodd"
                                                                                        clipRule="evenodd"
                                                                                        d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z"
                                                                                        fill="initial"
                                                                                    />
                                                                                </svg>
                                                                            </span>
                                                                        </a>
                                                                    }</td>
                                                                    <td>
                                                                        {Object.keys(resultsByPosition[position]?.vote).map((optionId, voteIndex) => (
                                                                            <div key={voteIndex}>
                                                                                {optionsMap[optionId] ? optionsMap[optionId] : "-"}
                                                                            </div>
                                                                        ))}
                                                                    </td>
                                                                    <td>
                                                                        {Object.values(resultsByPosition[position]?.vote).map((value, voteIndex) => (
                                                                            <div key={voteIndex}>
                                                                                {value}
                                                                            </div>
                                                                        ))}
                                                                    </td>
                                                                    <td>
                                                                        {resultsByPosition[position]?.votingPower}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                            :
                                                            <tr>
                                                                <td style={{ textAlign: "center" }} colSpan={4}>
                                                                    No data found
                                                                </td>
                                                            </tr>
                                                        )
                                                    }

                                                    {/* Loading */}
                                                    {noOfResultsLoaded != Object.keys(resultsByPosition).length &&
                                                        <tr>
                                                            <td style={{ textAlign: "center" }} colSpan={4}>
                                                                Loading...
                                                            </td>
                                                        </tr>
                                                    }

                                                    {/* Load more */}
                                                    {(noOfResultsLoaded == Object.keys(resultsByPosition).length &&
                                                        totalUniqueVotes != Object.keys(resultsByPosition).length) &&
                                                        <tr>
                                                            <td style={{ textAlign: "center" }} colSpan={4}>
                                                                <a style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => { loadMore(); }}>
                                                                    Load more
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    }
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side */}
                                <div className="col-sm-12 col-md-4">
                                    {/* Information */}
                                    <InformationComponent pollObject={pollObject} resultsByOption={resultsByOption} currentBlockHeight={currentBlockHeight} />
                                </div>
                            </div>
                        </div>
                    </>
                    :
                    <>Loading...</>
                }
            </div>

            {/* Success message popup */}
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Information</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Voted successfully! Your vote has been cast. Here is a link to your transaction status{" "}
                    <a
                        style={{ textDecoration: "underline", color: "#000" }}
                        href={formStacksExplorerUrl(txId)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {"here"}
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z"
                                fill="#000"
                            />
                        </svg>
                    </a>
                </Modal.Body>
            </Modal>
        </>
    );
}