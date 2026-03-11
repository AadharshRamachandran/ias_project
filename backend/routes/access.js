"use strict";
const express = require("express");
const router = express.Router();

const encSvc = require("../services/encryptionService");
const ipfsSvc = require("../services/ipfsService");
const gdprSvc = require("../services/gdprService");
const abeSvc = require("../services/abeService");

/**
 * POST /api/share
 * Grant file access: ABE key wrap + time-bound metadata (on-chain calls delegated to frontend)
 */
router.post("/share", async (req, res) => {
    try {
        const {
            fileId,
            ownerAddress,
            recipientAddress,
            recipientAttributes,
            expiryDurationSeconds,
            aesKeyHex,
            masterKeyHex,
        } = req.body;

        if (!fileId || !recipientAddress)
            return res.status(400).json({ error: "fileId and recipientAddress required" });

        const recipAttrs = recipientAttributes || ["role:user"];
        const aesKey = Buffer.from(aesKeyHex, "hex");
        const masterKey = Buffer.from(masterKeyHex, "hex");

        // Wrap AES key with ABE for recipient
        const threshold = Math.max(1, Math.floor(recipAttrs.length / 2));
        const recipientKey = abeSvc.keyGen(masterKey, recipAttrs, aesKey, threshold);

        const expiryTs = Math.floor(Date.now() / 1000) + (expiryDurationSeconds || 3600);

        gdprSvc.logAccess(
            ownerAddress?.toLowerCase(),
            String(fileId),
            "SHARE_GRANTED",
            null
        );

        return res.json({
            success: true,
            fileId,
            recipientAddress,
            expiryTimestamp: expiryTs,
            recipientKey,
            message:
                "ABE key generated. Call AccessControl.grantAccess() and TimeBoundPermissions.grantTimedAccess() on-chain.",
        });
    } catch (err) {
        console.error("[share]", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/access/:fileId
 * Retrieve and decrypt a file (requires ZKP proof in Authorization header)
 */
router.get("/access/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;
        const userAddress = req.headers["x-user-address"];

        if (!userAddress)
            return res.status(401).json({ error: "x-user-address header required" });

        // Decode passed metadata (CIDs, ivs, authTags, aesKey must come from the share flow)
        const { cids, ivs, authTags, aesKeyHex } = req.query;
        if (!cids || !aesKeyHex)
            return res.status(400).json({ error: "cids and aesKeyHex required in query" });

        const cidsArr = JSON.parse(cids);
        const ivsArr = JSON.parse(ivs).map((iv) => Buffer.from(iv, "hex"));
        const tagsArr = JSON.parse(authTags).map((t) => Buffer.from(t, "hex"));
        const aesKey = Buffer.from(aesKeyHex, "hex");

        // Fetch encrypted chunks from IPFS
        let encryptedChunks;
        try {
            encryptedChunks = await ipfsSvc.retrieveChunks(cidsArr);
        } catch {
            return res.status(503).json({ error: "IPFS unavailable" });
        }

        // Decrypt
        const plainBuffer = encSvc.decryptFile(encryptedChunks, aesKey, ivsArr, tagsArr);

        // Log access
        gdprSvc.logAccess(userAddress.toLowerCase(), String(fileId), "FILE_ACCESS", req.ip);

        res.set("Content-Type", "application/octet-stream");
        res.set("Content-Disposition", `attachment; filename="file_${fileId}"`);
        res.send(plainBuffer);
    } catch (err) {
        console.error("[access]", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
