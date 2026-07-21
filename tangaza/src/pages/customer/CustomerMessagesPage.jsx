import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBookingMessages, fetchMyChats, sendBookingMessage } from '../../api';
import ChatThread from '../../components/chat/ChatThread';
import { EmptyState } from '../../components/customer/ui';

/**
 * The customer's message inbox: one conversation per booking, straight to the
 * billboard company running each campaign.
 */
export default function CustomerMessagesPage() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchMyChats()
      .then((items) => {
        setChats(items);
        setSelected((current) => current ?? items[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchMessages = useCallback(
    () => (selected ? fetchBookingMessages(selected.bookingId) : Promise.resolve([])),
    [selected],
  );
  const sendMessage = useCallback(
    (payload) => sendBookingMessage(selected.bookingId, payload),
    [selected],
  );

  if (loading) {
    return (
      <p className="rounded-3xl border border-sand bg-white p-8 text-center text-stone-600 shadow-sm">
        Loading your conversations…
      </p>
    );
  }

  if (chats.length === 0) {
    return (
      <EmptyState
        title="No conversations yet"
        action={
          <Link
            to="/map"
            className="inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft"
          >
            Find a billboard
          </Link>
        }
      >
        Book a billboard and you can message the company here.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <div className="space-y-2 lg:max-h-[32rem] lg:overflow-y-auto lg:pr-1">
        {chats.map((chat) => (
          <button
            key={chat.bookingId}
            type="button"
            onClick={() => setSelected(chat)}
            className={`w-full rounded-2xl border p-3.5 text-left transition ${
              selected?.bookingId === chat.bookingId
                ? 'border-gold bg-white'
                : 'border-sand bg-white/80 hover:border-gold/50'
            }`}
          >
            <p className="truncate text-sm font-semibold text-slate-900">{chat.company}</p>
            <p className="truncate text-xs text-stone-500">{chat.billboard}</p>
            <p className="mt-1 truncate text-xs text-stone-400">
              {chat.latest
                ? `${chat.latest.fromCustomer ? 'You: ' : ''}${chat.latest.body}`
                : 'No messages yet'}
            </p>
          </button>
        ))}
      </div>

      {selected && (
        <section className="rounded-3xl border border-sand bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-sand pb-3">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-lg font-semibold text-forest">{selected.company}</h2>
              <p className="truncate text-xs text-stone-500">{selected.billboard}</p>
            </div>
            <Link
              to={`/dashboard/bookings/${selected.bookingId}/progress`}
              className="text-xs font-semibold text-gold-dark hover:underline"
            >
              View campaign progress →
            </Link>
          </div>
          <ChatThread
            key={selected.bookingId}
            fetchMessages={fetchMessages}
            sendMessage={sendMessage}
            emptyHint="Questions about your campaign? The team is notified the moment you write."
          />
        </section>
      )}
    </div>
  );
}
