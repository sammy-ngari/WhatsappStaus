import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthContext } from './context/AuthContext';

jest.mock('./api/axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  interceptors: {
    response: {
      use: jest.fn(),
    },
  },
}));

jest.mock(
  'react-router-dom',
  () => ({
    Navigate: ({ to }) => <div data-testid="navigate-target">{to}</div>,
    Route: ({ element }) => element,
    Routes: ({ children }) => <>{children}</>,
    useNavigate: () => jest.fn(),
    useLocation: () => ({}),
    Link: ({ to, children }) => <a href={to}>{children}</a>,
  }),
  { virtual: true }
);

test('renders login route', () => {
  const authContextValue = {
    user: null,
    permissions: [],
    isBootstrapping: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshAuthState: jest.fn(),
    hasPermission: jest.fn(() => false),
  };

  render(
    <AuthContext.Provider value={authContextValue}>
      <App />
    </AuthContext.Provider>
  );

  const heading = screen.getByRole('heading', { name: /login/i });
  expect(heading).toBeInTheDocument();
});
