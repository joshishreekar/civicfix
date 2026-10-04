
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

export default function MyReports() {
  const [d, setD] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadReports() {
    try {
      setLoading(true);
      const data = await api('/complaints/my');
      setD(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return <p>Loading your reports...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">My Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track and manage all your civic complaints.
          </p>
        </div>
      </div>

      {d.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-bold">No reports yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your submitted complaints will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {d.map((c) => (
            <Link
              className="block rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
              to={`/complaints/${c.id}`}
              key={c.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{c.public_id}</b>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    c.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : c.status === 'Reopened'
                        ? 'bg-orange-100 text-orange-700'
                        : c.status === 'Citizen Confirmed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {c.status}
                </span>
              </div>

              <p className="mt-2">
                {c.category || c.ai_category || 'Unclassified'} ·{' '}
                {c.final_priority || 'Medium'}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {c.description}
              </p>

              {c.status === 'Resolved' && (
                <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                  <b>Resolution available</b>
                  <p className="mt-1">
                    Open this report to confirm the resolution or report that
                    the issue still exists.
                  </p>
                </div>
              )}

              {c.status === 'Reopened' && (
                <div className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-700">
                  <b>Issue reopened</b>
                  <p className="mt-1">
                    The department can review this complaint again.
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
