import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useWeb3 } from '../contexts/Web3Context';
import { Zap, TrendingUp, Shield, Users, ArrowRight, CheckCircle } from 'lucide-react';

export default function Home() {
  const { isConnected, connectWallet } = useWeb3();
  const router = useRouter();

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]);

  const features = [
    {
      icon: Zap,
      title: 'Peer-to-Peer Trading',
      description: 'Buy and sell surplus energy directly with your neighbors',
    },
    {
      icon: TrendingUp,
      title: 'Dynamic Pricing',
      description: 'Market-based pricing ensures fair rates for buyers and sellers',
    },
    {
      icon: Shield,
      title: 'Blockchain Security',
      description: 'All transactions secured on the Ethereum blockchain',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Join a growing network of sustainable energy producers',
    },
  ];

  const benefits = [
    'Earn ETH by selling surplus solar energy',
    'Access renewable energy at competitive prices',
    'Reduce your carbon footprint',
    'Support local energy independence',
    'Transparent and secure transactions',
  ];

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          {/* Logo */}
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="p-4 bg-gradient-primary rounded-2xl">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-primary-800">
              P2P Energy Trading
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl text-primary-600 mb-8 max-w-2xl mx-auto">
            Trade renewable energy directly with your community. 
            Built on blockchain for transparency and security.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={connectWallet}
              className="px-8 py-4 bg-gradient-primary text-white rounded-xl font-medium text-lg hover:opacity-90 transition flex items-center space-x-2 shadow-lg"
            >
              <Zap className="w-5 h-5" />
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <Link
              href="/marketplace"
              className="px-8 py-4 bg-white text-primary-700 border-2 border-primary-200 rounded-xl font-medium text-lg hover:bg-primary-50 transition"
            >
              Explore Marketplace
            </Link>
          </div>

          {/* Status Badge */}
          <div className="mt-8 inline-flex items-center space-x-2 px-4 py-2 bg-secondary-100/30 rounded-full">
            <div className="w-2 h-2 bg-secondary-300 rounded-full animate-pulse"></div>
            <span className="text-sm text-secondary-700 font-medium">
              Live on Sepolia Testnet
            </span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="p-3 bg-gradient-primary rounded-xl w-fit mb-4">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-primary-800 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-primary-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="card mb-16 bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-200">
          <h2 className="text-3xl font-bold text-primary-800 mb-8 text-center">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-lg font-bold text-primary-800 mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-sm text-primary-600">
                Install MetaMask and connect to the Sepolia testnet
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-lg font-bold text-primary-800 mb-2">
                List Your Energy
              </h3>
              <p className="text-sm text-primary-600">
                Sell surplus solar energy and set your preferred price
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-teal/20 border-2 border-accent-teal rounded-full flex items-center justify-center mx-auto mb-4 text-accent-teal text-2xl font-bold">
                3
              </div>
              <h3 className="text-lg font-bold text-primary-800 mb-2">
                Start Trading
              </h3>
              <p className="text-sm text-primary-600">
                Buy from others or earn ETH from your sales
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Benefits List */}
          <div className="card">
            <h2 className="text-2xl font-bold text-primary-800 mb-6">
              Why Choose P2P Energy?
            </h2>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-secondary-300 flex-shrink-0 mt-0.5" />
                  <p className="text-primary-700">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="card bg-gradient-primary text-white">
            <h2 className="text-2xl font-bold mb-6">Platform Stats</h2>
            <div className="space-y-6">
              <div>
                <p className="text-white/80 text-sm mb-1">Total Energy Traded</p>
                <p className="text-3xl font-bold">2,847 kWh</p>
              </div>
              <div>
                <p className="text-white/80 text-sm mb-1">Active Users</p>
                <p className="text-3xl font-bold">156</p>
              </div>
              <div>
                <p className="text-white/80 text-sm mb-1">CO₂ Offset</p>
                <p className="text-3xl font-bold">1,234 kg</p>
              </div>
              <div>
                <p className="text-white/80 text-sm mb-1">Transactions</p>
                <p className="text-3xl font-bold">423</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="card bg-gradient-secondary text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Trading Energy?
          </h2>
          <p className="text-white/90 mb-8 text-lg max-w-2xl mx-auto">
            Join our community of sustainable energy producers and consumers. 
            Start earning or saving today!
          </p>
          <button
            onClick={connectWallet}
            className="px-8 py-4 bg-white text-secondary-700 rounded-xl font-medium text-lg hover:bg-white/90 transition inline-flex items-center space-x-2 shadow-lg"
          >
            <Zap className="w-5 h-5" />
            <span>Connect Wallet & Get Started</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-primary-100 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-primary-600">
            <p className="text-sm">
              Built with ❤️ for a sustainable future 
            </p>
            <p className="text-xs mt-2 text-primary-500">
              Contract Addresses: Token ({process.env.NEXT_PUBLIC_TOKEN_ADDRESS?.slice(0, 10)}...)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}