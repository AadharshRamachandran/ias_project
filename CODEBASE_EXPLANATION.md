# SecureFileShare: Comprehensive Codebase Explanation

This document provides a detailed, block-by-block explanation of every major code file in the SecureFileShare decentralized application. The system is split into multiple modules: Smart Contracts, Backend Services, and Frontend Components.

---

## 1. Smart Contracts (Blockchain)
Located in `blockchain/contracts/`, these solidity files dictate the on-chain logic.

### 1.1 `FileRegistry.sol`
**Purpose**: Acts as the central decentralized database mapping files to their owners, hashes, and IPFS locations.
- **State Variables**: 
  - `_files`: A mapping of an auto-incrementing `fileId` to a `FileRecord` struct (containing the owner, IPFS CIDs, SHA-256 hash, and a deletion flag).
  - `_ownerFiles`: Maps a user's address to a list of their uploaded `fileId`s.
- **`uploadFile`**: Called by the frontend right after IPFS pinning. It takes the returned CIDs and File Hash, stores them in `_files`, assigns ownership to `msg.sender`, and emits a `FileUploaded` event.
- **`getFile`**: A view function that returns the metadata of a `fileId` for frontend rendering.
- **`deleteFile`**: A soft-delete mechanism. Since data cannot be physically erased from a blockchain, it sets the `isDeleted` flag to true, satisfying GDPR off-chain while keeping the on-chain audit trail intact.

### 1.2 `AccessControl.sol`
**Purpose**: Manages Attribute-Based Access Control (ABAC). It defines who can access what based on attributes.
- **State Variables**: 
  - `_userAttributes`: Maps an address to a list of bytes32 tags (e.g., hashed "role:doctor").
  - `_filePolicies`: Maps a `fileId` to the list of attributes a recipient *must* have to gain access.
  - `_accessGrants`: Explicit overrides where an owner directly grants an address access.
- **`setUserAttributes`**: Allows users or the admin to tag a user wallet with specific attributes in preparation for ZKP verification.
- **`definePolicy` & `grantAccess`**: The file owner can set a strict cryptographic policy for a file, or bypass the policy to explicitly grant access to a specific recipient address.
- **`checkAccess`**: The core view function. It iterates through the file's required policy attributes and ensures the requesting user's `_userAttributes` array contains every single mandatory tag.

### 1.3 `GDPRCompliance.sol`
**Purpose**: Implements GDPR Right-to-Erasure (Article 17) and Data Portability (Article 20) natively on Web3.
- **State Variables**: 
  - `_requests`: Maps a `requestId` to an `EraseRequest` struct (tracking requester, fileId, and fulfillment status).
  - `_userFiles`: Tracks files per user for simple Article 20 JSON exports.
- **`requestErasure`**: Called by a user wishing to assert their right to be forgotten. It logs an on-chain `EraseRequest` and flags it as unfulfilled.
- **`fulfillErasure`**: Called by the backend servers *after* it confirms the file has been unpinned from Pinata IPFS and the SQLite database PII has been hashed/anonymized. This closes the loop.

### 1.4 `TimeBoundPermissions.sol`
**Purpose**: Automatically enforces time-based expiry on shared files based on block timestamps.
- **State Variables**: 
  - `_permissions`: Maps a `permissionId` to a `Permission` struct (tracking the user, file, and exact expiration Unix timestamp).
- **`grantTimedAccess`**: Takes a `durationSeconds` parameter, adds it to `block.timestamp`, and saves the future expiry date.
- **`isAccessValid`**: A view function that strictly checks if the current `block.timestamp` is less than or equal to the `expiryTimestamp`. If it has passed, the smart contract naturally blocks access without needing a manual revocation transaction.
- **`revokePermission` & `extendAccess`**: Allows the file owner to manually cut access short or extend the time limit.

---

## 2. Backend Services
Located in `backend/services/`, these Node.js modules handle the heavy cryptographic off-chain operations.

### 2.1 `encryptionService.js`
**Purpose**: Manages AES-256-GCM file encryption and ECDH key wrapping.
- **`generateKeyPair`**: Generates a fast, ephemeral Elliptic Curve (P-256) public/private key pair.
- **`encryptFile`**: Takes a raw file buffer and splits it into 64KB chunks. It generates a single 256-bit AES key. It iterates over every chunk, creating a unique Initialization Vector (IV), and encrypts the chunk using `aes-256-gcm`. It also calculates a SHA-256 hash of each chunk for integrity verification.
- **`decryptFile`**: Reassembles the encrypted chunks back into a unified plaintext buffer using the AES key.
- **`wrapKey` & `unwrapKey`**: Safely transmits the AES key by encrypting it with a wrapping key derived via Diffie-Hellman from an ephemeral private key and the recipient's public key.

