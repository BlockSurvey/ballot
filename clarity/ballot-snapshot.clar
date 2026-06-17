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

;; Off-chain snapshot: signer public key + this poll's id (replay binding)
(define-constant SNAPSHOT-SIGNER 0x03ef755a1edfb2de102b7b1e6bfd68f479a88528b52c6f36df22c835e84d356ca5)
(define-constant POLL-ID 0x33323264326137372d636630342d346234322d386230332d613134636165653666353866)

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
(define-map users {id: principal} {id: uint, vote: (list 2 (string-ascii 36)), volume: (list 2 uint), voting-power: uint, locked-stx: uint, unlocked-stx: uint})
(define-map register {id: uint} {user: principal, vote: (list 2 (string-ascii 36)), volume: (list 2 uint), voting-power: uint, locked-stx: uint, unlocked-stx: uint})
(define-data-var total uint u0)
(define-data-var total-votes uint u0)
(define-data-var options (list 2 (string-ascii 36)) (list))
(define-data-var temp-voting-power uint u0)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; private functions
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define-private (get-voting-power-by-snapshot (claimed-power uint) (sig (buff 65)))
    (if (secp256k1-verify
            (sha256 (unwrap-panic (to-consensus-buff? {poll: POLL-ID, power: claimed-power, voter: tx-sender})))
            sig
            SNAPSHOT-SIGNER)
        claimed-power
        u0
    )
)

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

(define-private (validate-vote-volume (volume (list 2 uint)))
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



;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; public functions for all
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
(define-public (cast-my-vote (vote (list 2 (string-ascii 36))) (volume (list 2 uint))
    (bns (string-ascii 256)) (domain (buff 20)) (namespace (buff 48)) (token-ids (list 60000 uint)) (snapshot-power uint) (snapshot-sig (buff 65))
    )
    (let
        (
            (vote-id (+ u1 (var-get total)))
            (voting-power (get-voting-power-by-snapshot snapshot-power snapshot-sig))
            
            ;; FPTP and Block voting
            (temp (var-set temp-voting-power voting-power))
            (volume-by-voting-power (map get-volume-by-voting-power volume))
        
            
            ;; FPTP and Block voting - Number of votes
            (my-votes voting-power)

            ;; Get the stx balance with locked and unlocked
            
        )
        ;; Validation
        (asserts! (and (> (len vote) u0) (is-eq (len vote) (len volume-by-voting-power)) (validate-vote-volume volume-by-voting-power)) ERR-NOT-VOTED)
        (asserts! (>= burn-block-height (var-get start)) ERR-NOT-STARTED)
        (asserts! (<= burn-block-height (var-get end)) ERR-ENDED)        
        (asserts! (not (have-i-voted)) ERR-ALREADY-VOTED)
        
            ;; FPTP and Block voting
            (asserts! (> voting-power u0) ERR-FAILED-STRATEGY)
        
        ;; Business logic
        ;; Process my vote
        (map process-my-vote vote volume-by-voting-power)

        
        
        ;; Register for reference
        (map-set users {id: tx-sender} {id: vote-id, vote: vote, volume: volume-by-voting-power, voting-power: voting-power , locked-stx: u0, unlocked-stx: u0})
        (map-set register {id: vote-id} {user: tx-sender, vote: vote, volume: volume-by-voting-power, voting-power: voting-power , locked-stx: u0, unlocked-stx: u0})

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
(var-set title u"SnapShot%20Height")
(var-set description u"")
(var-set voting-system "fptp")
(var-set options (list "2228569a-0a5e-4d03-94df-a94e8f02ea6a" "0e7f7b3d-4739-45f8-b10a-f853014ad107"))
(var-set start u184979)
(var-set end u194979)
(var-set snapshot u4005769)
(map-set results {id: "2228569a-0a5e-4d03-94df-a94e8f02ea6a"} {count: u0, name: u"Choice%201", locked-stx: u0, unlocked-stx: u0}) (map-set results {id: "0e7f7b3d-4739-45f8-b10a-f853014ad107"} {count: u0, name: u"Choice%202", locked-stx: u0, unlocked-stx: u0})