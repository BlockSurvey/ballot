import { useEffect, useState } from "react";
import { Col, Container, Row, Button, Form } from "react-bootstrap";
import styles from "../../styles/Builder.module.css";
import { getFileFromGaia, getMyStxAddress, getUserData, putFileToGaia } from "../../services/auth.js"
import { v4 as uuidv4 } from "uuid";
import { nanoid } from 'nanoid';
import Link from "next/link";
import Router from 'next/router'
import PreviewComponent from "./Preview.component";
import { getRecentBlock } from "../../common/utils";
import { deployContract } from "../../common/contract";

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

    // Default strategy templates
    const strategyTemplates = {
        "satoshibles": {
            "strategyNFTName": "Satoshibles",
            "strategyContractName": "SP6P4EJF0VG8V0RB3TQQKJBHDQKEF6NVRD1KZE3C.satoshibles"
        }, "crashpunks": {
            "strategyNFTName": "crashpunks-v2",
            "strategyContractName": "SP3QSAJQ4EA8WXEDSRRKMZZ29NH91VZ6C5X88FGZQ.crashpunks-v2"
        }, "theexplorerguild": {
            "strategyNFTName": "The-Explorer-Guild",
            "strategyContractName": "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173.the-explorer-guild"
        }, "stacksparrots": {
            "strategyNFTName": "stacks-parrots",
            "strategyContractName": "SP2KAF9RF86PVX3NEE27DFV1CQX0T4WGR41X3S45C.byzantion-stacks-parrots"
        }, "blocksurvey": {
            "strategyNFTName": "blocksurvey",
            "strategyContractName": "https://explorer.stacks.co/txid/SPNWZ5V2TPWGQGVDR6T7B6RQ4XMGZ4PXTEE0VQ0S.blocksurvey"
        }, "btcholders": {
            "strategyNFTName": "",
            "strategyContractName": ""
        }
    }

    // Functions
    useEffect(() => {
        if (pathParams && pathParams?.[0]) {
            setPollId(pathParams[0]);
        }

        if (pathParams && pathParams?.[1]) {
            setMode(pathParams[1]);
        } else {
            setMode("");
        }

        // Fetch from Gaia
        if (pollId) {
            if (pollId === "new") {
                // Initialize new poll
                setPollObject(initializeNewPoll());
            } else if (mode === "draft") {
                getFileFromGaia(pollId + ".json", {}).then(
                    (response) => {
                        if (response) {
                            setPollObject(JSON.parse(response));
                        }
                    },
                    (error) => {
                        // File does not exit in gaia
                        if (error && error.code == "does_not_exist") {
                            // Initialize new poll
                            setPollObject(initializeNewPoll());
                        }
                    });
            } else if (pollId) {
                // Fetch from IPFS
                fetch(`https://owllink.mypinata.cloud/ipfs/${pollId}`)
                    .then(response => response.json())
                    .then(data => setPollObject(data));
            }
        }
    }, [pathParams, pollId, mode]);

    function initializeNewPoll() {
        return {
            title: "",
            description: "",
            votingSystem: "single",
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

            // Reset the values
            if (value == false) {
                pollObject["votingStrategyTemplate"] = "";
                pollObject["strategyNFTName"] = "";
                pollObject["strategyContractName"] = "";
            }
        } else if (name == "votingStrategyTemplate") {
            if (strategyTemplates[value]) {
                pollObject["strategyNFTName"] = strategyTemplates[value]["strategyNFTName"];
                pollObject["strategyContractName"] = strategyTemplates[value]["strategyContractName"];
            } else {
                pollObject["strategyNFTName"] = "";
                pollObject["strategyContractName"] = "";
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
                    Router.replace("/p/" + pollObject?.id + "/" + gaiaAddress + "/results");
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

        if (pollObject?.votingStrategyTemplate == "other" && (!pollObject?.strategyNFTName || !pollObject?.strategyContractName)) {
            return "Please enter strategy NFT name or Contract Address"
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

        const contractName = "ballot-" + getTitleWithOutSpecialChar();
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
        return pollObject?.title?.replace(/[^a-zA-Z0-9]/g, '');
    }

    return (
        <>
            <Container fluid>
                <Row className="justify-content-md-center">
                    <Col lg={8} md={12}>
                        <div className={styles.builder_container}>

                            {/* Title */}
                            <h4>{pollId && pollId === "new" ? "New" : "Edit"} Poll</h4>

                            {pollObject && pollObject.id ?
                                <Form style={{ marginTop: "20px" }}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Title</Form.Label>
                                        <Form.Control type="text" name="title" value={pollObject.title} onChange={handleChange} />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Description</Form.Label>
                                        <Form.Control as="textarea" name="description" value={pollObject.description} rows={5} onChange={handleChange} />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Voting system</Form.Label>
                                        <div>
                                            {['Single', 'Multiple'].map((option, index) => (
                                                <Form.Check
                                                    inline
                                                    key={index}
                                                    type='radio'
                                                    name="votingSystem"
                                                    value={option.toLowerCase()}
                                                    checked={pollObject.votingSystem === option.toLowerCase()}
                                                    id={`voting_system_${option}`}
                                                    label={option}
                                                    onChange={handleChange}
                                                />
                                            ))}
                                        </div>

                                        {/* List of options */}
                                        <div style={{ margin: "10px 0 0 10px" }}>
                                            {pollObject?.options &&
                                                pollObject.options.map((option, index) => (
                                                    <div key={index} style={{ margin: "5px 0", display: "flex", alignItems: "center" }}>

                                                        {pollObject?.votingSystem === "single" ?
                                                            <Form.Check style={{ marginRight: "10px" }}
                                                                type='radio'
                                                                disabled
                                                            />
                                                            :
                                                            <Form.Check style={{ marginRight: "10px" }}
                                                                type='checkbox'
                                                                disabled
                                                            />
                                                        }

                                                        <Form.Control type="text" placeholder="" value={option?.value} onChange={e => handleOptionChange(e, option)} />

                                                        <Button variant="secondary" style={{ marginLeft: "10px", width: "80px" }} onClick={() => { deleteOption(index); }}>Delete</Button>
                                                    </div>
                                                ))
                                            }
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                            <Button variant="secondary" style={{ width: "75px" }} onClick={() => { addOption(); }}>Add</Button>
                                        </div>
                                    </Form.Group>

                                    {/* Voting Period */}
                                    <div>
                                        <Form.Label>Voting period</Form.Label>
                                        <Form.Group className="mb-3" style={{ display: "flex", alignItems: "center" }}>
                                            <Form.Label style={{ marginRight: "10px", width: "50px" }}>Start</Form.Label>
                                            <Form.Control type="datetime-local" name="startAtDate" value={pollObject.startAtDate} style={{ width: "250px" }}
                                                min={new Date().toISOString().slice(0, 16)}
                                                onChange={handleChange} />
                                        </Form.Group>

                                        <Form.Group className="mb-3" style={{ display: "flex", alignItems: "center" }}>
                                            <Form.Label style={{ marginRight: "10px", width: "50px" }}>End</Form.Label>
                                            <Form.Control type="datetime-local" name="endAtDate" value={pollObject.endAtDate} style={{ width: "250px" }}
                                                onChange={handleChange} disabled={!pollObject?.startAtDate} min={pollObject?.startAtDate} />
                                        </Form.Group>
                                    </div>

                                    {/* Voting Strategy */}
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", padding: "10px 0" }}>
                                            <Form.Label>Voting strategy</Form.Label>
                                            <Form.Check style={{ marginLeft: "10px" }}
                                                inline
                                                type="switch"
                                                id="voting-strategy-id"
                                                name="votingStrategyFlag"
                                                onChange={handleChange}
                                            />
                                        </div>

                                        {pollObject?.votingStrategyFlag &&
                                            <>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Default strategy</Form.Label>
                                                    <Form.Select id="voting-strategy-template" name="votingStrategyTemplate" defaultValue={""} onChange={handleChange}>
                                                        <option disabled value="">Select</option>
                                                        <option value="satoshibles">Satoshibles</option>
                                                        <option value="crashpunks">CrashPunks</option>
                                                        <option value="theexplorerguild">The Explorer Guild</option>
                                                        <option value="stacksparrots">Stacks Parrots</option>
                                                        <option value="blocksurvey">BlockSurvey</option>
                                                        <option value="btcholders">.btc holders</option>
                                                        <option value="other">Other</option>
                                                    </Form.Select>
                                                </Form.Group>

                                                {/* Only for other */}
                                                {pollObject?.votingStrategyTemplate && pollObject?.votingStrategyTemplate == "other" &&
                                                    <>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>NFT name</Form.Label>
                                                            <Form.Control type="text" name="strategyNFTName" value={pollObject.strategyNFTName}
                                                                onChange={handleChange} />
                                                        </Form.Group>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Contract name</Form.Label>
                                                            <Form.Control type="text" name="strategyContractName" value={pollObject.strategyContractName}
                                                                onChange={handleChange}
                                                                placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.contract" />
                                                        </Form.Group>
                                                    </>
                                                }
                                            </>
                                        }
                                    </div>

                                    {/* Error Message */}
                                    {errorMessage &&
                                        <div style={{ margin: "10px 0" }}>
                                            <span style={{ fontSize: "14px" }}>{errorMessage}</span>
                                        </div>
                                    }

                                    {/* CTA */}
                                    {
                                        pollId !== "new" &&
                                        <Button variant="secondary" onClick={() => { handleShow() }}>Preview</Button>
                                    }
                                    {'  '}
                                    <Button variant="secondary" onClick={() => { savePollToGaia() }} disabled={isProcessing || pollObject?.status != "draft"}>
                                        Save
                                    </Button>
                                    {' '}
                                    <Button variant="secondary" onClick={() => { publishPoll() }} disabled={isProcessing || pollObject?.status != "draft"}>
                                        Publish
                                    </Button>
                                    {' '}
                                    {currentProgressMessage &&
                                        <span>{currentProgressMessage}</span>
                                    }
                                </Form>
                                :
                                <>Loading...</>
                            }
                        </div>
                    </Col>
                </Row>
            </Container>

            {/* Preview popup */}
            <PreviewComponent pollObject={pollObject} show={show} handleClose={handleClose} />
        </>
    );
}