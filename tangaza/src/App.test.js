import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// jsdom has no real layout engine, which Leaflet's Map relies on; stub the
// map primitives so tests cover our chrome/panel rather than Leaflet internals.
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
}));

beforeEach(() => {
  // AuthProvider checks the session on mount, and the landing page fetches
  // billboard counts; stub both out as "not logged in" / "no data yet".
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 401, json: async () => ({}) }));
});

test('renders the landing page by default', async () => {
  render(<App />);
  expect(screen.getByRole('link', { name: 'TANGAZAA' })).toBeInTheDocument();
  expect(await screen.findByText(/book the right billboard/i)).toBeInTheDocument();
  expect(screen.getByText(/browse billboards/i)).toBeInTheDocument();
});

test('shows a sign-in link when logged out', async () => {
  render(<App />);
  expect(await screen.findByText('SIGN IN')).toBeInTheDocument();
});

test('the hero CTA navigates to the map browse page', async () => {
  render(<App />);
  await userEvent.click(await screen.findByText(/browse billboards/i));
  expect(await screen.findByText(/live inventory/i)).toBeInTheDocument();
});
