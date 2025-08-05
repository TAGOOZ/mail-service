import { useEffect, useRef, useState } from 'react';
import {
  getPerformanceMonitor,
  PerformanceMetrics,
  PerformanceReport,
  cleanupPerformanceMonitor,
} from '../utils/performanceMonitor';

export interface UsePerformanceOptions {
  enableReporting?: boolean;
  reportInterval?: number;
  onReport?: (report: PerformanceReport) => void;
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const {
    enableReporting = false,
    reportInterval = 30000, // 30 seconds
    onReport,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const monitorRef = useRef(getPerformanceMonitor());

  useEffect(() => {
    const monitor = monitorRef.current;

    // Initial metrics collection
    const collectMetrics = () => {
      const currentMetrics = monitor.getMetrics();
      setMetrics(currentMetrics);

      if (enableReporting) {
        const currentReport = monitor.generateReport();
        setReport(currentReport);
        onReport?.(currentReport);
      }
    };

    // Collect initial metrics after a short delay to ensure page is loaded
    const initialTimeout = setTimeout(collectMetrics, 1000);

    // Set up periodic reporting if enabled
    if (enableReporting && reportInterval > 0) {
      intervalRef.current = setInterval(collectMetrics, reportInterval);
    }

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enableReporting, reportInterval, onReport]);

  useEffect(() => {
    return () => {
      cleanupPerformanceMonitor();
    };
  }, []);

  const measureOperation = <T>(name: string, operation: () => T): T => {
    return monitorRef.current.measureFunction(name, operation);
  };

  const measureAsyncOperation = async <T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    return monitorRef.current.measureAsyncFunction(name, operation);
  };

  const startMeasurement = (name: string) => {
    monitorRef.current.startMeasurement(name);
  };

  const endMeasurement = (name: string): number => {
    return monitorRef.current.endMeasurement(name);
  };

  const generateReport = (): PerformanceReport => {
    const currentReport = monitorRef.current.generateReport();
    setReport(currentReport);
    return currentReport;
  };

  const refreshMetrics = () => {
    const currentMetrics = monitorRef.current.getMetrics();
    setMetrics(currentMetrics);
  };

  return {
    metrics,
    report,
    measureOperation,
    measureAsyncOperation,
    startMeasurement,
    endMeasurement,
    generateReport,
    refreshMetrics,
  };
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef<number>(0);
  const [renderStats, setRenderStats] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
  });

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      renderCountRef.current += 1;
      lastRenderTimeRef.current = renderTime;

      const newStats = {
        renderCount: renderCountRef.current,
        averageRenderTime: renderTime, // Simplified - could maintain running average
        lastRenderTime: renderTime,
      };

      setRenderStats(newStats);

      // Log slow renders
      if (renderTime > 16) {
        // More than one frame at 60fps
        console.warn(
          `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
        );
      }
    };
  });

  return renderStats;
}

// Hook for measuring API call performance
export function useApiPerformance() {
  const [apiStats, setApiStats] = useState<{
    [endpoint: string]: {
      callCount: number;
      averageResponseTime: number;
      lastResponseTime: number;
      errorCount: number;
    };
  }>({});

  const measureApiCall = async <T>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    let hasError = false;

    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      hasError = true;
      throw error;
    } finally {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      setApiStats(prev => {
        const current = prev[endpoint] || {
          callCount: 0,
          averageResponseTime: 0,
          lastResponseTime: 0,
          errorCount: 0,
        };

        const newCallCount = current.callCount + 1;
        const newAverageResponseTime =
          (current.averageResponseTime * current.callCount + responseTime) /
          newCallCount;

        return {
          ...prev,
          [endpoint]: {
            callCount: newCallCount,
            averageResponseTime: newAverageResponseTime,
            lastResponseTime: responseTime,
            errorCount: current.errorCount + (hasError ? 1 : 0),
          },
        };
      });

      // Log slow API calls
      if (responseTime > 2000) {
        console.warn(
          `Slow API call detected for ${endpoint}: ${responseTime.toFixed(2)}ms`
        );
      }
    }
  };

  const getApiStats = (endpoint?: string) => {
    if (endpoint) {
      return apiStats[endpoint];
    }
    return apiStats;
  };

  const resetStats = (endpoint?: string) => {
    if (endpoint) {
      setApiStats(prev => {
        const newStats = { ...prev };
        delete newStats[endpoint];
        return newStats;
      });
    } else {
      setApiStats({});
    }
  };

  return {
    measureApiCall,
    getApiStats,
    resetStats,
    apiStats,
  };
}
