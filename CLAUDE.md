# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ballot.gg is a decentralized polling application built on the Stacks blockchain that enables DAOs, NFT projects, and DeFi communities to conduct transparent, token-gated governance polls. The application uses Next.js for the frontend and interacts with Clarity smart contracts deployed on Stacks.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm lint
```

## Architecture Overview

### Frontend Stack
- **Framework**: Next.js 12.2.5 with React 18.2
- **UI Components**: React Bootstrap 5.2
- **Blockchain Integration**: @stacks/connect for wallet connectivity, @stacks/transactions for contract interactions
- **Data Storage**: BlockSurvey File Storage (https://storage.ballot.gg) - replaced deprecated Gaia storage

### Key Directories

- **`/pages`**: Next.js pages with file-based routing
  - `index.js`: Home page with poll creation interface
  - `[...id].js`: Dynamic poll viewing/voting page
  - `all-polls.js`: List of all polls
  - `/builder`: Poll creation wizard
  - `/summary`: Poll results visualization

- **`/services`**: Core business logic and blockchain integration
  - `auth.js`: Stacks wallet authentication
  - `contract.js`: Smart contract interactions (deployment, voting, reading state)
  - `utils.js`: Helper functions for data processing

- **`/components`**: React components organized by feature
  - `/builder`: Poll creation components
  - `/poll`: Voting interface components
  - `/summary`: Results display components
  - `/common`: Shared UI components

- **`/clarity`**: Clarity smart contracts
  - `ballot.clar`: Main voting contract with strategy support
  - `nft.clar`: NFT-related functionality

- **`/common/constants.js`**: Configuration including:
  - Network settings (mainnet/testnet toggle)
  - Supported voting systems (FPTP, Block, Quadratic, Weighted)
  - Token strategies for gating (ALEX, MIA, NYC, various NFT collections, .btc domains)

### Smart Contract Architecture

The ballot contract (`clarity/ballot.clar`) implements:
- Multiple voting systems (first-past-the-post, block voting, quadratic, weighted)
- Token-gated participation using fungible tokens (FT) or NFTs
- BNS (.btc) domain holder verification
- Vote tracking and result calculation
- Time-bound voting periods

### Network Configuration

- **Development**: Uses Stacks testnet (configured via `.env.development`)
- **Production**: Uses Stacks mainnet (configured via `.env.production`)
- Network toggle controlled by `NEXT_PUBLIC_STACKS_MAINNET_FLAG` environment variable

### Key Integration Points

1. **Wallet Connection**: Uses Hiro Wallet (formerly Stacks Wallet) for user authentication
2. **Contract Deployment**: Polls are deployed as individual smart contracts
3. **Data Storage**: Poll metadata stored in BlockSurvey Storage (https://storage.ballot.gg), contract state on blockchain
4. **Token Verification**: Validates user holdings for voting eligibility

### Storage Migration Notes

- **Migration from Gaia**: The application has been migrated from deprecated @stacks/storage (Gaia) to BlockSurvey File Storage
- **Storage API**: Custom API endpoints in `/pages/api/storage/` handle file upload/retrieval
- **Storage URLs**: Files are stored at `https://storage.ballot.gg/{gaiaAddress}/{fileName}`
- **Encryption**: Files can be encrypted using user's public key before storage

## Development Workflow

1. **Creating a Poll**:
   - User connects wallet via `services/auth.js`
   - Poll configuration built through `/pages/builder`
   - Contract deployed via `services/contract.js::deployContract()`

2. **Voting Process**:
   - Poll loaded from contract state
   - User eligibility verified against token holdings
   - Vote submitted as contract call
   - Results calculated on-chain

3. **Viewing Results**:
   - Real-time results fetched from contract
   - Visualization rendered in `/pages/summary`

## Important Considerations

- The application switches between testnet and mainnet based on environment variables
- Contract addresses vary by network - always check `common/constants.js` for correct addresses
- Voting power calculation depends on the selected strategy (token balance, NFT ownership, domain ownership)
- The application uses Stacks blockchain's clarity language for smart contracts - note the recent update from `block-height` to `tenure-height` function