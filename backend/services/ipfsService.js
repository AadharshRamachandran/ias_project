"use strict";
const axios = require("axios");
const config = require("../envConfig");

/**
 * ipfsService.js
 *
 * Connects to Pinata IPFS (via centralized .env configuration)
 * Provides chunked upload/download with progress, pin management,
 * and availability checks.
 *
 * Uses environment variables from: ../envConfig.js
 * Which loads from project root .env file
 */

const PINATA_API_URL = "https://api.pinata.cloud";
const PINATA_GATEWAY = config.pinata.gateway;

function getPinataHeaders() {
    return {
        pinata_api_key: config.pinata.apiKey,
        pinata_secret_api_key: config.pinata.apiSecret,
    };
}

/**
 * Upload an array of encrypted chunk Buffers to Pinata IPFS.
 * Each chunk is stored as a separate IPFS object.
 *
 * @param {Buffer[]} encryptedChunks
 * @param {Function} [onProgress]  Called with ({chunkIndex, total, cid}) after each chunk.
 * @returns {Promise<string[]>}    Array of IPFS CIDs matching chunk order.
 */
async function uploadChunks(encryptedChunks, onProgress) {
    const cids = [];
    const headers = getPinataHeaders();

    for (let i = 0; i < encryptedChunks.length; i++) {
        const chunk = encryptedChunks[i];
        const formData = new FormData();
        const blob = new Blob([chunk], { type: "application/octet-stream" });
        formData.append("file", blob);
        formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
        formData.append("pinataMetadata", JSON.stringify({ name: `chunk-${i}` }));

        try {
            const response = await axios.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, formData, {
                headers: {
                    ...headers,
                    "Content-Type": "multipart/form-data",
                },
            });

            const cid = response.data.IpfsHash;
            cids.push(cid);

            if (onProgress) {
                onProgress({ chunkIndex: i, total: encryptedChunks.length, cid });
            }
        } catch (err) {
            console.error(`[uploadChunks] Failed to upload chunk ${i}:`, err.message);
            throw err;
        }
    }

    return cids;
}

/**
 * Retrieve an ordered set of encrypted chunks from Pinata IPFS by CID array.
 *
 * @param {string[]} cids  CIDs in chunk order.
 * @returns {Promise<Buffer[]>}  Encrypted chunk buffers in order.
 */
async function retrieveChunks(cids) {
    const chunks = [];

    for (const cid of cids) {
        try {
            const url = `${PINATA_GATEWAY}/ipfs/${cid}`;
            const response = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 30000,
            });
            chunks.push(Buffer.from(response.data));
        } catch (err) {
            console.error(`[retrieveChunks] Failed to retrieve CID ${cid}:`, err.message);
            throw err;
        }
    }

    return chunks;
}

/**
 * Pin a CID explicitly via Pinata.
 * @param {string} cid
 */
async function pinFile(cid) {
    const headers = getPinataHeaders();

    try {
        await axios.post(
            `${PINATA_API_URL}/pinning/pinByHash`,
            { hashToPin: cid },
            { headers }
        );
    } catch (err) {
        console.error(`[pinFile] Failed to pin CID ${cid}:`, err.message);
        throw err;
    }
}

/**
 * Unpin a CID from Pinata (GDPR erasure — allows content to be removed).
 * @param {string} cid
 */
async function unpinFile(cid) {
    const headers = getPinataHeaders();

    try {
        await axios.delete(`${PINATA_API_URL}/pinning/unpin/${cid}`, { headers });
    } catch (err) {
        // Silently ignore "not found" errors
        if (err.response?.status === 404 || err.message.includes("not found")) {
            console.warn(`[unpinFile] CID ${cid} not found on Pinata, skipping.`);
            return;
        }
        console.error(`[unpinFile] Failed to unpin CID ${cid}:`, err.message);
        throw err;
    }
}

/**
 * Check whether a CID is pinned on Pinata.
 * @param {string} cid
 * @returns {Promise<boolean>}
 */
async function checkAvailability(cid) {
    const headers = getPinataHeaders();

    try {
        const response = await axios.get(`${PINATA_API_URL}/data/pinList`, {
            params: { hashContains: cid },
            headers,
        });

        if (response.data.rows && response.data.rows.length > 0) {
            return response.data.rows.some((pin) => pin.ipfs_pin_hash === cid);
        }
        return false;
    } catch (err) {
        console.error(`[checkAvailability] Failed to check CID ${cid}:`, err.message);
        return false;
    }
}

/**
 * Get Pinata account usage statistics.
 * (Replacement for local garbage collection)
 */
async function getAccountStats() {
    const headers = getPinataHeaders();

    try {
        const response = await axios.get(`${PINATA_API_URL}/data/userPinnedDataTotal`, {
            headers,
        });
        return response.data;
    } catch (err) {
        console.error("[getAccountStats] Failed to fetch account stats:", err.message);
        throw err;
    }
}

/**
 * List all pinned files on Pinata.
 */
async function listPinnedFiles() {
    const headers = getPinataHeaders();

    try {
        const response = await axios.get(`${PINATA_API_URL}/data/pinList`, {
            headers,
        });
        return response.data.rows || [];
    } catch (err) {
        console.error("[listPinnedFiles] Failed to list pinned files:", err.message);
        throw err;
    }
}

module.exports = {
    uploadChunks,
    retrieveChunks,
    pinFile,
    unpinFile,
    checkAvailability,
    getAccountStats,
    listPinnedFiles,
};
