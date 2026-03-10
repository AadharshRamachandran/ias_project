/**
 * envConfig.js
 * 
 * Centralized environment configuration loader
 * Loads from project root .env file
 * Used by all backend services
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root (parent of backend directory)
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

module.exports = {
    // Pinata Configuration
    pinata: {
        apiKey: process.env.PINATA_API_KEY,
        apiSecret: process.env.PINATA_API_SECRET,
        gateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud',
    },
    
    // Blockchain Configuration
    blockchain: {
        alchemyKey: process.env.ALCHEMY_API_KEY,
        privateKey: process.env.PRIVATE_KEY,
        contractAddress: process.env.CONTRACT_ADDRESS,
    },
    
    // Server Configuration
    server: {
        port: process.env.PORT || 3001,
        nodeEnv: process.env.NODE_ENV || 'development',
    },
};
