export const CONTRACTS = {
  // Sepolia Testnet Addresses
  energyToken: "0x8B62Df665a11193f7Ff3a139488151910Af897DC",
  priceOracle: "0xCD3B568a437cb003d497f1eC0E2eD351633C4C54",
  dataRegistry: "0x62Bde0e9847b21736A6D0379d894789E537b01ad",
  marketplace: "0x71e4ffcaE6C23dFeBF8E20d654e73D0DFB6F08A4",
} as const;

export const BACKEND_URL = "http://localhost:3000";

export const SEPOLIA_CHAIN_ID = 11155111;

export const NETWORK_CONFIG = {
  chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
  chainName: "Sepolia Testnet",
  nativeCurrency: {
    name: "Sepolia ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://eth-sepolia.g.alchemy.com/v2/QTfxgWpJDwg4ZZeIJCc1U"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};