import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MailboxProvider } from './contexts/MailboxContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { PageLoading } from './components/LoadingSkeletons';

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage'));
const MailboxPage = lazy(() => import('./pages/MailboxPage'));
const MailDetailPage = lazy(() => import('./pages/MailDetailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
  return (
    <ErrorBoundary>
      <MailboxProvider>
        <Layout>
          <Suspense fallback={<PageLoading message="加载页面中..." />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/mailbox/:mailboxId" element={<MailboxPage />} />
              <Route path="/mailbox/:mailboxId/mail/:mailId" element={<MailDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Layout>
      </MailboxProvider>
    </ErrorBoundary>
  );
}

export default App;