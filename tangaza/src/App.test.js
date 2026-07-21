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
  expect(await screen.findByText(/a new way to book outdoor advertising/i)).toBeInTheDocument();
  expect(screen.getByText(/real boards\. real data\./i)).toBeInTheDocument();
  // The tagline appears twice by design — hero eyebrow and footer strapline.
  expect(screen.getAllByText(/outdoor advertising, booked in minutes/i)).toHaveLength(2);
});

test('shows a sign-in link when logged out', async () => {
  render(<App />);
  // The footer also links to /login, so scope this to the header's own link
  // rather than matching the text anywhere on the page.
  const signIn = await screen.findAllByRole('link', { name: /sign in/i });
  expect(signIn.length).toBeGreaterThan(0);
  signIn.forEach((link) => expect(link).toHaveAttribute('href', '/login'));
});

test('the billboards CTA navigates to the map browse page', async () => {
  render(<App />);
  await userEvent.click(await screen.findByText(/view billboards/i));
  expect(await screen.findByText(/live inventory/i)).toBeInTheDocument();
});
