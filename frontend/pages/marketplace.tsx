import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { Zap, TrendingUp, User, Search, RefreshCw, DollarSign, ShoppingCart } from 'lucide-react';

interface Listing {
  listingId: number;
  seller: string;
  energyAmount: string;
  pricePerUnit: string;
  remainingAmount: string;
  timestamp: number;
  isActive: boolean;
}

const TOKEN_ADDRESS = '0x8B62Df665a11193f7Ff3a139488151910Af897DC';

export default function Marketplace() {
  const { marketplaceContract, address, isConnected, isCorrectNetwork, provider } = useWeb3();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [buying, setBuying] = useState<number | null>(null);
  const [ethBalance, setEthBalance] = useState('0');
  const [buyAmounts, setBuyAmounts] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (isConnected && isCorrectNetwork && marketplaceContract) {
      loadListings();
      loadBalance();
    }
  }, [isConnected, isCorrectNetwork, marketplaceContract, address]);

  const loadBalance = async () => {
    if (provider && address) {
      const balance = await provider.getBalance(address);
      setEthBalance(ethers.utils.formatEther(balance));
    }
  };

  const loadListings = async () => {
    if (!marketplaceContract) return;
    
    try {
      setLoading(true);
      console.log('📋 Loading marketplace listings...');
      
      const activeListingIds = await marketplaceContract.getActiveListings();
      console.log('Active listing IDs:', activeListingIds.map((id: ethers.BigNumber) => id.toString()));
      
      const listingsData = await Promise.all(
        activeListingIds.map(async (id: ethers.BigNumber) => {
          try {
            const listing = await marketplaceContract.getListing(id);
            
            return {
              listingId: id.toNumber(),
              seller: listing[0],
              energyAmount: listing[1].toString(),
              pricePerUnit: ethers.utils.formatEther(listing[2]),
              remainingAmount: listing[3].toString(),
              isActive: listing[4],
              timestamp: Math.floor(Date.now() / 1000),
            };
          } catch (error) {
            console.error(`Error fetching listing ${id}:`, error);
            return null;
          }
        })
      );

      const validListings = listingsData.filter(
        (l): l is Listing => l !== null && l.isActive
      );
      
      console.log('✅ Loaded valid listings:', validListings);
      setListings(validListings);
      
      // Initialize buy amounts to full amount
      const initialAmounts: { [key: number]: string } = {};
      validListings.forEach(listing => {
        initialAmounts[listing.listingId] = listing.remainingAmount;
      });
      setBuyAmounts(initialAmounts);
      
    } catch (error) {
      console.error('❌ Error loading listings:', error);
      toast.error('Failed to load marketplace listings');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyEnergy = async (listingId: number) => {
    if (!marketplaceContract || !address || !provider) {
      toast.error('Please connect your wallet');
      return;
    }

    const buyAmount = buyAmounts[listingId];
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setBuying(listingId);
      
      console.log('🛒 Starting purchase process...');
      console.log('Listing ID:', listingId);
      console.log('Buy amount:', buyAmount, 'Wh');

      const energyAmountWh = ethers.BigNumber.from(buyAmount);
      
      // Get listing details
      const listing = await marketplaceContract.getListing(listingId);
      const seller = listing[0];
      
      console.log('Listing details:', {
        seller: seller,
        energyAmount: listing[1].toString(),
        pricePerUnit: ethers.utils.formatEther(listing[2]),
        remainingAmount: listing[3].toString(),
        isActive: listing[4],
      });

      // Check if listing is active
      if (!listing[4]) {
        toast.error('This listing is not active');
        return;
      }

      // Check available amount
      if (energyAmountWh.gt(listing[3])) {
        toast.error(`Only ${listing[3].toString()} Wh available`);
        return;
      }

      // Check if own listing
      if (seller.toLowerCase() === address.toLowerCase()) {
        toast.error('You cannot buy your own listing');
        return;
      }

      // Calculate total cost - let the contract handle token math
      console.log('💰 Calculating total cost...');
      const [energyCost, platformFee, totalCost] = await marketplaceContract.calculateTotalCost(
        listingId,
        energyAmountWh
      );
      
      console.log('Cost breakdown:', {
        energyAmount: energyAmountWh.toString() + ' Wh',
        energyAmountKWh: (parseFloat(energyAmountWh.toString()) / 1000).toFixed(3) + ' kWh',
        energyCost: ethers.utils.formatEther(energyCost) + ' ETH',
        platformFee: ethers.utils.formatEther(platformFee) + ' ETH',
        totalCost: ethers.utils.formatEther(totalCost) + ' ETH',
      });

      // Check buyer's ETH balance
      const balance = await provider.getBalance(address);
      const gasEstimate = ethers.utils.parseEther('0.002');
      const totalNeeded = totalCost.add(gasEstimate);
      
      if (balance.lt(totalNeeded)) {
        const shortfall = ethers.utils.formatEther(totalNeeded.sub(balance));
        toast.error(`Insufficient ETH. Need ${shortfall} more ETH (including gas)`);
        console.error('Insufficient balance:', {
          balance: ethers.utils.formatEther(balance),
          totalCost: ethers.utils.formatEther(totalCost),
          gas: ethers.utils.formatEther(gasEstimate),
          needed: ethers.utils.formatEther(totalNeeded),
          shortfall,
        });
        return;
      }

      // Simulate transaction to catch errors before sending
      console.log('🧪 Simulating transaction...');
      console.log('📋 Final parameters:', {
        listingId,
        energyAmountWh: energyAmountWh.toString(),
        valueETH: ethers.utils.formatEther(totalCost),
        from: address,
      });
      
      try {
        await marketplaceContract.callStatic.buyEnergy(
          listingId, 
          energyAmountWh, 
          {
            value: totalCost,
            from: address,
          }
        );
        console.log('✅ Simulation successful!');
      } catch (simError: any) {
        console.error('❌ Simulation failed:', simError);
        
        let errorMsg = 'Transaction would fail. ';
        
        const errStr = (simError.message || '').toLowerCase();
        const errReason = (simError.reason || '').toLowerCase();
        
        if (errStr.includes('cannotbuyownlisting') || errReason.includes('cannotbuyownlisting')) {
          errorMsg = 'Cannot buy your own listing';
        } else if (errStr.includes('listingnotactive') || errReason.includes('notactive')) {
          errorMsg = 'Listing is not active';
        } else if (errStr.includes('insufficientpayment') || errReason.includes('payment')) {
          errorMsg = 'Insufficient payment amount';
        } else if (errStr.includes('insufficientamount') || errReason.includes('insufficient') && errReason.includes('amount')) {
          errorMsg = 'Not enough energy in listing';
        } else if (simError.reason) {
          errorMsg = simError.reason;
        } else if (errStr.includes('execution reverted')) {
          errorMsg = 'Transaction failed. The listing may be invalid or the seller may need to re-approve the marketplace.';
        }
        
        toast.error(errorMsg, { duration: 8000 });
        return;
      }

      // Execute purchase
      console.log('📤 Sending purchase transaction...');
      const tx = await marketplaceContract.buyEnergy(
        listingId,
        energyAmountWh,
        {
          value: totalCost,
          gasLimit: 500000,
        }
      );

      console.log('⏳ Transaction sent:', tx.hash);
      toast.loading('Processing purchase...', { id: 'buy' });
      
      const receipt = await tx.wait();
      console.log('✅ Purchase successful!', receipt);
      
      toast.success(`Energy purchased! 🎉 TX: ${receipt.transactionHash.slice(0, 10)}...`, { 
        id: 'buy',
        duration: 5000,
      });
      
      // Reload
      await Promise.all([loadListings(), loadBalance()]);
      
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      
      let errorMessage = 'Failed to purchase energy';
      
      if (error.message?.includes('CannotBuyOwnListing')) {
        errorMessage = 'You cannot buy your own listing';
      } else if (error.message?.includes('ListingNotActive')) {
        errorMessage = 'This listing is no longer active';
      } else if (error.message?.includes('InsufficientPayment')) {
        errorMessage = 'Payment amount is incorrect';
      } else if (error.message?.includes('user rejected') || error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH balance';
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = 'Transaction would fail. Check listing status.';
      } else if (error.reason) {
        errorMessage = error.reason;
      }
      
      toast.error(errorMessage, { id: 'buy' });
    } finally {
      setBuying(null);
    }
  };

  const handleAmountChange = (listingId: number, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setBuyAmounts(prev => ({ ...prev, [listingId]: value }));
    }
  };

  const filteredListings = listings.filter(listing =>
    listing.seller.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toKWh = (wh: string) => {
    return (Number(wh) / 1000).toFixed(2);
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
            Please connect your wallet to view the marketplace
          </p>
        </div>
      </Layout>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <Layout>
        <div className="text-center py-20">
          <TrendingUp className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary-800 mb-2">
            Wrong Network
          </h2>
          <p className="text-primary-600 mb-4">
            Please switch to Sepolia testnet
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-800 mb-2">
              Energy Marketplace
            </h1>
            <p className="text-primary-600">
              Browse and purchase energy from local producers
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <div className="text-right mr-4">
              <p className="text-xs text-primary-600">Your Balance</p>
              <p className="text-sm font-bold text-primary-800">
                {parseFloat(ethBalance).toFixed(4)} ETH
              </p>
            </div>
            <button
              onClick={loadListings}
              disabled={loading}
              className="px-6 py-3 bg-gradient-primary text-white rounded-xl font-medium hover:opacity-90 transition flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
            <input
              type="text"
              placeholder="Search by seller address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600 mb-1">Active Listings</p>
                <p className="text-2xl font-bold text-primary-800">{listings.length}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600 mb-1">Total Available</p>
                <p className="text-2xl font-bold text-primary-800">
                  {(listings.reduce((sum, l) => sum + Number(l.remainingAmount), 0) / 1000).toFixed(2)} kWh
                </p>
              </div>
              <div className="p-3 bg-gradient-secondary rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600 mb-1">Avg Price</p>
                <p className="text-2xl font-bold text-primary-800">
                  {listings.length > 0
                    ? (listings.reduce((sum, l) => sum + parseFloat(l.pricePerUnit), 0) / listings.length).toFixed(4)
                    : '0.0000'}{' '}
                  ETH
                </p>
              </div>
              <div className="p-3 bg-accent-teal/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-accent-teal" />
              </div>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-32 bg-primary-100 rounded-lg mb-4"></div>
                <div className="h-4 bg-primary-100 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-primary-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="card text-center py-12">
            <Zap className="w-12 h-12 text-primary-300 mx-auto mb-4" />
            <p className="text-lg text-primary-600">No listings found</p>
            <p className="text-sm text-primary-500 mt-2">
              {searchTerm ? 'Try adjusting your search' : 'Check back later for new listings'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const isOwnListing = listing.seller.toLowerCase() === address?.toLowerCase();
              const buyAmount = buyAmounts[listing.listingId] || listing.remainingAmount;
              const buyAmountKWh = toKWh(buyAmount);
              const energyKWh = toKWh(listing.remainingAmount);
              const totalCostETH = (Number(buyAmountKWh) * parseFloat(listing.pricePerUnit)).toFixed(4);
              const platformFee = (parseFloat(totalCostETH) * 0.025).toFixed(6);
              const totalWithFee = (parseFloat(totalCostETH) + parseFloat(platformFee)).toFixed(4);

              return (
                <div key={listing.listingId} className="card hover:shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-gradient-primary rounded-lg">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-primary-100 text-primary-800 rounded-lg">
                        #{listing.listingId}
                      </span>
                      {isOwnListing && (
                        <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded-lg">
                          Yours
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Seller */}
                  <p className="text-sm text-primary-600 flex items-center mb-4">
                    <User className="w-3 h-3 mr-1" />
                    {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                  </p>

                  {/* Available Energy */}
                  <div className="bg-gradient-soft rounded-xl p-3 mb-4">
                    <p className="text-xs text-primary-600 mb-1">Available</p>
                    <p className="text-2xl font-bold text-primary-800">
                      {energyKWh} <span className="text-sm">kWh</span>
                    </p>
                  </div>

                  {/* Amount to Buy Input */}
                  <div className="mb-4">
                    <label className="text-xs text-primary-600 mb-2 block">
                      Amount to buy (Wh)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={buyAmount}
                        onChange={(e) => handleAmountChange(listing.listingId, e.target.value)}
                        max={listing.remainingAmount}
                        min="1"
                        className="flex-1 px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 text-sm"
                        disabled={isOwnListing}
                      />
                      <button
                        onClick={() => setBuyAmounts(prev => ({ 
                          ...prev, 
                          [listing.listingId]: listing.remainingAmount 
                        }))}
                        className="px-3 py-2 text-xs bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition"
                        disabled={isOwnListing}
                      >
                        MAX
                      </button>
                    </div>
                    <p className="text-xs text-primary-500 mt-1">
                      = {buyAmountKWh} kWh
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-primary-600">Price/kWh</span>
                      <span className="font-bold text-primary-800">
                        {parseFloat(listing.pricePerUnit).toFixed(4)} ETH
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-primary-600">Energy Cost</span>
                      <span className="font-medium text-primary-800">{totalCostETH} ETH</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-primary-600">Fee (2.5%)</span>
                      <span className="font-medium text-primary-800">{platformFee} ETH</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-primary-100">
                      <span className="text-primary-600 font-medium">Total</span>
                      <span className="text-lg font-bold text-accent-teal">{totalWithFee} ETH</span>
                    </div>
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={() => handleBuyEnergy(listing.listingId)}
                    disabled={buying === listing.listingId || isOwnListing || !buyAmount || parseFloat(buyAmount) <= 0}
                    className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center space-x-2 ${
                      isOwnListing
                        ? 'bg-primary-100 text-primary-400 cursor-not-allowed'
                        : buying === listing.listingId
                        ? 'bg-primary-400 text-white cursor-wait'
                        : 'bg-gradient-primary text-white hover:opacity-90'
                    }`}
                  >
                    {buying === listing.listingId ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </>
                    ) : isOwnListing ? (
                      'Your Listing'
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>Buy Energy</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}