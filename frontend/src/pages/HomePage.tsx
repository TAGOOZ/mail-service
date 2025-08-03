import React from 'react';
import { Mail, Clock, Shield, Zap } from 'lucide-react';
import { useMailbox } from '../hooks/useMailbox';

const HomePage: React.FC = () => {
  const { generateMailbox, loading, error } = useMailbox();

  const handleGenerateMailbox = async () => {
    try {
      await generateMailbox();
    } catch (error) {
      console.error('Failed to generate mailbox:', error);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          临时邮箱服务
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          快速生成临时邮箱地址，保护您的隐私，无需注册即可接收邮件
        </p>
        <button
          onClick={handleGenerateMailbox}
          disabled={loading}
          className="btn-primary text-lg px-8 py-3 inline-flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="h-5 w-5" />
          <span>{loading ? '生成中...' : '生成临时邮箱'}</span>
        </button>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto">
            <Zap className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold">即时生成</h3>
          <p className="text-gray-600 text-sm">
            无需注册，一键生成临时邮箱地址
          </p>
        </div>

        <div className="card p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto">
            <Clock className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold">24小时有效</h3>
          <p className="text-gray-600 text-sm">
            邮箱有效期24小时，可延长至48小时
          </p>
        </div>

        <div className="card p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto">
            <Shield className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold">隐私保护</h3>
          <p className="text-gray-600 text-sm">
            保护您的真实邮箱，避免垃圾邮件
          </p>
        </div>

        <div className="card p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto">
            <Mail className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold">实时接收</h3>
          <p className="text-gray-600 text-sm">
            实时接收邮件，支持HTML和纯文本
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-center mb-8">如何使用</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              1
            </div>
            <h3 className="text-lg font-semibold">生成邮箱</h3>
            <p className="text-gray-600">
              点击"生成临时邮箱"按钮，系统会自动为您创建一个临时邮箱地址
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              2
            </div>
            <h3 className="text-lg font-semibold">使用邮箱</h3>
            <p className="text-gray-600">
              复制邮箱地址，在需要的网站上使用它进行注册或接收邮件
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              3
            </div>
            <h3 className="text-lg font-semibold">查看邮件</h3>
            <p className="text-gray-600">
              返回本页面查看收到的邮件，支持实时更新和邮件管理
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;