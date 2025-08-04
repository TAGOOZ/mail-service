import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-3 sm:space-y-4 md:space-y-0">
          <div className="text-xs sm:text-sm text-gray-600 text-center md:text-left">
            © 2024 临时邮箱 - 基于 nnu.edu.kg 域名的临时邮箱服务
          </div>
          
          <div className="flex items-center space-x-4 sm:space-x-6 text-xs sm:text-sm text-gray-600">
            <a 
              href="#privacy" 
              className="hover:text-gray-900 transition-colors touch-manipulation active:scale-95 px-2 py-1 rounded"
            >
              隐私政策
            </a>
            <a 
              href="#terms" 
              className="hover:text-gray-900 transition-colors touch-manipulation active:scale-95 px-2 py-1 rounded"
            >
              使用条款
            </a>
            <a 
              href="#contact" 
              className="hover:text-gray-900 transition-colors touch-manipulation active:scale-95 px-2 py-1 rounded hidden sm:inline"
            >
              联系我们
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;