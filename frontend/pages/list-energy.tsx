import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Zap, CheckCircle, AlertCircle, TrendingUp, Bug } from 'lucide-react';

export default function ListEnergy() {
  const { 
    tokenContract, 
    marketplaceContract, 
    dataRegistryContract, 
    address, 
    isConnected, 
    isCorrectNetwork 
  } = useWeb3();

  const [amount, setAmount] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [listingType, setListingType] = useState<0 | 1>(0);
  const [isApproved, setIsApproved] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [approving, setApproving] = useState(false);
  const [listing, setListing] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [availableSurplusWh, setAvailableSurplusWh] = useState('0');

  useEffect(() => {
    if (isConnected && isCorrectNetwork && address) {
      loadUserData();
      checkApproval();
    }
  }, [isConnected, isCorrectNetwork, tokenContract, marketplaceContract, address]);

  const loadUserData = async () => {
    try {
      // Get token balance (in kWh, 18 decimals)
      if (tokenContract && address) {
        const balance = await tokenContract.balanceOf(address);
        const balanceKWh = ethers.utils.formatEther(balance);
        setTokenBalance(balanceKWh);
        console.log('Token balance:', balanceKWh, 'kWh');
      }

      // Get available surplus (in Wh, no decimals)
      if (dataRegistryContract && address) {
        const availableSurplus = await dataRegistryContract.getAvailableSurplus(address);
        const availableWhStr = availableSurplus.toString();
        setAvailableSurplusWh(availableWhStr);
        console.log('Available surplus:', availableWhStr, 'Wh =', (parseFloat(availableWhStr) / 1000).toFixed(3), 'kWh');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkApproval = async () => {
    if (!tokenContract || !marketplaceContract || !address) return;

    try {
      setCheckingApproval(true);
      const marketplaceAddr = marketplaceContract.address;
      const allowance = await tokenContract.allowance(address, marketplaceAddr);
      const isApproved = allowance.gt(0);
      setIsApproved(isApproved);
      console.log('Marketplace approval:', isApproved, 'Allowance:', ethers.utils.formatEther(allowance));
    } catch (error) {
      console.error('Error checking approval:', error);
    } finally {
      setCheckingApproval(false);
    }
  };

  const handleApprove = async () => {
    if (!tokenContract || !marketplaceContract) {
      toast.error('Contracts not initialized');
      return;
    }

    try {
      setApproving(true);
      const marketplaceAddr = marketplaceContract.address;
      const maxApproval = ethers.constants.MaxUint256;
      
      console.log('Approving marketplace:', marketplaceAddr);
      const tx = await tokenContract.approve(marketplaceAddr, maxApproval);

      toast.loading('Approving marketplace...', { id: 'approve' });
      const receipt = await tx.wait();
      console.log('Approval successful:', receipt.transactionHash);
      
      toast.success('Marketplace approved!', { id: 'approve' });
      setIsApproved(true);
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to approve marketplace', { id: 'approve' });
    } finally {
      setApproving(false);
    }
  };

  const handleListEnergy = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!marketplaceContract || !tokenContract) {
      toast.error('Contracts not initialized');
      return;
    }

    if (!amount || !pricePerUnit) {
      toast.error('Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    const priceNum = parseFloat(pricePerUnit);

    if (amountNum <= 0 || priceNum <= 0) {
      toast.error('Amount and price must be greater than 0');
      return;
    }

    // Check available surplus (in Wh)
    const availableKWh = parseInt(availableSurplusWh || '0') / 1000;
    
    if (amountNum > availableKWh) {
      toast.error(`Insufficient surplus. Available: ${availableKWh.toFixed(3)} kWh`);
      return;
    }

    // Check token balance
    if (amountNum > parseFloat(tokenBalance)) {
      toast.error(`Insufficient tokens. Balance: ${parseFloat(tokenBalance).toFixed(3)} kWh`);
      return;
    }

    if (!isApproved) {
      toast.error('Please approve marketplace first');
      return;
    }

    try {
      setListing(true);
      
      // Convert kWh to Wh (contract expects Wh as whole numbers)
      const amountWh = Math.floor(amountNum * 1000);
      const amountWhBN = ethers.BigNumber.from(amountWh);
      
      // Price is per kWh in ETH
      const pricePerKWhWei = ethers.utils.parseEther(priceNum.toString());

      console.log('Listing parameters:', {
        amountKWh: amountNum,
        amountWh: amountWh,
        pricePerKWh: priceNum + ' ETH',
        pricePerKWhWei: pricePerKWhWei.toString(),
        listingType,
      });

      // Simulate transaction
      console.log('🧪 Simulating transaction...');
      try {
        await marketplaceContract.callStatic.listEnergy(
          amountWhBN, 
          pricePerKWhWei, 
          listingType,
          { from: address }
        );
        console.log('✅ Simulation passed');
      } catch (simError: any) {
        console.error('❌ Simulation failed:', simError);
        throw new Error(`Would fail: ${simError.reason || simError.message}`);
      }

      // Send actual transaction
      console.log('📤 Sending transaction...');
      const tx = await marketplaceContract.listEnergy(
        amountWhBN,
        pricePerKWhWei,
        listingType,
        { gasLimit: 500000 }
      );
      
      console.log('⏳ Transaction sent:', tx.hash);
      toast.loading('Creating listing...', { id: 'list' });
      
      const receipt = await tx.wait();
      console.log('✅ Listing created:', receipt.transactionHash);
      
      // Extract listing ID from events
      const listingEvent = receipt.events?.find((e: any) => e.event === 'EnergyListed');
      const listingId = listingEvent?.args?.listingId?.toString();
      
      toast.success(`Energy listed! Listing #${listingId || 'unknown'}`, { 
        id: 'list',
        duration: 5000,
      });

      // Reset form and reload data
      setAmount('');
      setPricePerUnit('');
      setTimeout(() => loadUserData(), 2000);
      
    } catch (error: any) {
      console.error('❌ Listing error:', error);
      
      let errorMessage = 'Failed to list energy';
      
      if (error.message?.includes('InsufficientSurplusEnergy')) {
        errorMessage = 'Insufficient surplus energy';
      } else if (error.message?.includes('InsufficientTokens')) {
        errorMessage = 'Insufficient energy tokens';
      } else if (error.message?.includes('user rejected') || error.code === 4001) {
        errorMessage = 'Transaction rejected';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas';
      } else if (error.message) {
        errorMessage = error.message.substring(0, 100);
      }
      
      toast.error(errorMessage, { id: 'list' });
    } finally {
      setListing(false);
    }
  };

  if (!isConnected) {
    return (
      <Layout>
        <div className="text-center py-20">
          <Zap className="w-16 h-16 text-primary-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary-800 mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-primary-600">
            Please connect your wallet to list energy
          </p>
        </div>
      </Layout>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <Layout>
        <div className="text-center py-20">
          <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary-800 mb-2">
            Wrong Network
          </h2>
          <p className="text-primary-600">
            Please switch to Sepolia testnet
          </p>
        </div>
      </Layout>
    );
  }

  const surplusKWh = (parseInt(availableSurplusWh || '0') / 1000).toFixed(3);
  const tokenBalanceNum = parseFloat(tokenBalance);
  const maxListable = Math.min(tokenBalanceNum, parseFloat(surplusKWh));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-800 mb-2">
            List Your Energy
          </h1>
          <p className="text-primary-600">
            Sell your surplus energy to the community
          </p>
        </div>

        {/* Warning if no surplus */}
        {parseInt(availableSurplusWh) === 0 && (
          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 mb-1">No Surplus Available</p>
                <p className="text-sm text-yellow-700">
                  You need to generate surplus energy before listing. Run MATLAB simulation or wait for solar production.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600 mb-1">Token Balance</p>
                <p className="text-2xl font-bold text-primary-800">
                  {tokenBalanceNum.toFixed(3)} <span className="text-base">kWh</span>
                </p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600 mb-1">Available Surplus</p>
                <p className="text-2xl font-bold text-accent-teal">
                  {surplusKWh} <span className="text-base">kWh</span>
                </p>
              </div>
              <div className="p-3 bg-accent-teal/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-accent-teal" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600 mb-1">Max Listable</p>
                <p className="text-2xl font-bold text-secondary-300">
                  {maxListable.toFixed(3)} <span className="text-base">kWh</span>
                </p>
              </div>
              <div className="p-3 bg-secondary-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-secondary-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Approval Section */}
        {!isApproved && (
          <div className="card bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-orange-900 mb-2">
                  Approval Required
                </h3>
                <p className="text-sm text-orange-700 mb-4">
                  Before listing, approve the marketplace to transfer your energy tokens. This is a one-time action.
                </p>
                <button
                  onClick={handleApprove}
                  disabled={approving || checkingApproval}
                  className="px-6 py-2 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {approving ? 'Approving...' : checkingApproval ? 'Checking...' : 'Approve Marketplace'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listing Form */}
        <div className="card">
          <form onSubmit={handleListEnergy} className="space-y-6">
            {/* Listing Type */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-3">
                Listing Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setListingType(0)}
                  className={`p-4 rounded-xl border-2 transition ${
                    listingType === 0
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-primary-100 hover:border-primary-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <CheckCircle className={`w-5 h-5 ${listingType === 0 ? 'text-primary-600' : 'text-primary-300'}`} />
                    <span className="font-bold text-primary-800">Fixed Price</span>
                  </div>
                  <p className="text-xs text-primary-600">Sell at a set price</p>
                </button>

                <button
                  type="button"
                  onClick={() => setListingType(1)}
                  className={`p-4 rounded-xl border-2 transition ${
                    listingType === 1
                      ? 'border-secondary-300 bg-secondary-100/30'
                      : 'border-primary-100 hover:border-primary-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <TrendingUp className={`w-5 h-5 ${listingType === 1 ? 'text-secondary-300' : 'text-primary-300'}`} />
                    <span className="font-bold text-primary-800">Negotiable</span>
                  </div>
                  <p className="text-xs text-primary-600">Allow price changes</p>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-primary-700 mb-2">
                Energy Amount (kWh)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.001"
                  min="0.001"
                  max={maxListable}
                  placeholder="1.000"
                  className="w-full px-4 py-3 pr-20 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300"
                  required
                  disabled={maxListable <= 0}
                />
                <button
                  type="button"
                  onClick={() => setAmount(maxListable.toFixed(3))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition disabled:opacity-50"
                  disabled={maxListable <= 0}
                >
                  MAX
                </button>
              </div>
              <p className="text-xs text-primary-500 mt-1">
                Available to list: {maxListable.toFixed(3)} kWh
              </p>
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-primary-700 mb-2">
                Price per kWh (ETH)
              </label>
              <input
                type="number"
                id="price"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                step="0.0001"
                min="0.0001"
                placeholder="0.0001"
                className="w-full px-4 py-3 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300"
                required
              />
              <p className="text-xs text-primary-500 mt-1">
                Suggested: 0.0001 - 0.001 ETH per kWh
              </p>
            </div>

            {/* Total Calculation */}
            {amount && pricePerUnit && (
              <div className="bg-gradient-soft rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-primary-600">Total Listing Value</span>
                  <span className="text-xl font-bold text-accent-teal">
                    {(parseFloat(amount) * parseFloat(pricePerUnit)).toFixed(4)} ETH
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isApproved || listing || !amount || !pricePerUnit || maxListable <= 0}
              className="w-full py-4 bg-gradient-primary text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {listing 
                ? 'Creating Listing...' 
                : !isApproved 
                ? 'Approve Marketplace First' 
                : maxListable <= 0 
                ? 'No Energy Available' 
                : 'List Energy'}
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="card bg-primary-50 border-primary-200">
          <h3 className="font-bold text-primary-800 mb-3 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Important Information
          </h3>
          <ul className="space-y-2 text-sm text-primary-700">
            <li>• Approval is required only once for the marketplace contract</li>
            <li>• Energy amount is in kWh (1 kWh = 1000 Wh)</li>
            <li>• Your tokens will be transferred when someone buys your energy</li>
            <li>• You'll receive ETH directly to your wallet</li>
            <li>• A small gas fee is required for the transaction</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}