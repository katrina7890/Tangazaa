import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../api';
import { formatDisplayDate } from './ui';

/**
 * Bell + dropdown for the Partner top bar. Polls every 60s so a booking made
 * on the app shows up for the billboard company without a refresh.
 */
export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(() => {
    fetchNotifications()
      .then(({ items: list, unreadCount: count }) => {
        setItems(list);
        setUnreadCount(count);
      })
      .catch(() => {}); // polling — a transient failure just tries again next tick
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function handleItemClick(notification) {
    if (!notification.readAt) {
      setItems((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      await markNotificationRead(notification.id).catch(() => {});
    }
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    setUnreadCount(0);
    await markAllNotificationsRead().catch(() => {});
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cream transition hover:bg-white/20"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-forest">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[1100] mt-2 w-80 overflow-hidden rounded-2xl border border-sand bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-sand bg-cream/60 px-4 py-2.5">
            <p className="text-sm font-semibold text-forest">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-stone-500">Nothing yet — new bookings will appear here.</p>
            ) : (
              items.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleItemClick(notification)}
                  className={`block w-full border-b border-sand/60 px-4 py-3 text-left transition last:border-b-0 hover:bg-cream/50 ${
                    notification.readAt ? 'opacity-70' : ''
                  }`}
                >
                  <span className="flex items-start gap-2">
                    {!notification.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-forest">{notification.title}</span>
                      {notification.body && <span className="block text-xs text-stone-600">{notification.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-stone-400">
                        {formatDisplayDate(notification.createdAt)}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
    </svg>
  );
}
