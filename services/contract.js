import { openContractCall, openContractDeploy } from "@stacks/connect";
import { AnchorMode, bufferCV, listCV, stringAsciiCV, uintCV } from "@stacks/transactions";
import { getNetworkType } from "../services/auth";

export async function deployContract(pollObject, contractName, callbackFunction, cancelCallbackFunction) {
    const contract = getContract(pollObject);

    // Transaction options
    const txOptions = {
        contractName: contractName,
        codeBody: contract,
        network: getNetworkType(),
        anchorMode: AnchorMode.Any,
        appDetails: {
            name: "Ballot",
            icon: window.location.origin + "/images/logo/ballot.png"
        },
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
            optionResults = `(map-set results {id: "${option?.id}"} {count: u0, name: u"${getStringByLength(option?.value, 512)}"})`
        } else {
            optionIds = optionIds + ` "${option?.id}"`;
            optionResults = optionResults + ` (map-set results {id: "${option?.id}"} {count: u0, name: u"${getStringByLength(option?.value, 512)}"})`
        }
    });

    // Strategy
    let strategyContractFunction = "";
    let validateStrategy = "";
    if (pollObject?.strategyContractName) {
        strategyContractFunction = getStrategyContractFunction(pollObject?.strategyContractName);
        validateStrategy = `(asserts! (validate-strategy token-id) ERR-FAILED-STRATEGY)`;
    }

    // .btc dns holder validation
    let btcDnsHolderContractFunction = "";
    let validateBtcDnsHolder = "";
    if (pollObject?.votingStrategyTemplate == "btcholders") {
        strategyContractFunction = getBtcDnsHolderContractFunction();
        validateStrategy = `(asserts! (am-i-btc-dns-holder domain namespace) ERR-NOT-HOLDING-BTC-DNS)`;
    }

    const placeholder = {
        "noOfOptions": pollObject?.options?.length,
        "title": getStringByLength(pollObject?.title, 512),
        "description": getStringByLength(pollObject?.description, 512),
        "votingSystem": pollObject?.votingSystem,
        "startAtBlock": pollObject?.startAtBlock,
        "endAtBlock": pollObject?.endAtBlock,
        "optionIds": optionIds,
        "optionResults": optionResults,
        "strategyContractFunction": strategyContractFunction,
        "validateStrategy": validateStrategy,
        "btcDnsHolderContractFunction": btcDnsHolderContractFunction,
        "validateBtcDnsHolder": validateBtcDnsHolder

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
    return `;; ballot

    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; Constants
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    (define-constant CONTRACT-OWNER tx-sender)
    ;; Errors
    (define-constant ERR-NOT-OWNER (err u1403))
    (define-constant ERR-NOT-STARTED (err u1001))
    (define-constant ERR-ENDED (err u1002))
    (define-constant ERR-ALREADY-VOTED (err u1003))
    (define-constant ERR-INVALID-VOTING-SYSTEM (err u1004))
    (define-constant ERR-NOT-HOLDING-BTC-DNS (err u1005))
    (define-constant ERR-FAILED-STRATEGY (err u1006))
    (define-constant ERR-NOT-VOTED (err u1007))
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; data maps and vars
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    (define-data-var title (string-utf8 512) u"")
    (define-data-var description (string-utf8 512) u"")
    (define-data-var voting-system (string-ascii 10) "")
    (define-data-var start uint u0)
    (define-data-var end uint u0)
    (define-data-var should-be-a-bns-holder bool false)
    (define-map results {id: (string-ascii 36)} {count: uint, name: (string-utf8 512)} )
    (define-map users {id: principal} {count: uint, vote: (list &{noOfOptions} (string-ascii 36)), volume: (list &{noOfOptions} uint)})
    (define-map register {id: uint} {user: principal, bns: (string-ascii 256), vote: (list &{noOfOptions} (string-ascii 36)), volume: (list &{noOfOptions} uint)})
    (define-data-var total uint u0)
    (define-data-var options (list &{noOfOptions} (string-ascii 36)) (list))
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; private functions
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    &{btcDnsHolderContractFunction}
    
    (define-private (have-i-voted)
        (match (map-get? users {id: tx-sender})
            success true
            false
        )
    )
    
    (define-private (voting-system-validation (length uint))
        (if (is-eq (var-get voting-system) "single")
            (if (is-eq length u1)
                true
                false
            )
            true
        )
    )
    
    &{strategyContractFunction}
    
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
            (begin
                (map-set results {id: option-id} {count: u1, name: u""})
    
                ;; Return
                true
            )
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
        (bns (string-ascii 256)) (domain (buff 20)) (namespace (buff 48)) (token-id uint)
        )
        (let
            (
                (next-total (+ u1 (var-get total)))
            )
            ;; Validation
            (asserts! (and (> (len vote) u0) (is-eq (len vote) (len volume)) (validate-vote-volume volume)) ERR-NOT-VOTED)        
            (asserts! (voting-system-validation (len vote)) ERR-INVALID-VOTING-SYSTEM)
            (asserts! (>= block-height (var-get start)) ERR-NOT-STARTED)
            (asserts! (<= block-height (var-get end)) ERR-ENDED)
            (asserts! (not (have-i-voted)) ERR-ALREADY-VOTED)
            &{validateStrategy}
            &{validateBtcDnsHolder}
    
            ;; Register the vote
            (map process-my-vote vote volume)
            (map-set users {id: tx-sender} {count: u1, vote: vote, volume: volume})
            (map-set register {id: next-total} {user: tx-sender, bns: bns, vote: vote, volume: volume})
    
            ;; Increase the total
            (var-set total next-total)
    
            ;; Return
            (ok true)
        )
    )
    
    (define-read-only (get-results)
        (begin
            (ok {total: (var-get total),options: (var-get options), results: (map get-single-result (var-get options))})
        )
    )
    
    (define-read-only (get-result-at-position (position uint))
        (ok (map-get? register {id: position}))
    )
    
    (define-read-only (get-result-by-user (user principal))
        (ok (map-get? users {id: user}))
    )
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; public functions for contract owner
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; Default assignments
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    (var-set title u"&{title}")
    (var-set description u"&{description}")
    (var-set voting-system "&{votingSystem}")
    (var-set options (list &{optionIds}))
    (var-set start u&{startAtBlock})
    (var-set end u&{endAtBlock})
    &{optionResults}`;
}

