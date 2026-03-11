import { ethers } from "ethers";
import FileRegistryABI from "../../../blockchain/artifacts/contracts/FileRegistry.sol/FileRegistry.json";
import AccessControlABI from "../../../blockchain/artifacts/contracts/AccessControl.sol/FileAccessControl.json";
import TimeBoundPermissionsABI from "../../../blockchain/artifacts/contracts/TimeBoundPermissions.sol/TimeBoundPermissions.json";
import GDPRComplianceABI from "../../../blockchain/artifacts/contracts/GDPRCompliance.sol/GDPRCompliance.json";
import ZKPVerifierABI from "../../../blockchain/artifacts/contracts/ZKPVerifier.sol/ZKPVerifier.json";
// Fallback if addresses file wasn't generated correctly by deploy.js yet
import Addresses from "../contracts/addresses.json";

const CONTRACTS = Addresses.contracts || Addresses;

export async function getProvider() {
    if (!window.ethereum) throw new Error("MetaMask not found");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    // Attempt to auto-switch to Hardhat localhost network (Chain ID: 1337 / 0x539)
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x539' }],
        });
    } catch (switchError) {
        // Error 4902 implies the chain is not yet added to MetaMask
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x539',
                        chainName: 'Hardhat Local',
                        rpcUrls: ['http://127.0.0.1:8545/'],
                        nativeCurrency: {
                            name: 'Ethereum',
                            symbol: 'ETH',
                            decimals: 18
                        }
                    }],
                });
            } catch (addError) {
                console.warn("Failed to add Hardhat network:", addError);
            }
        } else {
            console.warn("Failed to switch to Hardhat network:", switchError);
        }
    }

    return provider;
}

export async function getSigner() {
    const provider = await getProvider();
    return provider.getSigner();
}

function getContract(address, abi, signerOrProvider) {
    return new ethers.Contract(address, abi.abi || abi, signerOrProvider);
}

export async function getFileRegistry(signer) {
    return getContract(CONTRACTS.FileRegistry, FileRegistryABI, signer);
}

export async function getAccessControl(signer) {
    return getContract(CONTRACTS.FileAccessControl, AccessControlABI, signer);
}

export async function getTimeBoundPermissions(signer) {
    return getContract(CONTRACTS.TimeBoundPermissions, TimeBoundPermissionsABI, signer);
}

export async function getGDPRCompliance(signer) {
    return getContract(CONTRACTS.GDPRCompliance, GDPRComplianceABI, signer);
}

export async function getZKPVerifier(signer) {
    return getContract(CONTRACTS.ZKPVerifier, ZKPVerifierABI, signer);
}

export async function signAuthMessage(signer) {
    const address = await signer.getAddress();
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `SecureFileShare:${timestamp}:${address}`;
    const signature = await signer.signMessage(message);
    return { address, signature, message };
}
