import { useState } from "react";
import { Button, Col, Container, Form, Modal, Row, Table } from "react-bootstrap";
import { castMyVoteContractCall } from "../../services/contract";
import { formStacksExplorerUrl } from "../../services/utils";
import { authenticate, userSession } from "../../services/auth";
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
        votingPower } = props;

    // Capture the vote
    const [voteObject, setVoteObject] = useState({});

    const [txId, setTxId] = useState();

    // Show popup
    const [show, setShow] = useState(false);
    const handleShow = () => setShow(true);
    const handleClose = () => setShow(false);

    // Functions
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
            handleShow();
        }
    }

    const castMyVote = () => {
        if (pollObject?.publishedInfo?.contractAddress && pollObject?.publishedInfo?.contractName) {
            const contractAddress = pollObject?.publishedInfo?.contractAddress;
            const contractName = pollObject?.publishedInfo?.contractName;
            castMyVoteContractCall(contractAddress, contractName, voteObject, dns, holdingTokenIdArr?.[0], callbackFunction);
        }
    }

    // Design
    return (
        <>
            <Container fluid>
                <Row className="justify-content-md-center">
                    <Col lg={isPreview ? 12 : 8} md={12}>
                        <div className={styles.results_container}>

                            {pollObject && pollObject.id ?
                                <>
                                    <div className="row">
                                        {/* Left Side */}
                                        <div className="col-sm-12 col-md-8">
                                            {/* Header */}
                                            <HeaderComponent pollObject={pollObject} />

                                            {/* Cast your vote */}
                                            <div style={{ marginTop: "20px" }}>
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

                                                            {userSession && userSession.isUserSignedIn() ?
                                                                <Button style={{ marginTop: "10px" }}
                                                                    disabled={(isPreview || !holdingTokenArr || alreadyVoted) ? true : false}
                                                                    onClick={() => { castMyVote() }}>
                                                                    Vote
                                                                </Button>
                                                                :
                                                                <Button style={{ marginTop: "10px" }}
                                                                    onClick={() => { authenticate() }}>
                                                                    Vote
                                                                </Button>
                                                            }

                                                            {/* Holdings Required */}
                                                            {noHoldingToken &&
                                                                <div style={{ fontSize: "14px", color: "red" }}>
                                                                    Holdings required to vote this poll.
                                                                </div>
                                                            }

                                                            {/* Already voted */}
                                                            {alreadyVoted &&
                                                                <div style={{ fontSize: "14px", color: "red" }}>
                                                                    You have already cast your vote.
                                                                </div>
                                                            }
                                                        </Form.Group>
                                                    </Form>
                                                </div>
                                            </div>

                                            {/* Results */}
                                            <div style={{ marginTop: "20px" }}>
                                                <h5>Votes ({total})</h5>
                                                <Table striped bordered hover>
                                                    <thead>
                                                        <tr>
                                                            <th>Address</th>
                                                            <th>Option</th>
                                                            <th>Voting Power</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {Object.keys(resultsByPosition).map((position, index) => (
                                                            <tr key={index}>
                                                                <td>{resultsByPosition[position]?.address &&
                                                                    <a target="_blank" rel="noreferrer" href={formStacksExplorerUrl(resultsByPosition[position]?.address)}>
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
                                                                                    fill="#0d6efd"
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
                                                                <td>1</td>
                                                            </tr>
                                                        ))}
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
                                </>
                                :
                                <>Loading...</>
                            }
                        </div>
                    </Col>
                </Row>
            </Container>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Information</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Successfully! You have cast your vote. Check your transaction status on explorer
                    <a
                        style={{ textDecoration: "underline", color: "#000" }}
                        href={formStacksExplorerUrl(txId)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {" here "}
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