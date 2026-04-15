import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

// ============================================
// COMPLETE CONTRACT ABIs - Matching Your Contracts
// ============================================

const ENERGY_TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function getUserStats(address user) view returns (uint256 totalMinted, uint256 totalBurned, uint256 currentBalance)',
  'function totalSupply() view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

const DATA_REGISTRY_ABI = [
  'function getUserProfile(address user) view returns (uint256 totalConsumption, uint256 totalProduction, uint256 totalSurplusGenerated, uint256 currentSurplus, uint256 lastUpdateTime, string houseId)',
  'function getAvailableSurplus(address user) view returns (uint256)',
  'function getAllUsers() view returns (address[])',
  'function getAddressFromHouseId(string houseId) view returns (address)',
  'event UserRegistered(address indexed user, string houseId)',
  'event EnergyDataRegistered(address indexed user, uint256 consumption, uint256 production, int256 surplus, uint256 timestamp)',
];

const MARKETPLACE_ABI = [
  'function listEnergy(uint256 energyAmount, uint256 pricePerUnit, uint8 listingType) returns (uint256)',
  'function buyEnergy(uint256 listingId, uint256 energyAmount) payable',
  'function cancelListing(uint256 listingId)',
  'function getActiveListings() view returns (uint256[])',
  'function getListing(uint256 listingId) view returns (address seller, uint256 energyAmount, uint256 pricePerUnit, uint256 remainingAmount, bool isActive)',
  'function getUserListings(address user) view returns (uint256[])',
  'function calculateTotalCost(uint256 listingId, uint256 energyAmount) view returns (uint256 energyCost, uint256 platformFee, uint256 totalCost)',
  'event EnergyListed(uint256 indexed listingId, address indexed seller, uint256 energyAmount, uint256 pricePerUnit, uint8 listingType)',
  'event EnergyPurchased(uint256 indexed tradeId, uint256 indexed listingId, address indexed buyer, address seller, uint256 energyAmount, uint256 totalPrice)',
];

const PRICE_ORACLE_ABI = [
  'function getCurrentPrice() view returns (uint256)',
  'function basePrice() view returns (uint256)',
  'function currentPrice() view returns (uint256)',
  'function getSupplyDemand() view returns (uint256 supply, uint256 demand)',
  'event PriceUpdated(uint256 indexed timestamp, uint256 oldPrice, uint256 newPrice, uint256 supply, uint256 demand)',
];

// ============================================
// Contract Addresses (from your .env file)
// ============================================
const CONTRACT_ADDRESSES = {
  ENERGY_TOKEN: '0x8B62Df665a11193f7Ff3a139488151910Af897DC',
  PRICE_ORACLE: '0xCD3B568a437cb003d497f1eC0E2eD351633C4C54',
  DATA_REGISTRY: '0x62Bde0e9847b21736A6D0379d894789E537b01ad',
  MARKETPLACE: '0x71e4ffcaE6C23dFeBF8E20d654e73D0DFB6F08A4',
};

interface Web3ContextType {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  address: string | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToSepolia: () => Promise<void>;
  
  // Contract instances
  tokenContract: ethers.Contract | null;
  marketplaceContract: ethers.Contract | null;
  dataRegistryContract: ethers.Contract | null;
  priceOracleContract: ethers.Contract | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  
  // Contract states
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  const [dataRegistryContract, setDataRegistryContract] = useState<ethers.Contract | null>(null);
  const [priceOracleContract, setPriceOracleContract] = useState<ethers.Contract | null>(null);

  const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex

  const checkNetwork = async (provider: ethers.providers.Web3Provider) => {
    try {
      const network = await provider.getNetwork();
      const isCorrect = network.chainId === 11155111;
      setIsCorrectNetwork(isCorrect);
      return isCorrect;
    } catch (error) {
      console.error('Network check error:', error);
      return false;
    }
  };

