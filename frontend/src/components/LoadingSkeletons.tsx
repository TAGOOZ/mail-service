import React from 'react';

// Skeleton for MailboxInfo component
export const MailboxInfoSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 animate-pulse">
      <div className="flex flex-col space-y-4">
        <div className="space-y-3 flex-1">
          <div className="h-6 sm:h-8 bg-gray-200 rounded w-32 sm:w-48"></div>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="flex items-center space-x-2 flex-1">
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
              <div className="h-8 sm:h-10 bg-gray-200 rounded flex-1"></div>
            </div>
            <div className="h-10 sm:h-8 w-full sm:w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-end">
          <div className="h-10 sm:h-10 w-full sm:w-32 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="h-6 bg-gray-200 rounded"></div>
          <div className="h-6 bg-gray-200 rounded"></div>
          <div className="h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};

// Skeleton for MailList component
export const MailListSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header skeleton */}
      <div className="p-3 sm:p-4 border-b border-gray-200 animate-pulse">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-5 sm:h-6 bg-gray-200 rounded w-24 sm:w-32"></div>
          <div className="flex items-center justify-between sm:justify-end space-x-2">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div className="h-6 sm:h-8 w-16 sm:w-20 bg-gray-200 rounded"></div>
            <div className="h-6 sm:h-8 w-12 sm:w-16 bg-gray-200 rounded"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="h-8 sm:h-10 bg-gray-200 rounded mt-3"></div>
      </div>

      {/* Mail items skeleton */}
      <div className="divide-y divide-gray-200">
        {[...Array(5)].map((_, index) => (
          <MailItemSkeleton key={index} />
        ))}
      </div>
    </div>
  );
};

// Skeleton for individual mail item
export const MailItemSkeleton: React.FC = () => {
  return (
    <div className="p-3 sm:p-4 animate-pulse">
      <div className="flex items-start space-x-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="h-4 sm:h-5 bg-gray-200 rounded w-24 sm:w-32"></div>
              <div className="h-4 sm:h-5 w-10 sm:w-12 bg-gray-200 rounded-full"></div>
            </div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-12 sm:w-16"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
          <div className="h-6 sm:h-8 bg-gray-200 rounded mb-2"></div>
          <div className="flex items-center justify-between">
            <div className="h-3 bg-gray-200 rounded w-16 sm:w-20"></div>
            <div className="flex items-center space-x-1">
              <div className="h-6 w-6 sm:h-6 sm:w-6 bg-gray-200 rounded"></div>
              <div className="h-6 w-6 sm:h-6 sm:w-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Skeleton for MailContent component
export const MailContentSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
      {/* Header skeleton */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
};

// Skeleton for ActionButtons component
export const ActionButtonsSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-10 bg-gray-200 rounded flex-1"></div>
        <div className="h-10 bg-gray-200 rounded flex-1"></div>
        <div className="h-10 bg-gray-200 rounded flex-1"></div>
        <div className="h-10 bg-gray-200 rounded flex-1"></div>
      </div>
    </div>
  );
};

// Generic loading spinner
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${sizeClasses[size]} ${className}`}></div>
  );
};

// Page loading component
export const PageLoading: React.FC<{ message?: string }> = ({ message = '加载中...' }) => {
  return (
    <div className="flex items-center justify-center py-8 sm:py-12">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 text-sm sm:text-base">{message}</p>
      </div>
    </div>
  );
};

// Enhanced skeleton with shimmer effect
export const ShimmerSkeleton: React.FC<{
  className?: string;
  width?: string;
  height?: string;
}> = ({
  className = '',
  width = 'w-full',
  height = 'h-4'
}) => {
    return (
      <div className={`${width} ${height} bg-gray-200 rounded shimmer ${className}`}></div>
    );
  };

// Mobile-optimized action buttons skeleton
export const ActionButtonsSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 animate-pulse">
      <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3">
        <ShimmerSkeleton height="h-10 sm:h-10" className="rounded-md" />
        <ShimmerSkeleton height="h-10 sm:h-10" className="rounded-md" />
        <ShimmerSkeleton height="h-10 sm:h-10" className="rounded-md" />
        <ShimmerSkeleton height="h-10 sm:h-10" className="rounded-md" />
      </div>
    </div>
  );
};

// Progressive loading component
export const ProgressiveLoader: React.FC<{
  steps: string[];
  currentStep: number;
}> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-center py-8 sm:py-12">
      <div className="text-center max-w-sm">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <div className="space-y-2">
          <p className="text-gray-600 text-sm sm:text-base">
            {steps[currentStep] || '加载中...'}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            {currentStep + 1} / {steps.length}
          </p>
        </div>
      </div>
    </div>
  );
};