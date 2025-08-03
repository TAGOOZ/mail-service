import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MailboxProvider } from './contexts/MailboxContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import MailboxPage from './pages/MailboxPage';
import MailDetailPage from './pages/MailDetailPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <ErrorBoundary>
      <MailboxProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/mailbox/:mailboxId" element={<MailboxPage />} />
            <Route path="/mailbox/:mailboxId/mail/:mailId" element={<MailDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </MailboxProvider>
    </ErrorBoundary>
  );
}

export default App;