import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../ProtectedRoute';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock('../LoginDialog', () => ({
  LoginDialog: () => <div data-testid="login-dialog">Login Dialog</div>,
}));

const { useAuth } = require('@/contexts/AuthContext');

describe('ProtectedRoute', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_AUTH_BYPASS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('renders children when user is authenticated', () => {
    useAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-dialog')).not.toBeInTheDocument();
  });

  it('renders LoginDialog when user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('login-dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders loading skeletons while auth is loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-dialog')).not.toBeInTheDocument();
  });

  it('renders children when NEXT_PUBLIC_AUTH_BYPASS is set to "1"', () => {
    process.env.NEXT_PUBLIC_AUTH_BYPASS = '1';
    useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-dialog')).not.toBeInTheDocument();
  });
});
