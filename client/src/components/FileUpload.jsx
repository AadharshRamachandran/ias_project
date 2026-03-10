import React, { useState } from "react";
import { toast } from "react-toastify";
import { getSigner, getFileRegistry, getAccessControl, getTimeBoundPermissions, signAuthMessage } from "../utils/blockchain";

export default function FileUpload({ account, onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [attributes, setAttributes] = useState([
        { key: "role", value: "user" },
        { key: "org", value: "public" }
    ]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState("");

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

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

    const submitUpload = async (e) => {
        e.preventDefault();
        if (!file) return toast.error("Please select a file to upload");

        try {
            setIsUploading(true);
            setStage("Preparing secure packet...");
            setProgress(10);

            // 1. Format attributes
            const formattedAttrs = attributes
                .filter((a) => a.key && a.value)
                .map((a) => `${a.key}:${a.value}`);

            // 2. Sign auth message for backend
            const signer = await getSigner();
            const auth = await signAuthMessage(signer);

            // 3. Prepare FormData
            const formData = new FormData();
            formData.append("file", file);
            formData.append("userAddress", account);
            formData.append("fileName", file.name);
            formData.append("attributes", JSON.stringify(formattedAttrs));

            // 4. Send to backend (Encrypt + IPFS + ZKP + GDPR db)
            setStage("Encrypting (AES-256-GCM) & sending to IPFS...");
            setProgress(40);

            const res = await fetch("/api/upload", {
                method: "POST",
                headers: {
                    "x-user-address": auth.address,
                    "x-signature": auth.signature,
                    "x-message": auth.message,
                },
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Upload failed on backend");

            // 5. Register on Blockchain
            setStage("Writing ZKP verified CIDs to Blockchain...");
            setProgress(75);

            const fileRegistry = await getFileRegistry(signer);

            // We pass the CIDs and the first 32 bytes of the fileHash to the contract
            const fileHashBytes32 = "0x" + data.fileHashHex.slice(0, 64);

            const tx = await fileRegistry.uploadFile(
                data.cids,
                fileHashBytes32,
                file.name,
                file.size
            );

            setStage("Waiting for block confirmation...");
            setProgress(85);

            const receipt = await tx.wait();

            // Extract fileId from FileUploaded event
            let newFileId;
            if (receipt.events) {
                const event = receipt.events.find(e => e.event === 'FileUploaded');
                if (event && event.args) {
                    newFileId = event.args.fileId.toNumber();
                }
            }

            if (newFileId !== undefined) {
                setStage("Registering ABAC ownership...");
                setProgress(95);
                const accessControl = await getAccessControl(signer);
                const txOwner = await accessControl.registerFileOwner(newFileId);
                await txOwner.wait();

                setStage("Registering TimeBound ownership...");
                const timeBound = await getTimeBoundPermissions(signer);
                const txTbp = await timeBound.registerFileOwner(newFileId);
                await txTbp.wait();
            }

            setProgress(100);
            setStage("Complete!");
            toast.success("File uploaded securely to IPFS and Blockchain!");

            if (onUploadSuccess) {
                setTimeout(onUploadSuccess, 1500);
            }

        } catch (err) {
            console.error(err);
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Secure File Upload</h2>
                <p className="text-gray-400 text-sm">
                    Files are encrypted client-side contextually (simulated backend), sliced, and pinned to IPFS. A Zero-Knowledge Proof is generated to prove data integrity.
                </p>
            </div>

            <form onSubmit={submitUpload} className="space-y-6">
                {/* File Dropzone */}
                <div className="border-2 border-dashed border-cyber-700/50 rounded-xl p-8 text-center bg-dark-800/50 hover:bg-dark-700/50 transition-colors">
                    <input
                        type="file"
                        id="fileDrop"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    <label htmlFor="fileDrop" className="cursor-pointer flex flex-col items-center">
                        <svg className="w-12 h-12 text-cyber-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-gray-200 font-medium text-lg">
                            {file ? file.name : "Click to browse or drop file here"}
                        </span>
                        {file && (
                            <span className="text-cyber-500 text-sm mt-2">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || "unknown type"}
                            </span>
                        )}
                    </label>
                </div>

                {/* My Attributes (Metadata connected to the file for ABE policy simulation) */}
                <div className="bg-dark-800 rounded-xl p-5 border border-cyber-900/30">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-200 text-sm">My Upload Attributes (CP-ABE keys)</h3>
                        <button type="button" onClick={handleAddAttribute} className="text-xs text-cyber-400 hover:text-cyber-300 flex items-center gap-1">
                            <span>+ Add Attr</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {attributes.map((attr, idx) => (
                            <div key={idx} className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Key (e.g. role)"
                                    value={attr.key}
                                    onChange={(e) => handleAttrChange(idx, "key", e.target.value)}
                                    className="input-cyber w-1/3 py-2 text-xs"
                                />
                                <span className="text-gray-500 self-center">:</span>
                                <input
                                    type="text"
                                    placeholder="Value (e.g. doctor)"
                                    value={attr.value}
                                    onChange={(e) => handleAttrChange(idx, "value", e.target.value)}
                                    className="input-cyber flex-grow py-2 text-xs"
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

                {/* Progress Bar */}
                {isUploading && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-cyber-300">
                            <span>{stage}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="progress-bar overflow-hidden border border-cyber-900/50">
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}

                <button type="submit" disabled={!file || isUploading} className="btn-primary w-full py-3.5 text-base shadow-cyber-500/20">
                    {isUploading ? "Processing secure upload..." : "Encrypt & Upload File"}
                </button>
            </form>
        </div>
    );
}
