import axios from 'axios'
import fs from 'fs'

// ─── Poll Configuration ───────────────────────────────────────────────────────
const POLL_TITLE = 'SIP-039 (Clarity 5) + Rider SIP-040 and SIP-042'

const CONTRACT_ADDRESS = 'SP2NK4JSD4FC36P88E217XMKRCK74F1FH69MEASFA'
const CONTRACT_NAME = 'ballot-sip-039-clarity--3OJkh'
const CONTRACT_ID = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`

const SNAPSHOT_BLOCK = 7089277
const START_BLOCK = 940145
const END_BLOCK = 941639

// Options
const YES_OPTION_ID = 'e3b07637-296e-442a-9a2b-b1ce4ab6643a'
const NO_OPTION_ID = 'f8591b9c-4b12-4bef-96f0-327c1f46b535'

// STX Dust Voting Addresses
const STX_YES_ADDR = 'SP00000000001WPAWSDEDMQ0B9K76XTZ79N'
const STX_NO_ADDR = 'SP000000000006WVSDEDMQ0B9K76JZVAKY'

// BTC Dust Voting Addresses
const BTC_YES_ADDR = '11111111111mdWK2VXcrA1eceSntcp'
const BTC_NO_ADDR = '111111111111ACW5wa4RwyepZ84byy'

// PoX Cycles for BTC voting
const POX_CYCLES = [129, 130]

// ─── API Configuration ────────────────────────────────────────────────────────
const BASE_URL = 'https://api.hiro.so'
const MEMPOOL_API = 'https://mempool.space/api'

const PAGE_LIMIT = 50
const RETRY_LIMIT = 18
const RETRY_DELAY_MS = 10_000
const BALANCE_BATCH_SIZE = 5

const sleep = ms => new Promise(res => setTimeout(res, ms))

const fetchWithRetry = async (url, retries = RETRY_LIMIT) => {
  try {
    const { data } = await axios.get(url, { headers: { 'Accept': 'application/json' } })
    return data
  } catch (err) {
    if (retries > 0) {
      const status = err?.response?.status
      console.log(`  Retrying (${retries} left) after ${status || 'network error'}: ${url.slice(0, 80)}...`)
      await sleep(RETRY_DELAY_MS)
      return fetchWithRetry(url, retries - 1)
    }
    throw err
  }
}

// ─── 1. Contract Voting (Direct Ballot Contract) ─────────────────────────────

const getContractVotes = async () => {
  console.log('=== 1. Fetching Contract Votes (Direct Ballot) ===')

  let allTransactions = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const url = `${BASE_URL}/extended/v1/address/${CONTRACT_ID}/transactions?limit=${PAGE_LIMIT}&offset=${offset}`
    const { results, total } = await fetchWithRetry(url)
    allTransactions = [...allTransactions, ...results]
    hasMore = results.length === PAGE_LIMIT && allTransactions.length < total
    offset += PAGE_LIMIT
    console.log(`  Fetched ${allTransactions.length}/${total} contract transactions`)
    if (offset > 10000) break
  }

  // Filter for cast-my-vote calls (both success AND failed)
  const voteTransactions = allTransactions.filter(tx =>
    tx.tx_type === 'contract_call' &&
    tx.contract_call?.function_name === 'cast-my-vote'
  )

  console.log(`  Found ${voteTransactions.length} vote transactions (success + failed)`)

  // Parse vote data
  const votes = []
  for (const tx of voteTransactions) {
    const voteArg = tx.contract_call?.function_args?.find(a => a.name === 'vote')
    const volumeArg = tx.contract_call?.function_args?.find(a => a.name === 'volume')

    let voteOptions = []
    let voteVolumes = []

    // Parse vote options from repr
    if (voteArg?.repr) {
      voteOptions = parseReprStringList(voteArg.repr)
    }
    // Parse vote volumes from repr
    if (volumeArg?.repr) {
      voteVolumes = parseReprUintList(volumeArg.repr)
    }

    if (voteOptions.length > 0) {
      votes.push({
        address: tx.sender_address,
        voteOptions,
        voteVolumes,
        txId: tx.tx_id,
        txStatus: tx.tx_status,
        blockHeight: tx.block_height,
        nonce: tx.nonce,
      })
    }
  }

  // Deduplicate: keep the latest vote per address
  const voterMap = new Map()
  for (const vote of votes) {
    voterMap.set(vote.address, vote)
  }
  const uniqueVotes = Array.from(voterMap.values())

  console.log(`  Parsed ${votes.length} vote records, ${uniqueVotes.length} unique voters`)

  // Fetch balances at snapshot block
  const enriched = await fetchBalancesForAddresses(uniqueVotes.map(v => v.address))

  // Map option IDs to labels
  const optionLabel = id => {
    if (id === YES_OPTION_ID) return 'Yes - In Favor'
    if (id === NO_OPTION_ID) return 'No - Not in Favor'
    return id
  }

  const results = uniqueVotes.map(vote => {
    const bal = enriched.get(vote.address) || { locked: 0, unlocked: 0, total: 0 }
    const primaryOption = vote.voteOptions[0]
    return {
      address: vote.address,
      vote: optionLabel(primaryOption),
      optionId: primaryOption,
      votingPower: bal.total,
      locked: bal.locked,
      unlocked: bal.unlocked,
      txStatus: vote.txStatus,
      txId: vote.txId,
      blockHeight: vote.blockHeight,
      method: 'contract',
    }
  })

  return results
}

// ─── 2. STX Dust Voting ──────────────────────────────────────────────────────

const getStxDustVotes = async () => {
  console.log('\n=== 2. Fetching STX Dust Votes ===')

  const [yesEvents, noEvents] = await Promise.all([
    fetchDustTransactions(STX_YES_ADDR),
    fetchDustTransactions(STX_NO_ADDR),
  ])

  console.log(`  Raw STX dust: YES=${yesEvents.length}, NO=${noEvents.length}`)

  // Combine and deduplicate - first vote wins
  const allEvents = [
    ...yesEvents.map(e => ({ ...e, option: 'Yes - In Favor', optionId: YES_OPTION_ID })),
    ...noEvents.map(e => ({ ...e, option: 'No - Not in Favor', optionId: NO_OPTION_ID })),
  ]

  const firstVotes = new Map()
  for (const evt of allEvents) {
    if (evt.blockHeight < START_BLOCK || evt.blockHeight > END_BLOCK) continue
    const prev = firstVotes.get(evt.address)
    if (!prev ||
      evt.blockHeight < prev.blockHeight ||
      (evt.blockHeight === prev.blockHeight && evt.nonce < prev.nonce)) {
      firstVotes.set(evt.address, evt)
    }
  }

  console.log(`  Unique STX dust voters (first-vote deduped): ${firstVotes.size}`)

  // Fetch balances
  const addresses = Array.from(firstVotes.keys())
  const balances = await fetchBalancesForAddresses(addresses)

  const results = []
  for (const [address, evt] of firstVotes) {
    const bal = balances.get(address) || { locked: 0, unlocked: 0, total: 0 }
    results.push({
      address,
      vote: evt.option,
      optionId: evt.optionId,
      votingPower: bal.total,
      locked: bal.locked,
      unlocked: bal.unlocked,
      txStatus: evt.txStatus || 'success',
      txId: evt.txId || '',
      blockHeight: evt.blockHeight,
      method: 'stx-dust',
    })
  }

  return results
}

const fetchDustTransactions = async (dustAddress) => {
  const events = []
  let offset = 0
  let hasMore = true

  // Use v1 API (same as poll page) — returns flat tx objects with burn_block_height
  while (hasMore) {
    const url = `${BASE_URL}/extended/v1/address/${dustAddress}/transactions?limit=${PAGE_LIMIT}&offset=${offset}`
    const { total, results } = await fetchWithRetry(url)
    hasMore = results.length === PAGE_LIMIT && (offset + PAGE_LIMIT) < total
    offset += PAGE_LIMIT

    for (const tx of results) {
      // Match poll page logic: filter by token_transfer + recipient + burn_block_height range
      if (
        tx.tx_type === 'token_transfer' &&
        tx.token_transfer?.recipient_address?.toLowerCase() === dustAddress.toLowerCase()
      ) {
        events.push({
          address: tx.sender_address,
          blockHeight: tx.burn_block_height, // Use burn_block_height (Bitcoin block), same as poll page
          nonce: tx.nonce,
          txId: tx.tx_id,
          txStatus: tx.tx_status,
        })
      }
    }
    console.log(`  Fetched ${Math.min(offset, total)}/${total} STX dust tx for ${dustAddress}`)
  }

  return events
}

// ─── 3. BTC Dust Voting ──────────────────────────────────────────────────────

const getBtcDustVotes = async () => {
  console.log('\n=== 3. Fetching BTC Dust Votes ===')

  // Build BTC → STX address mapping from PoX cycles
  console.log(`  Building BTC→STX mapping for PoX cycles: ${POX_CYCLES.join(', ')}`)
  const btcToStxMap = await buildBtcToStxMap()
  console.log(`  BTC→STX map has ${btcToStxMap.size} BTC address entries`)

  // Fetch BTC transactions
  const [btcYesEvents, btcNoEvents] = await Promise.all([
    fetchBtcTransactions(BTC_YES_ADDR),
    fetchBtcTransactions(BTC_NO_ADDR),
  ])

  console.log(`  Raw BTC tx: YES=${btcYesEvents.length}, NO=${btcNoEvents.length}`)

  // Map BTC addresses to STX addresses
  const resolveStxAddresses = (events) => {
    const stxAddrs = new Set()
    for (const evt of events) {
      const stxList = btcToStxMap.get(evt.address) || []
      stxList.forEach(a => stxAddrs.add(a))
    }
    return [...stxAddrs]
  }

  const yesStxAddrs = resolveStxAddresses(btcYesEvents)
  const noStxAddrs = resolveStxAddresses(btcNoEvents)

  console.log(`  Resolved STX addresses: YES=${yesStxAddrs.length}, NO=${noStxAddrs.length}`)

  // Fetch balances for all unique BTC voter STX addresses
  const allBtcStxAddrs = [...new Set([...yesStxAddrs, ...noStxAddrs])]
  const balances = await fetchBalancesForAddresses(allBtcStxAddrs)

  const results = []

  for (const addr of yesStxAddrs) {
    const bal = balances.get(addr) || { locked: 0, unlocked: 0, total: 0 }
    if (bal.total > 0) {
      results.push({
        address: addr,
        vote: 'Yes - In Favor',
        optionId: YES_OPTION_ID,
        votingPower: bal.total,
        locked: bal.locked,
        unlocked: bal.unlocked,
        txStatus: 'success',
        txId: '',
        blockHeight: 0,
        method: 'btc-dust',
      })
    }
  }

  for (const addr of noStxAddrs) {
    const bal = balances.get(addr) || { locked: 0, unlocked: 0, total: 0 }
    if (bal.total > 0) {
      results.push({
        address: addr,
        vote: 'No - Not in Favor',
        optionId: NO_OPTION_ID,
        votingPower: bal.total,
        locked: bal.locked,
        unlocked: bal.unlocked,
        txStatus: 'success',
        txId: '',
        blockHeight: 0,
        method: 'btc-dust',
      })
    }
  }

  return results
}

const fetchBtcTransactions = async (btcAddress) => {
  const events = []
  const url = `${MEMPOOL_API}/address/${btcAddress}/txs?limit=${PAGE_LIMIT}`
  const txs = await axios.get(url).then(res => res.data)

  for (const tx of txs) {
    if (!tx.status.confirmed) continue
    for (const vin of tx.vin) {
      if (vin.prevout?.scriptpubkey_address) {
        events.push({
          address: vin.prevout.scriptpubkey_address,
          txId: tx.txid,
          blockHeight: tx.status.block_height,
        })
      }
    }
  }
  console.log(`  Fetched ${txs.length} BTC tx for ${btcAddress}`)
  return events
}

const buildBtcToStxMap = async () => {
  const map = new Map()
  for (const cycle of POX_CYCLES) {
    let signerOffset = 0, signerTotal = Infinity
    while (signerOffset < signerTotal) {
      const url = `${BASE_URL}/extended/v2/pox/cycles/${cycle}/signers?limit=${PAGE_LIMIT}&offset=${signerOffset}`
      const { total, results: signers } = await fetchWithRetry(url)
      signerTotal = total
      signerOffset += PAGE_LIMIT

      for (const { signing_key } of signers) {
        let stackerOffset = 0, stackerTotal = Infinity
        while (stackerOffset < stackerTotal) {
          const sUrl = `${BASE_URL}/extended/v2/pox/cycles/${cycle}/signers/${signing_key}/stackers?limit=${PAGE_LIMIT}&offset=${stackerOffset}`
          const { total: sTotal, results: stackers } = await fetchWithRetry(sUrl)
          stackerTotal = sTotal
          stackerOffset += PAGE_LIMIT

          for (const { pox_address, stacker_address } of stackers) {
            if (!map.has(pox_address)) map.set(pox_address, [])
            const existing = map.get(pox_address)
            if (!existing.includes(stacker_address)) {
              existing.push(stacker_address)
            }
          }
        }
      }
    }
    console.log(`  PoX cycle ${cycle} processed`)
  }
  return map
}

// ─── Shared Utilities ─────────────────────────────────────────────────────────

const fetchBalancesForAddresses = async (addresses) => {
  const balanceMap = new Map()
  console.log(`  Fetching STX balances for ${addresses.length} addresses at snapshot block ${SNAPSHOT_BLOCK}...`)

  for (let i = 0; i < addresses.length; i += BALANCE_BATCH_SIZE) {
    const batch = addresses.slice(i, i + BALANCE_BATCH_SIZE)
    const results = await Promise.all(batch.map(async (addr) => {
      const url = `${BASE_URL}/extended/v1/address/${addr}/stx?until_block=${SNAPSHOT_BLOCK}`
      const { locked, balance } = await fetchWithRetry(url)
      const lockedNum = Number(locked)
      const balanceNum = Number(balance)
      return {
        address: addr,
        locked: lockedNum > 0 ? Math.floor(lockedNum / 1e6) : 0,
        unlocked: balanceNum > 0 && balanceNum >= lockedNum ? Math.floor((balanceNum - lockedNum) / 1e6) : 0,
        total: balanceNum > 0 ? Math.floor(balanceNum / 1e6) : 0,
      }
    }))
    results.forEach(r => balanceMap.set(r.address, r))

    if ((i + BALANCE_BATCH_SIZE) % 50 === 0 || i + BALANCE_BATCH_SIZE >= addresses.length) {
      console.log(`  Balances: ${Math.min(i + BALANCE_BATCH_SIZE, addresses.length)}/${addresses.length}`)
    }
  }

  return balanceMap
}

const parseReprStringList = (repr) => {
  if (!repr) return []
  const matches = repr.match(/"([^"]+)"/g)
  return matches ? matches.map(m => m.replace(/"/g, '')) : []
}

const parseReprUintList = (repr) => {
  if (!repr) return []
  const matches = repr.match(/u(\d+)/g)
  return matches ? matches.map(m => parseInt(m.replace('u', ''))) : []
}

const fmtAmt = num => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtPct = num => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'

// ─── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  console.log(`\n╔══════════════════════════════════════════════════╗`)
  console.log(`║  Ballot.gg Audit: ${POLL_TITLE.slice(0, 30)}`)
  console.log(`║  Contract: ${CONTRACT_ID.slice(0, 40)}`)
  console.log(`║  Snapshot Block: ${SNAPSHOT_BLOCK}`)
  console.log(`║  Block Range: ${START_BLOCK} - ${END_BLOCK}`)
  console.log(`╚══════════════════════════════════════════════════╝\n`)

  // Fetch all three vote sources
  const contractVotes = await getContractVotes()
  const stxDustVotes = await getStxDustVotes()
  const btcDustVotes = await getBtcDustVotes()

  // ─── Summaries ──────────────────────────────────────────────────────────────

  const summarize = (label, votes) => {
    const yes = votes.filter(v => v.optionId === YES_OPTION_ID)
    const no = votes.filter(v => v.optionId === NO_OPTION_ID)
    const yesTotal = yes.reduce((s, v) => s + v.votingPower, 0)
    const noTotal = no.reduce((s, v) => s + v.votingPower, 0)
    const yesLocked = yes.reduce((s, v) => s + v.locked, 0)
    const noLocked = no.reduce((s, v) => s + v.locked, 0)
    const yesUnlocked = yes.reduce((s, v) => s + v.unlocked, 0)
    const noUnlocked = no.reduce((s, v) => s + v.unlocked, 0)
    const grand = yesTotal + noTotal

    console.log(`\n── ${label} ──`)
    console.log(`  YES voters:     ${yes.length}    |  NO voters:     ${no.length}`)
    console.log(`  YES locked:     ${fmtAmt(yesLocked)} STX   |  NO locked:     ${fmtAmt(noLocked)} STX`)
    console.log(`  YES unlocked:   ${fmtAmt(yesUnlocked)} STX   |  NO unlocked:   ${fmtAmt(noUnlocked)} STX`)
    console.log(`  YES total:      ${fmtAmt(yesTotal)} STX   |  NO total:      ${fmtAmt(noTotal)} STX`)
    if (grand > 0) {
      console.log(`  YES %:          ${fmtPct(yesTotal / grand * 100)}         |  NO %:          ${fmtPct(noTotal / grand * 100)}`)
    }
  }

  summarize('Contract Votes (Direct)', contractVotes)
  summarize('STX Dust Votes', stxDustVotes)
  summarize('BTC Dust Votes', btcDustVotes)

  // Combined summary — skip zero-balance voters
  const allVotes = [...contractVotes, ...stxDustVotes, ...btcDustVotes].filter(v => v.votingPower > 0)

  // Deduplicate across methods: if a wallet voted via contract AND dust, keep the contract vote
  const deduped = new Map()
  // Priority: contract > stx-dust > btc-dust
  const methodPriority = { 'contract': 0, 'stx-dust': 1, 'btc-dust': 2 }
  for (const vote of allVotes) {
    const existing = deduped.get(vote.address)
    if (!existing || methodPriority[vote.method] < methodPriority[existing.method]) {
      deduped.set(vote.address, vote)
    }
  }
  const dedupedVotes = Array.from(deduped.values())

  summarize('COMBINED (Deduped by Address)', dedupedVotes)

  // ─── CSV Output ─────────────────────────────────────────────────────────────

  const timestamp = new Date().toISOString().slice(0, 10)
  const prefix = `sip039-audit-${timestamp}`

  // 1. All votes (raw, not deduped across methods)
  await writeCsv(`${prefix}-all-votes.csv`, allVotes)

  // 2. Combined deduped
  await writeCsv(`${prefix}-combined-deduped.csv`, dedupedVotes)

  // 3. Per method
  await writeCsv(`${prefix}-contract-votes.csv`, contractVotes)
  await writeCsv(`${prefix}-stx-dust-votes.csv`, stxDustVotes)
  await writeCsv(`${prefix}-btc-dust-votes.csv`, btcDustVotes)

  console.log(`\n✓ Audit complete. ${allVotes.length} total votes, ${dedupedVotes.length} unique voters.`)
}

const writeCsv = (filename, records) => {
  const headers = ['address', 'vote', 'voting_method', 'voting_power_stx', 'locked_stx', 'unlocked_stx', 'tx_status', 'tx_id', 'block_height']
  const keys = ['address', 'vote', 'method', 'votingPower', 'locked', 'unlocked', 'txStatus', 'txId', 'blockHeight']
  const escCsv = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s }
  const lines = [headers.join(',')]
  for (const r of records) {
    lines.push(keys.map(k => escCsv(r[k])).join(','))
  }
  fs.writeFileSync(filename, lines.join('\n') + '\n')
  console.log(`  Wrote ${records.length} rows → ${filename}`)
}

main().catch(err => { console.error('Audit failed:', err); process.exit(1) })
