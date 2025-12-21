// Centralized client-side config for build-time environment values.
// Read values from CRA env vars (must be prefixed with REACT_APP_).

export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || null;
export const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY || null;
export const PINATA_SECRET_API_KEY = process.env.REACT_APP_PINATA_SECRET_API_KEY || null;

// You can import { CONTRACT_ADDRESS } from './config' in your components.
