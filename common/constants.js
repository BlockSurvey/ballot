export const Constants = {
  // Stacks mainnet network flag
  STACKS_MAINNET_FLAG: process.env.NEXT_PUBLIC_STACKS_MAINNET_FLAG === "false" ? false : true,

  GAIA_HUB_PREFIX: "https://storage.ballot.gg/",

  // Stacks API URLs
  STACKS_MAINNET_API_URL: "https://api.mainnet.hiro.so",
  STACKS_TESTNET_API_URL: "https://api.testnet.hiro.so",

  // IPFS gateway
  IPFS_GATEWAY: "https://cloudflare-ipfs.com/ipfs/",

  VOTING_SYSTEMS: [
    {
      "id": "fptp",
      "name": "First-past-the-post"
    }, {
      "id": "block",
      "name": "Block Voting"
    }, {
      "id": "quadratic",
      "name": "Quadratic Voting"
    }, {
      "id": "weighted",
      "name": "Weighted Voting"
    }
  ],

  STRATEGY_TEMPLATES: [
    {
      "id": "alex",
      "name": "ALEX",
      "strategyTokenType": "ft",
      "strategyTokenName": "alex",
      "strategyContractName": "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token",
      "strategyTokenDecimals": "8"
    }, {
      "id": "blocksurvey",
      "name": "BlockSurvey",
      "strategyTokenType": "nft",
      "strategyTokenName": "blocksurvey",
      "strategyContractName": "SPNWZ5V2TPWGQGVDR6T7B6RQ4XMGZ4PXTEE0VQ0S.blocksurvey"
    }, {
      "id": "btcholders",
      "name": ".btc Namespace",
      "strategyTokenType": "nft",
      "strategyTokenName": ".btc Namespace",
      "strategyContractName": ""
    }, {
      "id": "crashpunks",
      "name": "CrashPunks",
      "strategyTokenType": "nft",
      "strategyTokenName": "crashpunks-v2",
      "strategyContractName": "SP3QSAJQ4EA8WXEDSRRKMZZ29NH91VZ6C5X88FGZQ.crashpunks-v2"
    }, {
      "id": "miamicoin",
      "name": "MIA",
      "strategyTokenType": "ft",
      "strategyTokenName": "miamicoin",
      "strategyContractName": "SP1H1733V5MZ3SZ9XRW9FKYGEZT0JDGEB8Y634C7R.miamicoin-token-v2",
      "strategyTokenDecimals": "6"
    }, {
      "id": "newyorkcitycoin",
      "name": "NYC",
      "strategyTokenType": "ft",
      "strategyTokenName": "newyorkcitycoin",
      "strategyContractName": "SP2H8PY27SEZ03MWRKS5XABZYQN17ETGQS3527SA5.newyorkcitycoin-token",
      "strategyTokenDecimals": "0"
    }, {
      "id": "satoshibles",
      "name": "Satoshibles",
      "strategyTokenType": "nft",
      "strategyTokenName": "Satoshibles",
      "strategyContractName": "SP6P4EJF0VG8V0RB3TQQKJBHDQKEF6NVRD1KZE3C.satoshibles"
    }, {
      "id": "stacksparrots",
      "name": "Stacks Parrots",
      "strategyTokenType": "nft",
      "strategyTokenName": "stacks-parrots",
      "strategyContractName": "SP2KAF9RF86PVX3NEE27DFV1CQX0T4WGR41X3S45C.byzantion-stacks-parrots"
    }, {
      "id": "stx",
      "name": "STX",
      "strategyTokenType": "ft",
      "strategyTokenName": "STX",
      "strategyContractName": "",
      "strategyTokenDecimals": "6"
    }, {
      "id": "theexplorerguild",
      "name": "The Explorer Guild",
      "strategyTokenType": "nft",
      "strategyTokenName": "The-Explorer-Guild",
      "strategyContractName": "SP2X0TZ59D5SZ8ACQ6YMCHHNR2ZN51Z32E2CJ173.the-explorer-guild"
    }
  ],

  TOKEN_TYPES: [{ id: "nft", name: "Non Fungible Token" }, { id: "ft", name: "Fungible Token" }],

  // FAQs
  FAQ: [
    {
      question: "What is Ballot.gg?",
      answer: `The Ballot is a decentralized polling app for DAO, NFT, DeFi, and Web 3 projects that puts community members at the center to come to a consensus on important decisions. Polls will be gated based on holdings of tokens, .BTC namespaces, and NFTs.`,
    },
    {
      question: "How does Ballot.gg help?",
      answer: `Ballot.gg will help projects in the Stacks community to utilize tokens to govern decision-making on their platform. It will allow DAOs, NFTs, and DeFi's to get broad community consensus regarding proposed changes or ideas in a transparent and verifiable way.`,
    },
    {
      question: "How does Ballot.gg help Stacks community?",
      answer: `Polling for consensus has been around for years and is today used in politics to make decisions (eg. Brexit in the UK). Ballot makes it easy to deploy or integrate a poll into your project. Stacks community members can create polls for almost anything they want to know as a collective. Ballot will open up Stacks community members to be actively engaged and get to know how other community members think about things.`,
    },
    {
      question: "Is Ballot.gg open source?",
      answer: `Yes. The source of the <a href="https://github.com/BlockSurvey/ballot" target="_blank" rel="noreferrer">UI and Smart Contract ↗</a> is available here.`,
    },
    {
      question: "Is Ballot.gg free?",
      answer: `Yes. There are no charges for creating polls in Ballot.`,
    },
    {
      question: "Which wallets are supported?",
      answer: `Ballot.gg supports all major Stacks wallets including <a href="https://hiro.so/wallet" target="_blank" rel="noreferrer">Hiro Wallet ↗</a>, <a href="https://xverse.app" target="_blank" rel="noreferrer">Xverse ↗</a>, and <a href="https://asigna.io" target="_blank" rel="noreferrer">Asigna ↗</a>. Connect with your preferred wallet to start creating and participating in polls.`,
    },
    {
      question: "Do I need STX to use Ballot.gg?",
      answer: `Yes, you'll need a small amount of STX in your wallet to pay for transaction fees when creating polls and casting votes. The platform itself is free to use, but blockchain transactions require gas fees.`,
    },
    {
      question: "Who are the developers of Ballot.gg?",
      answer: `We are developers from Team <a href="https://blocksurvey.io?ref=ballot" target="_blank" rel="noreferrer">BlockSurvey ↗</a> , 
      <a href="https://owl.link?ref=ballot" target="_blank" rel="noreferrer">Owl Link ↗</a> , 
      <a href="https://checklist.gg?ref=ballot" target="_blank" rel="noreferrer">Checklist ↗</a>.`,
    }
  ],

  // Voting system document links
  VOTING_SYSTEM_DOCUMENTATION: {
    "fptp": {
      "id": "fptp",
      "name": "First-past-the-post",
      "link": "https://docs.ballot.gg/ballot.gg/voting-system/first-past-the-post"
    }, "block": {
      "id": "block",
      "name": "Block Voting",
      "link": "https://docs.ballot.gg/ballot.gg/voting-system/block-voting"
    }, "quadratic": {
      "id": "quadratic",
      "name": "Quadratic Voting",
      "link": "https://docs.ballot.gg/ballot.gg/voting-system/quadratic-voting"
    }, "weighted": {
      "id": "weighted",
      "name": "Weighted Voting",
      "link": "https://docs.ballot.gg/ballot.gg/voting-system/weighted-voting"
    }
  },

  // Ballot.gg wallet address for donations
  MAINNET_DONATION_ADDRESS: "SP1FQ3G3MYSXW68CWPY4GW342T3Y9HQCCXXCKENPH",
  TESTNET_DONATION_ADDRESS: "ST2FYE64JK2NMRS1640FE9SKJS37CYYJ3B1EHB6AR",
};
