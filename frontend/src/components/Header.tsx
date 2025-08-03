import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import ConnectionStatus from './ConnectionStatus';

const Header: React.FC = () => {
  const { connectionStatus } = useWebSocket();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors">
            <Mail className="h-8 w-8" />
            <span className="text-xl font-bold">临时邮箱</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <ConnectionStatus status={connectionStatus} className="hidden sm:flex" />
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                to="/" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                首页
              </Link>
              <a 
                href="#about" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
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