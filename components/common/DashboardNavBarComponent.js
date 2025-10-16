import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { authenticate, signOut, switchAccount, userSession } from "../../services/auth";
import { getCurrentBlockHeights, getDomainNamesFromBlockchain } from "../../services/utils";
import ModernMyVotesModal from "./ModernMyVotesModal";

export function DashboardNavBarComponent() {
    // Variables
    const [displayUsername, setDisplayUsername] = useState();
    const [isUserSignedIn, setIsUserSignedIn] = useState(false);
    const [stacksHeight, setStacksHeight] = useState(null);
    const [bitcoinHeight, setBitcoinHeight] = useState(null);

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
        getCurrentBlockHeight();

        if (userSession && userSession.isUserSignedIn()) {
            setIsUserSignedIn(true)
        }
    }, []);

    const getDisplayUsername = async () => {
        const _username = await getDomainNamesFromBlockchain();
        setDisplayUsername(_username);
    }

    const getCurrentBlockHeight = async () => {
        try {
            // Get current block height from Hiro API
            const { stacksHeight, bitcoinHeight } = await getCurrentBlockHeights();
            setStacksHeight(stacksHeight);
            setBitcoinHeight(bitcoinHeight);
        } catch (error) {
            console.error("Error fetching block heights:", error);
        }
    }

    // UI
    return (
        <>
            <nav className="nav_container">
                <div className="nav_content">
                    <Link href={isUserSignedIn ? "/all-polls" : "/"} className="nav_logo">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <svg width="68" height="19" viewBox="0 0 68 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10.16 9.408C11.104 9.584 11.88 10.056 12.488 10.824C13.096 11.592 13.4 12.472 13.4 13.464C13.4 14.36 13.176 15.152 12.728 15.84C12.296 16.512 11.664 17.04 10.832 17.424C10 17.808 9.016 18 7.88 18H0.656V1.248H7.568C8.704 1.248 9.68 1.432 10.496 1.8C11.328 2.168 11.952 2.68 12.368 3.336C12.8 3.992 13.016 4.736 13.016 5.568C13.016 6.544 12.752 7.36 12.224 8.016C11.712 8.672 11.024 9.136 10.16 9.408ZM4.016 8.16H7.088C7.888 8.16 8.504 7.984 8.936 7.632C9.368 7.264 9.584 6.744 9.584 6.072C9.584 5.4 9.368 4.88 8.936 4.512C8.504 4.144 7.888 3.96 7.088 3.96H4.016V8.16ZM7.4 15.264C8.216 15.264 8.848 15.072 9.296 14.688C9.76 14.304 9.992 13.76 9.992 13.056C9.992 12.336 9.752 11.776 9.272 11.376C8.792 10.96 8.144 10.752 7.328 10.752H4.016V15.264H7.4ZM15.2139 11.304C15.2139 9.96 15.4779 8.768 16.0059 7.728C16.5499 6.688 17.2779 5.888 18.1899 5.328C19.1179 4.768 20.1499 4.488 21.2859 4.488C22.2779 4.488 23.1419 4.688 23.8779 5.088C24.6299 5.488 25.2299 5.992 25.6779 6.6V4.704H29.0619V18H25.6779V16.056C25.2459 16.68 24.6459 17.2 23.8779 17.616C23.1259 18.016 22.2539 18.216 21.2619 18.216C20.1419 18.216 19.1179 17.928 18.1899 17.352C17.2779 16.776 16.5499 15.968 16.0059 14.928C15.4779 13.872 15.2139 12.664 15.2139 11.304ZM25.6779 11.352C25.6779 10.536 25.5179 9.84 25.1979 9.264C24.8779 8.672 24.4459 8.224 23.9019 7.92C23.3579 7.6 22.7739 7.44 22.1499 7.44C21.5259 7.44 20.9499 7.592 20.4219 7.896C19.8939 8.2 19.4619 8.648 19.1259 9.24C18.8059 9.816 18.6459 10.504 18.6459 11.304C18.6459 12.104 18.8059 12.808 19.1259 13.416C19.4619 14.008 19.8939 14.464 20.4219 14.784C20.9659 15.104 21.5419 15.264 22.1499 15.264C22.7739 15.264 23.3579 15.112 23.9019 14.808C24.4459 14.488 24.8779 14.04 25.1979 13.464C25.5179 12.872 25.6779 12.168 25.6779 11.352ZM35.7035 0.24V18H32.3435V0.24H35.7035ZM42.3832 0.24V18H39.0232V0.24H42.3832ZM51.6069 18.216C50.3269 18.216 49.1749 17.936 48.1509 17.376C47.1269 16.8 46.3189 15.992 45.7269 14.952C45.1509 13.912 44.8629 12.712 44.8629 11.352C44.8629 9.992 45.1589 8.792 45.7509 7.752C46.3589 6.712 47.1829 5.912 48.2229 5.352C49.2629 4.776 50.4229 4.488 51.7029 4.488C52.9829 4.488 54.1429 4.776 55.1829 5.352C56.2229 5.912 57.0389 6.712 57.6309 7.752C58.2389 8.792 58.5429 9.992 58.5429 11.352C58.5429 12.712 58.2309 13.912 57.6069 14.952C56.9989 15.992 56.1669 16.8 55.1109 17.376C54.0709 17.936 52.9029 18.216 51.6069 18.216ZM51.6069 15.288C52.2149 15.288 52.7829 15.144 53.3109 14.856C53.8549 14.552 54.2869 14.104 54.6069 13.512C54.9269 12.92 55.0869 12.2 55.0869 11.352C55.0869 10.088 54.7509 9.12 54.0789 8.448C53.4229 7.76 52.6149 7.416 51.6549 7.416C50.6949 7.416 49.8869 7.76 49.2309 8.448C48.5909 9.12 48.2709 10.088 48.2709 11.352C48.2709 12.616 48.5829 13.592 49.2069 14.28C49.8469 14.952 50.6469 15.288 51.6069 15.288ZM64.9196 7.464V13.896C64.9196 14.344 65.0236 14.672 65.2316 14.88C65.4556 15.072 65.8236 15.168 66.3356 15.168H67.8956V18H65.7836C62.9516 18 61.5356 16.624 61.5356 13.872V7.464H59.9516V4.704H61.5356V1.416H64.9196V4.704H67.8956V7.464H64.9196Z" fill="black" />
                            </svg>
                            <span style={{
                                fontSize: '10px',
                                color: '#666',
                                fontWeight: '400',
                                letterSpacing: '0.5px'
                            }}>
                                by BlockSurvey
                            </span>
                        </div>
                    </Link>

                    {isUserSignedIn ? (
                        <div className="nav_actions">
                            {/* Block Heights Section */}
                            <div className="block_heights_section">
                                <span className="block_height_label">Block Height</span>
                                <div className="block_height_item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 20 20">
                                        <path fill="#101010" d="M15.549 8.62826c.22-1.47106-.9-2.26187-2.4315-2.78942l.4968-1.99275-1.213-.3023-.4837 1.94023c-.3189-.07946-.6464-.15442-.9718-.2287l.4871-1.95302L10.2206 3l-.49716 1.99205c-.26395-.06011-.52306-.11953-.77458-.18206l.00139-.00622-1.67282-.4177-.32268 1.29556s.89998.20626.88097.21904c.49128.12265.58007.44774.56521.70547l-.5659 2.27018c.03386.00863.07774.02107.12611.04042-.04042-.01002-.08361-.02108-.12818-.03179l-.79323 3.18015c-.06012.1493-.21247.3731-.55588.2882.01209.0176-.88167-.2201-.88167-.2201L5 13.5217l1.57851.3935c.29366.0736.58144.1506.86474.2232l-.50198 2.0155 1.21161.3023.49715-1.9941c.33097.0898.65227.1727.96666.2508l-.49542 1.9848L10.3343 17l.5019-2.0117c2.0684.3914 3.6238.2335 4.2785-1.6373.5276-1.5063-.0263-2.3752-1.1145-2.9418.7925-.1827 1.3895-.70407 1.5488-1.78094Zm-2.7715 3.88634c-.3748 1.5063-2.91103.692-3.73328.4878l.66609-2.6702c.82229.2052 3.45899.6115 3.06719 2.1824Zm.3752-3.90811c-.342 1.37019-2.4529.67404-3.1377.50337l.6039-2.42183c.6848.17067 2.89.4892 2.5338 1.91846Z" />
                                    </svg>
                                    <span className="block_height_value">
                                        {bitcoinHeight ? bitcoinHeight.toLocaleString() : '...'}
                                    </span>
                                </div>
                                <div className="block_height_item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 20 20">
                                        <path fill="#101010" d="m14.8897 16.0001-2.546-3.8575H16v-1.4554H4v1.4571h3.65512l-2.54485 3.8558h1.8986L10 11.4681l2.9911 4.532h1.8986ZM16 9.27468V7.80464h-3.582L14.929 4h-1.8986L9.99997 8.59149 6.96957 4H5.07099l2.51428 3.80805H4v1.46663h12Z" />
                                    </svg>
                                    <span className="block_height_value">
                                        {stacksHeight ? stacksHeight.toLocaleString() : '...'}
                                    </span>
                                </div>
                            </div>

                            <Link href="/builder/new">
                                <Button className="action_secondary_btn">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 4.375V15.625M4.375 10H15.625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                                                width: '24px',
                                                height: '24px',
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
                                    <Dropdown.Item href="/builder/new">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                            <path d="M10 4.375V15.625M4.375 10H15.625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        New Poll
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={handleShowMyVotesPopup}>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                            <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-11z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                                            <path d="M7.5 10.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                        </svg>
                                        My votes
                                    </Dropdown.Item>
                                    {/* <Dropdown.Item href="/summary">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                            <path fillRule="evenodd" clipRule="evenodd" d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm9 3H5v1h6V6zm0 3H5v1h6V9z" fill="currentColor" />
                                        </svg>
                                        Summary page
                                    </Dropdown.Item> */}
                                    <Dropdown.Item onClick={() => switchAccount(window?.location?.href)}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                                            <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" fill="currentColor"/>
                                            <path d="M3 14C3 11.7909 4.79086 10 7 10H9C11.2091 10 13 11.7909 13 14V15H3V14Z" fill="currentColor"/>
                                            <path d="M13.5 4C14.3284 4 15 3.32843 15 2.5C15 1.67157 14.3284 1 13.5 1C12.6716 1 12 1.67157 12 2.5C12 3.32843 12.6716 4 13.5 4Z" fill="currentColor"/>
                                            <path d="M14 6H13C12.4477 6 12 6.44772 12 7V8H16V7C16 6.44772 15.5523 6 15 6H14Z" fill="currentColor"/>
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
                            {/* <Button
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
                            </Button> */}
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