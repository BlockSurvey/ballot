import { openContractCall, openContractDeploy } from "@stacks/connect";
import { AnchorMode, bufferCV, FungibleConditionCode, listCV, makeStandardSTXPostCondition, PostConditionMode, stringAsciiCV, uintCV } from "@stacks/transactions";
import { Constants } from "../common/constants";
import { getNetworkType } from "../services/auth";

const cancelCallbackFunction = (data) => {
    window.location.reload();
}

export async function deployContract(pollObject, contractName, callbackFunction) {
    const contract = getContract(pollObject);

    // this post-condition ensures that our recipient receives at least 5000 STX tokens
    const myPostCondition = makeStandardSTXPostCondition(
        Constants.STACKS_MAINNET_FLAG ? Constants.MAINNET_DONATION_ADDRESS : Constants.TESTNET_DONATION_ADDRESS,
        FungibleConditionCode.Equal,
        5000000 // 1STX = 1000000 micro-STX (denoted in micro-STX)
    );

    // Transaction options
    const txOptions = {
        network: getNetworkType(), // Testnet or Mainnet
        anchorMode: AnchorMode.Any, // which type of block the tx should be mined in

        contractName: contractName,
        codeBody: contract,

        appDetails: {
            name: "Ballot",
            icon: window.location.origin + "/images/logo/ballot.png"
        },

        postConditionMode: PostConditionMode.Allow, // whether the tx should fail when unexpected assets are transferred
        postConditions: [myPostCondition], // for an example using post-conditions, see next example

        onFinish: callbackFunction,
        onCancel: cancelCallbackFunction
    };

    // Call contract function
    await openContractDeploy(txOptions);
}

function getContract(pollObject) {
    let contract = getRawContract();

    let optionIds;
    let optionResults;
    pollObject?.options?.forEach(option => {
        if (!optionIds) {
            optionIds = `"${option?.id}"`
            optionResults = `(map-set results {id: "${option?.id}"} {count: u0, name: u"${getStringByLength(encodeURIComponent(option?.value), 512)}"})`
        } else {
            optionIds = optionIds + ` "${option?.id}"`;
            optionResults = optionResults + ` (map-set results {id: "${option?.id}"} {count: u0, name: u"${getStringByLength(encodeURIComponent(option?.value), 512)}"})`
        }
    });


    let strategyFunction = "";
    let votingPowerVariable = "";
    let volumeByVotingPower = "";
    let myVotes = "";
    let votingPowerValidation = "";

    // Strategy
    if (pollObject?.votingStrategyFlag && pollObject?.strategyTokenType) {
        // Non fungible tokens
        if (pollObject?.strategyTokenType == "nft") {
            if (pollObject?.votingStrategyTemplate == "btcholders") {
                strategyFunction = getStrategyFunctionForBtcHolders();
                votingPowerVariable = `(voting-power (get-voting-power-by-bns-holder domain namespace))`;
            } else if (pollObject?.strategyContractName) {
                strategyFunction = getStrategyFunctionForNFT(pollObject?.strategyContractName);
                votingPowerVariable = `(voting-power (get-voting-power-by-nft-holdings token-ids))`;
            }
        } else {
            // Fungible tokens
            if (pollObject?.votingStrategyTemplate == "stx") {
                strategyFunction = getStrategyFunctionForStxHolders(pollObject?.snapshotBlockHeight || 0);
                votingPowerVariable = `(voting-power (get-voting-power-by-stx-holdings))`;
            } else if (pollObject?.strategyContractName) {
                strategyFunction = getStrategyFunctionForFT(pollObject?.strategyContractName, pollObject?.snapshotBlockHeight || 0);
                votingPowerVariable = `(voting-power (get-voting-power-by-ft-holdings))`;
            }
        }
    } else {
        // No strategy

        // Based on voting system
        if (pollObject?.votingSystem == "fptp") {
            votingPowerVariable = `(voting-power u1)`;
        } else if (pollObject?.votingSystem == "block") {
            votingPowerVariable = `(voting-power u1)`;
        } else if (pollObject?.votingSystem == "quadratic") {
            votingPowerVariable = `(voting-power (fold + (map get-pow-value volume) u0))`;
        } else if (pollObject?.votingSystem == "weighted") {
            votingPowerVariable = `(voting-power (fold + volume u0))`;
        }
    }

    // Based on voting system
    if (pollObject?.votingSystem == "fptp") {
        volumeByVotingPower = `
                ;; FPTP and Block voting
                (temp (var-set temp-voting-power voting-power))
                (volume-by-voting-power (map get-volume-by-voting-power volume))
            `;

        myVotes = `
                ;; FPTP and Block voting - Number of votes
                (my-votes voting-power)`;

        votingPowerValidation = `
                ;; FPTP and Block voting
                (asserts! (> voting-power u0) ERR-FAILED-STRATEGY)`;
    } else if (pollObject?.votingSystem == "block") {
        volumeByVotingPower = `
                ;; FPTP and Block voting
                (temp (var-set temp-voting-power voting-power))
                (volume-by-voting-power (map get-volume-by-voting-power volume))
            `;

        myVotes = `
                ;; FPTP and Block voting - Number of votes
                (my-votes voting-power)`;

        votingPowerValidation = `
                ;; FPTP and Block voting
                (asserts! (> voting-power u0) ERR-FAILED-STRATEGY)`;
    } else if (pollObject?.votingSystem == "quadratic") {
        volumeByVotingPower = `
                ;; Quadratic or Weighted voting
                (volume-by-voting-power volume)`;

        myVotes = `
                ;; Quadratic or Weighted voting - Number of votes
                (my-votes (fold + volume u0))`;

        votingPowerValidation = `
                ;; Quadratic voting
                (asserts! (>= voting-power (fold + (map get-pow-value volume-by-voting-power) u0)) ERR-FAILED-STRATEGY)`;
    } else if (pollObject?.votingSystem == "weighted") {
        volumeByVotingPower = `
                ;; Quadratic or Weighted voting
                (volume-by-voting-power volume)`;

        myVotes = `
                ;; Quadratic or Weighted voting - Number of votes
                (my-votes (fold + volume u0))`;

        votingPowerValidation = `
                ;; Weigted voting
                (asserts! (>= voting-power (fold + volume-by-voting-power u0)) ERR-FAILED-STRATEGY)`;
    }

    const placeholder = {
        "noOfOptions": pollObject?.options?.length,
        "title": getStringByLength(encodeURIComponent(pollObject?.title), 512),
        "description": getStringByLength(encodeURIComponent(pollObject?.description), 512),
        "votingSystem": pollObject?.votingSystem,
        "startAtBlock": pollObject?.startAtBlock,
        "endAtBlock": pollObject?.endAtBlock,
        optionIds,
        optionResults,
        strategyFunction,
        votingPowerVariable,
        volumeByVotingPower,
        myVotes,
        votingPowerValidation
    }

    for (let key in placeholder) {
        const searchRegExp = new RegExp(`&{${key}}`, 'gi')
        const replaceWith = placeholder[key];
        contract = contract.replace(searchRegExp, replaceWith);
    }

    return contract;
}

