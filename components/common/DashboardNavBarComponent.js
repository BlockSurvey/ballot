import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { authenticate, signOut, switchAccount, userSession } from "../../services/auth";
import { getDomainNamesFromBlockchain } from "../../services/utils";
import ModernMyVotesModal from "./ModernMyVotesModal";

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
            <nav className="nav_container">
                <div className="nav_content">
                    <Link href={isUserSignedIn ? "/all-polls" : "/"} className="nav_logo">
                        <svg width="68" height="19" viewBox="0 0 68 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.16 9.408C11.104 9.584 11.88 10.056 12.488 10.824C13.096 11.592 13.4 12.472 13.4 13.464C13.4 14.36 13.176 15.152 12.728 15.84C12.296 16.512 11.664 17.04 10.832 17.424C10 17.808 9.016 18 7.88 18H0.656V1.248H7.568C8.704 1.248 9.68 1.432 10.496 1.8C11.328 2.168 11.952 2.68 12.368 3.336C12.8 3.992 13.016 4.736 13.016 5.568C13.016 6.544 12.752 7.36 12.224 8.016C11.712 8.672 11.024 9.136 10.16 9.408ZM4.016 8.16H7.088C7.888 8.16 8.504 7.984 8.936 7.632C9.368 7.264 9.584 6.744 9.584 6.072C9.584 5.4 9.368 4.88 8.936 4.512C8.504 4.144 7.888 3.96 7.088 3.96H4.016V8.16ZM7.4 15.264C8.216 15.264 8.848 15.072 9.296 14.688C9.76 14.304 9.992 13.76 9.992 13.056C9.992 12.336 9.752 11.776 9.272 11.376C8.792 10.96 8.144 10.752 7.328 10.752H4.016V15.264H7.4ZM15.2139 11.304C15.2139 9.96 15.4779 8.768 16.0059 7.728C16.5499 6.688 17.2779 5.888 18.1899 5.328C19.1179 4.768 20.1499 4.488 21.2859 4.488C22.2779 4.488 23.1419 4.688 23.8779 5.088C24.6299 5.488 25.2299 5.992 25.6779 6.6V4.704H29.0619V18H25.6779V16.056C25.2459 16.68 24.6459 17.2 23.8779 17.616C23.1259 18.016 22.2539 18.216 21.2619 18.216C20.1419 18.216 19.1179 17.928 18.1899 17.352C17.2779 16.776 16.5499 15.968 16.0059 14.928C15.4779 13.872 15.2139 12.664 15.2139 11.304ZM25.6779 11.352C25.6779 10.536 25.5179 9.84 25.1979 9.264C24.8779 8.672 24.4459 8.224 23.9019 7.92C23.3579 7.6 22.7739 7.44 22.1499 7.44C21.5259 7.44 20.9499 7.592 20.4219 7.896C19.8939 8.2 19.4619 8.648 19.1259 9.24C18.8059 9.816 18.6459 10.504 18.6459 11.304C18.6459 12.104 18.8059 12.808 19.1259 13.416C19.4619 14.008 19.8939 14.464 20.4219 14.784C20.9659 15.104 21.5419 15.264 22.1499 15.264C22.7739 15.264 23.3579 15.112 23.9019 14.808C24.4459 14.488 24.8779 14.04 25.1979 13.464C25.5179 12.872 25.6779 12.168 25.6779 11.352ZM35.7035 0.24V18H32.3435V0.24H35.7035ZM42.3832 0.24V18H39.0232V0.24H42.3832ZM51.6069 18.216C50.3269 18.216 49.1749 17.936 48.1509 17.376C47.1269 16.8 46.3189 15.992 45.7269 14.952C45.1509 13.912 44.8629 12.712 44.8629 11.352C44.8629 9.992 45.1589 8.792 45.7509 7.752C46.3589 6.712 47.1829 5.912 48.2229 5.352C49.2629 4.776 50.4229 4.488 51.7029 4.488C52.9829 4.488 54.1429 4.776 55.1829 5.352C56.2229 5.912 57.0389 6.712 57.6309 7.752C58.2389 8.792 58.5429 9.992 58.5429 11.352C58.5429 12.712 58.2309 13.912 57.6069 14.952C56.9989 15.992 56.1669 16.8 55.1109 17.376C54.0709 17.936 52.9029 18.216 51.6069 18.216ZM51.6069 15.288C52.2149 15.288 52.7829 15.144 53.3109 14.856C53.8549 14.552 54.2869 14.104 54.6069 13.512C54.9269 12.92 55.0869 12.2 55.0869 11.352C55.0869 10.088 54.7509 9.12 54.0789 8.448C53.4229 7.76 52.6149 7.416 51.6549 7.416C50.6949 7.416 49.8869 7.76 49.2309 8.448C48.5909 9.12 48.2709 10.088 48.2709 11.352C48.2709 12.616 48.5829 13.592 49.2069 14.28C49.8469 14.952 50.6469 15.288 51.6069 15.288ZM64.9196 7.464V13.896C64.9196 14.344 65.0236 14.672 65.2316 14.88C65.4556 15.072 65.8236 15.168 66.3356 15.168H67.8956V18H65.7836C62.9516 18 61.5356 16.624 61.5356 13.872V7.464H59.9516V4.704H61.5356V1.416H64.9196V4.704H67.8956V7.464H64.9196Z" fill="black" />
                        </svg>
                    </Link>
                    
                    {isUserSignedIn ? (
                        <div className="nav_actions">
                            <Link href="/builder/new">
                                <Button className="action_secondary_btn">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M8 1C8.55228 1 9 1.44772 9 2V7H14C14.5523 7 15 7.44772 15 8C15 8.55228 14.5523 9 14 9H9V14C9 14.5523 8.55228 15 8 15C7.44772 15 7 14.5523 7 14V9H2C1.44772 9 1 8.55228 1 8C1 7.44772 1.44772 7 2 7H7V2C7 1.44772 7.44772 1 8 1Z" fill="currentColor" />
                                    </svg>
                                    New Poll
                                </Button>
                            </Link>
                            
                            <div className="nav_user_menu">
                                <DropdownButton
                                    align="end"
                                    title={
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #000 0%, #666 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}>
                                                {displayUsername ? displayUsername.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <span style={{ 
                                                maxWidth: '120px', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis',
                                                fontSize: '14px',
                                                fontWeight: '500'
                                            }}>
                                                {displayUsername ? 
                                                    (displayUsername.length < 16 ? displayUsername : (displayUsername.substr(0, 12) + "...")) 
                                                    : "Loading..."
                                                }
                                            </span>
                                        </div>
                                    }
                                    id="dropdown-menu-align-end"
                                    className="user-dropdown"
                                >
                                    <Dropdown.Item onClick={handleShowMyVotesPopup}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                            <path fillRule="evenodd" clipRule="evenodd" d="M8 1C8.55228 1 9 1.44772 9 2V7H14C14.5523 7 15 7.44772 15 8C15 8.55228 14.5523 9 14 9H9V14C9 14.5523 8.55228 15 8 15C7.44772 15 7 14.5523 7 14V9H2C1.44772 9 1 8.55228 1 8C1 7.44772 1.44772 7 2 7H7V2C7 1.44772 7.44772 1 8 1Z" fill="currentColor" />
                                        </svg>
                                        My votes
                                    </Dropdown.Item>
                                    <Dropdown.Item href="/summary">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                            <path fillRule="evenodd" clipRule="evenodd" d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm9 3H5v1h6V6zm0 3H5v1h6V9z" fill="currentColor" />
                                        </svg>
                                        Summary page
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => switchAccount(window?.location?.href)}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                            <path fillRule="evenodd" clipRule="evenodd" d="M3 8a5 5 0 015-5v2l3-3-3-3v2A7 7 0 001 8h2zM13 8a7 7 0 01-7 7v-2l-3 3 3 3v-2a5 5 0 005-5h2z" fill="currentColor" />
                                        </svg>
                                        Switch account
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item href="https://github.com/BlockSurvey/ballot/issues" target="_blank">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                            <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" fill="currentColor" />
                                        </svg>
                                        Share feedback
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => signOut()}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                            <path fillRule="evenodd" clipRule="evenodd" d="M10 2.5a.5.5 0 00-.5-.5h-7a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h7a.5.5 0 00.5-.5V12a1 1 0 112 0v1.5A2.5 2.5 0 019.5 16h-7A2.5 2.5 0 010 13.5v-11A2.5 2.5 0 012.5 0h7A2.5 2.5 0 0112 2.5V4a1 1 0 11-2 0V2.5zM15.854 7.146a.5.5 0 010 .708l-3 3a.5.5 0 01-.708-.708L14.293 8H5a.5.5 0 010-1h9.293l-2.147-2.146a.5.5 0 01.708-.708l3 3z" fill="currentColor" />
                                        </svg>
                                        Logout
                                    </Dropdown.Item>
                                </DropdownButton>
                            </div>
                        </div>
                    ) : (
                        <div className="nav_actions">
                            <Button 
                                variant="dark"
                                onClick={() => authenticate(window?.location?.href)}
                                style={{
                                    padding: '8px 24px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#000',
                                    color: '#fff'
                                }}
                            >
                                Sign up
                            </Button>
                        </div>
                    )}
                </div>
            </nav>

            {/* My votes popup */}
            <ModernMyVotesModal
                showMyVotesPopup={showMyVotesPopup}
                handleCloseMyVotesPopup={handleCloseMyVotesPopup}
            />
        </>
    );
}