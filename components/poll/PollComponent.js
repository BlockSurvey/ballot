import { useEffect, useState } from "react";
import { Button, Form, Modal, Table } from "react-bootstrap";
import { authenticate, getFileFromGaia, putFileToGaia, userSession } from "../../services/auth";
import { castMyVoteContractCall } from "../../services/contract";
import { formStacksExplorerUrl } from "../../services/utils";
import styles from "../../styles/Poll.module.css";
import HeaderComponent from "../common/HeaderComponent";
import InformationComponent from "../common/InformationComponent";

export default function PollComponent(props) {
    // Variables

    // Poll id and Gaia address
    const {
        pollObject,
        isPreview,
        optionsMap,
        resultsByOption,
        resultsByPosition,
        total,
        dns,
        alreadyVoted,
        noHoldingToken,
        holdingTokenArr,
        holdingTokenIdArr,
        votingPower,
        publicUrl } = props;

    // Capture the vote
    const [voteObject, setVoteObject] = useState({});

    const [txId, setTxId] = useState();

    const [isUserSignedIn, setIsUserSignedIn] = useState(false);

    // Show popup
    const [show, setShow] = useState(false);
    const handleShow = () => setShow(true);
    const handleClose = () => setShow(false);

    // Processing
    const [isProcessing, setIsProcessing] = useState(false);

    // Functions
    useEffect(() => {
        if (userSession && userSession.isUserSignedIn()) {
            setIsUserSignedIn(true)
        }
    }, []);

    const handleChange = e => {
        const { name, value } = e.target;

        if (pollObject?.votingSystem == "single") {
            voteObject = {
                [value]: votingPower
            };
            setVoteObject(voteObject);
        } else {
            if (voteObject?.[value]) {
                delete voteObject[value];
            } else {
                voteObject[value] = votingPower;
            }
        }
    };

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

    const castMyVote = () => {
        if (pollObject?.publishedInfo?.contractAddress && pollObject?.publishedInfo?.contractName) {
            // Start processing
            setIsProcessing(true);

            const contractAddress = pollObject?.publishedInfo?.contractAddress;
            const contractName = pollObject?.publishedInfo?.contractName;
            castMyVoteContractCall(contractAddress, contractName, voteObject, dns, holdingTokenIdArr?.[0], callbackFunction);
        }
    }

    return (
        <>
            <div className={styles.poll_container}>
                {pollObject && pollObject.id ?
                    <>
                        <div style={{ margin: "0px 0 50px 0" }}>
                            <div className="row">
                                {/* Left Side */}
                                <div className="col-sm-12 col-md-8">
                                    {/* Header */}
                                    <HeaderComponent pollObject={pollObject} publicUrl={publicUrl} />

                                    {/* Cast your vote */}
                                    <div style={{ marginBottom: "30px" }}>
                                        <h5>Cast your vote</h5>
                                        <div>
                                            <Form>
                                                <Form.Group className="mb-3">
                                                    {pollObject?.options.map((option, index) => (
                                                        <Form.Check
                                                            key={index}
                                                            type={pollObject?.votingSystem == "single" ? "radio" : "checkbox"}
                                                            name="vote"
                                                            value={option.id}
                                                            label={option.value}
                                                            id={option.id}
                                                            onChange={handleChange}
                                                        />
                                                    ))}

                                                    {/* Voting Criteria */}
                                                    {pollObject?.votingStrategyFlag &&
                                                        <div style={{ marginTop: "30px" }}>
                                                            <h5>Voting Criteria</h5>
                                                            <span>
                                                                {pollObject?.votingStrategyTemplate == "btcholders" ?
                                                                    "You should hold .btc Namespace to vote." :
                                                                    (pollObject?.strategyNFTName &&
                                                                        `You should hold ${pollObject?.strategyNFTName} to vote.`
                                                                    )
                                                                }
                                                            </span>
                                                        </div>
                                                    }

                                                    {/* Vote button */}
                                                    {isUserSignedIn ?
                                                        <Button variant="dark" style={{ marginTop: "30px" }}
                                                            disabled={(isPreview || !holdingTokenArr || alreadyVoted || isProcessing ||
                                                                (pollObject?.endAtDate && (new Date(pollObject?.endAtDate) < new Date()))) ? true : false}
                                                            onClick={() => { castMyVote() }}>
                                                            Vote
                                                        </Button>
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
                                                            {pollObject?.votingStrategyTemplate == "btcholders" ?
                                                                ".btc Namespace" :
                                                                (pollObject?.strategyNFTName ? pollObject?.strategyNFTName : "strategy NFT")
                                                            }
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
                                        <h5>Votes {total >= 0 ? <>({total})</> : ""}</h5>
                                        <Table striped bordered>
                                            <thead>
                                                <tr>
                                                    <th>Address</th>
                                                    <th>Option</th>
                                                    <th>Voting power</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {total >= 0 ?
                                                    (total > 0 ?
                                                        Object.keys(resultsByPosition).map((position, index) => (
                                                            <tr key={index}>
                                                                <td>{resultsByPosition[position]?.address &&
                                                                    <a className="ballot_link" target="_blank" rel="noreferrer" href={formStacksExplorerUrl(resultsByPosition[position]?.address)}>
                                                                        <span>
                                                                            {resultsByPosition[position]?.address} { }
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
                                                                    {Object.values(resultsByPosition[position]?.vote)?.[0]}
                                                                </td>
                                                            </tr>
                                                        ))
                                                        :
                                                        <tr>
                                                            <td style={{ textAlign: "center" }} colSpan={3}>
                                                                No data found
                                                            </td>
                                                        </tr>
                                                    )
                                                    :
                                                    <tr>
                                                        <td style={{ textAlign: "center" }} colSpan={3}>
                                                            Loading
                                                        </td>
                                                    </tr>
                                                }
                                            </tbody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Right Side */}
                                <div className="col-sm-12 col-md-4">
                                    {/* Information */}
                                    <InformationComponent pollObject={pollObject} resultsByOption={resultsByOption} />
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