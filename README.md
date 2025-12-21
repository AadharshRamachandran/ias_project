# File Storage System

A blockchain-backed file storage application built with Solidity smart contracts, Hardhat for development, and React for the frontend. Files are stored on IPFS via Pinata, with metadata tracked on-chain.

## Features

- Upload files to IPFS through Pinata
- Store file metadata on Ethereum blockchain
- Retrieve and display uploaded files
- Local blockchain testing with Hardhat

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git**
- **MetaMask** (for interacting with the deployed contracts)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/file-storage-system.git
cd file-storage-system
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
```

### 3. Configure environment variables

#### Backend Configuration (Hardhat)

Create a `.env` file in the **project root**:

```bash
API_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
PRIVATE_KEY=your-wallet-private-key
```

#### Frontend Configuration (React)

Create a `.env` file in the **client** directory:

```bash
REACT_APP_PINATA_API_KEY=your_pinata_api_key
REACT_APP_PINATA_SECRET_API_KEY=your_pinata_secret_key
```

> **Security Warning**: Never commit `.env` files to version control. Add them to `.gitignore`.

## Running the Project

### Start Local Blockchain

In one terminal window:

```bash
cd client
npx hardhat node
```

This starts a local Ethereum node at `http://127.0.0.1:8545/`

### Deploy Smart Contracts

In another terminal window:

```bash
cd client
npx hardhat run scripts/deploy.js --network localhost
```

Copy the deployed contract address from the output.

### Start React Application

```bash
cd client
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
file-storage-system/
├── client/
│   ├── contracts/          # Solidity smart contracts
│   ├── scripts/            # Deployment scripts
│   ├── src/                # React application source
│   ├── hardhat.config.js   # Hardhat configuration
│   └── package.json
├── .gitignore
├── package.json
└── README.md
```

## Environment Variables

### Required Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `API_URL` | Root `.env` | Alchemy or Infura RPC URL |
| `PRIVATE_KEY` | Root `.env` | Wallet private key for deployment |
| `REACT_APP_PINATA_API_KEY` | `client/.env` | Pinata API key |
| `REACT_APP_PINATA_SECRET_API_KEY` | `client/.env` | Pinata secret key |

### Security Best Practices

-  Add `.env` files to `.gitignore`
-  Use `.env.example` files for templates
-  Never hardcode secrets in source code
-  `REACT_APP_*` variables are exposed in the browser bundle
-  For production, use a backend proxy for sensitive API operations

##  Testing

Run smart contract tests:

```bash
cd client
npx hardhat test
```

##  Deployment

### Deploy to Testnet (Sepolia)

1. Ensure you have testnet ETH in your wallet
2. Configure `API_URL` in `.env` with your Alchemy/Infura endpoint
3. Deploy:

```bash
cd client
npx hardhat run scripts/deploy.js --network sepolia
```

### Deploy Frontend

The React app can be deployed to:
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **GitHub Pages**: Configure in `package.json`

Remember to set environment variables in your hosting platform's dashboard.

##  Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Acknowledgments

- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [Pinata](https://www.pinata.cloud/) - IPFS pinning service
- [OpenZeppelin](https://www.openzeppelin.com/) - Secure smart contract libraries
