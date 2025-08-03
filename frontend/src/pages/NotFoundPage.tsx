import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <AlertCircle className="h-24 w-24 text-gray-300 mx-auto" />
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700">页面未找到</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          抱歉，您访问的页面不存在。可能是链接错误或页面已被删除。
        </p>
      </div>
      
      <div className="space-y-4">
        <Link
          to="/"
          className="btn-primary inline-flex items-center space-x-2"
        >
          <Home className="h-4 w-4" />
          <span>返回首页</span>
        </Link>
        
        <div className="text-sm text-gray-500">
          或者您可以 <button className="text-primary-600 hover:text-primary-700 underline">生成新的临时邮箱</button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;