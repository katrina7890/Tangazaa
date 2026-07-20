import { useEffect, useRef, useState } from 'react';

/**
 * A booking's message thread + composer, shared by the Partner Chat Centre
 * and the customer's campaign page. Fetching/sending is injected so each side
 * uses its own endpoints.
 */
export default function ChatThread({ fetchMessages, sendMessage, emptyHint }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMessages()
      .then((items) => !cancelled && setMessages(items))
      .catch(() => !cancelled && setError('Could not load messages.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  async function handleSend(event) {
    event.preventDefault();
    if (!body.trim() && attachments.length === 0) return;
    setSending(true);
    setError('');
    try {
      const sent = await sendMessage({ body: body.trim() || null, attachments });
      setMessages((current) => [...current, sent]);
      setBody('');
      setAttachments([]);
      if (fileRef.current) fileRef.current.value = '';
    } catch (sendError) {
      setError(sendError.message || 'Could not send the message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="max-h-96 min-h-40 flex-1 space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-sm text-stone-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-sand-dark bg-cream/40 p-4 text-center text-sm text-stone-600">
            {emptyHint || 'No messages yet — say hello.'}
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  message.mine ? 'rounded-br-md bg-forest text-cream' : 'rounded-bl-md bg-cream text-slate-800'
                }`}
              >
                {message.body && <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>}
                {message.attachments.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {message.attachments.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
                        <img src={url} alt="Attachment" className="h-20 w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <p className={`mt-1 text-[10px] ${message.mine ? 'text-cream/60' : 'text-stone-400'}`}>
                  {message.sender ? `${message.sender} · ` : ''}
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-3 border-t border-sand pt-3">
        {attachments.length > 0 && (
          <p className="mb-1.5 text-xs text-stone-500">
            {attachments.length} image{attachments.length > 1 ? 's' : ''} attached
          </p>
        )}
        {error && <p className="mb-1.5 text-xs font-medium text-red-600">{error}</p>}
        <div className="flex items-end gap-2">
          <label className="cursor-pointer rounded-full border border-sand p-2.5 text-stone-500 transition hover:border-gold hover:text-gold-dark">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => setAttachments([...event.target.files].slice(0, 4))}
            />
            <PaperclipIcon />
          </label>
          <textarea
            rows={1}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a message…"
            className="max-h-28 flex-1 resize-y rounded-2xl border border-sand px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
          <button
            type="submit"
            disabled={sending || (!body.trim() && attachments.length === 0)}
            className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-forest-deep transition hover:bg-gold-soft disabled:opacity-50"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatTime(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M21 12.5l-8.5 8.5a6 6 0 0 1-8.5-8.5L12.5 4a4 4 0 0 1 5.7 5.7L9.7 18.2a2 2 0 0 1-2.9-2.9l7.8-7.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
