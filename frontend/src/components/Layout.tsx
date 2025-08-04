import React from 'react';
import Header from './Header';
import Footer from './Footer';
import NetworkStatus from './NetworkStatus';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <NetworkStatus />
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;