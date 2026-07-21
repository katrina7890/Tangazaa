import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadDocument, fetchMyDocuments } from '../../api';
import { EmptyState, ErrorNotice, SectionHeading, formatDate } from '../../components/customer/ui';
import { formatKES } from '../../utils/availability';

const TYPE_META = {
  contract: {
    label: 'Contract',
    blurb: 'The booking agreement between you and the billboard company.',
    chip: 'bg-forest/10 text-forest',
  },
  receipt: {
    label: 'Receipt',
    blurb: 'Proof of payment for your records.',
    chip: 'bg-emerald-100 text-emerald-800',
  },
};

/** Contracts and receipts, rendered to PDF on demand by the API. */
export default function CustomerDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMyDocuments()
      .then(setDocuments)
      .catch(() => setError('Could not load your documents.'))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? documents : documents.filter((item) => item.type === filter)),
    [documents, filter],
  );

  async function handleDownload(item) {
    setError('');
    setDownloadingId(item.id);
    try {
      await downloadDocument(item);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <ErrorNotice>{error}</ErrorNotice>

      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'All documents' },
          { value: 'contract', label: 'Contracts' },
          { value: 'receipt', label: 'Receipts' },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === value
                ? 'bg-forest text-cream'
                : 'border border-sand bg-white text-stone-600 hover:border-gold/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-stone-600">Loading your documents…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title="No documents yet"
          action={
            <Link
              to="/map"
              className="inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft"
            >
              Find a billboard
            </Link>
          }
        >
          Your contract and receipt are issued the moment a campaign is paid for — and emailed to you
          as well.
        </EmptyState>
      ) : (
        <>
          <SectionHeading>Your paperwork</SectionHeading>
          <div className="space-y-3">
            {visible.map((item) => {
              const meta = TYPE_META[item.type] || TYPE_META.receipt;
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sand bg-white px-5 py-4 shadow-sm transition hover:border-gold/40"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <PdfIcon />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-forest">{item.title}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.chip}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="truncate text-sm text-stone-500">
                        {item.billboard} · {item.company}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-stone-400">
                        {item.reference} · {formatDate(item.issuedAt)}
                        {item.amount ? ` · ${formatKES(item.amount)}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    disabled={downloadingId === item.id}
                    className="shrink-0 rounded-full bg-gold px-5 py-2 text-sm font-bold text-white transition hover:bg-gold-soft disabled:opacity-60"
                  >
                    {downloadingId === item.id ? 'Preparing…' : 'Download PDF'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PdfIcon() {
  return (
    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream text-gold-dark">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