function getStrategyContractFunction(strategyContractName) {
    return `(define-private (validate-strategy (token-id uint))
    (let
        (
            (nft-owner-optional (unwrap-panic (contract-call? '${strategyContractName} get-owner token-id)))
        )

        (match nft-owner-optional
            nft-owner 
                (if (is-eq tx-sender nft-owner)
                    true
                    false
                )
            false
        )
    )
)`;
}

function getBtcDnsHolderContractFunction() {
    return `(define-private (am-i-btc-dns-holder (domain (buff 20)) (namespace (buff 48)))
    (let 
        (
            (dns-owner (get owner (unwrap-panic (contract-call? 'SP000000000000000000002Q6VF78.bns name-resolve domain namespace))))
        )

        (if (and (is-eq domain 0x627463) (is-eq tx-sender dns-owner))
            true
            false
        )
    )
)`;
}

export async function castMyVoteContractCall(contractAddress, contractName, voteObj, dns, tokenId, callbackFunction) {
    // Parse vote
    let voteStringAsciiArr = [], volumeUIntArr = [];
    for (let key in voteObj) {
        voteStringAsciiArr.push(stringAsciiCV(key));
        volumeUIntArr.push(uintCV(voteObj[key]));
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
        listCV(voteStringAsciiArr),
        listCV(volumeUIntArr),
        stringAsciiCV(dns ? dns : ""),
        bufferCV(Buffer.from(domain ? domain : "")),
        bufferCV(Buffer.from(namespace ? namespace : "")),
        uintCV(tokenId ? tokenId : 0)
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
    };

    // Call contract function
    await openContractCall(options);
}