function getStringByLength(text, length) {
    // Make it single line string
    let finalText = text.replace(/\n/g, "");

    // Cut shot by string length
    finalText = finalText.slice(0, length);

    return finalText;
}

function getRawContract() {
    return `
    ;; ballot
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; Constants
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    (define-constant CONTRACT-OWNER tx-sender)
    ;; Errors
    (define-constant ERR-NOT-STARTED (err u1001))
    (define-constant ERR-ENDED (err u1002))
    (define-constant ERR-ALREADY-VOTED (err u1003))
    (define-constant ERR-FAILED-STRATEGY (err u1004))
    (define-constant ERR-NOT-VOTED (err u1005))
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; data maps and vars
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    (define-data-var title (string-utf8 512) u"")
    (define-data-var description (string-utf8 512) u"")
    (define-data-var voting-system (string-ascii 512) "")
    (define-data-var start uint u0)
    (define-data-var end uint u0)
    (define-map token-ids-map {token-id: uint} {user: principal, vote-id: uint})
    (define-map btc-holder-map {domain: (buff 20), namespace: (buff 48)} {user: principal, vote-id: uint})
    (define-map results {id: (string-ascii 36)} {count: uint, name: (string-utf8 256)} )
    (define-map users {id: principal} {id: uint, vote: (list &{noOfOptions} (string-ascii 36)), volume: (list &{noOfOptions} uint), voting-power: uint})
    (define-map register {id: uint} {user: principal, vote: (list &{noOfOptions} (string-ascii 36)), volume: (list &{noOfOptions} uint), voting-power: uint})
    (define-data-var total uint u0)
    (define-data-var total-votes uint u0)
    (define-data-var options (list &{noOfOptions} (string-ascii 36)) (list))
    (define-data-var temp-voting-power uint u0)
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; private functions
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    &{strategyFunction}
    
    (define-private (have-i-voted)
        (match (map-get? users {id: tx-sender})
            success true
            false
        )
    )
    
    (define-private (fold-boolean (left bool) (right bool))
        (and (is-eq left true) (is-eq right true))
    )

    (define-private (check-volume (each-volume uint))
        (> each-volume u0)
    )

    (define-private (validate-vote-volume (volume (list &{noOfOptions} uint)))
        (begin
            (fold fold-boolean (map check-volume volume) true)
        )
    )

    (define-private (get-volume-by-voting-power (volume uint))
        (var-get temp-voting-power)
    )

    (define-private (get-pow-value (volume uint))
        (pow volume u2)
    )
    
    (define-private (process-my-vote (option-id (string-ascii 36)) (volume uint))
        (match (map-get? results {id: option-id})
            result (let
                    (
                        (new-count-tuple {count: (+ volume (get count result))})
                    )

                    ;; Capture the vote
                    (map-set results {id: option-id} (merge result new-count-tuple))

                    ;; Return
                    true
                )
            false
        )
    )
    
    (define-private (get-single-result (option-id (string-ascii 36)))
        (let 
            (
                (volume (default-to u0 (get count (map-get? results {id: option-id}))))
            )
    
            ;; Return volume
            volume
        )
    )
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; public functions for all
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    (define-public (cast-my-vote (vote (list &{noOfOptions} (string-ascii 36))) (volume (list &{noOfOptions} uint))
        (bns (string-ascii 256)) (domain (buff 20)) (namespace (buff 48)) (token-ids (list 60000 uint))
        )
        (let
            (
                (vote-id (+ u1 (var-get total)))
                &{votingPowerVariable}
                &{volumeByVotingPower}
                &{myVotes}
            )
            ;; Validation
            (asserts! (and (> (len vote) u0) (is-eq (len vote) (len volume-by-voting-power)) (validate-vote-volume volume-by-voting-power)) ERR-NOT-VOTED)
            (asserts! (>= block-height (var-get start)) ERR-NOT-STARTED)
            (asserts! (<= block-height (var-get end)) ERR-ENDED)        
            (asserts! (not (have-i-voted)) ERR-ALREADY-VOTED)
            &{votingPowerValidation}
            
            ;; Business logic
            ;; Process my vote
            (map process-my-vote vote volume-by-voting-power)
            
            ;; Register for reference
            (map-set users {id: tx-sender} {id: vote-id, vote: vote, volume: volume-by-voting-power, voting-power: voting-power})
            (map-set register {id: vote-id} {user: tx-sender, vote: vote, volume: volume-by-voting-power, voting-power: voting-power})

            ;; Increase the total votes
            (var-set total-votes (+ my-votes (var-get total-votes)))

            ;; Increase the total
            (var-set total vote-id)
    
            ;; Return
            (ok true)
        )
    )
    
    (define-read-only (get-results)
        (begin
            (ok {
                    total: (var-get total), 
                    total-votes: (var-get total-votes), 
                    options: (var-get options), 
                    results: (map get-single-result (var-get options))
                })
        )
    )
    
    (define-read-only (get-result-at-position (position uint))
        (ok (map-get? register {id: position}))
    )
        
    (define-read-only (get-result-by-user (user principal))
        (ok (map-get? users {id: user}))
    )
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; Default assignments
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    (var-set title u"&{title}")
    (var-set description u"&{description}")
    (var-set voting-system "&{votingSystem}")
    (var-set options (list &{optionIds}))
    (var-set start u&{startAtBlock})
    (var-set end u&{endAtBlock})
    &{optionResults}
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; Supporting Ballot.gg
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    (stx-transfer? u5000000 tx-sender '${Constants.STACKS_MAINNET_FLAG ? Constants.MAINNET_DONATION_ADDRESS : Constants.TESTNET_DONATION_ADDRESS})`;
}

