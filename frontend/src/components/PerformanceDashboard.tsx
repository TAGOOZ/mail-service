import React, { useState, useEffect } from 'react';
import { usePerformance, useApiPerformance } from '../hooks/usePerformance';
import { PerformanceReport } from '../utils/performanceMonitor';
import { PerformanceTestPanel } from './PerformanceTestPanel';

interface PerformanceDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible,
  onClose,
}) => {
  const [reports, setReports] = useState<PerformanceReport[]>([]);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'tests' | 'optimization'>('metrics');

  const { metrics, report, generateReport } = usePerformance({
    enableReporting: true,
    reportInterval: 10000, // 10 seconds
    onReport: (newReport) => {
      setReports(prev => [...prev.slice(-9), newReport]); // Keep last 10 reports
    },
  });

  const { apiStats } = useApiPerformance();

  const handleGenerateReport = () => {
    const newReport = generateReport();
    setReports(prev => [...prev.slice(-9), newReport]);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">性能监控面板</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowTestPanel(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                性能测试
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('metrics')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'metrics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  性能指标
                </button>
                <button
                  onClick={() => setActiveTab('tests')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'tests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  自动化测试
                </button>
                <button
                  onClick={() => setActiveTab('optimization')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'optimization'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  优化建议
                </button>
              </nav>
            </div>
          </div>

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <>
              {/* Current Performance Score */}
              {report && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">当前性能评分</h3>
                    <button
                      onClick={handleGenerateReport}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      刷新报告
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getScoreColor(report.score)}`}>
                        {report.score}
                      </div>
                      <div className="text-sm text-gray-600">总体评分</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatTime(report.metrics.firstContentfulPaint)}
                      </div>
                      <div className="text-sm text-gray-600">首次内容绘制</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatTime(report.metrics.largestContentfulPaint)}
                      </div>
                      <div className="text-sm text-gray-600">最大内容绘制</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatTime(report.metrics.firstInputDelay)}
                      </div>
                      <div className="text-sm text-gray-600">首次输入延迟</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Core Web Vitals */}
              {metrics && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">核心网页指标</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">LCP (最大内容绘制)</h4>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatTime(metrics.largestContentfulPaint)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        目标: &lt; 2.5s
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">FID (首次输入延迟)</h4>
                      <div className="text-2xl font-bold text-green-600">
                        {formatTime(metrics.firstInputDelay)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        目标: &lt; 100ms
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">CLS (累积布局偏移)</h4>
                      <div className="text-2xl font-bold text-orange-600">
                        {metrics.cumulativeLayoutShift.toFixed(3)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        目标: &lt; 0.1
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resource Metrics */}
              {metrics && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">资源指标</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">资源数量</h4>
                      <div className="text-2xl font-bold text-blue-600">
                        {metrics.resourceCount}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">总资源大小</h4>
                      <div className="text-2xl font-bold text-indigo-600">
                        {formatBytes(metrics.totalResourceSize)}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">DOM加载时间</h4>
                      <div className="text-2xl font-bold text-cyan-600">
                        {formatTime(metrics.domContentLoaded)}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">页面加载完成</h4>
                      <div className="text-2xl font-bold text-teal-600">
                        {formatTime(metrics.loadComplete)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Memory Usage */}
              {metrics && metrics.usedJSHeapSize && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">内存使用情况</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">已使用堆内存</h4>
                      <div className="text-2xl font-bold text-red-600">
                        {formatBytes(metrics.usedJSHeapSize)}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">总堆内存</h4>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatBytes(metrics.totalJSHeapSize || 0)}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">堆内存限制</h4>
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatBytes(metrics.jsHeapSizeLimit || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* API Performance */}
              {Object.keys(apiStats).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">API 性能统计</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">端点</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">调用次数</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">平均响应时间</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">最近响应时间</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">错误次数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(apiStats).map(([endpoint, stats]) => (
                          <tr key={endpoint}>
                            <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                              {endpoint}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {stats.callCount}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {formatTime(stats.averageResponseTime)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {formatTime(stats.lastResponseTime)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <span className={stats.errorCount > 0 ? 'text-red-600' : 'text-green-600'}>
                                {stats.errorCount}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Performance History */}
              {reports.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">性能历史记录</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">时间</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">评分</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">FCP</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">LCP</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">FID</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">CLS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.slice(-10).map((report, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 px-4 py-2 text-sm">
                              {report.timestamp.toLocaleTimeString()}
                            </td>
                            <td className={`border border-gray-300 px-4 py-2 font-bold ${getScoreColor(report.score)}`}>
                              {report.score}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {formatTime(report.metrics.firstContentfulPaint)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {formatTime(report.metrics.largestContentfulPaint)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {formatTime(report.metrics.firstInputDelay)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {report.metrics.cumulativeLayoutShift.toFixed(3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {report && report.recommendations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">优化建议</h3>
                  <ul className="space-y-2">
                    {report.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-yellow-500 mr-2">⚠️</span>
                        <span className="text-gray-700">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Tests Tab */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">自动化性能测试</h3>
                <p className="text-gray-600 mb-4">
                  运行自动化测试来验证应用性能是否符合预期标准。
                </p>
                <button
                  onClick={() => setShowTestPanel(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  打开测试面板
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">页面加载测试</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    测试页面加载时间、首次内容绘制等关键指标
                  </p>
                  <div className="text-sm text-green-600">✅ 可用</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">内存使用测试</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    监控JavaScript堆内存使用情况
                  </p>
                  <div className="text-sm text-green-600">✅ 可用</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">API性能测试</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    测试API响应时间和吞吐量
                  </p>
                  <div className="text-sm text-green-600">✅ 可用</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">邮件处理测试</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    测试大量邮件时的界面响应性能
                  </p>
                  <div className="text-sm text-green-600">✅ 可用</div>
                </div>
              </div>
            </div>
          )}

          {/* Optimization Tab */}
          {activeTab === 'optimization' && (
            <div className="space-y-6">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">性能优化建议</h3>
                <p className="text-gray-600">
                  基于当前性能数据提供的优化建议
                </p>
              </div>

              {/* General Optimization Tips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">🚀 页面加载优化</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 启用资源压缩和缓存</li>
                    <li>• 优化图片大小和格式</li>
                    <li>• 使用CDN加速静态资源</li>
                    <li>• 实现代码分割和懒加载</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">💾 内存优化</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 及时清理事件监听器</li>
                    <li>• 使用虚拟滚动处理大列表</li>
                    <li>• 避免内存泄漏</li>
                    <li>• 优化数据结构</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">⚡ API优化</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 实现响应缓存</li>
                    <li>• 使用分页减少数据量</li>
                    <li>• 优化数据库查询</li>
                    <li>• 实现请求去重</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">🎨 渲染优化</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 减少DOM操作</li>
                    <li>• 使用CSS动画替代JS动画</li>
                    <li>• 避免强制同步布局</li>
                    <li>• 优化重绘和回流</li>
                  </ul>
                </div>
              </div>

              {/* Performance Budget */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-3">性能预算</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">&lt; 3s</div>
                    <div className="text-sm text-gray-600">页面加载时间</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">&lt; 50MB</div>
                    <div className="text-sm text-gray-600">内存使用上限</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">&lt; 2s</div>
                    <div className="text-sm text-gray-600">API响应时间</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Test Panel */}
        <PerformanceTestPanel
          isVisible={showTestPanel}
          onClose={() => setShowTestPanel(false)}
        />
      </div>
    </div>
  );
};