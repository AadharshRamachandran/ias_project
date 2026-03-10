# SecureFileShare: A Deep Dive Guide

Welcome to **SecureFileShare**. This is not just a typical file upload application; it is a full-stack, decentralized, mathematically-secured platform that extends blockchain, IPFS (InterPlanetary File System), and smart contracts with four advanced cryptographic features:

1. **Zero-Knowledge Proofs (ZKP)**: We use Groth16 cryptographic proofs (via `snarkjs` and `circom`) to mathematically prove that a file's hash is valid, and that a user possesses specific attributes (like "Role: Doctor"), **without ever revealing the file contents or the user's actual attributes on-chain**.
2. **Attribute-Based Encryption (CP-ABE)**: Traditional encryption encrypts a file for *one* specific person. Ciphertext-Policy ABE allows you to encrypt a file for a *policy* (e.g., "Must be a Doctor AND in the Cardiology Department"). The underlying file is secured with military-grade AES-256-GCM, and the AES key is then mathematically split (using Shamir's Secret Sharing) according to the policy.
3. **GDPR Compliance natively on Web3**: The blockchain is permanent (immutable), which violates Europe's GDPR "Right to be Forgotten" (Article 17). Our system implements a hybrid approach: an off-chain secure SQLite database tracks Personally Identifiable Information (PII). When a user requests deletion, their IPFS files are unpinned, and their database records are permanently anonymized via cryptographic hashing, leaving a compliant audit trail.
4. **Time-Bound Permissions**: Decentralized access control via the blockchain that automatically revokes access based on Ethereum's exact `block.timestamp`.

This comprehensive guide will walk you through *exactly* how to set up the environment, deploy the project, and understand the code execution at every step.

---

## Prerequisites
Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MetaMask](https://metamask.io/) browser extension (used to act as your Web3 identity)

---

## Step 1: Acquiring Environment Variables (The `.env` Setup)

In modern web development, sensitive keys (like API passwords or Crypto Private Keys) must never be hardcoded into the source code. Instead, we use Environment Variables. 

This project uses a **single, centralized `.env` file** located at the root of the project folder. Create it by copying the example:

```bash
cp .env.example .env
```

Now, let's look at exactly how to get the three crucial pieces of information for that file.

### A. Pinata IPFS Credentials
Files are too large and expensive to store directly on the Ethereum blockchain. Instead, we store files on **IPFS** (a peer-to-peer file sharing network) and only save the small, resulting "Content Identifier" (CID hash) on the blockchain. 
To reliably upload to IPFS, we use a service called **Pinata**.

1. Go to [Pinata Cloud](https://app.pinata.cloud) and sign up for a free account.
2. In the dashboard, click **API Keys** on the left menu.
3. Click **New Key**. Enable "Admin" privileges and give it a name (like "SecureShareKey").
4. Pinata will show you an **API Key** and an **API Secret**. Copy both immediately (they are only shown once).

### B. MetaMask Wallet Setup
You need a blockchain wallet to interact with the decentralized network.
1. Open your MetaMask browser extension.
2. **Crucial:** Click the network dropdown (top left, probably says "Ethereum Mainnet"). Click **Add network** -> **Add a network manually**.
3. Input the details for your local Hardhat node (which we'll start in Step 2):
   - **Network name:** Hardhat Local
   - **New RPC URL:** `http://127.0.0.1:8545/`
   - **Chain ID:** `1337` (or sometimes `31337`)
   - **Currency symbol:** `ETH`
4. Click Save and switch to this newly created "Hardhat Local" network.

### C. Populating the `.env` file
Now open your `.env` file and fill it out:

```env
# 📌 PINATA IPFS (From Step A)
PINATA_API_KEY=your_copied_api_key
PINATA_API_SECRET=your_copied_api_secret
PINATA_GATEWAY=https://gateway.pinata.cloud

# 🔗 BLOCKCHAIN 
# (Leave PRIVATE_KEY blank for exactly one minute, we will get it in Step 2)
ALCHEMY_API_KEY=unused_for_local_development
PRIVATE_KEY=
CONTRACT_ADDRESS=

# 🖥️ SERVER
PORT=3001
NODE_ENV=development
```

---

## Step 2: Blockchain Initialization and Deployment

We use **Hardhat** to simulate a real Ethereum blockchain on your local computer.

### A. Start the Blockchain Node
Open a new terminal (Terminal 1) at the project root:
```bash
cd blockchain
npm install
npx hardhat node
```
This starts the local blockchain (`http://127.0.0.1:8545`). 
It will print **20 dummy accounts**, each loaded with 10,000 fake ETH. 

**Go back to your `.env` file:** Copy the very first `Private Key` printed in the terminal (e.g., `0xac09...`) and paste it into your `.env` file under `PRIVATE_KEY=`. Do the same (just the first account) and import to your metamask wallet!

### B. Deploy the Smart Contracts
Open a second terminal (Terminal 2) at the project root:
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```
**What happens under the hood?**
The `deploy.js` script compiles our Solidity code (`.sol` files) into EVM bytecode. It then sends deployment transactions to your local Hardhat node. 
Once deployed, the script automatically writes the new smart contract addresses into `client/src/contracts/addresses.json` and `backend/contracts/addresses.json`. This auto-wiring ensures both the frontend and backend know exactly where to send blockchain transactions.

---

## Step 3: Starting the Backend Server

Open a third terminal (Terminal 3):
```bash
cd backend
npm install
npm run dev
```

**What happens under the hood?**
1. The Node.js Express server starts on port `3001`.
2. It immediately checks the `db` folder. If `gdpr.db` doesn't exist, it uses `better-sqlite3` to build a fresh SQLite database to act as our GDPR audit trail.
3. It exposes endpoints for the frontend to utilize heavy cryptographic operations (like `/api/upload` which handles ZKP generation and AES encryption).

---

## Step 4: Starting the Frontend (Client)

Open a fourth terminal (Terminal 4):
```bash
cd client
npm install
npm run dev
```
Vite will launch the modern React web application on `http://localhost:5173`. Open this URL in your browser.

Click **Connect Wallet**. The app will detect MetaMask, verify you are on the `Hardhat Local` network, and securely request your public address (without ever exposing your private key).

---

## 📖 User Guide: How to Upload & Share Files

The application uses your MetaMask **Wallet Address** as your identity. When we talk about a "Recipient Address", we mean the MetaMask Public Key (e.g., `0x123...abc`) of the person you want to send the file to.

### 1. How to Upload a File
1. Open the web app and click **Connect Wallet** in the top right. MetaMask will ask you to connect your account.
2. Navigate to the **Dashboard**, and click the **Upload** tab.
3. **Select a File** from your computer.
4. (Optional) Provide explicit User Attributes. This tags *you* (the uploader) with specific roles (like `role: doctor`). This is important later if you want to enforce policies.
5. Click **Encrypt & Upload File**.
6. MetaMask will pop up asking you to **Sign** a message. This proves you own the wallet without charging gas fees.
7. Wait for the progress bar. The file is being encrypted, pinned to IPFS, and a Zero-Knowledge Proof is generating.
8. MetaMask will pop up a second time asking you to **Confirm a Transaction**. This writes the final file record to the blockchain. Click Confirm.
9. Your file now appears in the **My Files** tab!

### 2. How to Share a File
To share a file, you need the **MetaMask Address** of the person you want to send it to. If you are testing locally, you can use the address of "Account 2" from your Hardhat terminal.

1. Go to the **My Files** tab.
2. Find the file you want to share and click the **Share** button next to it.
3. In the **Recipient Address** field, paste the MetaMask Public Address of the receiver (e.g., `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
4. Select an **Access Duration** (e.g., 1 Hour). After this time, the blockchain will automatically lock the file.
5. Set an **ABE Policy (Required Attributes)**. For example, if you add `department : cardiology`, the recipient *must* have that attribute assigned to their wallet to decrypt the file.
6. Click **Grant Access & Encode ABE Keys**.
7. MetaMask will pop up twice to confirm blockchain transactions (one to grant access, one to set the time-bound rules). Click Confirm for both.

### 3. How to Receive/Download a Shared File
1. The recipient must open the app and connect *their* MetaMask wallet (the address you shared it with).
2. They go to the **My Files** tab. The shared file will appear there.
3. They click **Download**. The system will verify their attributes via Zero-Knowledge Proofs, check the Time-Bound permissions on the blockchain, and securely decrypt the file back to its original state!

---

## 🧠 How it Works: Deep Dive into the Code Flow

### Scenario 1: Uploading a File
When a user selects a file on the Dashboard and clicks "Encrypt & Upload File":

1. **Frontend Request:** The React app reads the file, signs an authentication message with MetaMask (to prove identity without a traditional password), and sends the raw file to the backend via a `POST /api/upload` request.
2. **Backend Encryption:** The backend (`backend/routes/upload.js`) intercepts the file. It generates a random, highly secure AES-256 Symmetric Key. The file is encrypted into an unreadable "Ciphertext".
3. **IPFS Pinning:** The backend connects to Pinata using the API keys from your `.env` file. It uploads the encrypted ciphertext to the decentralized IPFS network. Pinata returns a `CID` (Content Identifier hash).
4. **ZKP Generation:** The backend uses `snarkjs` to generate a mathematically sound Zero-Knowledge Proof. This proof asserts: *"I know the exact contents of this file that map to this file hash, but I am not going to show you the file."*
5. **Blockchain Registry:** The backend returns the `CID` and the `ZKP` back to the React Frontend. The Frontend then prompts MetaMask to execute a smart contract transaction (`FileRegistry.uploadFile(cids, fileHash)`). 

**The Result:** The file is heavily encrypted and scattered across IPFS. Only a tiny, cheap record (the CID and Hash) is stored permanently on the Ethereum blockchain.

### Scenario 2: Sharing a File (ABAC & Time-Bound)
When a user clicks "Share" and inputs a recipient address and a duration (e.g., 1 hour):

1. **Attribute Based Encryption (CP-ABE):** The frontend tells the backend: *"I want to share File X with Address Y, but ONLY if Address Y possesses the attribute 'Role: Doctor'"*.
2. **Key Splitting:** The backend takes the AES-256 key used to encrypt the file, and cryptographically wraps it using an ABE algorithm. It essentially generates a mathematical puzzle that can only be solved (unlocked) if the recipient's blockchain address is linked to the required attributes.
3. **On-Chain Policy Write:** The Frontend prompts MetaMask to call `AccessControl.grantAccess()`. This writes the explicit "Role: Doctor" requirement into the smart contract for that specific file.
4. **Time-Bound Execution:** The Frontend immediately prompts MetaMask a second time to call `TimeBoundPermissions.grantTimedAccess()`. The smart contract reads `block.timestamp` (the exact second the block is mined) and adds the requested hour duration. 

**The Result:** If the recipient tries to download the file 1 hour and 1 second later, the smart contract will revert the transaction. If they try to download it immediately, but the contract owner hasn't assigned them the `Role: Doctor` attribute via `AccessControl.setUserAttributes()`, the ZKP verifier will refuse to unlock the AES key. 

### Scenario 3: GDPR Compliance
Blockchain immutability means data can't be deleted, which violates privacy laws. Here is how we solve it:

1. **Article 20 (Data Export):** Clicking "Download JSON Archive" hits `/api/gdpr/export`. The backend queries the SQLite database and returns a complete machine-readable audit trail of every interaction that user has had with the platform.
2. **Article 17 (Right to Erasure):** Clicking "Erase" hits `/api/gdpr/erase`. 
   - The backend calls the Pinata API to actively `unpin` (delete) the file from the IPFS network.
   - The backend scrambles the user's Ethereum address in the SQLite database into a one-way `SHA-256` hash. This effectively anonymizes the data while preserving system analytics.
   - The backend tells the frontend to update the smart contract `FileRegistry`, marking the file's boolean flag `isDeleted = true`.

---
*Built via advanced integration of Solidity, React, Express, and modern Zero-Knowledge Cryptography.*
