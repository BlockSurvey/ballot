import { nanoid } from 'nanoid';
import Link from 'next/link.js';
import Router from 'next/router';
import { useEffect, useRef, useState } from "react";
import { Button, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { v4 as uuidv4 } from "uuid";
import { Constants } from '../../common/constants.js';
import { getFileFromGaia, getGaiaAddressFromPublicKey, getMyStxAddress, getUserData, putFileToGaia } from "../../services/auth.js";
import { deployContract } from "../../services/contract";
import { getCurrentBlockHeights, isValidUtf8, calculateDateFromBitcoinBlockHeight, formatLocalDateTime } from "../../services/utils";
import styles from "../../styles/Builder.module.css";
import PreviewComponent from "./Preview.component";
import RichTextEditor, { stripHtmlTags, isEditorEmpty } from "../common/RichTextEditor";
import DustTransactionModal from "./DustTransactionModal";

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

    // Processing flags
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    // Progress messages
    const [saveProgress, setSaveProgress] = useState('');
    const [publishProgress, setPublishProgress] = useState('');

    // Error message
    const [errorMessage, setErrorMessage] = useState("");

    // Field validation errors
    const [fieldErrors, setFieldErrors] = useState({});

    // Show preview
    const [show, setShow] = useState(false);
    const handleShow = () => setShow(true);
    const handleClose = () => setShow(false);

    // Dust Transaction Modal
    const [showDustModal, setShowDustModal] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);

    // Refs for form fields to manage focus
    const titleRef = useRef(null);
    const descriptionRef = useRef(null);
    const startAtBlockRef = useRef(null);
    const endAtBlockRef = useRef(null);
    const votingStrategyTemplateRef = useRef(null);
    const strategyTokenNameRef = useRef(null);
    const strategyContractNameRef = useRef(null);
    const strategyTokenDecimalsRef = useRef(null);
    const snapshotBlockHeightRef = useRef(null);
    const optionRefs = useRef([]);


    // Current block height
    const [stacksHeight, setStacksHeight] = useState(0);
    const [bitcoinHeight, setBitcoinHeight] = useState(0);

    // Drag and drop state
    const [draggedIndex, setDraggedIndex] = useState(null);

    // On page load
    useEffect(() => {
        getCurrentBlockHeight();
    }, []);

    // Functions
    useEffect(() => {
        let isCancelled = false;
        if (pathParams && pathParams?.[0]) {
            setPollId(pathParams[0]);
        }

        if (pathParams && pathParams?.[1]) {
            setMode(pathParams[1]);
        } else {
            setMode("");
        }

        // Initialize new poll
        if (pathParams?.[0] === "new") {
            setPollObject(initializeNewPoll());
        } else if (pathParams?.[1] === "draft") {
            // Fetch from Gaia
            getFileFromGaia(pathParams[0] + ".json", {}).then(
                (response) => {
                    if (response && !isCancelled) {
                        setPollObject(JSON.parse(response));
                    }
                }, (error) => {
                    // File does not exit in gaia
                    if (error && error.code == "does_not_exist" && !isCancelled) {
                        // Initialize new poll
                        setPollObject(initializeNewPoll());
                    }
                });
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
                    value: "Choice 1",
                    dustAddress: "",
                    dustAmount: ""
                },
                {
                    id: uuidv4(),
                    value: "Choice 2",
                    dustAddress: "",
                    dustAmount: ""
                }
            ],
            votingStrategyFlag: false,
            strategyTokenType: "ft",
            strategyContractName: "",
            // startAtBlock: 0,
            // endAtBlock: 0,
            startAtDate: 0,
            endAtDate: 0,

            id: uuidv4(),
            status: "draft",
            createdAt: new Date(),
            username: getUserData().identityAddress,
            userStxAddress: getMyStxAddress()
        }
    }

    const getCurrentBlockHeight = async () => {
        // Get current block height from Hiro API
        const { stacksHeight, bitcoinHeight } = await getCurrentBlockHeights();
        setStacksHeight(stacksHeight);
        setBitcoinHeight(bitcoinHeight);
    }

    const handleChange = e => {
        let { name, value } = e.target;

        // Switch box component
        if (name == "votingStrategyFlag") {
            value = e.target.checked;
            // Set default template to STX when enabling token-based voting for the first time
            if (value && !pollObject.votingStrategyTemplate) {
                pollObject["votingStrategyTemplate"] = "stx";
                const strategyTemplate = Constants.STRATEGY_TEMPLATES.find(template => template.id == "stx");
                if (strategyTemplate) {
                    pollObject["strategyTokenType"] = strategyTemplate["strategyTokenType"];
                    pollObject["strategyTokenName"] = strategyTemplate["strategyTokenName"];
                    pollObject["strategyContractName"] = strategyTemplate["strategyContractName"];
                    pollObject["strategyTokenDecimals"] = strategyTemplate["strategyTokenDecimals"];
                    pollObject["snapshotBlockHeight"] = strategyTemplate["snapshotBlockHeight"];
                }
            }
        } else if (name == "votingStrategyTemplate") {
            const strategyTemplate = Constants.STRATEGY_TEMPLATES.find(template => template.id == value);
            if (strategyTemplate) {
                pollObject["strategyTokenType"] = strategyTemplate["strategyTokenType"];
                pollObject["strategyTokenName"] = strategyTemplate["strategyTokenName"];
                pollObject["strategyContractName"] = strategyTemplate["strategyContractName"];
                pollObject["strategyTokenDecimals"] = strategyTemplate["strategyTokenDecimals"];
                pollObject["snapshotBlockHeight"] = strategyTemplate["snapshotBlockHeight"];
            } else {
                pollObject["strategyTokenName"] = "";
                pollObject["strategyContractName"] = "";
                pollObject["strategyTokenDecimals"] = "";
                pollObject["snapshotBlockHeight"] = 0;
            }
        }

        // If value is empty, then delete key from previous state
        if (!value && pollObject) {
            // Delete key from JSON
            delete pollObject[name];
        } else if (name == "startAtBlock" || name == "endAtBlock" || name == "snapshotBlockHeight") {
            // Update the value
            pollObject[name] = parseInt(value);
        } else {
            // Update the value
            pollObject[name] = value;
        }

        setPollObject({ ...pollObject });

        // Clear field error when user starts typing
        if (fieldErrors[name]) {
            const newErrors = { ...fieldErrors };
            delete newErrors[name];
            setFieldErrors(newErrors);
        }
    };

    // Handle rich text editor changes for description
    const handleRichTextChange = (htmlContent, textContent) => {
        // Update the description with HTML content
        if (isEditorEmpty(htmlContent)) {
            delete pollObject["description"];
        } else {
            pollObject["description"] = htmlContent;
        }

        setPollObject({ ...pollObject });

        // Clear description field error when user starts typing
        if (fieldErrors.description) {
            const newErrors = { ...fieldErrors };
            delete newErrors.description;
            setFieldErrors(newErrors);
        }
    };

    const addOption = () => {
        if (pollObject?.options) {
            pollObject.options.push({
                id: uuidv4(),
                value: `Choice ${pollObject.options.length + 1}`,
                dustAddress: "",
                dustAmount: ""
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

        // Clear option-specific errors
        if (fieldErrors.optionItems) {
            const optionIndex = pollObject.options.findIndex(opt => opt.id === option.id);
            if (optionIndex !== -1 && fieldErrors.optionItems[optionIndex]) {
                const newErrors = { ...fieldErrors };
                const newOptionErrors = { ...newErrors.optionItems };
                delete newOptionErrors[optionIndex];

                if (Object.keys(newOptionErrors).length === 0) {
                    delete newErrors.optionItems;
                    delete newErrors.options;
                } else {
                    newErrors.optionItems = newOptionErrors;
                }

                setFieldErrors(newErrors);
            }
        }
    }

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const items = Array.from(pollObject.options);
        const [draggedItem] = items.splice(draggedIndex, 1);
        items.splice(dropIndex, 0, draggedItem);

        setPollObject({ ...pollObject, options: items });
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // Dust Transaction Modal Functions
    const handleDustSettingsClick = (option) => {
        setSelectedOption(option);
        setShowDustModal(true);
    };

    const handleDustModalClose = () => {
        setShowDustModal(false);
        setSelectedOption(null);
    };

    const handleDustTransactionSave = (dustDetails) => {
        if (selectedOption && pollObject?.options) {
            const optionIndex = pollObject.options.findIndex(opt => opt.id === selectedOption.id);
            if (optionIndex !== -1) {
                // Ensure backward compatibility - initialize dust fields if they don't exist
                if (!pollObject.options[optionIndex].hasOwnProperty('dustAddress')) {
                    pollObject.options[optionIndex].dustAddress = "";
                }
                if (!pollObject.options[optionIndex].hasOwnProperty('dustAmount')) {
                    pollObject.options[optionIndex].dustAmount = "";
                }

                pollObject.options[optionIndex].dustAddress = dustDetails.dustAddress;
                pollObject.options[optionIndex].dustAmount = dustDetails.dustAmount;
                setPollObject({ ...pollObject });
            }
        }
    };

    const savePollToGaia = (encrypt = true) => {
        if (pollObject?.id) {
            // Start saving
            setIsSaving(true);
            setIsProcessing(true);
            setSaveProgress('Saving poll...');

            // Reset message
            setErrorMessage("");

            // Save to gaia
            putFileToGaia(`${pollObject.id}.json`, JSON.stringify(pollObject), (encrypt ? {} : { "encrypt": false })).then(response => {
                setSaveProgress('Updating index...');
                // Fetch and Update poll index
                fetchAndUpdatePollIndex();
            }).catch(error => {
                setErrorMessage('Failed to save poll. Please try again.');
                setIsSaving(false);
                setIsProcessing(false);
                setSaveProgress('');
            });
        }
    }

    const fetchAndUpdatePollIndex = () => {
        getFileFromGaia("pollIndex.json", {}).then(
            (response) => {
                if (response) {
                    updatePollIndex(JSON.parse(response));
                }
            }, (error) => {
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

            putFileToGaia("pollIndex.json", JSON.stringify(currentPollIndexObj), {}).then(async (response) => {
                if (pollObject?.ipfsLocation) {
                    const gaiaAddress = await getGaiaAddressFromPublicKey();
                    setPublishProgress('Redirecting...');
                    Router.replace("/" + pollObject?.id + "/" + gaiaAddress);
                } else if (pollId === "new") {
                    setSaveProgress('Complete!');
                    Router.replace("/builder/" + pollObject.id + "/draft");
                    setPollId(pollObject.id);
                }

                // Stop processing
                setIsProcessing(false);
                setIsSaving(false);
                setIsPublishing(false);

                // Clear progress messages after a brief delay
                setTimeout(() => {
                    setSaveProgress('');
                    setPublishProgress('');
                }, 1000);
            }).catch(error => {
                setErrorMessage('Failed to update poll index. Please try again.');
                setIsProcessing(false);
                setIsSaving(false);
                setIsPublishing(false);
                setSaveProgress('');
                setPublishProgress('');
            });
        }
    }

    const validatePoll = () => {
        const errors = {};
        let hasErrors = false;
        let firstErrorField = null;

        if (!pollObject) {
            setErrorMessage("Poll is not yet created.");
            return "Poll is not yet created.";
        }

        // Check poll title
        if (!pollObject?.title || pollObject.title.trim() === '') {
            errors.title = "Poll title is required";
            hasErrors = true;
            if (!firstErrorField) firstErrorField = 'title';
        } else if (isValidUtf8(pollObject?.title) == false) {
            errors.title = "Please enter valid UTF-8 characters";
            hasErrors = true;
            if (!firstErrorField) firstErrorField = 'title';
        }

        // Check description UTF-8 (convert HTML to text for validation)
        if (pollObject?.description) {
            const textContent = stripHtmlTags(pollObject.description);
            if (textContent && isValidUtf8(textContent) == false) {
                errors.description = "Please enter valid UTF-8 characters";
                hasErrors = true;
                if (!firstErrorField) firstErrorField = 'description';
            }
        }

        // Check for options
        if (!pollObject?.options || pollObject?.options?.length == 0) {
            errors.options = "At least one poll option is required";
            hasErrors = true;
        } else {
            // Check each option
            const optionErrors = {};
            for (let i = 0; i < pollObject.options.length; i++) {
                if (!pollObject.options[i].value || pollObject.options[i].value.trim() === '') {
                    optionErrors[i] = "Option text is required";
                    hasErrors = true;
                    if (!firstErrorField) firstErrorField = `option-${i}`;
                } else if (isValidUtf8(pollObject.options[i].value) == false) {
                    optionErrors[i] = "Please enter valid UTF-8 characters";
                    hasErrors = true;
                    if (!firstErrorField) firstErrorField = `option-${i}`;
                }
            }
            if (Object.keys(optionErrors).length > 0) {
                errors.optionItems = optionErrors;
            }
        }

        // Check for start and end block
        if (!pollObject?.startAtBlock) {
            errors.startAtBlock = "Start tenure block height is required";
            hasErrors = true;
            if (!firstErrorField) firstErrorField = 'startAtBlock';
        } else if (pollObject?.startAtBlock < bitcoinHeight) {
            errors.startAtBlock = `Start tenure block must be >= current block height (${bitcoinHeight})`;
            hasErrors = true;
            if (!firstErrorField) firstErrorField = 'startAtBlock';
        }

        if (!pollObject?.endAtBlock) {
            errors.endAtBlock = "End tenure block height is required";
            hasErrors = true;
            if (!firstErrorField) firstErrorField = 'endAtBlock';
        } else if (pollObject?.startAtBlock && pollObject?.endAtBlock <= pollObject?.startAtBlock) {
            errors.endAtBlock = "End tenure block must be greater than start tenure block";
            hasErrors = true;
            if (!firstErrorField) firstErrorField = 'endAtBlock';
        }

        // Check for voting strategy
        if (pollObject?.votingStrategyFlag) {
            if (pollObject?.strategyTokenType && !pollObject?.votingStrategyTemplate) {
                errors.votingStrategyTemplate = "Please select a default strategy or choose 'Other'";
                hasErrors = true;
                if (!firstErrorField) firstErrorField = 'votingStrategyTemplate';
            }

            if (pollObject?.votingStrategyTemplate == "other") {
                if (!pollObject?.strategyTokenName || pollObject.strategyTokenName.trim() === '') {
                    errors.strategyTokenName = "Strategy token name is required when using custom strategy";
                    hasErrors = true;
                    if (!firstErrorField) firstErrorField = 'strategyTokenName';
                }
                if (!pollObject?.strategyContractName || pollObject.strategyContractName.trim() === '') {
                    errors.strategyContractName = "Strategy contract address is required when using custom strategy";
                    hasErrors = true;
                    if (!firstErrorField) firstErrorField = 'strategyContractName';
                }
            }

            // Fungible token specific validation
            if (pollObject?.strategyTokenType == "ft") {
                try {
                    if (!pollObject?.strategyTokenDecimals || !Number.isInteger(parseInt(pollObject?.strategyTokenDecimals))) {
                        errors.strategyTokenDecimals = "Please enter a positive integer for strategy decimals";
                        hasErrors = true;
                        if (!firstErrorField) firstErrorField = 'strategyTokenDecimals';
                    }

                    if (!pollObject?.snapshotBlockHeight || !Number.isInteger(parseInt(pollObject?.snapshotBlockHeight)) || pollObject?.snapshotBlockHeight <= 0) {
                        errors.snapshotBlockHeight = "Please enter a positive integer for snapshot block height";
                        hasErrors = true;
                        if (!firstErrorField) firstErrorField = 'snapshotBlockHeight';
                    }
                } catch (e) {
                    errors.strategyTokenDecimals = "Please enter a positive integer for strategy decimals";
                    hasErrors = true;
                    if (!firstErrorField) firstErrorField = 'strategyTokenDecimals';
                }
            }
        }

        // Update field errors state
        setFieldErrors(errors);

        if (hasErrors) {
            // Focus on the first field with an error
            focusOnErrorField(firstErrorField);

            // Set a general error message
            setErrorMessage("Please fix the highlighted fields below and try again.");
            return "Please fix the highlighted fields below and try again.";
        }

        // Clear any previous errors if validation passes
        setFieldErrors({});
        return null;
    }

    const focusOnErrorField = (fieldName) => {
        // Use setTimeout to ensure the DOM has updated with the error state
        setTimeout(() => {
            if (fieldName === 'title' && titleRef.current) {
                titleRef.current.focus();
                titleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (fieldName === 'description' && descriptionRef.current) {
                descriptionRef.current.focus();
                descriptionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (fieldName.startsWith('option-') && optionRefs.current.length > 0) {
                const optionIndex = parseInt(fieldName.split('-')[1]);
                if (optionRefs.current[optionIndex]) {
                    optionRefs.current[optionIndex].focus();
                    optionRefs.current[optionIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else if (fieldName === 'startAtBlock' && startAtBlockRef.current) {
                startAtBlockRef.current.focus();
                startAtBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (fieldName === 'endAtBlock' && endAtBlockRef.current) {
                endAtBlockRef.current.focus();
                endAtBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (fieldName === 'votingStrategyTemplate' && votingStrategyTemplateRef.current) {
                votingStrategyTemplateRef.current.focus();
                votingStrategyTemplateRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (fieldName === 'strategyTokenName' && strategyTokenNameRef.current) {
                strategyTokenNameRef.current.focus();
                strategyTokenNameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (fieldName === 'strategyContractName' && strategyContractNameRef.current) {
                strategyContractNameRef.current.focus();
                strategyContractNameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (fieldName === 'strategyTokenDecimals' && strategyTokenDecimalsRef.current) {
                strategyTokenDecimalsRef.current.focus();
                strategyTokenDecimalsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (fieldName === 'snapshotBlockHeight' && snapshotBlockHeightRef.current) {
                snapshotBlockHeightRef.current.focus();
                snapshotBlockHeightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
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

    const calculateDate = (blockHeight, currentBlockHeight) => {
        if (blockHeight && currentBlockHeight && blockHeight > 0 && currentBlockHeight > 0 &&
            blockHeight > currentBlockHeight) {
            const diff = blockHeight - currentBlockHeight;
            const minutes = diff * 10;

            return new Date(new Date().getTime() + (minutes * 60 * 1000));
        }

        return new Date();
    }

    const publishPoll = async () => {
        // Start publishing
        setIsPublishing(true);
        setIsProcessing(true);
        setPublishProgress('Validating poll...');

        // Reset message
        setErrorMessage("");

        // Validation
        const _errorMessage = validatePoll();
        if (_errorMessage) {
            setErrorMessage(_errorMessage);
            setIsPublishing(false);
            setIsProcessing(false);
            setPublishProgress('');
            return;
        }

        setPublishProgress('Preparing contract...');


        // Calculate stand and end time based on block height
        if (pollObject?.startAtBlock) {
            pollObject['startAtDate'] = calculateDate(pollObject?.startAtBlock, bitcoinHeight);
        }
        if (pollObject?.endAtBlock) {
            pollObject['endAtDate'] = calculateDate(pollObject?.endAtBlock, bitcoinHeight);
        }

        // Convert local date to ISO date
        pollObject['startAtDateUTC'] = new Date(pollObject?.startAtDate).toISOString();
        pollObject['endAtDateUTC'] = new Date(pollObject?.endAtDate).toISOString();

        const contractName = "ballot-" + getTitleWithOutSpecialChar() + "-" + nanoid(5);
        pollObject["publishedInfo"] = {
            "contractAddress": getMyStxAddress(),
            "contractName": contractName
        }

        publishContract(contractName);
    }

    const publishContract = (contractName) => {
        setPublishProgress('Deploying smart contract...');
        // Publish contract
        deployContract(pollObject, contractName, callbackFunction);
    }

    const callbackFunction = (data) => {
        if (data?.txId) {
            setPublishProgress('Contract deployed! Publishing to IPFS...');
            // Update the contract deployed information
            pollObject.publishedInfo["txId"] = data?.txId;

            // Update the status
            pollObject["status"] = "live";

            publishPollToIPFS();
        } else {
            setErrorMessage('Contract deployment failed. Please try again.');
            setIsPublishing(false);
            setIsProcessing(false);
            setPublishProgress('');
        }
    }

    const publishPollToIPFS = async () => {
        setPublishProgress('Publishing to IPFS...');

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

            if (responseBody?.IpfsHash) {
                setPublishProgress('IPFS published! Finalizing...');

                // Update the IPFS location
                pollObject["ipfsLocation"] = responseBody?.IpfsHash
                setPollObject({ ...pollObject });

                // Save poll to gaia
                savePollToGaia(false);
            } else {
                setErrorMessage('Failed to publish to IPFS. Please try again.');
                setIsPublishing(false);
                setIsProcessing(false);
                setPublishProgress('');
            }
        }).catch(error => {
            setErrorMessage('IPFS publishing failed. Please try again.');
            setIsPublishing(false);
            setIsProcessing(false);
            setPublishProgress('');
        });
    }

    const getTitleWithOutSpecialChar = () => {
        return pollObject?.title?.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().substr(0, 16);
    }

    return (
        <>
            {pollObject && pollObject.id ?
                <>
                    {/* Data Found! */}
                    <div className={styles.builder_container}>
                        {/* Header Section */}
                        <div className={styles.builder_header}>
                            <div className={styles.builder_header_content}>
                                <div className={styles.builder_back_section}>
                                    <Link href="/all-polls">
                                        <a className={styles.back_button}>
                                            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path fillRule="evenodd" clipRule="evenodd" d="M5.42417 0.57573C5.65848 0.810044 5.65848 1.18994 5.42417 1.42426L2.44843 4.39999H14.9999C15.3313 4.39999 15.5999 4.66862 15.5999 4.99999C15.5999 5.33136 15.3313 5.59999 14.9999 5.59999H2.44843L5.42417 8.57573C5.65848 8.81005 5.65848 9.18994 5.42417 9.42426C5.18985 9.65857 4.80995 9.65857 4.57564 9.42426L0.575638 5.42426C0.341324 5.18994 0.341324 4.81004 0.575638 4.57573L4.57564 0.57573C4.80995 0.341415 5.18985 0.341415 5.42417 0.57573Z" fill="currentColor" />
                                            </svg>
                                            Back
                                        </a>
                                    </Link>
                                    <div className={styles.builder_title}>
                                        <h1>{(pollObject.title || 'Untitled Poll').length > 50 ?
                                            `${(pollObject.title || 'Untitled Poll').substring(0, 50)}...` :
                                            (pollObject.title || 'Untitled Poll')}
                                        </h1>
                                        <span className={styles.poll_status}>{pollObject.status === 'draft' ? 'Draft' : 'Published'}</span>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Main Content */}
                        <div className={styles.builder_main}>
                            {/* Left Column - Form Content */}
                            <div className={styles.builder_content}>
                                <div className={styles.builder_form}>

                                    {/* Basic Information Section */}
                                    <div className={styles.form_section}>
                                        <div className={styles.section_header}>
                                            <h2>Basic Information</h2>
                                            <p>Set the title and description for your poll</p>
                                        </div>
                                        <div className={styles.section_content}>
                                            <Form.Group className={styles.form_group}>
                                                <Form.Label className={styles.form_label}>Poll Title *</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="title"
                                                    value={pollObject.title}
                                                    onChange={handleChange}
                                                    placeholder="Enter a compelling title for your poll"
                                                    className={`${styles.form_input} ${fieldErrors.title ? styles.error : ''}`}
                                                    ref={titleRef}
                                                />
                                                {fieldErrors.title && (
                                                    <small className={styles.field_error}>
                                                        {fieldErrors.title}
                                                    </small>
                                                )}
                                            </Form.Group>

                                            <Form.Group className={styles.form_group}>
                                                <Form.Label className={styles.form_label}>Description</Form.Label>
                                                <div ref={descriptionRef}>
                                                    <RichTextEditor
                                                        value={pollObject.description || ''}
                                                        onChange={handleRichTextChange}
                                                        placeholder="Provide context and details about what you're polling. Use the toolbar to format your text, add links, lists, and more."
                                                        error={!!fieldErrors.description}
                                                        className={styles.rich_text_editor}
                                                    />
                                                </div>
                                                {fieldErrors.description && (
                                                    <small className={styles.field_error}>
                                                        {fieldErrors.description}
                                                    </small>
                                                )}
                                            </Form.Group>
                                        </div>
                                    </div>

                                    {/* Voting System Section */}
                                    <div className={styles.form_section}>
                                        <div className={styles.section_header}>
                                            <h2>Voting System</h2>
                                            <p>Choose how votes will be counted and weighted</p>
                                        </div>
                                        <div className={styles.section_content}>
                                            <div className={styles.voting_systems_grid}>
                                                {Constants.VOTING_SYSTEMS.map((option, index) => (
                                                    <div
                                                        key={index}
                                                        className={`${styles.voting_system_card} ${pollObject.votingSystem === option.id ? styles.selected : ''
                                                            }`}
                                                        onClick={() => handleChange({
                                                            target: { name: 'votingSystem', value: option.id }
                                                        })}
                                                    >
                                                        <div className={styles.voting_system_icon}>
                                                            {/* Purposeful icons based on voting system functionality */}
                                                            {option.id === 'fptp' && (
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                    <path d="M8 12l2 2 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                    <circle cx="7" cy="8" r="1.5" fill="currentColor" />
                                                                    <circle cx="7" cy="16" r="1.5" fill="currentColor" />
                                                                </svg>
                                                            )}
                                                            {option.id === 'block' && (
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <rect x="3" y="4" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                    <path d="M9 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                    <rect x="3" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" />
                                                                    <path d="M9 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                    <rect x="3" y="16" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" />
                                                                    <path d="M9 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                </svg>
                                                            )}
                                                            {option.id === 'quadratic' && (
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M3 20V4M21 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                    <path d="M3 20h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                    <path d="M6 17Q9 8 12 11T18 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                                    <circle cx="6" cy="17" r="2" fill="currentColor" />
                                                                    <circle cx="18" cy="8" r="2" fill="currentColor" />
                                                                </svg>
                                                            )}
                                                            {option.id === 'weighted' && (
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M12 3v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                    <path d="M12 9l-8 6v4h16v-4l-8-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                                    <ellipse cx="7" cy="16" rx="2" ry="1" fill="currentColor" />
                                                                    <ellipse cx="17" cy="17" rx="2" ry="1" fill="currentColor" />
                                                                    <circle cx="12" cy="6" r="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className={styles.voting_system_content}>
                                                            <h3>{option.name}</h3>
                                                            <p className={styles.voting_system_description}>
                                                                {option.id === 'fptp' && 'Simple majority voting - one vote per voter'}
                                                                {option.id === 'block' && 'Voters can select multiple options'}
                                                                {option.id === 'quadratic' && 'Vote weight scales quadratically with tokens'}
                                                                {option.id === 'weighted' && 'Vote weight scales linearly with tokens'}
                                                            </p>
                                                        </div>
                                                        {pollObject.votingSystem === option.id && (
                                                            <div className={styles.selected_indicator}>
                                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708L6.5 11.707 2.146 7.354a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {(pollObject.votingSystem && Constants.VOTING_SYSTEM_DOCUMENTATION?.[pollObject.votingSystem]) &&
                                                <div className={styles.help_link}>
                                                    <Link href={Constants.VOTING_SYSTEM_DOCUMENTATION?.[pollObject.votingSystem]?.["link"]}>
                                                        <a className={styles.external_link} target={"_blank"}>
                                                            Learn more about {Constants.VOTING_SYSTEM_DOCUMENTATION?.[pollObject.votingSystem]?.["name"]}
                                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path fillRule="evenodd" clipRule="evenodd" d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z" fill="currentColor" />
                                                            </svg>
                                                        </a>
                                                    </Link>
                                                </div>
                                            }
                                        </div>
                                    </div>

                                    {/* Options Section */}
                                    <div className={styles.form_section}>
                                        <div className={styles.section_header}>
                                            <h2>Voting Options</h2>
                                            <p>Add the choices voters can select from</p>
                                        </div>
                                        <div className={styles.section_content}>
                                            {fieldErrors.options && (
                                                <div className={styles.field_error}>
                                                    {fieldErrors.options}
                                                </div>
                                            )}
                                            <div className={styles.options_container}>
                                                {pollObject?.options && (
                                                    <div className={styles.options_list}>
                                                        {pollObject.options.map((option, index) => (
                                                            <div
                                                                key={option.id}
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, index)}
                                                                onDragOver={handleDragOver}
                                                                onDrop={(e) => handleDrop(e, index)}
                                                                onDragEnd={handleDragEnd}
                                                                className={`${styles.option_item} ${draggedIndex === index ? styles.dragging : ''
                                                                    }`}
                                                            >
                                                                <div
                                                                    className={styles.drag_handle}
                                                                    title="Drag to reorder"
                                                                >
                                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        <circle cx="2" cy="2" r="1" fill="currentColor" />
                                                                        <circle cx="6" cy="2" r="1" fill="currentColor" />
                                                                        <circle cx="10" cy="2" r="1" fill="currentColor" />
                                                                        <circle cx="2" cy="6" r="1" fill="currentColor" />
                                                                        <circle cx="6" cy="6" r="1" fill="currentColor" />
                                                                        <circle cx="10" cy="6" r="1" fill="currentColor" />
                                                                        <circle cx="2" cy="10" r="1" fill="currentColor" />
                                                                        <circle cx="6" cy="10" r="1" fill="currentColor" />
                                                                        <circle cx="10" cy="10" r="1" fill="currentColor" />
                                                                    </svg>
                                                                </div>
                                                                <div className={styles.option_number}>{index + 1}</div>
                                                                <div className={styles.option_input_wrapper}>
                                                                    <Form.Control
                                                                        type="text"
                                                                        placeholder={`Option ${index + 1}`}
                                                                        value={option?.value}
                                                                        onChange={e => handleOptionChange(e, option)}
                                                                        className={`${styles.option_input} ${fieldErrors.optionItems?.[index] ? styles.error : ''}`}
                                                                        ref={el => optionRefs.current[index] = el}
                                                                    />
                                                                    {fieldErrors.optionItems?.[index] && (
                                                                        <small className={styles.field_error}>
                                                                            {fieldErrors.optionItems[index]}
                                                                        </small>
                                                                    )}
                                                                    {(option?.dustAddress && option?.dustAddress.trim() && option?.dustAmount && option?.dustAmount.toString().trim()) && (
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            marginTop: '6px',
                                                                            padding: '4px 8px',
                                                                            backgroundColor: '#f8f9fa',
                                                                            border: '1px solid #dee2e6',
                                                                            borderRadius: '4px',
                                                                            fontSize: '0.75rem',
                                                                            color: '#6c757d',
                                                                            fontWeight: '500'
                                                                        }}>
                                                                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px', flexShrink: 0 }}>
                                                                                <path d="M8 0L10.2 5.8L16 8L10.2 10.2L8 16L5.8 10.2L0 8L5.8 5.8L8 0Z" fill="#6c757d" />
                                                                            </svg>
                                                                            <span style={{ fontSize: '0.75rem', lineHeight: '1' }}>
                                                                                Dust: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                                                                                {option.dustAddress.length > 16 ? 
                                                                                    `${option.dustAddress.substring(0, 6)}...${option.dustAddress.substring(option.dustAddress.length - 4)}` :
                                                                                    option.dustAddress
                                                                                }</span> ({option.dustAmount} STX)
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <OverlayTrigger
                                                                    placement="top"
                                                                    overlay={<Tooltip>Configure Dust Transaction</Tooltip>}
                                                                >
                                                                    <Button
                                                                        className={styles.option_settings}
                                                                        onClick={() => handleDustSettingsClick(option)}
                                                                        size="sm"
                                                                    >
                                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" fill="currentColor" />
                                                                            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z" fill="currentColor" />
                                                                        </svg>
                                                                    </Button>
                                                                </OverlayTrigger>
                                                                {pollObject.options.length > 2 && (
                                                                    <Button
                                                                        className={styles.option_delete}
                                                                        onClick={() => { deleteOption(index); }}
                                                                        title="Delete option"
                                                                    >
                                                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <Button className={styles.add_option_btn} onClick={() => { addOption(); }}>
                                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M10 4.5V15.5M4.5 10H15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    Add Option
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Voting Period Section */}
                                    <div className={styles.form_section}>
                                        <div className={styles.section_header}>
                                            <h2>Voting Period</h2>
                                            <p>Set when voting opens and closes</p>
                                        </div>
                                        <div className={styles.section_content}>
                                            <div className={styles.block_height_info}>
                                                <div className={styles.info_badge}>
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" fill="currentColor" />
                                                        <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" fill="currentColor" />
                                                    </svg>
                                                    Current Bitcoin Block Height: <strong>{bitcoinHeight}</strong>
                                                </div>
                                            </div>

                                            <div className={styles.voting_period_grid}>
                                                <Form.Group className={styles.form_group}>
                                                    <Form.Label className={styles.form_label}>Start Bitcoin Block Height *</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        name="startAtBlock"
                                                        value={pollObject.startAtBlock || ''}
                                                        placeholder={`e.g. ${bitcoinHeight + 10}`}
                                                        onChange={handleChange}
                                                        className={`${styles.form_input} ${fieldErrors.startAtBlock ? styles.error : ''}`}
                                                        min={bitcoinHeight}
                                                        ref={startAtBlockRef}
                                                    />
                                                    {fieldErrors.startAtBlock ? (
                                                        <small className={styles.field_error}>
                                                            {fieldErrors.startAtBlock}
                                                        </small>
                                                    ) : (
                                                        <small className={styles.field_hint}>
                                                            Must be {bitcoinHeight} or higher
                                                        </small>
                                                    )}
                                                </Form.Group>

                                                <Form.Group className={styles.form_group}>
                                                    <Form.Label className={styles.form_label}>End Bitcoin Block Height *</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        name="endAtBlock"
                                                        value={pollObject.endAtBlock || ''}
                                                        placeholder={`e.g. ${bitcoinHeight + 100}`}
                                                        onChange={handleChange}
                                                        className={`${styles.form_input} ${fieldErrors.endAtBlock ? styles.error : ''}`}
                                                        min={pollObject.startAtBlock || bitcoinHeight + 1}
                                                        ref={endAtBlockRef}
                                                    />
                                                    {fieldErrors.endAtBlock ? (
                                                        <small className={styles.field_error}>
                                                            {fieldErrors.endAtBlock}
                                                        </small>
                                                    ) : (
                                                        <small className={styles.field_hint}>
                                                            Must be greater than start block
                                                        </small>
                                                    )}
                                                </Form.Group>
                                            </div>

                                            {pollObject.startAtBlock && pollObject.endAtBlock && (
                                                <div className={styles.period_summary}>
                                                    <div className={styles.summary_item}>
                                                        <span className={styles.summary_label}>Duration:</span>
                                                        <span className={styles.summary_value}>
                                                            {pollObject.endAtBlock - pollObject.startAtBlock} blocks
                                                            (~{Math.round((pollObject.endAtBlock - pollObject.startAtBlock) * 10 / 60)} hours)
                                                        </span>
                                                    </div>
                                                    <div className={styles.summary_item}>
                                                        <span className={styles.summary_label}>Start Date:</span>
                                                        <span className={styles.summary_value}>
                                                            {(() => {
                                                                try {
                                                                    const startDate = calculateDateFromBitcoinBlockHeight(bitcoinHeight, pollObject.startAtBlock);
                                                                    return formatLocalDateTime(startDate.toISOString());
                                                                } catch (error) {
                                                                    console.error('Error calculating start date:', error);
                                                                    return 'Invalid Date';
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <div className={styles.summary_item}>
                                                        <span className={styles.summary_label}>End Date:</span>
                                                        <span className={styles.summary_value}>
                                                            {(() => {
                                                                try {
                                                                    const endDate = calculateDateFromBitcoinBlockHeight(bitcoinHeight, pollObject.endAtBlock);
                                                                    return formatLocalDateTime(endDate.toISOString());
                                                                } catch (error) {
                                                                    console.error('Error calculating end date:', error);
                                                                    return 'Invalid Date';
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Token Based Section */}
                                    <div className={styles.form_section}>
                                        <div className={styles.section_header}>
                                            <h2>Token Based</h2>
                                            <p>Restrict voting to token holders (optional)</p>
                                        </div>
                                        <div className={styles.section_content}>
                                            <div className={styles.toggle_container}>
                                                <Form.Check
                                                    type="switch"
                                                    id="voting-strategy-switch"
                                                    name="votingStrategyFlag"
                                                    label="Enable token-based voting"
                                                    onChange={handleChange}
                                                    checked={pollObject.votingStrategyFlag}
                                                    className={styles.form_switch}
                                                />
                                                <p className={styles.toggle_description}>
                                                    {pollObject.votingStrategyFlag
                                                        ? 'Only token holders will be able to vote'
                                                        : 'Anyone can vote (1 vote per wallet)'
                                                    }
                                                </p>
                                            </div>

                                            {pollObject?.votingStrategyFlag && (
                                                <div className={styles.strategy_config}>
                                                    {/* Token Type Selection */}
                                                    <div className={styles.token_types_grid}>
                                                        {Constants.TOKEN_TYPES.map((option, index) => (
                                                            <div
                                                                key={index}
                                                                className={`${styles.token_type_card} ${pollObject.strategyTokenType === option.id ? styles.selected : ''
                                                                    }`}
                                                                onClick={() => handleChange({
                                                                    target: { name: 'strategyTokenType', value: option.id }
                                                                })}
                                                            >
                                                                <div className={styles.token_type_icon}>
                                                                    {option.id === 'ft' && (
                                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                            <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                            <path d="M8 8l8 8" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
                                                                        </svg>
                                                                    )}
                                                                    {option.id === 'nft' && (
                                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M12 2L16 8L22 9L17 14L18 20L12 17L6 20L7 14L2 9L8 8L12 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                            <circle cx="12" cy="10" r="2" fill="currentColor" />
                                                                            <path d="M10 13l2-1 2 1v2l-2 1-2-1v-2z" fill="currentColor" />
                                                                        </svg>
                                                                    )}
                                                                    {option.id === 'stx' && (
                                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M12 2L3.09 8.26L0 9L5 14L3.82 21L12 17.77L20.18 21L19 14L24 9L20.91 8.26L12 2Z" fill="currentColor" />
                                                                        </svg>
                                                                    )}
                                                                    {option.id === 'bns' && (
                                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <rect x="4" y="4" width="16" height="4" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                            <rect x="6" y="10" width="12" height="4" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                            <rect x="8" y="16" width="8" height="4" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                            <circle cx="12" cy="6" r="1" fill="currentColor" />
                                                                            <circle cx="12" cy="12" r="1" fill="currentColor" />
                                                                            <circle cx="12" cy="18" r="1" fill="currentColor" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <h4>{option.name}</h4>
                                                                {pollObject.strategyTokenType === option.id && (
                                                                    <div className={styles.selected_indicator}>
                                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M13.854 3.646a.5.5 0 0 1 0 .708L6.5 11.707 2.146 7.354a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Strategy Template Selection */}
                                                    <Form.Group className={styles.form_group}>
                                                        <Form.Label className={styles.form_label}>Select Token Template *</Form.Label>
                                                        <Form.Select
                                                            name="votingStrategyTemplate"
                                                            value={pollObject?.votingStrategyTemplate || ""}
                                                            onChange={handleChange}
                                                            className={`${styles.form_select} ${fieldErrors.votingStrategyTemplate ? styles.error : ''}`}
                                                            ref={votingStrategyTemplateRef}
                                                        >
                                                            <option disabled value="">Choose a token template</option>
                                                            {Constants.STRATEGY_TEMPLATES
                                                                .filter(token => token.strategyTokenType === pollObject.strategyTokenType)
                                                                .map((option, index) => (
                                                                    <option value={option.id} key={index}>{option.name}</option>
                                                                ))}
                                                            <option value="other">Custom Token</option>
                                                        </Form.Select>
                                                        {fieldErrors.votingStrategyTemplate && (
                                                            <small className={styles.field_error}>
                                                                {fieldErrors.votingStrategyTemplate}
                                                            </small>
                                                        )}
                                                    </Form.Group>

                                                    {/* Custom Token Configuration */}
                                                    {pollObject?.votingStrategyTemplate === "other" && (
                                                        <div className={styles.custom_token_config}>
                                                            <Form.Group className={styles.form_group}>
                                                                <Form.Label className={styles.form_label}>Token Name *</Form.Label>
                                                                <Form.Control
                                                                    type="text"
                                                                    name="strategyTokenName"
                                                                    value={pollObject.strategyTokenName || ''}
                                                                    onChange={handleChange}
                                                                    placeholder="e.g., APower"
                                                                    className={`${styles.form_input} ${fieldErrors.strategyTokenName ? styles.error : ''}`}
                                                                    ref={strategyTokenNameRef}
                                                                />
                                                                {fieldErrors.strategyTokenName ? (
                                                                    <small className={styles.field_error}>
                                                                        {fieldErrors.strategyTokenName}
                                                                    </small>
                                                                ) : (
                                                                    <small className={styles.field_hint}>
                                                                        Case-sensitive token name from the smart contract
                                                                    </small>
                                                                )}
                                                            </Form.Group>

                                                            <Form.Group className={styles.form_group}>
                                                                <Form.Label className={styles.form_label}>Contract Address *</Form.Label>
                                                                <Form.Control
                                                                    type="text"
                                                                    name="strategyContractName"
                                                                    value={pollObject.strategyContractName || ''}
                                                                    onChange={handleChange}
                                                                    placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.contract"
                                                                    className={`${styles.form_input} ${fieldErrors.strategyContractName ? styles.error : ''}`}
                                                                    ref={strategyContractNameRef}
                                                                />
                                                                {fieldErrors.strategyContractName && (
                                                                    <small className={styles.field_error}>
                                                                        {fieldErrors.strategyContractName}
                                                                    </small>
                                                                )}
                                                            </Form.Group>

                                                            {/* Fungible Token specific fields */}
                                                            {pollObject?.strategyTokenType === "ft" && (
                                                                <>
                                                                    <Form.Group className={styles.form_group}>
                                                                        <Form.Label className={styles.form_label}>Token Decimals</Form.Label>
                                                                        <Form.Control
                                                                            type="number"
                                                                            name="strategyTokenDecimals"
                                                                            value={pollObject.strategyTokenDecimals || ''}
                                                                            onChange={handleChange}
                                                                            placeholder="6"
                                                                            className={`${styles.form_input} ${fieldErrors.strategyTokenDecimals ? styles.error : ''}`}
                                                                            min="0"
                                                                            ref={strategyTokenDecimalsRef}
                                                                        />
                                                                        {fieldErrors.strategyTokenDecimals && (
                                                                            <small className={styles.field_error}>
                                                                                {fieldErrors.strategyTokenDecimals}
                                                                            </small>
                                                                        )}
                                                                    </Form.Group>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Fungible Token Snapshot Height */}
                                                    {pollObject?.strategyTokenType === "ft" && (
                                                        <Form.Group className={styles.form_group}>
                                                            <Form.Label className={styles.form_label}>Snapshot Stacks Block Height (Current Height: {stacksHeight}) *</Form.Label>
                                                            <Form.Control
                                                                type="number"
                                                                name="snapshotBlockHeight"
                                                                value={pollObject.snapshotBlockHeight || ''}
                                                                onChange={handleChange}
                                                                placeholder={`e.g., ${stacksHeight - 100}`}
                                                                className={`${styles.form_input} ${fieldErrors.snapshotBlockHeight ? styles.error : ''}`}
                                                                min="0"
                                                                ref={snapshotBlockHeightRef}
                                                            />
                                                            {fieldErrors.snapshotBlockHeight ? (
                                                                <small className={styles.field_error}>
                                                                    {fieldErrors.snapshotBlockHeight}
                                                                </small>
                                                            ) : (
                                                                <small className={styles.field_hint}>
                                                                    Block height for token balance snapshot (Stacks)
                                                                </small>
                                                            )}
                                                        </Form.Group>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Actions Sidebar */}
                            <div className={styles.builder_sidebar}>
                                <div className={styles.sidebar_sticky}>
                                    <div className={styles.actions_card}>
                                        <div className={styles.actions_header}>
                                            <h3>Actions</h3>
                                            <p>Save, preview, or publish your poll</p>
                                        </div>

                                        <div className={styles.actions_list}>
                                            {pollId !== "new" && (
                                                <Button
                                                    className={styles.action_preview}
                                                    onClick={() => { handleShow() }}
                                                    disabled={isProcessing}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M1.25 10C1.25 10 4.375 3.75 10 3.75C15.625 3.75 18.75 10 18.75 10C18.75 10 15.625 16.25 10 16.25C4.375 16.25 1.25 10 1.25 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    Preview Poll
                                                </Button>
                                            )}

                                            <Button
                                                className={`${styles.action_save} ${isSaving ? styles.loading : ''}`}
                                                onClick={() => { savePollToGaia() }}
                                                disabled={isProcessing || pollObject?.status !== "draft"}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <div className={styles.button_spinner}></div>
                                                        {saveProgress || 'Saving...'}
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M15.625 5L7.5 13.125L4.375 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        Save Draft
                                                    </>
                                                )}
                                            </Button>

                                            <Button
                                                className={`${styles.action_publish} ${isPublishing ? styles.loading : ''}`}
                                                onClick={() => { publishPoll() }}
                                                disabled={isProcessing || pollObject?.status !== "draft"}
                                            >
                                                {isPublishing ? (
                                                    <>
                                                        <div className={styles.button_spinner}></div>
                                                        {publishProgress || 'Publishing...'}
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M10 3.75V16.25M3.75 10L10 3.75L16.25 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        Publish Poll
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        {errorMessage && (
                                            <div className={styles.error_message}>
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zM8 4v4M8 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                <span>{errorMessage}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.help_card}>
                                        <div className={styles.help_content}>
                                            <h4>Need Help?</h4>
                                            <p>Check our comprehensive documentation for detailed guides and examples.</p>
                                            <Link href="https://docs.ballot.gg">
                                                <a className={styles.help_link} target="_blank">
                                                    View Documentation
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path fillRule="evenodd" clipRule="evenodd" d="M3.5044 0.743397C3.5044 0.33283 3.83723 -6.71395e-08 4.2478 0L11.2566 6.60206e-07C11.6672 6.60206e-07 12 0.33283 12 0.743397L12 7.7522C12 8.16277 11.6672 8.4956 11.2566 8.4956C10.846 8.4956 10.5132 8.16277 10.5132 7.7522V2.53811L1.26906 11.7823C0.978742 12.0726 0.50805 12.0726 0.217736 11.7823C-0.0725787 11.4919 -0.0725784 11.0213 0.217736 10.7309L9.46189 1.48679L4.2478 1.48679C3.83723 1.48679 3.5044 1.15396 3.5044 0.743397Z" fill="currentColor" />
                                                    </svg>
                                                </a>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview popup */}
                        <PreviewComponent
                            pollObject={pollObject}
                            show={show}
                            handleClose={handleClose}
                            currentBitcoinBlockHeight={bitcoinHeight}
                            currentStacksBlockHeight={stacksHeight}
                        />

                        {/* Dust Transaction Modal */}
                        <DustTransactionModal
                            show={showDustModal}
                            onHide={handleDustModalClose}
                            option={selectedOption}
                            onSave={handleDustTransactionSave}
                        />
                    </div>
                </>
                :
                <>
                    {/* No Data Found! */}
                    {/* Loading space */}
                    <div style={{ height: "30px" }}></div>

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
