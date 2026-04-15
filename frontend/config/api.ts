import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// API Client with error handling
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ============================================
// Energy Data APIs
// ============================================

export const energyAPI = {
  // Get user profile
  getUserProfile: async (address: string) => {
    const response = await apiClient.get(`/api/energy/user/${address}`);
    return response.data;
  },

  // Get all users
  getAllUsers: async () => {
    const response = await apiClient.get('/api/energy/users');
    return response.data;
  },

  // Get user by house ID
  getUserByHouseId: async (houseId: string) => {
    const response = await apiClient.get(`/api/energy/house/${houseId}`);
    return response.data;
  },

  // Register user (if needed from frontend)
  registerUser: async (userAddress: string, houseId: string) => {
    const response = await apiClient.post('/api/energy/register-user', {
      userAddress,
      houseId,
    });
    return response.data;
  },
};

// ============================================
// Marketplace APIs
// ============================================

export const marketplaceAPI = {
  // Debug user trading status
  debugUser: async (address: string) => {
    const response = await apiClient.get(`/api/marketplace/debug/user/${address}`);
    return response.data;
  },

  // Get active listings
  getActiveListings: async () => {
    const response = await apiClient.get('/api/marketplace/listings');
    return response.data;
  },

  // Get user listings
  getUserListings: async (address: string) => {
    const response = await apiClient.get(`/api/marketplace/listings/${address}`);
    return response.data;
  },

  // Get user trades
  getUserTrades: async (address: string) => {
    const response = await apiClient.get(`/api/marketplace/trades/${address}`);
    return response.data;
  },

  // Get listing details
  getListingDetails: async (listingId: number) => {
    const response = await apiClient.get(`/api/marketplace/listing/${listingId}`);
    return response.data;
  },

  // Calculate purchase cost
  calculateCost: async (listingId: number, amount: number) => {
    const response = await apiClient.get(`/api/marketplace/calculate-cost/${listingId}/${amount}`);
    return response.data;
  },

  // Get marketplace stats
  getMarketplaceStats: async () => {
    const response = await apiClient.get('/api/marketplace/stats');
    return response.data;
  },
};

// ============================================
// Price Oracle APIs
// ============================================

export const priceAPI = {
  // Get current price
  getCurrentPrice: async () => {
    const response = await apiClient.get('/api/price/current');
    return response.data;
  },

  // Get price history
  getPriceHistory: async (fromBlock?: number, toBlock?: number) => {
    const params: any = {};
    if (fromBlock) params.fromBlock = fromBlock;
    if (toBlock) params.toBlock = toBlock;
    
    const response = await apiClient.get('/api/price/history', { params });
    return response.data;
  },

  // Calculate optimal price
  calculateOptimalPrice: async (supply: number, demand: number) => {
    const response = await apiClient.post('/api/price/calculate', {
      supply,
      demand,
    });
    return response.data;
  },
};

// ============================================
// Transaction Monitoring
// ============================================

export const transactionAPI = {
  // Get transaction history for user
  getUserTransactions: async (address: string) => {
    try {
      const [listings, trades] = await Promise.all([
        marketplaceAPI.getUserListings(address),
        marketplaceAPI.getUserTrades(address),
      ]);
      
      return {
        listings: listings.data?.listings || [],
        trades: trades.data?.tradeIds || [],
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return { listings: [], trades: [] };
    }
  },
};

// ============================================
// Health Check
// ============================================

export const healthCheck = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return { status: 'error', message: 'Backend is offline' };
  }
};

export default apiClient;