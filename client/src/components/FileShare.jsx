import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getSigner, getAccessControl, getTimeBoundPermissions } from "../utils/blockchain";

export default function FileShare({ account, initialFileId = null }) {
    const [fileId, setFileId] = useState(initialFileId || "");
    const [recipient, setRecipient] = useState("");
    const [duration, setDuration] = useState(3600); // Default 1 hour
    const [attributes, setAttributes] = useState([
        { key: "role", value: "doctor" }
    ]);
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        if (initialFileId) setFileId(initialFileId);
    }, [initialFileId]);

    const handleAddAttribute = () => setAttributes([...attributes, { key: "", value: "" }]);

    const handleAttrChange = (index, field, val) => {
        const newAttrs = [...attributes];
        newAttrs[index][field] = val;
        setAttributes(newAttrs);
    };

    const handleRemoveAttribute = (index) => {
        const newAttrs = [...attributes];
        newAttrs.splice(index, 1);
        setAttributes(newAttrs);
    };

    const submitShare = async (e) => {
        e.preventDefault();
        if (!fileId || !recipient) return toast.error("File ID and Recipient address required");

        try {
            setIsSharing(true);
            const toastId = toast.loading("Executing ABE key share...");

            // 1. Format policy attributes
            const formattedAttrs = attributes
                .filter((a) => a.key && a.value)
                .map((a) => `${a.key}:${a.value}`);

            // We simulate passing the AES Key from the uploader's keystore. 
            // In a real localized app, the sender decrypts their own master share locally.
            // For this demo, we use a placeholder hex that the backend mock uses.
            const dummyAesKeyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
            const dummyMasterKeyHex = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

            // 2. Call backend to perform ABE wrap
            const res = await fetch("/api/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileId,
                    ownerAddress: account,
                    recipientAddress: recipient,
                    recipientAttributes: formattedAttrs,
                    expiryDurationSeconds: Number(duration),
                    aesKeyHex: dummyAesKeyHex,
                    masterKeyHex: dummyMasterKeyHex,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Share failed on backend");

            toast.update(toastId, { render: "Writing access policies to Blockchain...", type: "info" });

            // 3. Setup Blockchain Contracts
            const signer = await getSigner();
            const accessControl = await getAccessControl(signer);
            const timeBound = await getTimeBoundPermissions(signer);

            // We must hash the string attributes into bytes32 for on-chain storage
            const { ethers } = await import("ethers");
            const bytes32Attrs = formattedAttrs.map((attr) =>
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes(attr))
            );

            // 4. On-chain ABAC: grant explicit access + set recipient attributes
            const tx1 = await accessControl.grantAccess(
                fileId,
                recipient,
                bytes32Attrs
            );
            await tx1.wait();

            // 5. On-chain TimeBound Permissions
            const tx2 = await timeBound.grantTimedAccess(
                recipient,
                fileId,
                Number(duration)
            );
            await tx2.wait();

            toast.update(toastId, {
                render: "Share complete! Access granted.",
                type: "success",
                isLoading: false,
                autoClose: 3000,
            });

            // Reset form
            if (!initialFileId) setFileId("");
            setRecipient("");

        } catch (err) {
            console.error(err);
            toast.dismiss();
            toast.error(err.message || "Sharing failed");
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Share File Access</h2>
                <p className="text-gray-400 text-sm">
                    Grant time-limited access backed by CP-ABE (Ciphertext-Policy Attribute-Based Encryption).
                </p>
            </div>

            <form onSubmit={submitShare} className="space-y-6">
                {/* File ID */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">File ID</label>
                    <input
                        type="number"
                        value={fileId}
                        onChange={(e) => setFileId(e.target.value)}
                        className="input-cyber"
                        placeholder="e.g. 0"
                        required
                        readOnly={!!initialFileId}
                    />
                </div>

                {/* Recipient */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Recipient Address</label>
                    <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="input-cyber font-mono"
                        placeholder="0x..."
                        required
                    />
                </div>

                {/* Expiry Duration */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Access Duration</label>
                    <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="input-cyber bg-dark-800"
                    >
                        <option value={60}>1 Minute (Demo testing)</option>
                        <option value={3600}>1 Hour</option>
                        <option value={86400}>24 Hours</option>
                        <option value={604800}>7 Days</option>
                    </select>
                </div>

                {/* Access Policy Requirements */}
                <div className="bg-dark-800 rounded-xl p-5 border border-purple-900/30">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-semibold text-purple-100 text-sm">ABE Policy (Required Attributes)</h3>
                            <p className="text-xs text-gray-400 mt-1">Recipient must possess ALL these to decrypt</p>
                        </div>
                        <button type="button" onClick={handleAddAttribute} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                            <span>+ Add Attr</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {attributes.map((attr, idx) => (
                            <div key={idx} className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Key (e.g. dept)"
                                    value={attr.key}
                                    onChange={(e) => handleAttrChange(idx, "key", e.target.value)}
                                    className="input-cyber w-1/3 py-2 text-xs border-purple-900/40 focus:border-purple-500"
                                />
                                <span className="text-gray-500 self-center">:</span>
                                <input
                                    type="text"
                                    placeholder="Value (e.g. hr)"
                                    value={attr.value}
                                    onChange={(e) => handleAttrChange(idx, "value", e.target.value)}
                                    className="input-cyber flex-grow py-2 text-xs border-purple-900/40 focus:border-purple-500"
                                />
                                {attributes.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveAttribute(idx)} className="text-red-400 hover:text-red-300 px-2">
                                        &times;
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSharing || !fileId || !recipient}
                    className="btn-primary w-full py-3.5 text-base bg-gradient-to-r from-purple-600 to-cyber-600 hover:from-purple-500 hover:to-cyber-500 shadow-purple-500/20"
                >
                    {isSharing ? "Executing Secure Share..." : "Grant Access & Encode ABE Keys"}
                </button>
            </form>
        </div>
    );
}