### 2.2 `abeService.js`
**Purpose**: Simplified Ciphertext-Policy Attribute-Based Encryption (CP-ABE) using Shamir's Secret Sharing over the BN128 prime curve.
- **`lagrangeInterpolate` & `splitSecret`**: The mathematical core. It takes the AES file key and splits it into cryptographic "shares" based on a polynomial equation.
- **`keyGen` (Encrypt)**: Derives a specific symmetric wrapping key for *each* required attribute tag using an HMAC of a Master Key and the tag. It then encrypts one Shamir share with each attribute key.
- **`decrypt`**: Validates the requested user's attributes. Uses the Master Key to recreate the attribute keys, decrypts individual shares, and then runs the Lagrange interpolation to fully reconstruct the AES key.

### 2.3 `ipfsService.js`
**Purpose**: Interfaces with the Pinata Cloud IPFS gateway using REST API endpoints.
- **`uploadFile`**: Creates a `FormData` object from a file buffer and POSTs it to `https://api.pinata.cloud/pinning/pinFileToIPFS`. It returns the `IpfsHash` (CID).
- **`unpinFile`**: Hits the Pinata `unpin` endpoint to delete an artifact from the IPFS network—a critical function for fulfilling GDPR right-to-erasure workflows.
- **`getFile`**: Retrieves a file buffer via a dedicated IPFS gateway URL using the CID.

### 2.4 `gdprService.js`
**Purpose**: A local, disk-based SQLite database wrapper for high-speed PII management.
- **`initDB`**: Bootstraps the `gdpr.db` file with four relational tables: `user_data_registry`, `erasure_requests`, `access_logs`, and `consent_records`.
- **`logAccess`**: Inserts a row tracking timestamped download/share actions.
- **`anonymizeUser`**: The core of the Right to be Forgotten. It doesn't drop the row; it hashes the user's Ethereum address, preserving system analytics while destroying the PII.

---

## 3. Backend API Routes
Located in `backend/routes/`.
- **`upload.js`**: Intercepts `multipart/form-data` uploads via Multer. Validates MetaMask wallet signatures (`x-signature`). Hands the buffer to `encryptionService`, uploads the cipher to `ipfsService`, logs it to SQLite via `gdprService`, and returns the payloads to the frontend.
- **`access.js`**: Handles file retrieval and sharing permissions. Retrieves IPFS data, wraps Shamir keys via `abeService` if policy conditions trigger, and ensures `TimeBoundPermissions` logic matches off-chain intent.
- **`gdpr.js`**: Exposes `/api/gdpr/export` (downloads an Article 20 JSON graph) and `/api/gdpr/erase` (invokes unpinning in `ipfsService.js` and anonymization in `gdprService.js`).

---

## 4. Frontend Components (React & Vite)
Located in `client/src/`. This layer controls the user interface and coordinates interactions between Web3 Wallets and the Node API.

### 4.1 `components/FileUpload.jsx`
**Flow**: 
1. The user drags/drops a file.
2. The user types in their "Attributes" (simulating a policy like `role:doctor`).
3. Formats these into FormData and triggers a MetaMask Signature request (via `signAuthMessage`) for authentication.
4. Posts to `backend/api/upload`.
5. Receives IPFS CIDs and the original file Hash from the backend.
6. Invokes `fileRegistry.uploadFile` from the Ethereum smart contract via ethers.js.

### 4.2 `components/FileShare.jsx`
**Flow**:
1. Takes an input of a specific File ID and a recipient MetaMask address.
2. Accepts a dropdown for Expiry Duration (e.g. 1 hour = 3600 seconds) and an array of required CP-ABE Attributes.
3. Makes an API call to `backend/api/share` to mathematically wrap the AES-256 keys.
4. Converts the string labels into `bytes32` hashes on the client side.
5. Invokes `accessControl.grantAccess` to lock policy parameters onto the blockchain.
6. Invokes `timeBound.grantTimedAccess` for the blockchain TTL countdown logic.

### 4.3 `components/AccessDashboard.jsx`
**Flow**:
Allows users to view their owned files versus the files shared *with them*. 
When downloading a file:
1. Validates `timeBound.isAccessValid(user, file)`.
2. Validates `accessControl.checkAccess(user, file)` locally before wasting gas/backend calls.
3. Hooks into `backend/api/access` to retrieve chunks, reconstructs the AES key from the Shamir shares, pieces together the file, and triggers a browser `blob` download for the user.

### 4.4 `components/GDPRPanel.jsx`
**Flow**:
Acts as the user-facing hub for Article 17 and Article 20.
- "Export Data" triggers the backend export generator stringifying the SQLite database content into a Blob.
- "Request Erasure" fires the `requestErasure` method on `GDPRCompliance.sol`, tracking the state locally, and then informs the backend to perform the IPFS unpinning operation before fulfilling the Smart Contract request dynamically.

### 4.5 `utils/blockchain.js` & `utils/ipfs.js`
