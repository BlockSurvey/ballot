export const Constants = {
  // Stacks mainnet network flag
  STACKS_MAINNET_FLAG: process.env.NEXT_PUBLIC_STACKS_MAINNET_FLAG === "false" ? false : true,

  GAIA_HUB_PREFIX: "https://gaia.blockstack.org/hub/",

  // IPFS gateway
  IPFS_GATEWAY: "https://cloudflare-ipfs.com/ipfs/",

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
      answer: `Yes. The source of the smart contact is available here.`,
    },
    {
      question: "Is Ballot.gg free?",
      answer: `Yes. There are no charges for creating polls in Ballot.`,
    },
    {
      question: "Who are the developers of Ballot.gg?",
      answer: `We are developers from Team <a href="https://blocksurvey.io?ref=ballot" target="_blank" rel="noreferrer">BlockSurvey ↗</a>.`,
    }
  ]
};
