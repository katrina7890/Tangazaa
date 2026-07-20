import { useCallback, useEffect, useState } from 'react';
import { fetchPartnerChatMessages, fetchPartnerChats, sendPartnerChatMessage } from '../../api';
import ChatThread from '../../components/chat/ChatThread';
import { Badge, EmptyState, SectionCard } from '../../components/partner/ui';

/**
 * Chat Centre (ERP PRD §5): every booking's conversation in one place — app
 * clients get real two-way chat, offline threads double as the comms log.
 */
export default function PartnerChatPage() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchPartnerChats()
      .then((items) => {
        setChats(items);
        setSelected((current) => current ?? items[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchMessages = useCallback(
    () => (selected ? fetchPartnerChatMessages(selected.bookingId) : Promise.resolve([])),
    [selected],
  );
  const sendMessage = useCallback(
    (payload) => sendPartnerChatMessage(selected.bookingId, payload),
    [selected],
  );

  if (loading) return <p className="text-stone-600">Loading…</p>;
  if (chats.length === 0) return <EmptyState>No bookings yet — conversations appear here per booking.</EmptyState>;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
      {/* Conversation list */}
      <div className="space-y-2 lg:max-h-[34rem] lg:overflow-y-auto lg:pr-1">
        {chats.map((chat) => (
          <button
            key={chat.bookingId}
            type="button"
            onClick={() => setSelected(chat)}
            className={`w-full rounded-2xl border p-3.5 text-left transition ${
              selected?.bookingId === chat.bookingId
                ? 'border-gold bg-white'
                : 'border-sand bg-white/70 hover:border-gold/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                {chat.advertiser || 'Client'}
              </p>
              <Badge tone={chat.source === 'offline' ? 'forest' : 'gold'}>
                {chat.source === 'offline' ? 'Offline' : 'App'}
              </Badge>
            </div>
            <p className="truncate text-xs text-stone-500">{chat.billboard}</p>
            <p className="mt-1 truncate text-xs text-stone-400">
              {chat.latest
                ? `${chat.latest.fromCustomer ? 'Client: ' : ''}${chat.latest.body}`
                : 'No messages yet'}
            </p>
          </button>
        ))}
      </div>

      {/* Active thread */}
      {selected && (
        <SectionCard
          title={`${selected.advertiser || 'Client'} — ${selected.billboard}`}
          action={
            selected.source === 'offline' ? (
              <span className="text-xs text-stone-500">Internal log — this client isn&apos;t on the app</span>
            ) : (
              <span className="text-xs text-stone-500">The client sees this in their Tangazaa account</span>
            )
          }
        >
          <ChatThread
            key={selected.bookingId}
            fetchMessages={fetchMessages}
            sendMessage={sendMessage}
            emptyHint={
              selected.source === 'offline'
                ? 'Log calls, WhatsApps and agreements here so the whole team sees them.'
                : 'No messages yet — your client will be notified when you write.'
            }
          />
        </SectionCard>
      )}
    </div>
  );
}
