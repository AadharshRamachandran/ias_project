"use strict";
const crypto = require("crypto");

/**
 * abeService.js – Simplified CP-ABE using Shamir's Secret Sharing
 *
 * Full pairing-based ABE is complex in pure JS; we implement a practical
 * simplified version:
 *  • setup()    → generates master key + public parameters
 *  • keyGen()   → splits master secret into shares keyed by attribute tags
 *  • encrypt()  → threshold-encodes the AES key; each share is encrypted with
 *                 an HKDF-derived per-attribute key (from masterKey + attribute)
 *  • decrypt()  → user collects shares for their attributes, reconstructs AES key
 *  • verifyPolicy() → pure attribute intersection check
 *
 * The on-chain ABAC in FileAccessControl.sol provides the second layer of
 * enforcement. This layer adds cryptographic enforcement in the backend.
 */

const PRIME = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
); // BN128 scalar field order

// ──────────────────────────── Shamir SSS helpers ──────────────────────────

function modInverse(a, p) {
    let [old_r, r] = [a, p];
    let [old_s, s] = [1n, 0n];
    while (r !== 0n) {
        const q = old_r / r;
        [old_r, r] = [r, old_r - q * r];
        [old_s, s] = [s, old_s - q * s];
    }
    return ((old_s % p) + p) % p;
}

function lagrangeInterpolate(shares, p) {
    // shares: [{x: BigInt, y: BigInt}]
    let secret = 0n;
    for (let i = 0; i < shares.length; i++) {
        let num = 1n;
        let den = 1n;
        for (let j = 0; j < shares.length; j++) {
            if (i === j) continue;
            num = (num * ((0n - shares[j].x + p) % p)) % p;
            den = (den * ((shares[i].x - shares[j].x + p) % p)) % p;
        }
        secret = (secret + shares[i].y * num * modInverse(den, p)) % p;
    }
    return secret;
}

function splitSecret(secret, threshold, numShares, prime) {
    const coefficients = [secret];
    for (let i = 1; i < threshold; i++) {
        const coeff = BigInt("0x" + crypto.randomBytes(32).toString("hex")) % prime;
        coefficients.push(coeff);
    }
    const shares = [];
    for (let x = 1n; x <= BigInt(numShares); x++) {
        let y = 0n;
        for (let i = 0; i < coefficients.length; i++) {
            y = (y + coefficients[i] * x ** BigInt(i)) % prime;
        }
        shares.push({ x, y });
    }
    return shares;
}

// ──────────────────────────── Per-attribute encryption ────────────────────

function deriveAttrKey(masterKey, attribute) {
    return crypto
        .createHmac("sha256", masterKey)
        .update(attribute)
        .digest();
}

function encryptShare(share, attrKey) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", attrKey, iv);
    const plaintext = Buffer.from(share.y.toString(16).padStart(64, "0"), "hex");
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        x: share.x.toString(),
        iv: iv.toString("hex"),
        enc: enc.toString("hex"),
        authTag: authTag.toString("hex"),
    };
}

function decryptShare(encShare, attrKey) {
    const iv = Buffer.from(encShare.iv, "hex");
    const enc = Buffer.from(encShare.enc, "hex");
    const authTag = Buffer.from(encShare.authTag, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", attrKey, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    return { x: BigInt(encShare.x), y: BigInt("0x" + plain.toString("hex")) };
}

// ──────────────────────────── Public API ──────────────────────────────────

/**
 * Generate master key and public parameters.
 * @returns {{ masterKey: Buffer, publicParams: { threshold: number } }}
 */
function setup(threshold = 2) {
    const masterKey = crypto.randomBytes(32);
    return { masterKey, publicParams: { threshold } };
}

/**
 * Generate a user secret key (set of attribute-encrypted shares).
 * @param {Buffer}   masterKey       From setup().
 * @param {string[]} userAttributes  e.g. ["role:doctor", "org:hospital"]
 * @param {Buffer}   secretToShare   The AES key to protect (32 bytes).
 * @param {number}   threshold       Minimum attributes needed to reconstruct.
 * @returns {{ shares: object[], policy: string[] }}
 */
function keyGen(masterKey, userAttributes, secretToShare, threshold) {
    if (userAttributes.length < threshold) {
        throw new Error("ABE: need at least threshold attributes for key generation");
    }
    const secret = BigInt("0x" + secretToShare.toString("hex")) % PRIME;
    const rawShares = splitSecret(secret, threshold, userAttributes.length, PRIME);

    const shares = rawShares.map((share, i) => {
        const attr = userAttributes[i];
        const attrKey = deriveAttrKey(masterKey, attr);
        return {
            attribute: attr,
            ...encryptShare(share, attrKey),
        };
    });

    return { shares, policy: userAttributes, threshold };
}

/**
 * Encrypt a message (AES key buffer) under a threshold policy.
 * Returns a ciphertext object that can only be decrypted by a user
 * who possesses >= threshold of the required attributes.
 */
function encrypt(message, accessPolicy, masterKey, threshold) {
    return keyGen(masterKey, accessPolicy, message, threshold);
}

/**
 * Decrypt a ciphertext (reconstruct the AES key buffer).
 * @param {object}   ciphertext     From encrypt() or keyGen().
 * @param {Buffer}   masterKey      From setup() (keeps it server-side).
 * @param {string[]} userAttributes The decrypting user's attributes.
 * @returns {Buffer}  Reconstructed secret (AES key).
 */
function decrypt(ciphertext, masterKey, userAttributes) {
    const { shares, threshold } = ciphertext;

    // Filter shares to those the user can decrypt (attributes they possess)
    const userAttrSet = new Set(userAttributes);
    const decryptable = shares.filter((s) => userAttrSet.has(s.attribute));

    if (decryptable.length < threshold) {
        throw new Error(
            `ABE: insufficient attributes (have ${decryptable.length}, need ${threshold})`
        );
    }

    const recoveredShares = decryptable.slice(0, threshold).map((s) => {
        const attrKey = deriveAttrKey(masterKey, s.attribute);
        return decryptShare(s, attrKey);
    });

    const secret = lagrangeInterpolate(recoveredShares, PRIME);
    const hex = secret.toString(16).padStart(64, "0");
    return Buffer.from(hex.slice(-64), "hex"); // last 32 bytes = AES key
}

/**
 * Check if userAttributes satisfy the access policy (subset check).
 * @param {string[]} userAttributes
 * @param {string[]} policy          Required attributes.
 * @returns {boolean}
 */
function verifyPolicy(userAttributes, policy) {
    const userSet = new Set(userAttributes);
    return policy.every((attr) => userSet.has(attr));
}

module.exports = { setup, keyGen, encrypt, decrypt, verifyPolicy };
