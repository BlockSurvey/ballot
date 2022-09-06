import { convertToDisplayDateFormat, formStacksExplorerUrl } from "../../common/utils";


export default function InformationComponent(props) {
    // Variables
    const { pollObject, resultsByOption } = props;

    // Function

    // Design
    return (
        <>
            {pollObject && pollObject.id &&
                <>
                    <div style={{ padding: "10px", border: "1px solid #cccccc", borderRadius: "5px", width: "100%" }}>
                        {/* Title */}
                        <h6>Information</h6>

                        <div style={{ marginTop: "10px" }}>
                            {
                                pollObject?.publishedInfo?.contractAddress && pollObject?.publishedInfo?.contractName &&
                                pollObject?.publishedInfo?.txId &&
                                <div>
                                    Contract
                                    <a target="_blank" rel="noreferrer" href={formStacksExplorerUrl(pollObject?.publishedInfo?.txId)}>
                                        <span style={{ float: "right", fontWeight: "bold" }}>
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
                                                    fill="#0d6efd"
                                                />
                                            </svg>
                                        </span>
                                    </a>
                                </div>
                            }
                            {
                                pollObject?.ipfsLocation &&
                                <div>
                                    IPFS
                                    <a target="_blank" rel="noreferrer" href={`https://owllink.mypinata.cloud/ipfs/${pollObject?.ipfsLocation}`}>
                                        <span style={{ float: "right", fontWeight: "bold" }}>
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
                                                    fill="#0d6efd"
                                                />
                                            </svg>
                                        </span>
                                    </a>
                                </div>
                            }
                            {
                                pollObject?.strategyContractName &&
                                <div>
                                    Strategy
                                    <a target="_blank" rel="noreferrer" href={formStacksExplorerUrl(pollObject?.strategyContractName)}>
                                        <span style={{ float: "right", fontWeight: "bold" }}>
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
                                                    fill="#0d6efd"
                                                />
                                            </svg>
                                        </span>
                                    </a>
                                </div>
                            }
                            <div>
                                System <span style={{ float: "right", fontWeight: "bold", textTransform: "capitalize" }}>{pollObject?.votingSystem} Choice</span>
                            </div>
                            <div>
                                Start Date <span style={{ float: "right", fontWeight: "bold" }}>{convertToDisplayDateFormat(pollObject?.startAtDate)}</span>
                            </div>
                            <div>
                                End Date <span style={{ float: "right", fontWeight: "bold" }}>{convertToDisplayDateFormat(pollObject?.endAtDate)}</span>
                            </div>
                            {pollObject?.contractAddress &&
                                <div>
                                    Contract Address <span style={{ float: "right", fontWeight: "bold" }}>{pollObject?.contractAddress}</span>
                                </div>
                            }
                        </div>
                    </div>

                    <div style={{ padding: "10px", marginTop: "10px", border: "1px solid #cccccc", borderRadius: "5px", width: "100%" }}>
                        {/* Title */}
                        <h6>Current results</h6>

                        <div style={{ marginTop: "10px" }}>
                            {pollObject?.options?.map((option, index) => (
                                <div key={index}>
                                    {option?.value}
                                    <span style={{ float: "right", fontWeight: "bold", textTransform: "capitalize" }}>
                                        {resultsByOption && resultsByOption[option.id] ? resultsByOption[option.id] : "-"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            }
        </>
    );
}