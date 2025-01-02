import { useEffect, useState } from "react";
import { Table } from "react-bootstrap";
import { Constants } from "../../common/constants";
import { calculateDateByBlockHeight, convertToDisplayDateFormat, formStacksExplorerUrl, formatUtcDateTime } from "../../services/utils";


export default function InformationComponent(props) {
    // Variables
    const { pollObject, resultsByOption, currentBlockHeight } = props;
    const [votingSystemInfo, setVotingSystemInfo] = useState();

    // Function
    useEffect(() => {
        setVotingSystemInfo(Constants.VOTING_SYSTEMS.find(system => system.id == pollObject?.votingSystem));
    }, [pollObject]);

    // Design
    return (
        <>
            {pollObject && pollObject.id &&
                <>
                    <div style={{ padding: "16px", backgroundColor: "rgba(236, 239, 241, 0.3)", width: "100%", overflow: "auto" }}>
                        {/* Title */}
                        <h6 style={{ fontWeight: "600" }}>Information</h6>

                        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", rowGap: "6px" }}>
                            {
                                pollObject?.publishedInfo?.contractAddress && pollObject?.publishedInfo?.contractName &&
                                pollObject?.publishedInfo?.txId &&
                                <div>
                                    Contract
                                    <span style={{ float: "right", fontWeight: "bold" }}>
                                        <a className="ballot_link" target="_blank" rel="noreferrer" href={formStacksExplorerUrl(pollObject?.publishedInfo?.txId)}>
                                            {pollObject?.publishedInfo?.contractName.substring(0, 10)} { }
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
                                        </a>
                                    </span>
                                </div>
                            }
                            {
                                pollObject?.ipfsLocation &&
                                <div>
                                    IPFS
                                    <span style={{ float: "right", fontWeight: "bold" }}>
                                        <a className="ballot_link" target="_blank" rel="noreferrer" href={`${Constants.IPFS_GATEWAY}${pollObject?.ipfsLocation}`}>
                                            #{pollObject?.ipfsLocation.substring(0, 8)} { }
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
                                        </a>
                                    </span>
                                </div>
                            }
                            {
                                pollObject?.strategyContractName &&
                                <div>
                                    Strategy
                                    <span style={{ float: "right", fontWeight: "bold" }}>
                                        <a className="ballot_link" target="_blank" rel="noreferrer" href={formStacksExplorerUrl(pollObject?.strategyContractName)}>
                                            {pollObject?.strategyContractName.substring(0, 10)} { }
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
                                        </a>
                                    </span>
                                </div>
                            }
                            <div>
                                Voting System <span style={{ float: "right", fontWeight: "bold", textTransform: "capitalize" }}>{votingSystemInfo?.name}</span>
                            </div>
                            <div>
                                Start Date
                                <span style={{ float: "right", fontWeight: "bold" }}>
                                    {pollObject?.startAtDateUTC ? (formatUtcDateTime(pollObject?.startAtDateUTC) + " UTC") : convertToDisplayDateFormat(pollObject?.startAtDate)}
                                </span>
                            </div>
                            <div>
                                End Date
                                <span style={{ float: "right", fontWeight: "bold" }}>
                                    {pollObject?.endAtBlock && currentBlockHeight < pollObject?.endAtBlock ?
                                        <>
                                            {formatUtcDateTime(calculateDateByBlockHeight(currentBlockHeight, pollObject?.endAtBlock))} UTC
                                        </> :
                                        <>
                                            {pollObject?.endAtDateUTC ? (formatUtcDateTime(pollObject?.endAtDateUTC) + " UTC") : convertToDisplayDateFormat(pollObject?.endAtDate)}
                                        </>
                                    }
                                </span>
                            </div>
                            <div>
                                Start Tenure Block <span style={{ float: "right", fontWeight: "bold" }}>{pollObject?.startAtBlock}</span>
                            </div>
                            <div>
                                End Tenure Block <span style={{ float: "right", fontWeight: "bold" }}>{pollObject?.endAtBlock}</span>
                            </div>
                            <div>
                                Current Tenure Block <span style={{ float: "right", fontWeight: "bold" }}>{currentBlockHeight}</span>
                            </div>
                            {pollObject?.contractAddress &&
                                <div>
                                    Contract Address <span style={{ float: "right", fontWeight: "bold" }}>{pollObject?.contractAddress}</span>
                                </div>
                            }
                        </div>
                    </div>

                    <div style={{ padding: "16px", marginTop: "10px", backgroundColor: "rgba(236, 239, 241, 0.3)", width: "100%" }}>
                        {/* Title */}
                        <h6 style={{ fontWeight: "600" }}>Current results</h6>

                        <div style={{ marginTop: "10px" }}>
                            <Table striped bordered>
                                <tbody>
                                    {pollObject?.options?.map((option, index) => (
                                        <tr key={index}>
                                            <td style={{ width: "70%" }}>
                                                {option?.value}
                                            </td>
                                            <td>
                                                <span style={{ float: "right", fontWeight: "bold", textTransform: "capitalize" }}>
                                                    {resultsByOption && resultsByOption[option.id] ?
                                                        <>
                                                            {resultsByOption[option.id]["percentage"]}% ({resultsByOption[option.id]["total"]})
                                                        </>
                                                        : "-"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                </>
            }
        </>
    );
}