  const initializeContracts = (signer: ethers.Signer) => {
    try {
      // Initialize all contracts
      const token = new ethers.Contract(
        CONTRACT_ADDRESSES.ENERGY_TOKEN,
        ENERGY_TOKEN_ABI,
        signer
      );
      const marketplace = new ethers.Contract(
        CONTRACT_ADDRESSES.MARKETPLACE,
        MARKETPLACE_ABI,
        signer
      );
      const dataRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.DATA_REGISTRY,
        DATA_REGISTRY_ABI,
        signer
      );
      const priceOracle = new ethers.Contract(
        CONTRACT_ADDRESSES.PRICE_ORACLE,
        PRICE_ORACLE_ABI,
        signer
      );

      setTokenContract(token);
      setMarketplaceContract(marketplace);
      setDataRegistryContract(dataRegistry);
      setPriceOracleContract(priceOracle);

      console.log('✅ Contracts initialized successfully');
    } catch (error) {
      console.error('Contract initialization error:', error);
      toast.error('Failed to initialize contracts');
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        toast.error('Please install MetaMask!');
        window.open('https://metamask.io/download/', '_blank');
        return;
      }

      // Request account access
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length === 0) {
        toast.error('No accounts found');
        return;
      }

      const signer = provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAddress(address);
      setIsConnected(true);

      // Store connection state in localStorage
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletAddress', address);

      // Check network
      const isCorrect = await checkNetwork(provider);
      
      if (!isCorrect) {
        toast.error('Please switch to Sepolia network', {
          duration: 5000,
        });
      } else {
        // Initialize contracts only if on correct network
        initializeContracts(signer);
        toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      
      // Handle specific error cases
      if (error.code === 4001) {
        toast.error('Connection rejected');
      } else {
        toast.error(error.message || 'Failed to connect wallet');
      }
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setIsConnected(false);
    setIsCorrectNetwork(false);
    setTokenContract(null);
    setMarketplaceContract(null);
    setDataRegistryContract(null);
    setPriceOracleContract(null);
    
    // Clear connection state from localStorage
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    
    toast.success('Wallet disconnected');
  };

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      
      toast.success('Switched to Sepolia network');
      
      // Re-initialize contracts after network switch
      if (signer) {
        const isCorrect = await checkNetwork(provider!);
        if (isCorrect) {
          initializeContracts(signer);
        }
      }
    } catch (error: any) {
      // This error code means the chain hasn't been added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          toast.success('Sepolia network added');
        } catch (addError) {
          console.error('Failed to add network:', addError);
          toast.error('Failed to add Sepolia network');
        }
      } else {
        console.error('Failed to switch network:', error);
        toast.error('Failed to switch network');
      }
    }
  };

  // Auto-reconnect on page load
  useEffect(() => {
    const autoConnect = async () => {
      const wasConnected = localStorage.getItem('walletConnected');
      const savedAddress = localStorage.getItem('walletAddress');
      
      if (wasConnected === 'true' && typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const accounts = await provider.listAccounts();
          
          if (accounts.length > 0) {
            const signer = provider.getSigner();
            const address = await signer.getAddress();

            // Verify the address matches
            if (!savedAddress || address.toLowerCase() === savedAddress.toLowerCase()) {
              setProvider(provider);
              setSigner(signer);
              setAddress(address);
              setIsConnected(true);

              const isCorrect = await checkNetwork(provider);
              if (isCorrect) {
                initializeContracts(signer);
                console.log('✅ Auto-reconnected to wallet');
              }
            } else {
              // Address mismatch, clear storage
              localStorage.removeItem('walletConnected');
              localStorage.removeItem('walletAddress');
            }
          } else {
            // No accounts found, clear the connection flag
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAddress');
          }
        } catch (error) {
          console.error('Auto-connect error:', error);
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('walletAddress');
        }
      }
    };

    autoConnect();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (address && accounts[0].toLowerCase() !== address.toLowerCase()) {
          // Account changed, reconnect with new account
          connectWallet();
        }
      };

      const handleChainChanged = () => {
        // Reload page on chain change
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Cleanup
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [address]);

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        address,
        isConnected,
        isCorrectNetwork,
        connectWallet,
        disconnectWallet,
        switchToSepolia,
        tokenContract,
        marketplaceContract,
        dataRegistryContract,
        priceOracleContract,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}