function getStrategyFunctionForBtcHolders() {
    return `
    (define-private (get-voting-power-by-bns-holder (domain (buff 20)) (namespace (buff 48)))
        (let
            (
                (bns-owner (get owner (unwrap-panic (contract-call? 'SP000000000000000000002Q6VF78.bns name-resolve domain namespace))))
            )

            (if (is-eq tx-sender bns-owner)
                (match (map-get? btc-holder-map {domain: domain, namespace: namespace})
                    result
                        u0
                    u1
                )
                u0
            )
        )
    )`;
}

function getStrategyFunctionForNFT(strategyContractName) {
    return `
    (define-private (validate-nft-ownership (token-id uint))
        (let
            (
                (vote-id (+ u1 (var-get total)))
                (nft-owner-optional (unwrap-panic (contract-call? '${strategyContractName} get-owner token-id)))
            )

            (match nft-owner-optional
                nft-owner 
                    (if (is-eq tx-sender nft-owner)
                        (match (map-get? token-ids-map {token-id: token-id})
                            result
                                u0
                            (if (map-set token-ids-map {token-id: token-id} {user: tx-sender, vote-id: vote-id})                        
                                u1
                                u0
                            )
                        )
                        u0
                    )
                u0
            )
        )
    )

    (define-private (get-voting-power-by-nft-holdings (token-ids (list 60000 uint)))
        (fold + (map validate-nft-ownership token-ids) u0)
    )`;
}

