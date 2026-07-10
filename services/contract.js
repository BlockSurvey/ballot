// @stacks/connect v8 `request()` — the SIP-030 wallet protocol used for both
// auth (see services/auth.js) and transaction signing. Single package now.
import { connect, disconnect, isConnected, request } from "@stacks/connect";
import { bufferCV, cvToHex, listCV, stringAsciiCV, uintCV } from "@stacks/transactions";
import { Constants } from "../common/constants";
import { getNetworkString } from "../services/auth";

const cancelCallbackFunction = (data) => {
    window.location.reload();
}

// The wallet connection is normally established at login (services/auth.js).
// If it's missing here (e.g. a session that predates that flow), connect once
// (cached in localStorage → subsequent calls are silent), and transparently
// reconnect + retry once if the cached wallet has gone stale (another extension
// took the provider → "Wallet no longer available").
const WALLET_STALE_RE = /no longer available|reconnect|not connected|no wallet|wallet.*unavailable/i;

export async function walletRequest(method, params) {
    // Auth (v7) and transaction signing (v8) keep SEPARATE connection state. v8's
    // grant persists across v7 account switches, which is why a stale account
    // could sign ("signed in as wallet 2 but the popup shows wallet 1"). The fix
    // lives in auth.js: switching account / signing out clears the v8 grant, so
    // the next request re-connects to the now-current account exactly once.
    //
    // We intentionally do NOT compare the v7 auth address to v8's stored address
    // to decide whether to reconnect: the same account is encoded differently per
    // network (testnet ST… vs mainnet SP…), so a raw comparison always "mismatches"
    // and would re-prompt the wallet selector on every single deploy/vote.
    if (!isConnected()) {
        await connect(); // one-time wallet selection; caches the choice
    }

    try {
        return await request(method, params);
    } catch (error) {
        if (WALLET_STALE_RE.test(error?.message || "")) {
            // Cached wallet is stale (e.g. another extension took the provider).
            // Force a fresh selection and retry the request once.
            try { disconnect(); } catch (_) { /* ignore */ }
            await connect();
            return await request(method, params);
        }
        throw error;
    }
}

export async function deployContract(pollObject, contractName, callbackFunction) {
    const contract = getContract(pollObject);

    try {
        // @stacks/connect v8: the legacy `openContractDeploy` protocol was dropped
        // by current wallets (Leather/Xverse). Use the SIP-030 `request()` API.
        const response = await walletRequest("stx_deployContract", {
            name: contractName,
            clarityCode: contract,
            network: getNetworkString(), // "mainnet" | "testnet"
        });

        // v8 resolves with { txid }; keep the { txId } shape the callbacks expect.
        callbackFunction?.({ txId: response?.txid });
    } catch (error) {
        // Thrown when the user rejects/closes the wallet or the request fails.
        console.error("Contract deploy failed or was cancelled:", error);
        cancelCallbackFunction(error);
    }
}

