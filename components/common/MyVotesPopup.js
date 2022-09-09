import { useEffect, useState } from "react";
import { Modal, Spinner, Table } from "react-bootstrap";
import { getFileFromGaia } from "../../services/auth";
import { convertToDisplayDateFormat, formStacksExplorerUrl } from "../../services/utils";
import styles from "../../styles/Dashboard.module.css";

export default function MyVotePopup(props) {
    const { showMyVotesPopup, handleCloseMyVotesPopup } = props;

    // List of votes
    const [votes, setVotes] = useState();

    // Loading
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getMyVotes();
    }, []);

    // Show my polls
    const getMyVotes = () => {
        // Start loading
        setIsLoading(true);

        // Store transaction to Gaia
        getFileFromGaia("my_votes_ballot.json").then(
            (response) => {
                if (response) {
                    const myVotesObj = JSON.parse(response);

                    if (
                        myVotesObj &&
                        myVotesObj.votes &&
                        myVotesObj.votes.length > 0
                    ) {
                        setVotes(myVotesObj.votes.reverse());
                    } else {
                        // Show empty list
                        setVotes([]);
                    }
                } else {
                    // Show empty list
                    setVotes([]);
                }

                // Stop loading
                setIsLoading(false);
            },
            (error) => {
                // File does not exit in gaia
                if (error && error.code == "does_not_exist") {
                    // Show empty list
                    setVotes([]);
                }

                // Stop loading
                setIsLoading(false);
            }
        );
    };

    const getEachRow = (vote) => {
        if (vote?.voteObject && vote?.optionsMap) {
            return (
                Object.keys(vote?.voteObject).map((optionId, optionIndex) => (
                    <div key={optionId}>
                        {vote?.optionsMap[optionId]}
                    </div>
                ))
            );
        }

        return (<></>);
    }

    return (
        <>
            {/* My transactions popup */}
            <Modal
                show={showMyVotesPopup}
                onHide={handleCloseMyVotesPopup}
                keyboard={false}
                centered
                size="xl"
            >
                {/* Header */}
                <div className={styles.dashboard_modal_header_box}>
                    <div>My votes</div>
                    <button
                        className={styles.dashboard_modal_close_icon_btn_box}
                        onClick={handleCloseMyVotesPopup}
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
                <div
                    className={
                        styles.dashboard_modal_body_box +
                        " " +
                        styles.dashboard_transactions_modal_body_box
                    }
                    style={{ padding: "0px", marginBottom: "20px" }}
                >
                    {
                        // Loading
                        isLoading ? (
                            <div style={{ textAlign: "center", padding: "10px" }}>
                                <Spinner animation="border" variant="secondary" size="md" />
                            </div>
                        ) : // Once data found
                            votes && votes.length > 0 ? (
                                <div style={{ padding: "0px 20px 10px", fontSize: "14px" }}>
                                    <Table striped bordered>
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Voted option</th>
                                                <th>Voting power</th>
                                                <th>Voted at</th>
                                                <th>Transaction</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                votes && votes.length > 0 ? (
                                                    votes.map((vote, index) => (
                                                        <tr key={index}>
                                                            <td>
                                                                <a
                                                                    className="ballot_link"
                                                                    href={vote?.url}
                                                                    target="_blank"
                                                                    rel="noreferrer">
                                                                    {vote?.title}
                                                                </a>
                                                            </td>
                                                            <td>{getEachRow(vote)}</td>
                                                            <td>{Object.values(vote?.voteObject)?.[0]}</td>
                                                            <td>{convertToDisplayDateFormat(vote.votedAt)}</td>
                                                            <td>
                                                                <a
                                                                    className="ballot_link"
                                                                    href={formStacksExplorerUrl(vote?.txId)}
                                                                    target="_blank"
                                                                    rel="noreferrer">
                                                                    {vote?.txId?.substr(0, 10) + "..."}
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : ""
                                            }
                                        </tbody>
                                    </Table>
                                </div>
                            ) : (
                                <div style={{ padding: "0px 20px 10px", fontSize: "14px" }}>
                                    You have not cast your vote yet.
                                </div>
                            )
                    }
                </div>
            </Modal>
        </>);
}