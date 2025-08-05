import React, { useState, useEffect } from 'react';
import {
  getPerformanceTestRunner,
  PerformanceTestResult,
  createPageLoadTestSuite,
  createMemoryTestSuite,
  createApiPerformanceTestSuite,
  createMailHandlingTestSuite,
} from '../utils/performanceTestRunner';

interface PerformanceTestPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const PerformanceTestPanel: React.FC<PerformanceTestPanelProps> = ({
  isVisible,
  onClose,
}) => {
  const [testResults, setTestResults] = useState<PerformanceTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string>('pageLoad');
  const testRunner = getPerformanceTestRunner();

  useEffect(() => {
    setTestResults(testRunner.getResults());
  }, [testRunner]);

  const runSelectedTestSuite = async () => {
    setIsRunning(true);

    try {
      let suite;
      switch (selectedSuite) {
        case 'pageLoad':
          suite = createPageLoadTestSuite();
          break;
        case 'memory':
          suite = createMemoryTestSuite();
          break;
        case 'api':
          suite = createApiPerformanceTestSuite([
            '/api/mailbox/generate',
            '/api/mail',
            '/api/performance/stats',
          ]);
          break;
        case 'mailHandling':
          suite = createMailHandlingTestSuite();
          break;
        default:
          suite = createPageLoadTestSuite();
      }

      const results = await testRunner.runTestSuite(suite);
      setTestResults(testRunner.getResults());
    } catch (error) {
      console.error('Error running test suite:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    testRunner.clearResults();
    setTestResults([]);
  };

  const getResultColor = (result: PerformanceTestResult) => {
    if (result.passed) return 'text-green-600';
    return 'text-red-600';
  };

  const getResultIcon = (result: PerformanceTestResult) => {
    if (result.passed) return '✅';
    return '❌';
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'bytes') {
      if (value === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(value) / Math.log(k));
      return parseFloat((value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    if (unit === 'ms') {
      if (value < 1000) return `${value.toFixed(0)}ms`;
      return `${(value / 1000).toFixed(2)}s`;
    }
    return `${value.toFixed(2)} ${unit}`;
  };

  const generateReport = () => {
    const report = testRunner.generateReport();
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: report.totalTests,
        passedTests: report.passedTests,
        failedTests: report.failedTests,
        passRate: report.passRate,
      },
      results: report.results,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  const report = testRunner.generateReport();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">性能测试面板</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Test Suite Selection */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">选择测试套件</h3>
            <div className="flex flex-wrap gap-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="pageLoad"
                  checked={selectedSuite === 'pageLoad'}
                  onChange={(e) => setSelectedSuite(e.target.value)}
                  className="mr-2"
                />
                页面加载性能
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="memory"
                  checked={selectedSuite === 'memory'}
                  onChange={(e) => setSelectedSuite(e.target.value)}
                  className="mr-2"
                />
                内存使用
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="api"
                  checked={selectedSuite === 'api'}
                  onChange={(e) => setSelectedSuite(e.target.value)}
                  className="mr-2"
                />
                API 性能
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="mailHandling"
                  checked={selectedSuite === 'mailHandling'}
                  onChange={(e) => setSelectedSuite(e.target.value)}
                  className="mr-2"
                />
                邮件处理性能
              </label>
            </div>
            <div className="flex gap-4">
              <button
                onClick={runSelectedTestSuite}
                disabled={isRunning}
                className={`px-4 py-2 rounded font-medium ${isRunning
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
              >
                {isRunning ? '运行中...' : '运行测试'}
              </button>
              <button
                onClick={clearResults}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                清除结果
              </button>
              <button
                onClick={generateReport}
                disabled={testResults.length === 0}
                className={`px-4 py-2 rounded font-medium ${testResults.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
              >
                导出报告
              </button>
            </div>
          </div>

          {/* Test Summary */}
          {report.totalTests > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">测试摘要</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {report.totalTests}
                  </div>
                  <div className="text-sm text-gray-600">总测试数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {report.passedTests}
                  </div>
                  <div className="text-sm text-gray-600">通过测试</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {report.failedTests}
                  </div>
                  <div className="text-sm text-gray-600">失败测试</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${report.passRate >= 80 ? 'text-green-600' :
                      report.passRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                    {report.passRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">通过率</div>
                </div>
              </div>
            </div>
          )}

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">测试结果</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">状态</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">测试名称</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">实际值</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">阈值</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.slice(-20).map((result, index) => (
                      <tr key={index} className={result.passed ? '' : 'bg-red-50'}>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <span className="text-lg">{getResultIcon(result)}</span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {result.testName}
                        </td>
                        <td className={`border border-gray-300 px-4 py-2 font-mono ${getResultColor(result)}`}>
                          {formatValue(result.actualValue, result.unit)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-mono">
                          {formatValue(result.expectedThreshold, result.unit)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                          {result.timestamp.toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Performance Recommendations */}
          {report.failedTests > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">性能优化建议</h3>
              <div className="space-y-2">
                {testResults
                  .filter(result => !result.passed)
                  .map((result, index) => (
                    <div key={index} className="flex items-start p-3 bg-yellow-50 rounded-lg">
                      <span className="text-yellow-500 mr-2">⚠️</span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {result.testName} 测试失败
                        </div>
                        <div className="text-sm text-gray-600">
                          实际值: {formatValue(result.actualValue, result.unit)},
                          期望值: ≤ {formatValue(result.expectedThreshold, result.unit)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {getOptimizationSuggestion(result.testName)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {testResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>暂无测试结果，请选择测试套件并运行测试。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getOptimizationSuggestion(testName: string): string {
  const suggestions: { [key: string]: string } = {
    'DOM Content Loaded': '优化关键资源加载，减少阻塞渲染的脚本',
    'First Contentful Paint': '优化首屏内容，使用服务端渲染或预加载关键资源',
    'Largest Contentful Paint': '优化最大内容元素，压缩图片或使用懒加载',
    'Total Resource Size': '启用压缩，优化图片，移除未使用的代码',
    'Resource Count': '合并文件，使用 HTTP/2，减少第三方资源',
    'Used JS Heap Size': '检查内存泄漏，优化数据结构，清理未使用的对象',
    'DOM Node Count': '简化 DOM 结构，使用虚拟滚动，延迟渲染',
    'Mail List Render Time': '使用虚拟化列表，优化渲染逻辑，减少重绘',
    'Mail Content Render Time': '优化 HTML 渲染，使用内容安全策略，延迟加载非关键内容',
  };

  for (const [key, suggestion] of Object.entries(suggestions)) {
    if (testName.includes(key)) {
      return suggestion;
    }
  }

  return '请检查相关代码逻辑，优化性能瓶颈';
}