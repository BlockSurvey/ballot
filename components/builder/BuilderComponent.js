import { nanoid } from 'nanoid';
import Link from 'next/link.js';
import Router from 'next/router';
import { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { v4 as uuidv4 } from "uuid";
import { Constants } from '../../common/constants.js';
import { getFileFromGaia, getMyStxAddress, getUserData, putFileToGaia } from "../../services/auth.js";
import { deployContract } from "../../services/contract";
import { getRecentBlock } from "../../services/utils";
import styles from "../../styles/Builder.module.css";
import PreviewComponent from "./Preview.component";

export default function BuilderComponent(props) {
    // Variables

    // Poll id and Gaia address
    const { pathParams } = props;

    // Poll id
    const [pollId, setPollId] = useState();

    // Draft mode or not
    const [mode, setMode] = useState();

    // Poll object
    const [pollObject, setPollObject] = useState();

    // Processing flag
    const [isProcessing, setIsProcessing] = useState(false);

    // Error message
    const [errorMessage, setErrorMessage] = useState("");

    // Show preview
    const [show, setShow] = useState(false);
    const handleShow = () => setShow(true);
    const handleClose = () => setShow(false);

    const [currentProgressMessage, setCurrentProgressMessage] = useState();

    // Functions
    useEffect(() => {
        let _pollId, _mode, isCancelled = false;
        if (pathParams && pathParams?.[0]) {
            _pollId = pathParams[0];
            setPollId(_pollId);
        }

        if (pathParams && pathParams?.[1]) {
            _mode = pathParams[1];
            setMode(_mode);
        } else {
            setMode("");
        }

        // Fetch from Gaia
        if (_pollId) {
            if (_pollId === "new") {
                // Initialize new poll
                setPollObject(initializeNewPoll());
            } else if (_mode === "draft") {
                getFileFromGaia(_pollId + ".json", {}).then(
                    (response) => {
                        if (response && !isCancelled) {
                            setPollObject(JSON.parse(response));
                        }
                    },
                    (error) => {
                        // File does not exit in gaia
                        if (error && error.code == "does_not_exist" && !isCancelled) {
                            // Initialize new poll
                            setPollObject(initializeNewPoll());
                        }
                    });
            }
        }

        return () => {
            isCancelled = true;
        }
    }, [pathParams]);

    function initializeNewPoll() {
        return {
            title: "",
            description: "",
            votingSystem: "fptp",
            options: [
                {
                    id: uuidv4(),
                    value: "Choice 1"
                },
                {
                    id: uuidv4(),
                    value: "Choice 2"
                }
            ],
            votingStrategyFlag: true,
            strategyTokenType: "nft",
            strategyContractName: "",
            startAtBlock: 0,
            endAtBlock: 0,
            startAtDate: 0,
            endAtDate: 0,

            id: uuidv4(),
            status: "draft",
            createdAt: new Date(),
            username: getUserData().identityAddress,
            userStxAddress: getMyStxAddress()
        }
    }

    const handleChange = e => {
        const { name, value } = e.target;

        // Switch box component
        if (name == "votingStrategyFlag") {
            value = e.target.checked;
        } else if (name == "votingStrategyTemplate") {
            const strategyTemplate = Constants.STRATEGY_TEMPLATES.find(template => template.id == value);
            if (strategyTemplate) {
                pollObject["strategyTokenType"] = strategyTemplate["strategyTokenType"];
                pollObject["strategyTokenName"] = strategyTemplate["strategyTokenName"];
                pollObject["strategyContractName"] = strategyTemplate["strategyContractName"];
                pollObject["strategyTokenDecimals"] = strategyTemplate["strategyTokenDecimals"];
            } else {
                pollObject["strategyTokenName"] = "";
                pollObject["strategyContractName"] = "";
                pollObject["strategyTokenDecimals"] = "";
            }
        }

        // If value is empty, then delete key from previous state
        if (!value && pollObject) {
            // Delete key from JSON
            delete pollObject[name];
        } else {
            // Update the value
            pollObject[name] = value;
        }

        setPollObject({ ...pollObject });
    };

    const addOption = () => {
        if (pollObject?.options) {
            pollObject.options.push({
                id: uuidv4(),
                value: `Choice ${pollObject.options.length + 1}`
            })
        }
        setPollObject({ ...pollObject });
    }

    const deleteOption = (index) => {
        if (pollObject?.options && index < pollObject?.options?.length) {
            pollObject.options.splice(index, 1);
            setPollObject({ ...pollObject });
        }
    }

    const handleOptionChange = (e, option) => {
        option.value = e.target.value
        setPollObject({ ...pollObject });
    }

    const savePollToGaia = (encrypt = true) => {
        if (pollObject?.id) {
            // Start processing
            setIsProcessing(true);

            setCurrentProgressMessage("Saving ...");

            // Reset message
            setErrorMessage("");

            // Save to gaia
            putFileToGaia(`${pollObject.id}.json`, JSON.stringify(pollObject), (encrypt ? {} : { "encrypt": false })).then(response => {
                // Fetch and Update poll index
                fetchAndUpdatePollIndex();
            });
        }
    }

    const fetchAndUpdatePollIndex = () => {
        getFileFromGaia("pollIndex.json", {}).then(
            (response) => {
                if (response) {
                    updatePollIndex(JSON.parse(response));
                }
            },
            (error) => {
                // File does not exit in gaia
                if (error && error.code == "does_not_exist") {
                    // Initialize new
                    const newPollIndexObj = {
                        list: [],
                        ref: {}
                    };

                    updatePollIndex(newPollIndexObj);
                }
            });
    }

    const updatePollIndex = (currentPollIndexObj) => {
        if (currentPollIndexObj?.list && currentPollIndexObj?.ref) {
            // Insert to list
            if (!currentPollIndexObj.ref[pollObject.id]) {
                // New index
                currentPollIndexObj.list.push(pollObject.id);
            }

            // Create/Update index
            currentPollIndexObj.ref[pollObject.id] = {
                "id": pollObject.id,
                "title": pollObject.title,
                "description": pollObject.description,
                "username": pollObject.username,
                "createdAt": pollObject.createdAt,
                "updatedAt": new Date(),
                "status": pollObject.status,
                "startAt": pollObject.startAtDate,
                "endAt": pollObject.endAtDate,
                "publishedInfo": pollObject?.publishedInfo,
                "ipfsLocation": pollObject?.ipfsLocation
            };

            putFileToGaia("pollIndex.json", JSON.stringify(currentPollIndexObj), {}).then(response => {
                if (pollObject?.ipfsLocation) {
                    const gaiaAddress = getUserData()?.gaiaHubConfig?.address;
                    Router.replace("/" + pollObject?.id + "/" + gaiaAddress);
                } else if (pollId === "new") {
                    Router.replace("/builder/" + pollObject.id + "/draft");
                    setPollId(pollObject.id);
                }

                // Stop processing
                setIsProcessing(false);

                setCurrentProgressMessage("");
            });
        }
    }

    const validatePoll = () => {
        if (!pollObject) return "Poll is not yet created.";

        if (!pollObject?.title || !pollObject?.description ||
            !pollObject?.options || pollObject?.options?.length == 0) {
            return "Please fill all required fields."
        }

        if (!pollObject?.startAtDate || !pollObject?.endAtDate) {
            return "Please select poll start and end date."
        } else if (new Date() > new Date(pollObject?.startAtDate)) {
            return "Start date should be a future date."
        } else if (new Date() > new Date(pollObject?.endAtDate) ||
            new Date(pollObject?.startAtDate) > new Date(pollObject?.endAtDate)) {
            return "End date should be greater than start date."
        }

        if (pollObject?.votingStrategyTemplate == "other" && (!pollObject?.strategyTokenName || !pollObject?.strategyContractName)) {
            return "Please enter strategy Token name and Contract Address"
        }

        try {
            if (pollObject?.votingStrategyFlag && pollObject?.strategyTokenType == "ft" &&
                (!pollObject?.strategyTokenDecimals || !Number.isInteger(parseInt(pollObject?.strategyTokenDecimals)))) {
                return "Please enter positive integer value for strategy decimals"
            }
        } catch (e) {
            return "Please enter positive integer value for strategy decimals"
        }
    }

    const calculateBlockTime = (targetTimestamp, currentBlockHeight) => {
        const currentTimestamp = new Date().getTime();

        if (targetTimestamp && targetTimestamp > currentTimestamp && currentBlockHeight > 0) {
            const diff = Math.abs(new Date(targetTimestamp) - new Date(currentTimestamp));
            const minutes = Math.floor((diff / 1000) / 60);

            const blockTime = Math.round((1 / 10) * minutes);

            return currentBlockHeight + blockTime;
        }

        return 0;
    }

    const publishPoll = async () => {
        // Start processing
        setIsProcessing(true);

        // Reset message
        setErrorMessage("");

        // Validation
        const _errorMessage = validatePoll();
        if (_errorMessage) {
            setErrorMessage(_errorMessage);

            // Start processing
            setIsProcessing(false);
            return;
        }

        // Show message
        setCurrentProgressMessage("Publishing contract ...");

        // Get current Block
        const currentBlock = await getRecentBlock();

        // Calculate block time
        if (pollObject?.startAtDate) {
            pollObject['startAtBlock'] = calculateBlockTime(new Date(pollObject?.startAtDate).getTime(), currentBlock?.height);
        }
        if (pollObject?.endAtDate) {
            pollObject['endAtBlock'] = calculateBlockTime(new Date(pollObject?.endAtDate).getTime(), currentBlock?.height);
        }

        const contractName = "ballot-" + getTitleWithOutSpecialChar() + "-" + nanoid(5);
        pollObject["publishedInfo"] = {
            "contractAddress": getMyStxAddress(),
            "contractName": contractName
        }

        publishContract(contractName);
    }

    const publishContract = (contractName) => {
        // Publish contract
        deployContract(pollObject, contractName, callbackFunction);
    }

    const callbackFunction = (data) => {
        if (data?.txId) {
            // Update the contract deployed information
            pollObject.publishedInfo["txId"] = data?.txId;

            // Update the status
            pollObject["status"] = "live";

            publishPollToIPFS();
        }
    }

    const publishPollToIPFS = async () => {
        setCurrentProgressMessage("Publishing to IPFS ...");

        // Publish JSON to IPFS
        const data = JSON.stringify({
            "pinataOptions": {
                "cidVersion": 1
            },
            "pinataMetadata": {
                "name": pollObject?.title,
                "keyvalues": {
                    "id": pollObject?.id
                }
            },
            "pinataContent": pollObject
        });

        fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI0MDgzMzAwOC0wNWE2LTQxNzYtYjZlNy01ZGZjYzliOTg0NTYiLCJlbWFpbCI6InJhamFAYmxvY2tzdXJ2ZXkub3JnIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siaWQiOiJGUkExIiwiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjF9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImIwOWMzZjVjMTQ1ZWMxMjIwNGIxIiwic2NvcGVkS2V5U2VjcmV0IjoiMGUxMWNhZGZhMDFiMmQ3MGQ4YTJiZWMwZTRmNzBkMWJiN2I2NWZlYTA3OWQzZjNkNGI1YmQ5ODk0M2U4MTk3ZiIsImlhdCI6MTY2MTc4NjY4N30.qmkn_YrtU1jJExIpqZLN3FfMqbIzciuerWIUUutCayc'
            },
            body: data
        }).then(async (response) => {
            const responseBody = await response.json();

            // Update the IPFS location
            pollObject["ipfsLocation"] = responseBody?.IpfsHash
            setPollObject({ ...pollObject });

            // Save poll to gaia
            savePollToGaia(false);
        });
    }

    const getTitleWithOutSpecialChar = () => {
        return pollObject?.title?.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().substr(0, 16);
    }

    return (
        <>
            {pollObject && pollObject.id ?
                <>
                    <div className={styles.builder_container}>
                        {/* Left side */}
                        <div className={styles.builder_left}>
                            {/* Back button */}
                            <Link href="/all-polls">
                                <a style={{ fontSize: "14px", textDecoration: "none" }} className="ballot_links">
                                    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M5.42417 0.57573C5.65848 0.810044 5.65848 1.18994 5.42417 1.42426L2.44843 4.39999H14.9999C15.3313 4.39999 15.5999 4.66862 15.5999 4.99999C15.5999 5.33136 15.3313 5.59999 14.9999 5.59999H2.44843L5.42417 8.57573C5.65848 8.81005 5.65848 9.18994 5.42417 9.42426C5.18985 9.65857 4.80995 9.65857 4.57564 9.42426L0.575638 5.42426C0.341324 5.18994 0.341324 4.81004 0.575638 4.57573L4.57564 0.57573C4.80995 0.341415 5.18985 0.341415 5.42417 0.57573Z" fill="black" fillOpacity="0.7" />
                                    </svg>
                                    {' '}
                                    Back
                                </a>
                            </Link>

                            <Form style={{ margin: "20px 0 100px 0" }}>
                                <Form.Group className="mb-3">
                                    <Form.Label className='ballot_labels'>Title</Form.Label>
                                    <Form.Control type="text" name="title" value={pollObject.title} onChange={handleChange}
                                        className="ballot_input" />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className='ballot_labels'>Description</Form.Label>
                                    <Form.Control as="textarea" name="description" value={pollObject.description} rows={5} onChange={handleChange} className="ballot_input" />
                                </Form.Group>

                                {/* Voting system */}
                                <Form.Group className="mb-3">
                                    <Form.Label className='ballot_labels'>
                                        Voting system
                                    </Form.Label>
                                    <div>
                                        <Form.Select id="voting-strategy-template" name="votingSystem"
                                            value={pollObject?.votingSystem ? pollObject.votingSystem : ""}
                                            onChange={handleChange} className="ballot_input">
                                            {Constants.VOTING_SYSTEMS.map((option, index) => (
                                                <option value={option.id} key={index}>{option.name}</option>
                                            ))}
                                        </Form.Select>

                                        {(pollObject.votingSystem && Constants.VOTING_SYSTEM_DOCUMENTATION?.[pollObject.votingSystem]) &&
                                            <small className="form-text text-muted" style={{ fontSize: "12px" }}>
                                                <Link href={Constants.VOTING_SYSTEM_DOCUMENTATION?.[pollObject.votingSystem]?.["link"]}>
                                                    <a className="ballot_links" target={"_blank"}>
                                                        Learn more about {" "} {Constants.VOTING_SYSTEM_DOCUMENTATION?.[pollObject.votingSystem]?.["name"]}
                                                        <svg style={{ marginLeft: "6px" }}
                                                            width="8"
                                                            height="8"
                                                            viewBox="0 0 12 12"
                                                            fill="none"
                                                            xmlns="http://www.w3.org/2000/svg">
                                                            <path
                                                                fillRule="evenodd"
                                                                clipRule="evenodd"
                                                                d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z"
                                                                fill="initial"
                                                            />
                                                        </svg>
                                                    </a>
                                                </Link>
                                            </small>
                                        }
                                    </div>
                                </Form.Group>

                                {/* Options */}
                                <Form.Group className="mb-3">
                                    <Form.Label className='ballot_labels'>Options</Form.Label>
                                    {/* List of options */}
                                    <div className={styles.builder_option_box}>
                                        {pollObject?.options &&
                                            pollObject.options.map((option, index) => (
                                                <div key={index} className={styles.builder_option_section}>
                                                    <Form.Control type="text" placeholder="" value={option?.value}
                                                        style={{ paddingRight: "50px" }}
                                                        onChange={e => handleOptionChange(e, option)} className="ballot_input" />

                                                    <Button className={"action_secondary_btn " + styles.builder_option_delete} onClick={() => { deleteOption(index); }}>
                                                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M5.475 15.375C5.1 15.375 4.78125 15.2438 4.51875 14.9813C4.25625 14.7188 4.125 14.4 4.125 14.025V4.5H3.9375C3.775 4.5 3.64075 4.44675 3.53475 4.34025C3.42825 4.23425 3.375 4.1 3.375 3.9375C3.375 3.775 3.42825 3.64075 3.53475 3.53475C3.64075 3.42825 3.775 3.375 3.9375 3.375H6.75C6.75 3.1875 6.8155 3.03125 6.9465 2.90625C7.078 2.78125 7.2375 2.71875 7.425 2.71875H10.575C10.7625 2.71875 10.922 2.78125 11.0535 2.90625C11.1845 3.03125 11.25 3.1875 11.25 3.375H14.0625C14.225 3.375 14.3595 3.42825 14.466 3.53475C14.572 3.64075 14.625 3.775 14.625 3.9375C14.625 4.1 14.572 4.23425 14.466 4.34025C14.3595 4.44675 14.225 4.5 14.0625 4.5H13.875V14.025C13.875 14.4 13.7438 14.7188 13.4813 14.9813C13.2188 15.2438 12.9 15.375 12.525 15.375H5.475ZM5.25 4.5V14.025C5.25 14.0875 5.272 14.1407 5.316 14.1847C5.3595 14.2283 5.4125 14.25 5.475 14.25H12.525C12.5875 14.25 12.6407 14.2283 12.6847 14.1847C12.7283 14.1407 12.75 14.0875 12.75 14.025V4.5H5.25ZM7.05 12.1875C7.05 12.35 7.10325 12.4845 7.20975 12.591C7.31575 12.697 7.45 12.75 7.6125 12.75C7.775 12.75 7.9095 12.697 8.016 12.591C8.122 12.4845 8.175 12.35 8.175 12.1875V6.5625C8.175 6.4 8.122 6.2655 8.016 6.159C7.9095 6.053 7.775 6 7.6125 6C7.45 6 7.31575 6.053 7.20975 6.159C7.10325 6.2655 7.05 6.4 7.05 6.5625V12.1875ZM9.825 12.1875C9.825 12.35 9.878 12.4845 9.984 12.591C10.0905 12.697 10.225 12.75 10.3875 12.75C10.55 12.75 10.6845 12.697 10.791 12.591C10.897 12.4845 10.95 12.35 10.95 12.1875V6.5625C10.95 6.4 10.897 6.2655 10.791 6.159C10.6845 6.053 10.55 6 10.3875 6C10.225 6 10.0905 6.053 9.984 6.159C9.878 6.2655 9.825 6.4 9.825 6.5625V12.1875ZM5.25 4.5V14.025C5.25 14.0875 5.272 14.1407 5.316 14.1847C5.3595 14.2283 5.4125 14.25 5.475 14.25H5.25V4.5Z" fill="black" fillOpacity="0.6" />
                                                        </svg>
                                                    </Button>
                                                </div>
                                            ))
                                        }
                                    </div>

                                    <div style={{ display: "flex", marginTop: "10px" }}>
                                        <Button style={{ width: "100%" }} className="action_dashed_btn" onClick={() => { addOption(); }}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="12" cy="12" r="12" fill="#ECEFF1" />
                                                <path d="M12 8V12M12 16V12M12 12H16M12 12H8" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </Button>
                                    </div>
                                </Form.Group>

                                {/* Voting Period */}
                                <Form.Group className="mb-3">
                                    <Form.Label className='ballot_labels'>Voting period</Form.Label>
                                    <div style={{ display: "flex", flexWrap: "wrap", columnGap: "20px" }}>
                                        <Form.Group className="mb-3">
                                            <Form.Label style={{ width: "50px" }} className='ballot_labels'>Start</Form.Label>
                                            <Form.Control type="datetime-local" name="startAtDate" value={pollObject.startAtDate} style={{ width: "250px" }}
                                                min={new Date().toISOString().slice(0, 16)}
                                                onChange={handleChange} className="ballot_input" />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label style={{ width: "50px" }} className='ballot_labels'>End</Form.Label>
                                            <Form.Control type="datetime-local" name="endAtDate" value={pollObject.endAtDate} style={{ width: "250px" }}
                                                onChange={handleChange} disabled={!pollObject?.startAtDate} min={pollObject?.startAtDate} className="ballot_input" />
                                        </Form.Group>

                                        <small className="form-text text-muted" style={{ fontSize: "12px" }}>
                                            The start and End date with time are stored in ISO date format(2022-10-21T17:19). It will be converted to a local date format for displaying.
                                        </small>
                                    </div>
                                </Form.Group>

                                {/* Voting Strategy */}
                                <Form.Group className="mb-3">
                                    <Form.Check
                                        inline
                                        type="checkbox"
                                        id="voting-strategy-id"
                                        name="votingStrategyFlag"
                                        label="Voting strategy"
                                        onChange={handleChange}
                                        checked={pollObject.votingStrategyFlag}
                                    />
                                </Form.Group>

                                {pollObject?.votingStrategyFlag &&
                                    <>
                                        {/* Token type */}
                                        <Form.Group className="mb-3">
                                            <Form.Label className='ballot_labels'>Token type</Form.Label>
                                            <div>
                                                {Constants.TOKEN_TYPES.map((option, index) => (
                                                    <Form.Check
                                                        inline
                                                        key={index}
                                                        type='radio'
                                                        name="strategyTokenType"
                                                        value={option.id}
                                                        checked={pollObject.strategyTokenType === option.id}
                                                        id={`strategy_token_type_${option.id}`}
                                                        label={option.name}
                                                        onChange={handleChange}
                                                    />
                                                ))}
                                            </div>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label className='ballot_labels'>Default strategy</Form.Label>
                                            <Form.Select id="voting-strategy-template" name="votingStrategyTemplate"
                                                value={pollObject?.votingStrategyTemplate ? pollObject.votingStrategyTemplate : ""}
                                                onChange={handleChange} className="ballot_input">
                                                <option disabled value="">Select</option>
                                                {Constants.STRATEGY_TEMPLATES.filter(token => token.strategyTokenType == pollObject.strategyTokenType)
                                                    .map((option, index) => (
                                                        <option value={option.id} key={index}>{option.name}</option>
                                                    ))}
                                                <option value="other">Other</option>
                                            </Form.Select>
                                        </Form.Group>

                                        {/* Only for other */}
                                        {pollObject?.votingStrategyTemplate && pollObject?.votingStrategyTemplate == "other" &&
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className='ballot_labels'>Token name</Form.Label>
                                                    <Form.Control type="text" name="strategyTokenName" value={pollObject.strategyTokenName}
                                                        onChange={handleChange} placeholder="blocksurvey" className="ballot_input" />
                                                    <small className="form-text text-muted" style={{ fontSize: "12px" }}>
                                                        The token name is case-sensitive. Please give it as it is in the smart contract. (ex. APower)
                                                    </small>
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className='ballot_labels'>Contract name</Form.Label>
                                                    <Form.Control type="text" name="strategyContractName" value={pollObject.strategyContractName}
                                                        onChange={handleChange}
                                                        placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.contract" className="ballot_input" />
                                                </Form.Group>

                                                {/* Only fungible token */}
                                                {pollObject?.strategyTokenType == "ft" &&
                                                    <>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label className='ballot_labels'>Token decimals</Form.Label>
                                                            <Form.Control type="number" name="strategyTokenDecimals" value={pollObject.strategyTokenDecimals}
                                                                onChange={handleChange}
                                                                placeholder="0" className="ballot_input" min="0" />
                                                        </Form.Group>
                                                    </>
                                                }
                                            </>
                                        }
                                    </>
                                }
                            </Form>
                        </div>

                        {/* Right side */}
                        <div className={styles.builder_right}>
                            <div style={{ position: "sticky", top: "119px" }}>
                                <div className={styles.builder_right_section}>
                                    {
                                        pollId !== "new" &&
                                        <Button style={{ width: "100%", marginBottom: "10px" }} className="action_secondary_btn"
                                            onClick={() => { handleShow() }}>
                                            Preview
                                        </Button>
                                    }

                                    <Button style={{ width: "100%", marginBottom: "10px" }} className="action_secondary_btn"
                                        onClick={() => { savePollToGaia() }} disabled={isProcessing || pollObject?.status != "draft"}>
                                        Save
                                    </Button>

                                    <Button variant="dark" style={{ width: "100%" }}
                                        onClick={() => { publishPoll() }} disabled={isProcessing || pollObject?.status != "draft"}>
                                        Publish
                                    </Button>

                                    {/* Error Message */}
                                    {errorMessage &&
                                        <div style={{ marginTop: "10px" }}>
                                            <span style={{ fontSize: "14px" }}>{errorMessage}</span>
                                        </div>
                                    }
                                </div>

                                <div style={{ margin: "28px 0px 100px 0px", padding: "0px 20px" }}>
                                    <Link href="https://docs.ballot.gg">
                                        <a style={{ fontSize: "14px", textDecoration: "none" }} className="ballot_links" target={"_blank"}>
                                            Help documentation
                                            <svg style={{ marginLeft: "6px" }}
                                                width="8"
                                                height="8"
                                                viewBox="0 0 12 12"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z"
                                                    fill="initial"
                                                />
                                            </svg>
                                        </a>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview popup */}
                    <PreviewComponent pollObject={pollObject} show={show} handleClose={handleClose} />
                </>
                :
                <>
                    <div style={{ width: "100%", maxWidth: "52px", height: "17px", marginBottom: "20px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                    <div style={{ width: "100px", height: "22px", marginBottom: "8px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                    <div style={{ width: "100%", height: "36px", marginBottom: "16px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                    <div style={{ width: "130px", height: "22px", marginBottom: "8px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                    <div style={{ width: "100%", height: "132px", marginBottom: "16px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                    <div style={{ width: "150px", height: "22px", marginBottom: "8px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                    <div style={{ width: "100%", height: "36px", marginBottom: "16px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                    <div style={{ width: "170px", height: "22px", marginBottom: "8px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>
                    <div style={{ width: "100%", height: "36px", marginBottom: "16px", backgroundColor: "#eceff1", borderRadius: "4px" }}></div>

                </>
            }
        </>
    );
}