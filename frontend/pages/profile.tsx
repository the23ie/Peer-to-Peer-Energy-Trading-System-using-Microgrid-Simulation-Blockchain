import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import axios from 'axios';
import { Zap, TrendingUp, Users, Award, Calendar, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  amount: string;
  price: string;
  timestamp: number;
  buyer: string;
  seller: string;
  txHash: string;
}

export default function Profile() {
  const { address, tokenContract, dataRegistryContract, isConnected, provider } = useWeb3();
  const [userData, setUserData] = useState({
    energyProduced: '0',
    energyConsumed: '0',
    surplusEnergy: '0',
    carbonOffset: '0',
    tokenBalance: '0',
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [ethBalance, setEthBalance] = useState('0');

  useEffect(() => {
    if (isConnected && address) {
      loadUserProfile();
    }
  }, [isConnected, address]);

  const loadUserProfile = async () => {
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

      // Get user data from registry using getUserProfile
      if (dataRegistryContract && address) {
        const profile = await dataRegistryContract.getUserProfile(address);
        // profile returns: (totalConsumption, totalProduction, totalSurplusGenerated, currentSurplus, lastUpdateTime, houseId)
        setUserData(prev => ({
          ...prev,
          energyProduced: profile.totalProduction.toString(),
          energyConsumed: profile.totalConsumption.toString(),
          surplusEnergy: profile.currentSurplus.toString(),
          carbonOffset: (parseFloat(profile.totalProduction.toString()) * 0.43).toFixed(0), // Estimate: 0.43 kg CO2 per kWh
        }));
      }

      // Load transaction history from backend
      await loadTransactions();
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      // Fetch trades from marketplace API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/marketplace/trades/${address}`
      );
      const data = await response.json();
      
      if (data.status === 'success' && data.data.tradeIds) {
        // Transform trade IDs to transaction format
        const txs = data.data.tradeIds.map((id: string, index: number) => ({
          id: id,
          type: 'buy' as const,
          amount: '0',
          price: '0',
          timestamp: Math.floor(Date.now() / 1000) - (index * 3600),
          buyer: address,
          seller: '0x0000000000000000000000000000000000000000',
          txHash: '',
        }));
        setTransactions(txs);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Silently fail, transactions are optional
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isConnected) {
    return (
      <Layout>
        <div className="text-center py-20">
          <Users className="w-16 h-16 text-primary-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary-800 mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-primary-600">
            Please connect your wallet to view your profile
          </p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="card animate-pulse">
            <div className="h-32 bg-primary-100 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-24 bg-primary-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="card bg-gradient-primary text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                <Users className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Your Profile</h1>
                <div className="flex items-center space-x-2">
                  <code className="text-sm bg-white/20 px-3 py-1 rounded-lg">
                    {address?.slice(0, 10)}...{address?.slice(-8)}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="p-1 hover:bg-white/20 rounded transition"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90 mb-1">ETH Balance</p>
              <p className="text-2xl font-bold">{parseFloat(ethBalance).toFixed(4)} ETH</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-primary-600">Energy Tokens</p>
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Zap className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary-800">
              {parseFloat(userData.tokenBalance).toFixed(2)}
              <span className="text-sm text-primary-600 ml-1">kWh</span>
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-primary-600">Energy Produced</p>
              <div className="p-2 bg-gradient-secondary rounded-lg">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary-800">
              {parseFloat(userData.energyProduced).toFixed(2)}
              <span className="text-sm text-primary-600 ml-1">kWh</span>
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-primary-600">Surplus Energy</p>
              <div className="p-2 bg-accent-teal/20 rounded-lg">
                <Zap className="w-4 h-4 text-accent-teal" />
              </div>
            </div>
            <p className="text-2xl font-bold text-accent-teal">
              {parseFloat(userData.surplusEnergy).toFixed(2)}
              <span className="text-sm text-primary-600 ml-1">kWh</span>
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-primary-600">Carbon Offset</p>
              <div className="p-2 bg-accent-aqua/20 rounded-lg">
                <Award className="w-4 h-4 text-accent-aqua" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary-800">
              {parseFloat(userData.carbonOffset).toFixed(2)}
              <span className="text-sm text-primary-600 ml-1">kg CO₂</span>
            </p>
          </div>
        </div>

        {/* Energy Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-bold text-primary-800 mb-4">Energy Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-primary-600">Produced</span>
                  <span className="font-medium text-primary-800">
                    {parseFloat(userData.energyProduced).toFixed(2)} kWh
                  </span>
                </div>
                <div className="w-full bg-primary-100 rounded-full h-3">
                  <div
                    className="bg-gradient-secondary h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (parseFloat(userData.energyProduced) /
                          (parseFloat(userData.energyProduced) + parseFloat(userData.energyConsumed))) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-primary-600">Consumed</span>
                  <span className="font-medium text-primary-800">
                    {parseFloat(userData.energyConsumed).toFixed(2)} kWh
                  </span>
                </div>
                <div className="w-full bg-primary-100 rounded-full h-3">
                  <div
                    className="bg-gradient-primary h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (parseFloat(userData.energyConsumed) /
                          (parseFloat(userData.energyProduced) + parseFloat(userData.energyConsumed))) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-primary-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-primary-600">Net Balance</span>
                  <span className="text-xl font-bold text-accent-teal">
                    +{parseFloat(userData.surplusEnergy).toFixed(2)} kWh
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-primary-800 mb-4">Environmental Impact</h3>
            <div className="space-y-4">
              <div className="bg-gradient-soft rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-primary-600">Carbon Offset</span>
                  <Award className="w-5 h-5 text-accent-aqua" />
                </div>
                <p className="text-2xl font-bold text-primary-800">
                  {parseFloat(userData.carbonOffset).toFixed(2)} kg
                </p>
                <p className="text-xs text-primary-500 mt-1">
                  Equivalent to {(parseFloat(userData.carbonOffset) / 411).toFixed(1)} trees planted
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-primary-600">Clean Energy %</span>
                  <span className="font-medium text-primary-800">
                    {parseFloat(userData.energyProduced) > 0
                      ? ((parseFloat(userData.energyProduced) /
                          (parseFloat(userData.energyProduced) + parseFloat(userData.energyConsumed))) *
                          100
                        ).toFixed(1)
                      : '0'}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-600">Contribution Rank</span>
                  <span className="font-medium text-primary-800">Top 10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-primary-800 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Transaction History
            </h3>
            <span className="text-sm text-primary-600">
              {transactions.length} transactions
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-primary-300 mx-auto mb-4" />
              <p className="text-primary-600">No transactions yet</p>
              <p className="text-sm text-primary-500 mt-2">
                Your trading activity will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 bg-gradient-soft rounded-xl hover:shadow-md transition"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-2 rounded-lg ${
                        tx.type === 'buy'
                          ? 'bg-primary-100'
                          : 'bg-secondary-100'
                      }`}
                    >
                      {tx.type === 'buy' ? (
                        <TrendingUp className="w-5 h-5 text-primary-600" />
                      ) : (
                        <Zap className="w-5 h-5 text-secondary-300" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-primary-800">
                        {tx.type === 'buy' ? 'Bought' : 'Sold'} {parseFloat(tx.amount).toFixed(2)} kWh
                      </p>
                      <p className="text-xs text-primary-500">
                        {formatDate(tx.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-800">
                      {(parseFloat(tx.amount) * parseFloat(tx.price)).toFixed(4)} ETH
                    </p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-500 hover:text-primary-700 flex items-center justify-end space-x-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}