import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useWeb3 } from '../contexts/Web3Context';
import EnergyCard from '../components/EnergyCard';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { 
  Zap, 
  TrendingUp, 
  ShoppingCart, 
  PlusCircle, 
  User, 
  Activity,
  ArrowRight,
  Leaf,
  DollarSign
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { 
    address, 
    isConnected, 
    isCorrectNetwork,
    tokenContract, 
    dataRegistryContract,
    priceOracleContract,
    provider
  } = useWeb3();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    tokenBalance: '0',
    totalProduction: '0',
    totalConsumption: '0',
    currentSurplus: '0',
    availableSurplus: '0',
    houseId: '',
  });
  const [currentPrice, setCurrentPrice] = useState('0');
  const [ethBalance, setEthBalance] = useState('0');

  useEffect(() => {
    if (isConnected && isCorrectNetwork && address) {
      loadDashboardData();
    }
  }, [isConnected, isCorrectNetwork, address]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get token balance
      if (tokenContract && address) {
        const balance = await tokenContract.balanceOf(address);
        setUserData(prev => ({
          ...prev,
          tokenBalance: ethers.utils.formatUnits(balance, 18),
        }));
      }

      // Get ETH balance
      if (provider && address) {
        const balance = await provider.getBalance(address);
        setEthBalance(ethers.utils.formatEther(balance));
      }

      // Get user profile from data registry
      if (dataRegistryContract && address) {
        const profile = await dataRegistryContract.getUserProfile(address);
        const availableSurplus = await dataRegistryContract.getAvailableSurplus(address);
        
        setUserData(prev => ({
          ...prev,
          totalProduction: ethers.utils.formatUnits(profile.totalProduction, 0),
          totalConsumption: ethers.utils.formatUnits(profile.totalConsumption, 0),
          currentSurplus: ethers.utils.formatUnits(profile.currentSurplus, 0),
          availableSurplus: ethers.utils.formatUnits(availableSurplus, 0),
          houseId: profile.houseId,
        }));
      }

      // Get current price from oracle
      if (priceOracleContract) {
        const price = await priceOracleContract.getCurrentPrice();
        setCurrentPrice(ethers.utils.formatEther(price));
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Layout>
        <div className="text-center py-20">
          <Zap className="w-16 h-16 text-primary-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary-800 mb-2">
            Welcome to P2P Energy Trading
          </h2>
          <p className="text-primary-600 mb-6">
            Connect your wallet to access your dashboard
          </p>
        </div>
      </Layout>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <Layout>
        <div className="text-center py-20">
          <Activity className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary-800 mb-2">
            Wrong Network
          </h2>
          <p className="text-primary-600 mb-6">
            Please switch to Sepolia testnet to continue
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="card bg-gradient-primary text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back! 👋
              </h1>
              <p className="text-white/90 mb-1">
                Address: {address?.slice(0, 10)}...{address?.slice(-8)}
              </p>
              {userData.houseId && (
                <p className="text-white/90">
                  House ID: {userData.houseId}
                </p>
              )}
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <p className="text-sm text-white/80 mb-1">ETH Balance</p>
              <p className="text-2xl font-bold">{parseFloat(ethBalance).toFixed(4)} ETH</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-24 bg-primary-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <EnergyCard
              title="Energy Tokens"
              value={parseFloat(userData.tokenBalance).toFixed(2)}
              unit="kWh"
              icon="zap"
              gradient="primary"
            />
            <EnergyCard
              title="Total Production"
              value={parseFloat(userData.totalProduction).toFixed(2)}
              unit="kWh"
              icon="up"
              gradient="secondary"
            />
            <EnergyCard
              title="Available Surplus"
              value={parseFloat(userData.availableSurplus).toFixed(2)}
              unit="kWh"
              icon="zap"
              gradient="teal"
            />
            <EnergyCard
              title="Current Price"
              value={parseFloat(currentPrice).toFixed(4)}
              unit="ETH/kWh"
              icon="up"
              gradient="aqua"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Browse Marketplace */}
          <button
            onClick={() => router.push('/marketplace')}
            className="card hover:shadow-xl transition-all hover:-translate-y-1 text-left group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-primary rounded-xl">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-primary-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-primary-800 mb-2">
              Browse Marketplace
            </h3>
            <p className="text-sm text-primary-600">
              Buy energy from local producers at competitive prices
            </p>
          </button>

          {/* List Energy */}
          <button
            onClick={() => router.push('/list-energy')}
            className="card hover:shadow-xl transition-all hover:-translate-y-1 text-left group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-secondary rounded-xl">
                <PlusCircle className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-primary-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-primary-800 mb-2">
              List Your Energy
            </h3>
            <p className="text-sm text-primary-600">
              Sell your surplus energy and earn ETH
            </p>
          </button>

          {/* View Profile */}
          <button
            onClick={() => router.push('/profile')}
            className="card hover:shadow-xl transition-all hover:-translate-y-1 text-left group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-accent-teal/20 rounded-xl">
                <User className="w-6 h-6 text-accent-teal" />
              </div>
              <ArrowRight className="w-5 h-5 text-primary-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-primary-800 mb-2">
              Your Profile
            </h3>
            <p className="text-sm text-primary-600">
              View stats, history and environmental impact
            </p>
          </button>
        </div>

        {/* Energy Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Production vs Consumption */}
          <div className="card">
            <h3 className="text-lg font-bold text-primary-800 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Energy Overview
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-primary-600">Total Production</span>
                  <span className="font-medium text-primary-800">
                    {parseFloat(userData.totalProduction).toFixed(2)} kWh
                  </span>
                </div>
                <div className="w-full bg-primary-100 rounded-full h-3">
                  <div
                    className="bg-gradient-secondary h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (parseFloat(userData.totalProduction) /
                          Math.max(parseFloat(userData.totalProduction) + parseFloat(userData.totalConsumption), 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-primary-600">Total Consumption</span>
                  <span className="font-medium text-primary-800">
                    {parseFloat(userData.totalConsumption).toFixed(2)} kWh
                  </span>
                </div>
                <div className="w-full bg-primary-100 rounded-full h-3">
                  <div
                    className="bg-gradient-primary h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (parseFloat(userData.totalConsumption) /
                          Math.max(parseFloat(userData.totalProduction) + parseFloat(userData.totalConsumption), 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-primary-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-primary-600">Current Surplus</span>
                  <span className="text-xl font-bold text-accent-teal">
                    {parseFloat(userData.currentSurplus).toFixed(2)} kWh
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Market Info */}
          <div className="card">
            <h3 className="text-lg font-bold text-primary-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Market Information
            </h3>
            <div className="space-y-4">
              <div className="bg-gradient-soft rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-primary-600">Current Price</span>
                  <DollarSign className="w-5 h-5 text-accent-aqua" />
                </div>
                <p className="text-2xl font-bold text-primary-800">
                  {parseFloat(currentPrice).toFixed(4)} ETH
                </p>
                <p className="text-xs text-primary-500 mt-1">per kWh</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-primary-600">Your Surplus Value</span>
                  <span className="font-medium text-primary-800">
                    {(parseFloat(userData.availableSurplus) * parseFloat(currentPrice)).toFixed(4)} ETH
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary-600">≈ USD Value</span>
                  <span className="font-medium text-primary-800">
                    ${(parseFloat(userData.availableSurplus) * parseFloat(currentPrice) * 2000).toFixed(2)}
                  </span>
                </div>
              </div>

              {parseFloat(userData.availableSurplus) > 0 && (
                <button
                  onClick={() => router.push('/list-energy')}
                  className="w-full mt-4 py-3 bg-gradient-secondary text-white rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>List Surplus Energy</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="card bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-500 rounded-xl">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-primary-800 mb-2">
                Your Environmental Impact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-primary-600 mb-1">Clean Energy Produced</p>
                  <p className="text-xl font-bold text-green-700">
                    {parseFloat(userData.totalProduction).toFixed(2)} kWh
                  </p>
                </div>
                <div>
                  <p className="text-primary-600 mb-1">Carbon Offset</p>
                  <p className="text-xl font-bold text-green-700">
                    {(parseFloat(userData.totalProduction) * 0.43).toFixed(2)} kg CO₂
                  </p>
                </div>
                <div>
                  <p className="text-primary-600 mb-1">Trees Equivalent</p>
                  <p className="text-xl font-bold text-green-700">
                    {((parseFloat(userData.totalProduction) * 0.43) / 21).toFixed(1)} trees
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}