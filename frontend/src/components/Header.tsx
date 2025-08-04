import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import ConnectionStatus from './ConnectionStatus';

const Header: React.FC = () => {
  const { connectionStatus } = useWebSocket();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-4xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors touch-manipulation active:scale-95">
            <Mail className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="text-lg sm:text-xl font-bold">临时邮箱</span>
          </Link>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ConnectionStatus status={connectionStatus} className="hidden sm:flex" />
            
            <nav className="flex items-center space-x-3 sm:space-x-6">
              <Link 
                to="/" 
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base touch-manipulation active:scale-95 px-2 py-1 rounded"
              >
                首页
              </Link>
              <a 
                href="#about" 
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base touch-manipulation active:scale-95 px-2 py-1 rounded hidden sm:inline"
              >
                关于
              </a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;