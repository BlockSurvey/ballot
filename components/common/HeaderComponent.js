import { formStacksExplorerUrl } from "../../services/utils";


export default function HeaderComponent(props) {
    // Variables
    const { pollObject } = props;

    // Function

    // Design
    return (
        <>
            {pollObject && pollObject.id &&
                <>
                    {/* Title */}
                    <h4>{pollObject?.title}</h4>

                    {/* Info Bar */}
                    <div style={{ fontSize: "14px" }}>
                        {pollObject?.status == "draft" ? "Draft" : "Active"} {' '}
                        {pollObject?.userStxAddress &&
                            <a target="_blank" rel="noreferrer" href={formStacksExplorerUrl(pollObject?.userStxAddress)}>
                                <span>
                                    {pollObject?.userStxAddress?.substring(0, 10)} { }
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
                        }
                    </div>

                    {/* Description */}
                    <div style={{ margin: "20px 0", whiteSpace: "pre-wrap" }}>
                        <h5>Description</h5>
                        <p>
                            {pollObject?.description}
                        </p>
                    </div>
                </>
            }
        </>
    );
}