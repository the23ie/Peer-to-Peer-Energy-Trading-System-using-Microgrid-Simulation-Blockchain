import { Zap, User, Clock, TrendingUp } from 'lucide-react';

interface ListingCardProps {
  listingId: number;
  seller: string;
  amount: string;
  pricePerUnit: string;
  timestamp: number;
  listingType: number;
  isOwnListing: boolean;
  onBuy: () => void;
  isBuying: boolean;
}

export default function ListingCard({
  listingId,
  seller,
  amount,
  pricePerUnit,
  timestamp,
  listingType,
  isOwnListing,
  onBuy,
  isBuying,
}: ListingCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalCost = (parseFloat(amount) * parseFloat(pricePerUnit)).toFixed(4);

  return (
    <div className="card hover:shadow-xl transition-all hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-lg ${
                listingType === 0
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-secondary-100 text-secondary-300'
              }`}
            >
              {listingType === 0 ? 'Fixed Price' : 'Auction'}
            </span>
            {isOwnListing && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-yellow-100 text-yellow-800">
                Your Listing
              </span>
            )}
          </div>
          <p className="text-sm text-primary-600 flex items-center">
            <User className="w-3 h-3 mr-1" />
            {seller.slice(0, 6)}...{seller.slice(-4)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-primary-500 mb-1">Listing #{listingId}</p>
        </div>
      </div>

      {/* Energy Amount - Featured */}
      <div className="bg-gradient-soft rounded-xl p-4 mb-4">
        <p className="text-sm text-primary-600 mb-1">Energy Available</p>
        <p className="text-3xl font-bold text-primary-800">
          {parseFloat(amount).toFixed(2)}
          <span className="text-lg text-primary-600 ml-1">kWh</span>
        </p>
      </div>

      {/* Pricing Details */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-primary-600">Price per kWh</span>
          <span className="text-lg font-bold text-primary-800">
            {parseFloat(pricePerUnit).toFixed(4)} ETH
          </span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-primary-100">
          <span className="text-sm text-primary-600">Total Cost</span>
          <div className="text-right">
            <span className="text-xl font-bold text-accent-teal">{totalCost} ETH</span>
            <p className="text-xs text-primary-500">
              ≈ ${(parseFloat(totalCost) * 2000).toFixed(2)} USD
            </p>
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex items-center text-xs text-primary-500 mb-4 pb-4 border-b border-primary-100">
        <Clock className="w-3 h-3 mr-1" />
        Listed {formatDate(timestamp)}
      </div>

      {/* Buy Button */}
      <button
        onClick={onBuy}
        disabled={isBuying || isOwnListing}
        className={`w-full py-3 rounded-xl font-medium transition-all ${
          isOwnListing
            ? 'bg-primary-100 text-primary-400 cursor-not-allowed'
            : 'bg-gradient-primary text-white hover:opacity-90 hover:shadow-lg'
        }`}
      >
        {isBuying ? (
          <span className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Processing...</span>
          </span>
        ) : isOwnListing ? (
          'Your Listing'
        ) : (
          <span className="flex items-center justify-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Buy Energy</span>
          </span>
        )}
      </button>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-primary-50 rounded-lg p-2 text-center">
          <p className="text-xs text-primary-600">Rate</p>
          <p className="text-sm font-bold text-primary-800">
            {((parseFloat(pricePerUnit) * 2000) / 0.12).toFixed(0)}%
          </p>
        </div>
        <div className="bg-primary-50 rounded-lg p-2 text-center">
          <p className="text-xs text-primary-600">Value</p>
          <p className="text-sm font-bold text-primary-800">
            {parseFloat(amount) > 100 ? 'High' : parseFloat(amount) > 50 ? 'Medium' : 'Low'}
          </p>
        </div>
      </div>
    </div>
  );
}