function getStrategyFunctionForStxHolders(snapshotBlockHeight) {
    if (snapshotBlockHeight > 0) {
        return `
        (define-private (get-voting-power-by-stx-holdings)
            (at-block (unwrap-panic (get-block-info? id-header-hash u${snapshotBlockHeight}))
                (let
                    (
                        (stx-balance (stx-get-balance tx-sender))
                    )
                    (if (> stx-balance u0)
                        (/ stx-balance u1000000)
                        stx-balance
                    )
                )
            )
        )`;
    }

    return `
    (define-private (get-voting-power-by-stx-holdings)
        (let
            (
                (stx-balance (stx-get-balance tx-sender))
            )
            (if (> stx-balance u0)
                (/ stx-balance u1000000)
                stx-balance
            )
        )    
    )`;
}

function getStrategyFunctionForFT(strategyContractName, snapshotBlockHeight) {
    if (snapshotBlockHeight > 0) {
        return `
        (define-private (get-voting-power-by-ft-holdings)
            (at-block (unwrap-panic (get-block-info? id-header-hash u${snapshotBlockHeight}))
                (let
                    (
                        (ft-balance (unwrap-panic (contract-call? '${strategyContractName} get-balance tx-sender)))
                        (ft-decimals (unwrap-panic (contract-call? '${strategyContractName} get-decimals)))
                    )

                    (if (> ft-balance u0)
                        (if (> ft-decimals u0)
                            (/ ft-balance (pow u10 ft-decimals))
                            ft-balance
                        )
                        ft-balance
                    )
                )
            )
        )`;
    }

    return `
    (define-private (get-voting-power-by-ft-holdings)
        (let
            (
                (ft-balance (unwrap-panic (contract-call? '${strategyContractName} get-balance tx-sender)))
                (ft-decimals (unwrap-panic (contract-call? '${strategyContractName} get-decimals)))
            )

            (if (> ft-balance u0)
                (if (> ft-decimals u0)
                    (/ ft-balance (pow u10 ft-decimals))
                    ft-balance
                )
                ft-balance
            )
        )
    )`;
}

export async function castMyVoteContractCall(contractAddress, contractName, voteObj, dns, tokenIdsArray, callbackFunction) {
    // Parse vote
    let voteStringAsciiArray = [], volumeUIntArray = [];
    for (let key in voteObj) {
        voteStringAsciiArray.push(stringAsciiCV(key));
        volumeUIntArray.push(uintCV(voteObj[key]));
    }

    let tokenIdsUintArray = [];
    for (let tokenId of tokenIdsArray) {
        tokenIdsUintArray.push(uintCV(tokenId));
    }

    // Parse dns
    let domain, namespace;
    if (dns && dns.split(".").length > 1) {
        // Parse dns
        let splittedDns = dns.split(".");
        domain = splittedDns.pop();
        namespace = splittedDns.join(".");
    }

    const functionArgs = [
        listCV(voteStringAsciiArray),
        listCV(volumeUIntArray),
        stringAsciiCV(dns ? dns : ""),
        bufferCV(Buffer.from(domain ? domain : "")),
        bufferCV(Buffer.from(namespace ? namespace : "")),
        listCV(tokenIdsUintArray)
    ];

    // Contract function details to be called
    const options = {
        contractAddress: contractAddress,
        contractName: contractName,
        functionName: "cast-my-vote",
        functionArgs: functionArgs,
        postConditions: [],
        network: getNetworkType(),
        appDetails: {
            name: "Ballot",
            icon: window.location.origin + "/images/logo/ballot.png",
        },
        onFinish: callbackFunction,
        onCancel: cancelCallbackFunction
    };

    // Call contract function
    await openContractCall(options);
}