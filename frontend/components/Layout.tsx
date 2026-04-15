import { ReactNode } from 'react';
import Navbar from './Navbar';
import { Zap } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-primary-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 bg-gradient-primary rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-primary-800">
                  P2P Energy Trading
                </span>
              </div>
              <p className="text-sm text-primary-600 max-w-sm">
                Empowering communities to trade renewable energy directly on the blockchain.
                Join the future of decentralized energy markets.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-primary-800 mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-primary-600">
                <li>
                  <a href="/dashboard" className="hover:text-primary-800 transition">
                    Dashboard
                  </a>
                </li>
                <li>
                  <a href="/marketplace" className="hover:text-primary-800 transition">
                    Marketplace
                  </a>
                </li>
                <li>
                  <a href="/list-energy" className="hover:text-primary-800 transition">
                    List Energy
                  </a>
                </li>
                <li>
                  <a href="/profile" className="hover:text-primary-800 transition">
                    Profile
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-bold text-primary-800 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-primary-600">
                <li>
                  <a href="#" className="hover:text-primary-800 transition">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-800 transition">
                    Smart Contracts
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-800 transition">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="hover:text-primary-800 transition">
                    Etherscan
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-primary-100 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-primary-600">
            <p>© 2024 P2P Energy Trading. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary-800 transition">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-primary-800 transition">
                Terms of Service
              </a>
              <a href="#" className="hover:text-primary-800 transition">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}