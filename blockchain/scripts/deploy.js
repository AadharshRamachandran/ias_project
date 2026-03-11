const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log(
        "Account balance:",
        ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
        "ETH"
    );

    // ── 1. FileRegistry ──────────────────────────────────────────────────
    console.log("\n📦 Deploying FileRegistry...");
    const FileRegistry = await ethers.getContractFactory("FileRegistry");
    const fileRegistry = await FileRegistry.deploy();
    await fileRegistry.waitForDeployment();
    const fileRegistryAddr = await fileRegistry.getAddress();
    console.log("✅ FileRegistry deployed to:", fileRegistryAddr);

    // ── 2. FileAccessControl ─────────────────────────────────────────────
    console.log("\n📦 Deploying FileAccessControl...");
    const FileAccessControl = await ethers.getContractFactory("FileAccessControl");
    const accessControl = await FileAccessControl.deploy();
    await accessControl.waitForDeployment();
    const accessControlAddr = await accessControl.getAddress();
    console.log("✅ FileAccessControl deployed to:", accessControlAddr);

    // ── 3. TimeBoundPermissions ──────────────────────────────────────────
    console.log("\n📦 Deploying TimeBoundPermissions...");
    const TimeBoundPermissions = await ethers.getContractFactory("TimeBoundPermissions");
    const timeBound = await TimeBoundPermissions.deploy();
    await timeBound.waitForDeployment();
    const timeBoundAddr = await timeBound.getAddress();
    console.log("✅ TimeBoundPermissions deployed to:", timeBoundAddr);

    // ── 4. GDPRCompliance ────────────────────────────────────────────────
    console.log("\n📦 Deploying GDPRCompliance...");
    const GDPRCompliance = await ethers.getContractFactory("GDPRCompliance");
    const gdpr = await GDPRCompliance.deploy();
    await gdpr.waitForDeployment();
    const gdprAddr = await gdpr.getAddress();
    console.log("✅ GDPRCompliance deployed to:", gdprAddr);

    // ── 5. ZKPVerifier ───────────────────────────────────────────────────
    console.log("\n📦 Deploying ZKPVerifier (Basic Integrity)...");
    const ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
    const zkpVerifier = await ZKPVerifier.deploy();
    await zkpVerifier.waitForDeployment();
    const zkpVerifierAddr = await zkpVerifier.getAddress();
    console.log("✅ ZKPVerifier deployed to:", zkpVerifierAddr);

    // ── Save addresses ───────────────────────────────────────────────────
    const addresses = {
        network: "localhost",
        chainId: 1337,
        deployedAt: new Date().toISOString(),
        contracts: {
            FileRegistry: fileRegistryAddr,
            FileAccessControl: accessControlAddr,
            TimeBoundPermissions: timeBoundAddr,
            GDPRCompliance: gdprAddr,
            ZKPVerifier: zkpVerifierAddr,
        },
    };

    const outPath = path.join(__dirname, "..", "deployed_addresses.json");
    fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
    console.log("\n📝 Contract addresses saved to deployed_addresses.json");

    // Also write addresses for client consumption
    const frontendOut = path.join(
        __dirname,
        "..",
        "..",
        "client",
        "src",
        "contracts",
        "addresses.json"
    );
    fs.mkdirSync(path.dirname(frontendOut), { recursive: true });
    fs.writeFileSync(frontendOut, JSON.stringify(addresses, null, 2));
    console.log("📝 Addresses also saved to client/src/contracts/addresses.json");

    // Also write addresses for backend consumption
    const backendOut = path.join(
        __dirname,
        "..",
        "..",
        "backend",
        "contracts",
        "addresses.json"
    );
    fs.mkdirSync(path.dirname(backendOut), { recursive: true });
    fs.writeFileSync(backendOut, JSON.stringify(addresses, null, 2));
    console.log("📝 Addresses also saved to backend/contracts/addresses.json");

    console.log("\n🎉 All contracts deployed successfully!");
    console.log("─".repeat(60));
    console.log("Next steps:");
    console.log("  1. cd backend && node server.js");
    console.log("  2. cd client && npm run dev");
    console.log("  3. Open http://localhost:5173 in your browser");
    console.log("  4. Connect MetaMask to http://localhost:8545 (Chain ID: 1337)");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