function getContract(pollObject) {
    let contract = getRawContract();

    let optionIds;
    let optionResults;
    pollObject?.options?.forEach(option => {
        if (!optionIds) {
            optionIds = `"${option?.id}"`
            optionResults = `(map-set results {id: "${option?.id}"} {count: u0, name: u"${getStringByLength(encodeURIComponent(option?.value), 512)}", locked-stx: u0, unlocked-stx: u0})`
        } else {
            optionIds = optionIds + ` "${option?.id}"`;
            optionResults = optionResults + ` (map-set results {id: "${option?.id}"} {count: u0, name: u"${getStringByLength(encodeURIComponent(option?.value), 512)}", locked-stx: u0, unlocked-stx: u0})`
        }
    });


    let strategyFunction = "";
    let votingPowerVariable = "";
    let volumeByVotingPower = "";
    let myVotes = "";
    let votingPowerValidation = "";
    let stxBalanceWithLockedAndUnlockedFunction = "";
    let stxBalanceWithLockedAndUnlockedLetVariable = "";
    let registerStxWithLockedAndUnlockedFunction = "";
    let registerStxWithLockedAndUnlockedWithUserFunction = ", locked-stx: u0, unlocked-stx: u0";
    // Off-chain snapshot (oracle-signed weight) extras — empty unless a snapshot is used
    let snapshotConstants = "";
    let snapshotVoteArgs = "";

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
            // Fungible tokens (STX or other FT)
            const snapshotHeight = parseInt(pollObject?.snapshotBlockHeight) || 0;
            // Use the off-chain signed-snapshot strategy when a snapshot block is set
            // AND a signer public key is configured. Otherwise fall back to current balance.
            const useSnapshotOracle = snapshotHeight > 0 && Constants.SNAPSHOT_SIGNER_PUBKEY;

            if (useSnapshotOracle) {
                // Voting power = locked + unlocked balance at the snapshot block,
                // computed off-chain and signed by Ballot's signer, verified on-chain
                // (post at-block removal). Locked/unlocked are stored per option so the
                // results UI can show the breakdown.
                strategyFunction = getSnapshotOracleStrategyFunction();
                votingPowerVariable = `(voting-power (get-voting-power-by-snapshot snapshot-locked snapshot-unlocked snapshot-sig))`;
                snapshotVoteArgs = ` (snapshot-locked uint) (snapshot-unlocked uint) (snapshot-sig (buff 65))`;
                snapshotConstants = `
    ;; Off-chain snapshot: signer public key + this poll's id (replay binding)
    (define-constant SNAPSHOT-SIGNER 0x${Constants.SNAPSHOT_SIGNER_PUBKEY})
    (define-constant POLL-ID 0x${Buffer.from(String(pollObject?.id || "")).toString("hex")})
    (define-data-var temp-locked-stx uint u0)
    (define-data-var temp-unlocked-stx uint u0)`;
                // Per-option locked/unlocked accumulation (reuses the locked/unlocked slots)
                stxBalanceWithLockedAndUnlockedFunction = `
    (define-private (register-snapshot-locked-unlocked (option-id (string-ascii 36)) (volume uint))
        (match (map-get? results {id: option-id})
            result (begin
                (if (> volume u0)
                    (map-set results {id: option-id} (merge result {
                        locked-stx: (+ (var-get temp-locked-stx) (get locked-stx result)),
                        unlocked-stx: (+ (var-get temp-unlocked-stx) (get unlocked-stx result))
                    }))
                    true
                )
                true
            )
            true
        )
    )`;
                stxBalanceWithLockedAndUnlockedLetVariable = `(stash-locked (var-set temp-locked-stx snapshot-locked))
                (stash-unlocked (var-set temp-unlocked-stx snapshot-unlocked))`;
                registerStxWithLockedAndUnlockedFunction = `
            ;; Register the snapshot locked/unlocked per voted option
            (map register-snapshot-locked-unlocked vote volume-by-voting-power)`;
                registerStxWithLockedAndUnlockedWithUserFunction = `, locked-stx: snapshot-locked, unlocked-stx: snapshot-unlocked`;
            } else if (pollObject?.votingStrategyTemplate == "stx") {
                strategyFunction = getStrategyFunctionForStxHolders(snapshotHeight);
                votingPowerVariable = `(voting-power (get-voting-power-by-stx-holdings))`;
            } else if (pollObject?.strategyContractName) {
                strategyFunction = getStrategyFunctionForFT(pollObject?.strategyContractName, snapshotHeight);
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
        "snapshotBlockHeight": pollObject?.snapshotBlockHeight || 0,
        optionIds,
        optionResults,
        strategyFunction,
        votingPowerVariable,
        volumeByVotingPower,
        myVotes,
        votingPowerValidation,
        stxBalanceWithLockedAndUnlockedFunction,
        stxBalanceWithLockedAndUnlockedLetVariable,
        registerStxWithLockedAndUnlockedFunction,
        registerStxWithLockedAndUnlockedWithUserFunction,
        snapshotConstants,
        snapshotVoteArgs
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
    (define-constant ERR-NOT-OWNER (err u1006))
    (define-constant ERR-INVALID-RANGE (err u1007))
    &{snapshotConstants}

    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; data maps and vars
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    (define-data-var title (string-utf8 512) u"")
    (define-data-var description (string-utf8 512) u"")
    (define-data-var voting-system (string-ascii 512) "")
    (define-data-var start uint u0)
    (define-data-var end uint u0)
    (define-data-var snapshot uint u0)
    (define-map token-ids-map {token-id: uint} {user: principal, vote-id: uint})
    (define-map btc-holder-map {domain: (buff 20), namespace: (buff 48)} {user: principal, vote-id: uint})
    (define-map results {id: (string-ascii 36)} {count: uint, name: (string-utf8 256), locked-stx: uint, unlocked-stx: uint} )
    (define-map users {id: principal} {id: uint, vote: (list &{noOfOptions} (string-ascii 36)), volume: (list &{noOfOptions} uint), voting-power: uint, locked-stx: uint, unlocked-stx: uint})
    (define-map register {id: uint} {user: principal, vote: (list &{noOfOptions} (string-ascii 36)), volume: (list &{noOfOptions} uint), voting-power: uint, locked-stx: uint, unlocked-stx: uint})
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

    (define-private (get-single-result-with-locked-and-unlocked-stx (option-id (string-ascii 36)))
        (let 
            (
                (locked-stx (default-to u0 (get locked-stx (map-get? results {id: option-id}))))
                (unlocked-stx (default-to u0 (get unlocked-stx (map-get? results {id: option-id}))))
            )

            ;; Return locked-stx and unlocked-stx
            {locked-stx: locked-stx, unlocked-stx: unlocked-stx}
        )
    )

    &{stxBalanceWithLockedAndUnlockedFunction}
    
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    ;; public functions for all
    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    (define-public (cast-my-vote (vote (list &{noOfOptions} (string-ascii 36))) (volume (list &{noOfOptions} uint))
        (bns (string-ascii 256)) (domain (buff 20)) (namespace (buff 48)) (token-ids (list 60000 uint))&{snapshotVoteArgs}
        )
        (let
            (
                (vote-id (+ u1 (var-get total)))
                &{votingPowerVariable}
                &{volumeByVotingPower}
                &{myVotes}

                ;; Get the stx balance with locked and unlocked
                &{stxBalanceWithLockedAndUnlockedLetVariable}
            )
            ;; Validation
            (asserts! (and (> (len vote) u0) (is-eq (len vote) (len volume-by-voting-power)) (validate-vote-volume volume-by-voting-power)) ERR-NOT-VOTED)
            (asserts! (>= burn-block-height (var-get start)) ERR-NOT-STARTED)
            (asserts! (<= burn-block-height (var-get end)) ERR-ENDED)        
            (asserts! (not (have-i-voted)) ERR-ALREADY-VOTED)
            &{votingPowerValidation}
            
            ;; Business logic
            ;; Process my vote
            (map process-my-vote vote volume-by-voting-power)

            &{registerStxWithLockedAndUnlockedFunction}
            
            ;; Register for reference
            (map-set users {id: tx-sender} {id: vote-id, vote: vote, volume: volume-by-voting-power, voting-power: voting-power &{registerStxWithLockedAndUnlockedWithUserFunction}})
            (map-set register {id: vote-id} {user: tx-sender, vote: vote, volume: volume-by-voting-power, voting-power: voting-power &{registerStxWithLockedAndUnlockedWithUserFunction}})

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
                    results: (map get-single-result (var-get options)),
                    results-with-locked-and-unlocked-stx: (map get-single-result-with-locked-and-unlocked-stx (var-get options))
                })
        )
    )
    
    (define-read-only (get-result-at-position (position uint))
        (ok (map-get? register {id: position}))
    )
        
    (define-read-only (get-result-by-user (user principal))
        (ok (map-get? users {id: user}))
    )

    (define-read-only (get-config)
        (ok {
            start: (var-get start),
            end: (var-get end),
            snapshot: (var-get snapshot),
            owner: CONTRACT-OWNER
        })
    )

    ;; Owner-only: update the voting window (start/end) and the token-gating
    ;; snapshot height. Can only be done by the deployer, before the poll ends,
    ;; and the window must be valid (end after start).
    (define-public (update-config (new-start uint) (new-end uint) (new-snapshot uint))
        (begin
            (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
            (asserts! (<= burn-block-height (var-get end)) ERR-ENDED)
            (asserts! (> new-end new-start) ERR-INVALID-RANGE)
            (var-set start new-start)
            (var-set end new-end)
            (var-set snapshot new-snapshot)
            (ok {start: new-start, end: new-end, snapshot: new-snapshot})
        )
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
    (var-set snapshot u&{snapshotBlockHeight})
    &{optionResults}`;
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
    // NOTE: `at-block` was removed in Epoch 3.4 / Clarity 5 (SIP-042), so
    // historical balance snapshots can no longer be read on-chain. Token gating
    // now uses the voter's CURRENT balance at the time they cast their vote.
    return `
    (define-private (get-voting-power-by-stx-holdings)
        (let
            (
                (acct (stx-account tx-sender))
                (locked (get locked acct))
                (unlocked (get unlocked acct))
                (stx-balance (+ (get unlocked acct) (get locked acct)))
            )
            (if (> stx-balance u0)
                (/ stx-balance u1000000)
                stx-balance
            )
        )
    )`;
}

function getStrategyFunctionForFT(strategyContractName, snapshotBlockHeight) {
    // `at-block` removed in Epoch 3.4 / Clarity 5 (SIP-042) — use the voter's
    // CURRENT token balance at vote time instead of a historical snapshot.
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

function getSnapshotOracleStrategyFunction() {
    // The voter's snapshot-block locked/unlocked balance is computed off-chain and
    // signed by Ballot's snapshot signer. We verify that signature here, binding it
    // to this poll (POLL-ID) and this voter (tx-sender) so it can't be forged or
    // replayed. Voting power = locked + unlocked. Replaces at-block historical reads
    // (removed in Epoch 3.4 / SIP-042).
    return `
    (define-private (get-voting-power-by-snapshot (claimed-locked uint) (claimed-unlocked uint) (sig (buff 65)))
        (if (secp256k1-verify
                (sha256 (unwrap-panic (to-consensus-buff? {locked: claimed-locked, poll: POLL-ID, unlocked: claimed-unlocked, voter: tx-sender})))
                sig
                SNAPSHOT-SIGNER)
            (+ claimed-locked claimed-unlocked)
            u0
        )
    )`;
}

function getStxBalanceWithLockedAndUnlockedFunction(snapshotBlockHeight) {
    if (snapshotBlockHeight > 0) {
        return `
        (define-private (get-stx-balance-with-locked-and-unlocked)
            (let
                (
                    (account (stx-account tx-sender))
                    (locked-stx (get locked account))
                    (unlocked-stx (get unlocked account))
                    (total-stx (+ locked-stx unlocked-stx))
                )

                ;; Return the current stx balance with locked and unlocked
                {
                    locked-stx: (if (> locked-stx u0) (/ locked-stx u1000000) locked-stx),
                    unlocked-stx: (if (> unlocked-stx u0) (/ unlocked-stx u1000000) unlocked-stx),
                    total-stx: (if (> total-stx u0) (/ total-stx u1000000) total-stx)
                }
            )
        )
    
        (define-private (register-stx-with-locked-and-unlocked (option-id (string-ascii 36)) (volume uint))
            (match (map-get? results {id: option-id})
                result (let
                        (
                            (stx-balance-with-locked-and-unlocked (get-stx-balance-with-locked-and-unlocked))
                            (new-count-tuple {
                                locked-stx: (+ (get locked-stx stx-balance-with-locked-and-unlocked) (get locked-stx result)), 
                                unlocked-stx: (+ (get unlocked-stx stx-balance-with-locked-and-unlocked) (get unlocked-stx result))
                            })
                        )
    
                        ;; If the volume is greater than zero, then register the stx
                        (if (> volume u0)
                            (map-set results {id: option-id} (merge result new-count-tuple))
                            true
                        )
    
                        ;; Return
                        true
                    )
                true
            )
        )`;
    }
}

function getStxBalanceWithLockedAndUnlockedLetVariable(snapshotBlockHeight) {
    if (snapshotBlockHeight > 0) {
        return `(stx-balance-with-locked-and-unlocked (get-stx-balance-with-locked-and-unlocked))`;
    }
}

function getRegisterStxWithLockedAndUnlockedFunction(snapshotBlockHeight) {
    if (snapshotBlockHeight > 0) {
        return `
        ;; Register stx with locked and unlocked
        (map register-stx-with-locked-and-unlocked vote volume-by-voting-power)`;
    }
}

function getRegisterStxWithLockedAndUnlockedWithUserFunction(snapshotBlockHeight) {
    if (snapshotBlockHeight > 0) {
        return `, locked-stx: (get locked-stx stx-balance-with-locked-and-unlocked), unlocked-stx: (get unlocked-stx stx-balance-with-locked-and-unlocked)`;
    }

    return `, locked-stx: u0, unlocked-stx: u0`;
}

export async function castMyVoteContractCall(contractAddress, contractName, voteObj, dns, tokenIdsArray, callbackFunction, snapshot) {
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

    // Snapshot polls take extra signed args. The shape MUST match the deployed
    // contract or the wallet crashes on the arg-count mismatch, so we follow the
    // scheme the server derived from the on-chain ABI:
    //   "power" (legacy): snapshot-power + signature        → 2 extra args
    //   "split" (current): snapshot-locked + -unlocked + sig → 3 extra args
    if (snapshot?.signature) {
        if (snapshot.scheme === "power") {
            functionArgs.push(uintCV(snapshot.power));
            functionArgs.push(bufferCV(Buffer.from(snapshot.signature, "hex")));
        } else {
            functionArgs.push(uintCV(snapshot.locked));
            functionArgs.push(uintCV(snapshot.unlocked));
            functionArgs.push(bufferCV(Buffer.from(snapshot.signature, "hex")));
        }
    }

    try {
        // @stacks/connect v8 `request()` replaces the legacy `openContractCall`.
        const response = await walletRequest("stx_callContract", {
            contract: `${contractAddress}.${contractName}`,
            functionName: "cast-my-vote",
            // Pass hex-serialized args, not CV objects: connect-v8's internal
            // v6->v7 ClarityValue conversion breaks across webpack module
            // instances ("Unable to serialize. Invalid Clarity Value."). The
            // hex wire format is version-stable and deserialized by the wallet.
            functionArgs: functionArgs.map(cvToHex),
            network: getNetworkString(),
        });

        callbackFunction?.({ txId: response?.txid });
    } catch (error) {
        // Surface the real error to the caller (ModernVotingInterface shows a
        // message) instead of silently reloading the page, which hid failures.
        console.error("cast-my-vote request failed:", error);
        throw error;
    }
}

/**
 * Owner-only update of the on-chain voting window (start/end) and the
 * token-gating snapshot height. Calls the deployed poll contract's
 * `update-config` function; only the contract deployer can succeed.
 */
export async function updatePollConfigContractCall(contractAddress, contractName, newStart, newEnd, newSnapshot, callbackFunction, onCancelFunction) {
    const functionArgs = [
        uintCV(parseInt(newStart) || 0),
        uintCV(parseInt(newEnd) || 0),
        uintCV(parseInt(newSnapshot) || 0)
    ];

    try {
        const response = await walletRequest("stx_callContract", {
            contract: `${contractAddress}.${contractName}`,
            functionName: "update-config",
            functionArgs: functionArgs.map(cvToHex), // hex wire format (see cast-my-vote note)
            network: getNetworkString(),
        });

        callbackFunction?.({ txId: response?.txid });
    } catch (error) {
        console.error("update-config request failed:", error);
        if (onCancelFunction) {
            onCancelFunction(error);
        } else {
            throw error;
        }
    }
}