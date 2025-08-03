import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('App', () => {
  it('renders without crashing', () => {
    renderWithRouter(<App />);
    expect(screen.getByText('临时邮箱')).toBeInTheDocument();
  });

  it('renders the home page by default', () => {
    renderWithRouter(<App />);
    expect(screen.getByText('临时邮箱服务')).toBeInTheDocument();
    expect(screen.getByText('生成临时邮箱')).toBeInTheDocument();
  });
});