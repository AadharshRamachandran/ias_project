"use strict";
const { ethers } = require("ethers");

/**
 * auth.js – Ethereum signature-based authentication middleware.
 *
 * Every protected route should include the following headers:
 *   x-user-address   : Ethereum address e.g. "0xABCD..."
 *   x-signature      : ethers.utils.signMessage result
 *   x-message        : The plaintext message that was signed
 *
 * The message should be: `SecureFileShare:${timestamp}:${userAddress}`
 * where timestamp is a Unix timestamp (seconds) within ±5 minutes of server time.
 */

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000; // 5 minutes

function authMiddleware(req, res, next) {
    try {
        const address = req.headers["x-user-address"];
        const signature = req.headers["x-signature"];
        const message = req.headers["x-message"];

        if (!address || !signature || !message) {
            return res.status(401).json({
                error: "Authentication required: x-user-address, x-signature, x-message headers",
            });
        }

        // Parse and validate timestamp in message
        const parts = message.split(":");
        if (parts.length < 3 || parts[0] !== "SecureFileShare") {
            return res.status(401).json({ error: "Invalid message format" });
        }

        const msgTimestamp = parseInt(parts[1], 10) * 1000;
        if (Math.abs(Date.now() - msgTimestamp) > MAX_TIMESTAMP_SKEW_MS) {
            return res.status(401).json({ error: "Signature expired (>5 minutes)" });
        }

        // Verify the Ethereum signature
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            return res.status(403).json({ error: "Signature verification failed" });
        }

        // Attach verified address to request
        req.verifiedAddress = address.toLowerCase();
        next();
    } catch (err) {
        res.status(401).json({ error: "Auth error: " + err.message });
    }
}

/**
 * Optional: lightweight auth that only checks header presence (for dev/testing).
 */
function devAuthMiddleware(req, res, next) {
    const address = req.headers["x-user-address"];
    if (!address) {
        return res.status(401).json({ error: "x-user-address header required" });
    }
    req.verifiedAddress = address.toLowerCase();
    next();
}

module.exports = { authMiddleware, devAuthMiddleware };
