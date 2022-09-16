import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { authenticate, signOut, switchAccount, userSession } from "../../services/auth";
import { getDomainNamesFromBlockchain } from "../../services/utils";
import MyVotePopup from "./MyVotesPopup";

export function DashboardNavBarComponent() {
    // Variables
    const [displayUsername, setDisplayUsername] = useState();
    const [isUserSignedIn, setIsUserSignedIn] = useState(false);

    // My votes popup
    const [showMyVotesPopup, setShowMyVotesPopup] = useState(false);
    const handleCloseMyVotesPopup = () =>
        setShowMyVotesPopup(false);
    const handleShowMyVotesPopup = () => setShowMyVotesPopup(true);

    // Feedback hidden button
    const feedbackButton = useRef(null);

    // Functions
    useEffect(() => {
        getDisplayUsername();

        if (userSession && userSession.isUserSignedIn()) {
            setIsUserSignedIn(true)
        }
    }, []);

    const getDisplayUsername = async () => {
        const _username = await getDomainNamesFromBlockchain();
        setDisplayUsername(_username);
    }

    // UI
    return (
        <>
            <div style={{ margin: "30px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <a href={isUserSignedIn ? "/all-polls" : "/"}>
                        <svg width="68" height="19" viewBox="0 0 68 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.16 9.408C11.104 9.584 11.88 10.056 12.488 10.824C13.096 11.592 13.4 12.472 13.4 13.464C13.4 14.36 13.176 15.152 12.728 15.84C12.296 16.512 11.664 17.04 10.832 17.424C10 17.808 9.016 18 7.88 18H0.656V1.248H7.568C8.704 1.248 9.68 1.432 10.496 1.8C11.328 2.168 11.952 2.68 12.368 3.336C12.8 3.992 13.016 4.736 13.016 5.568C13.016 6.544 12.752 7.36 12.224 8.016C11.712 8.672 11.024 9.136 10.16 9.408ZM4.016 8.16H7.088C7.888 8.16 8.504 7.984 8.936 7.632C9.368 7.264 9.584 6.744 9.584 6.072C9.584 5.4 9.368 4.88 8.936 4.512C8.504 4.144 7.888 3.96 7.088 3.96H4.016V8.16ZM7.4 15.264C8.216 15.264 8.848 15.072 9.296 14.688C9.76 14.304 9.992 13.76 9.992 13.056C9.992 12.336 9.752 11.776 9.272 11.376C8.792 10.96 8.144 10.752 7.328 10.752H4.016V15.264H7.4ZM15.2139 11.304C15.2139 9.96 15.4779 8.768 16.0059 7.728C16.5499 6.688 17.2779 5.888 18.1899 5.328C19.1179 4.768 20.1499 4.488 21.2859 4.488C22.2779 4.488 23.1419 4.688 23.8779 5.088C24.6299 5.488 25.2299 5.992 25.6779 6.6V4.704H29.0619V18H25.6779V16.056C25.2459 16.68 24.6459 17.2 23.8779 17.616C23.1259 18.016 22.2539 18.216 21.2619 18.216C20.1419 18.216 19.1179 17.928 18.1899 17.352C17.2779 16.776 16.5499 15.968 16.0059 14.928C15.4779 13.872 15.2139 12.664 15.2139 11.304ZM25.6779 11.352C25.6779 10.536 25.5179 9.84 25.1979 9.264C24.8779 8.672 24.4459 8.224 23.9019 7.92C23.3579 7.6 22.7739 7.44 22.1499 7.44C21.5259 7.44 20.9499 7.592 20.4219 7.896C19.8939 8.2 19.4619 8.648 19.1259 9.24C18.8059 9.816 18.6459 10.504 18.6459 11.304C18.6459 12.104 18.8059 12.808 19.1259 13.416C19.4619 14.008 19.8939 14.464 20.4219 14.784C20.9659 15.104 21.5419 15.264 22.1499 15.264C22.7739 15.264 23.3579 15.112 23.9019 14.808C24.4459 14.488 24.8779 14.04 25.1979 13.464C25.5179 12.872 25.6779 12.168 25.6779 11.352ZM35.7035 0.24V18H32.3435V0.24H35.7035ZM42.3832 0.24V18H39.0232V0.24H42.3832ZM51.6069 18.216C50.3269 18.216 49.1749 17.936 48.1509 17.376C47.1269 16.8 46.3189 15.992 45.7269 14.952C45.1509 13.912 44.8629 12.712 44.8629 11.352C44.8629 9.992 45.1589 8.792 45.7509 7.752C46.3589 6.712 47.1829 5.912 48.2229 5.352C49.2629 4.776 50.4229 4.488 51.7029 4.488C52.9829 4.488 54.1429 4.776 55.1829 5.352C56.2229 5.912 57.0389 6.712 57.6309 7.752C58.2389 8.792 58.5429 9.992 58.5429 11.352C58.5429 12.712 58.2309 13.912 57.6069 14.952C56.9989 15.992 56.1669 16.8 55.1109 17.376C54.0709 17.936 52.9029 18.216 51.6069 18.216ZM51.6069 15.288C52.2149 15.288 52.7829 15.144 53.3109 14.856C53.8549 14.552 54.2869 14.104 54.6069 13.512C54.9269 12.92 55.0869 12.2 55.0869 11.352C55.0869 10.088 54.7509 9.12 54.0789 8.448C53.4229 7.76 52.6149 7.416 51.6549 7.416C50.6949 7.416 49.8869 7.76 49.2309 8.448C48.5909 9.12 48.2709 10.088 48.2709 11.352C48.2709 12.616 48.5829 13.592 49.2069 14.28C49.8469 14.952 50.6469 15.288 51.6069 15.288ZM64.9196 7.464V13.896C64.9196 14.344 65.0236 14.672 65.2316 14.88C65.4556 15.072 65.8236 15.168 66.3356 15.168H67.8956V18H65.7836C62.9516 18 61.5356 16.624 61.5356 13.872V7.464H59.9516V4.704H61.5356V1.416H64.9196V4.704H67.8956V7.464H64.9196Z" fill="black" />
                        </svg>
                    </a>
                </div>
                {
                    isUserSignedIn ?
                        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                            <div style={{ margin: "10px 0" }}>
                                <a href="/builder/new" style={{ color: "black", textDecoration: "none" }}>
                                    <Button className="action_secondary_btn">
                                        <svg style={{ width: "12px" }} viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.30005 0.299988C5.63917 0.299988 5.91408 0.574901 5.91408 0.914023V4.68595H9.68601C10.0251 4.68595 10.3 4.96087 10.3 5.29999C10.3 5.63911 10.0251 5.91402 9.68601 5.91402H5.91408V9.68595C5.91408 10.0251 5.63917 10.3 5.30005 10.3C4.96093 10.3 4.68601 10.0251 4.68601 9.68595V5.91402H0.914084C0.574962 5.91402 0.300049 5.63911 0.300049 5.29999C0.300049 4.96087 0.574962 4.68595 0.914084 4.68595H4.68601V0.914023C4.68601 0.574901 4.96093 0.299988 5.30005 0.299988Z" fill="black" />
                                        </svg>
                                        New Poll
                                    </Button>
                                </a>
                            </div>

                            {/* <div className="d-none d-md-block" style={{ margin: "10px 0" }}>
                                <Link href="/all-polls">
                                    <Button variant="secondary">
                                        All Polls
                                    </Button>
                                </Link>
                            </div> */}

                            {/* Profile */}
                            <div>
                                <DropdownButton
                                    align="end"
                                    title={displayUsername ? (displayUsername.length < 16 ? displayUsername : (displayUsername.substr(0, 8) + "...")) : "..."}
                                    id="dropdown-menu-align-end"
                                    style={{ maxWidth: "120px" }}
                                >
                                    <Dropdown.Item
                                        onClick={() => {
                                            handleShowMyVotesPopup();
                                        }}
                                    >
                                        My votes
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => {
                                            switchAccount(window?.location?.href);
                                        }}
                                    >
                                        Switch account
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item
                                        href="https://github.com/BlockSurvey/ballot/issues"
                                        target="_blank">
                                        Share feedback
                                    </Dropdown.Item>
                                    <Dropdown.Item eventKey="1" onClick={() => { signOut() }}>Logout</Dropdown.Item>
                                </DropdownButton>
                            </div>
                        </div>
                        :
                        <div>
                            <Button variant="dark"
                                onClick={() => { authenticate(window?.location?.href) }}>
                                Sign up
                            </Button>
                        </div>
                }
            </div>

            {/* My votes popup */}
            <MyVotePopup showMyVotesPopup={showMyVotesPopup}
                handleCloseMyVotesPopup={handleCloseMyVotesPopup}
                handleShowMyVotesPopup={handleShowMyVotesPopup}
            />
        </>
    );
}