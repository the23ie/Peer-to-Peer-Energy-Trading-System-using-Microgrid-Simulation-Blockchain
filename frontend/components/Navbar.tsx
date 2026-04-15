import Link from 'next/link';
import { useWeb3 } from '../contexts/Web3Context';
import { Zap, Menu, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { 
    address, 
    isConnected, 
    isCorrectNetwork, 
    connectWallet, 
    disconnectWallet,
    switchToSepolia 
  } = useWeb3();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'List Energy', href: '/list-energy' },
    { name: 'Profile', href: '/profile' },
  ];

  return (
    <nav className="bg-white border-b border-primary-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-primary-800">
              P2P Energy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 rounded-lg transition"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-3">
            {/* Network Warning */}
            {isConnected && !isCorrectNetwork && (
              <button
                onClick={switchToSepolia}
                className="hidden md:flex items-center space-x-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Wrong Network</span>
              </button>
            )}

            {/* Connect/Disconnect Button */}
            {isConnected ? (
              <div className="flex items-center space-x-2">
                <div className="hidden md:block px-3 py-2 bg-gradient-soft rounded-lg">
                  <p className="text-xs text-primary-600">Connected</p>
                  <p className="text-sm font-medium text-primary-800">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-4 py-2 bg-gradient-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-primary-100">
          <div className="px-4 py-3 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 rounded-lg transition"
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile Network Warning */}
            {isConnected && !isCorrectNetwork && (
              <button
                onClick={() => {
                  switchToSepolia();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Switch to Sepolia</span>
              </button>
            )}

            {/* Mobile Address Display */}
            {isConnected && (
              <div className="px-4 py-2 bg-gradient-soft rounded-lg">
                <p className="text-xs text-primary-600">Connected Address</p>
                <p className="text-sm font-medium text-primary-800">
                  {address?.slice(0, 10)}...{address?.slice(-8)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}