import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-600">
            © 2024 临时邮箱 - 基于 nnu.edu.kg 域名的临时邮箱服务
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <a href="#privacy" className="hover:text-gray-900 transition-colors">
              隐私政策
            </a>
            <a href="#terms" className="hover:text-gray-900 transition-colors">
              使用条款
            </a>
            <a href="#contact" className="hover:text-gray-900 transition-colors">
              联系我们
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;