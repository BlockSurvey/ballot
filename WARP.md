# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Ballot.gg is a decentralized polling application built on the Stacks blockchain. It enables DAOs, NFT communities, and DeFi projects to create token-gated polls with various voting systems and strategies.

## Common Development Commands

### Development Server
```bash
# Start development server (uses testnet)
npm run dev
# or
yarn dev
```

### Build and Production
```bash
# Build for production
npm run build
# or
yarn build

# Start production server
npm run start
# or 
yarn start
```

### Linting
```bash
# Run ESLint
npm run lint
# or
yarn lint
```

### Environment Configuration
- Development: Uses `.env.development` (testnet)
- Production: Uses `.env.production` (mainnet)
- Toggle between networks via `NEXT_PUBLIC_STACKS_MAINNET_FLAG` environment variable

## Architecture Overview

### Core Application Structure

**Next.js Pages Architecture:**
- `pages/index.js` - Landing page with authentication
- `pages/all-polls.js` - Dashboard showing all polls  
- `pages/[...id].js` - Dynamic poll creation/voting pages
- `pages/[param].js` - Generic parameter-based routing

**Service Layer (`services/`):**
- `auth.js` - Stacks authentication using Hiro Wallet, Gaia storage operations
- `contract.js` - Smart contract deployment and interaction, voting mechanisms
- `utils.js` - Utility functions for data processing

**Smart Contracts (`clarity/`):**
- `ballot.clar` - Main voting contract template
- `nft.clar` - NFT-related contract functionality

### Blockchain Integration

**Stacks Network Integration:**
- Uses `@stacks/connect` for wallet integration (Hiro Wallet)
- `@stacks/transactions` for contract calls and deployments
- `@stacks/network` for mainnet/testnet switching
- `@stacks/storage` for decentralized data storage via Gaia

**Contract Deployment Pattern:**
- Each poll deploys a unique Clarity smart contract
- Dynamic contract generation based on poll configuration
- Template system with placeholders replaced at deployment time

### Voting System Architecture

**Four Voting Systems Supported:**
1. **First-past-the-post (FPTP)** - Simple majority voting
2. **Block Voting** - Multiple selections allowed
3. **Quadratic Voting** - Voting power scales quadratically with tokens
4. **Weighted Voting** - Linear relationship between tokens and votes

**Token Strategy System:**
- **No Strategy** - Open voting (1 vote per wallet)
- **Fungible Token (FT) Strategy** - Voting power based on token holdings
- **Non-Fungible Token (NFT) Strategy** - Voting power based on NFT ownership
- **STX Strategy** - Voting power based on STX balance
- **BNS Strategy** - Voting power based on .btc namespace ownership

**Pre-configured Strategy Templates:**
Located in `constants.js` with mappings for popular Stacks tokens (ALEX, MIA, NYC, CrashPunks, Satoshibles, etc.)

### Key Components Architecture

**Contract Generation (`services/contract.js`):**
- `getContract()` - Generates Clarity code from poll configuration
- Dynamic strategy function injection based on token type
- Voting system logic generation with validation rules
- Placeholder replacement system for poll metadata

**Authentication Flow (`services/auth.js`):**
- Wallet connection via Stacks Connect
- Session management with JWT validation
- Network switching (mainnet/testnet)
- Gaia storage integration for poll data persistence

**State Management:**
- No global state management library used
- Component-level state with React hooks
- Server-side rendering for initial page loads
- Client-side navigation with Next.js router

## Development Guidelines

### Working with Smart Contracts

When modifying voting logic:
1. Update template in `getRawContract()` function
2. Modify placeholder replacement logic in `getContract()`
3. Update strategy functions for different token types
4. Test with different voting systems and token strategies

### Adding New Voting Strategies

To add a new token strategy:
1. Add entry to `STRATEGY_TEMPLATES` in `constants.js`
2. Create corresponding strategy function in `contract.js`
3. Update contract template with new strategy logic
4. Test deployment and voting flow

### Network Configuration

- Development uses Stacks testnet by default
- Production uses Stacks mainnet
- Network switching handled via environment variables
- API endpoints automatically switch based on network flag

### Styling Architecture

- CSS Modules used for component-specific styling
- Bootstrap components for layout and UI elements
- Global styles in `styles/globals.css`
- Component-specific modules in `styles/*.module.css`

## Important Implementation Details

**Contract Deployment Process:**
1. Poll configuration converted to Clarity contract code
2. Contract deployed to Stacks blockchain with unique name
3. Poll metadata stored in contract state variables
4. Voting options initialized with zero counts

**Voting Validation:**
- Block height validation for poll start/end times
- Token ownership verification for gated polls
- Double-voting prevention via on-chain mapping
- Volume validation based on voting system rules

**Data Storage Strategy:**
- Poll metadata stored on-chain in contract state
- Additional poll data stored in Gaia decentralized storage
- Vote results calculated and stored on-chain
- User voting history tracked in contract maps

**Token Integration Patterns:**
- Dynamic contract calls to token contracts for balance checking
- NFT ownership validation via contract calls
- Snapshot functionality for token balances at specific block heights
- BNS (Bitcoin Name System) integration for .btc namespace holders