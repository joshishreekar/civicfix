import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

function getUserFromToken() {
  try {
    const token = localStorage.getItem('civicfix_token');
    if (!token) return null;

    const payload = JSON.parse(atob(token.split('.')[1]));

    return payload;
  } catch {
    return null;
  }
}

export default function Complaint() {
  const { id } = useParams();

  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [remark, setRemark] = useState('');

  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionImage, setResolutionImage] = useState(null);

  const user = getUserFromToken();
  const isDepartment = user?.role === 'DEPARTMENT';
  const isCitizen = user?.role === 'CITIZEN';

  async function load() {
    try {
      setError('');

      const data = await api('/complaints/' + id);

      setC(data);
      setStatus(data.status || 'Reported');
      setPriority(data.final_priority || 'Medium');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function updateStatus() {
    try {
      setError('');
      setSuccess('');

      if (!status) {
        setError('Please select a status.');
        return;
      }

      await api('/complaints/' + id + '/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          priority,
          remark
        })
      });

      setSuccess('Complaint updated successfully.');
      setRemark('');

      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addRemark() {
    try {
      setError('');
      setSuccess('');

      if (!remark.trim()) {
        setError('Please enter a remark.');
        return;
      }

      await api('/complaints/' + id + '/remarks', {
        method: 'POST',
        body: JSON.stringify({
          remark
        })
      });

      setSuccess('Department remark added.');
      setRemark('');

      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadResolution() {
    try {
      setError('');
      setSuccess('');

      if (!resolutionNote.trim() && !resolutionImage) {
        setError('Add a resolution note or upload a resolution image.');
        return;
      }

      const formData = new FormData();

      if (resolutionImage) {
        formData.append('image', resolutionImage);
      }

      formData.append(
        'description',
        resolutionNote || 'Resolution evidence uploaded.'
      );

      await api('/complaints/' + id + '/resolution', {
        method: 'POST',
        body: formData
      });

      setSuccess('Resolution evidence uploaded.');
      setResolutionNote('');
      setResolutionImage(null);

      document.getElementById('resolution-image').value = '';

      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmResolution(confirmed) {
    try {
      setError('');
      setSuccess('');

      await api('/complaints/' + id + '/confirm', {
        method: 'POST',
        body: JSON.stringify({
          confirmed
        })
      });

      setSuccess(
        confirmed
          ? 'Resolution confirmed.'
          : 'Complaint reopened because the issue still exists.'
      );

      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!c) {
    return (
      <div className="p-6">
        {error ? (
          <p className="rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        ) : (
          <p>Loading…</p>
        )}
      </div>
    );
  }

  const imageBase =
    (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
      '/api',
      ''
    );

  return (
    <div className="max-w-5xl space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black">{c.public_id}</h1>

        <p className="mt-1 text-sm text-slate-500">
          Reported on{' '}
          {c.created_at
            ? new Date(c.created_at).toLocaleString()
            : 'Unknown date'}
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">
          {success}
        </div>
      )}

      {/* Main information */}
      <div className="grid gap-5 md:grid-cols-2">

        {/* Complaint details */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <p className="text-sm text-slate-500">Status</p>

          <p className="mt-1 text-xl font-bold">
            {c.status}
          </p>

          <p className="mt-4 text-sm text-slate-500">
            Category
          </p>

          <p className="font-medium">
            {c.category || c.ai_category || 'Unclassified'}
          </p>

          <p className="mt-4 text-sm text-slate-500">
            Priority
          </p>

          <p className="font-medium">
            {c.final_priority || 'Medium'}
          </p>

          <p className="mt-4 text-sm text-slate-500">
            Department
          </p>

          <p className="font-medium">
            {c.department || 'Not assigned'}
          </p>

          <p className="mt-4 text-sm text-slate-500">
            Description
          </p>

          <p className="mt-1">
            {c.description}
          </p>


            {c.citizen_name && (
  <div className="mt-5 rounded-xl bg-slate-50 p-4">
    <h2 className="font-bold">Citizen Information</h2>

    <p className="mt-3 text-sm text-slate-500">Name</p>
    <p className="font-semibold">{c.citizen_name}</p>

    <p className="mt-3 text-sm text-slate-500">Phone</p>
    <p className="font-semibold">
      {c.citizen_phone || 'Not available'}
    </p>

    <p className="mt-3 text-sm text-slate-500">Email</p>
    <p className="font-semibold break-all">
      {c.citizen_email || 'Not available'}
    </p>
  </div>
)}



          {c.address && (
            <>
              <p className="mt-4 text-sm text-slate-500">
                Address
              </p>

              <p>{c.address}</p>
            </>
          )}

          {c.landmark && (
            <>
              <p className="mt-4 text-sm text-slate-500">
                Landmark
              </p>

              <p>{c.landmark}</p>
            </>
          )}
        </div>

        {/* AI information */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <h2 className="font-bold text-lg">
            AI Analysis
          </h2>

          <p className="mt-4 text-sm text-slate-500">
            AI Category
          </p>

          <p>
            {c.ai_category || 'Not available'}
          </p>

          <p className="mt-4 text-sm text-slate-500">
            AI Suggested Priority
          </p>

          <p>
            {c.ai_priority || 'Not available'}
          </p>

          <p className="mt-4 text-sm text-slate-500">
            AI Summary
          </p>

          <p>
            {c.ai_summary || 'Not available'}
          </p>
        </div>
      </div>

      {/* Department controls */}
      {isDepartment && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <h2 className="text-xl font-bold">
            Department Actions
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            {/* Status */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Status
              </label>

              <select
                className="w-full rounded-xl border p-3"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Reported">
                  Reported
                </option>

                <option value="AI Analyzed">
                  AI Analyzed
                </option>

                <option value="Assigned">
                  Assigned
                </option>

                <option value="Under Review">
                  Under Review
                </option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Resolved">
                  Resolved
                </option>

                <option value="Rejected / Invalid">
                  Rejected / Invalid
                </option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Priority
              </label>

              <select
                className="w-full rounded-xl border p-3"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Low">
                  Low
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="High">
                  High
                </option>

                <option value="Critical">
                  Critical
                </option>
              </select>
            </div>
          </div>

          {/* Remark */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">
              Department Remark
            </label>

            <textarea
              className="w-full rounded-xl border p-3"
              rows="4"
              placeholder="Add a remark about this complaint..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">

            <button
              onClick={updateStatus}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Update Status
            </button>

            <button
              onClick={addRemark}
              className="rounded-xl border border-slate-300 px-5 py-3 font-medium"
            >
              Add Remark
            </button>

          </div>
        </div>
      )}

      {/* Resolution evidence */}
      {isDepartment && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <h2 className="text-xl font-bold">
            Resolution Evidence
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Upload proof that the infrastructure issue has been resolved.
          </p>

          <div className="mt-5">

            <label className="mb-2 block text-sm font-medium">
              Resolution Image
            </label>

            <input
              id="resolution-image"
              type="file"
              accept="image/*"
              className="w-full rounded-xl border p-3"
              onChange={(e) =>
                setResolutionImage(e.target.files?.[0] || null)
              }
            />
          </div>

          <div className="mt-4">

            <label className="mb-2 block text-sm font-medium">
              Resolution Note
            </label>

            <textarea
              className="w-full rounded-xl border p-3"
              rows="4"
              placeholder="Describe what was repaired..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
            />
          </div>

          <button
            onClick={uploadResolution}
            className="mt-4 rounded-xl bg-blue-700 px-5 py-3 font-medium text-white"
          >
            Upload Resolution & Mark Resolved
          </button>
        </div>
      )}

      

      {/* Resolution confirmation for citizen */}
      {isCitizen && c.status === 'Resolved' && (
        <div className="rounded-2xl bg-emerald-50 p-5">

          <h2 className="text-xl font-bold">
            Has the issue been resolved?
          </h2>

          <p className="mt-2 text-slate-600">
            The department has marked this complaint as resolved.
            Please confirm whether the issue has actually been fixed.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">

            <button
              onClick={() => confirmResolution(true)}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Confirm Resolution
            </button>

            <button
              onClick={() => confirmResolution(false)}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium"
            >
              Issue Still Exists
            </button>

          </div>
        </div>
      )}

      {/* Resolution evidence already uploaded */}
      {c.resolution?.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <h2 className="text-xl font-bold">
            Resolution Evidence
          </h2>

          <div className="mt-4 space-y-4">

            {c.resolution.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border p-4"
              >

                {r.image_url && (
                  <img
                    src={imageBase + r.image_url}
                    alt="Resolution evidence"
                    className="max-h-80 rounded-xl"
                  />
                )}

                <p className="mt-3">
                  {r.description}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString()
                    : ''}
                </p>

              </div>
            ))}

          </div>
        </div>
      )}

      {/* Complaint images */}
      {c.images?.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <h2 className="font-bold">
            Complaint Images
          </h2>

          <div className="mt-3 flex flex-wrap gap-3">

            {c.images.map((i) => (
              <img
                key={i.id}
                src={imageBase + i.image_url}
                alt="Complaint"
                className="max-h-72 rounded-xl"
              />
            ))}

          </div>
        </div>
      )}

      {/* Department remarks */}
      {c.remarks?.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <h2 className="font-bold">
            Department Remarks
          </h2>

          <div className="mt-4 space-y-3">

            {c.remarks.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border p-4"
              >
                <p>{r.remark}</p>

                <p className="mt-1 text-sm text-slate-500">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString()
                    : ''}
                </p>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Status history */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">

        <h2 className="font-bold">
          Status History
        </h2>

        <div className="mt-4 space-y-4">

          {c.history?.map((h) => (
            <div
              className="border-l-2 border-emerald-600 pl-4"
              key={h.id}
            >
              <b>{h.new_status}</b>

              <p className="text-sm text-slate-500">
                {h.created_at
                  ? new Date(h.created_at).toLocaleString()
                  : ''}
              </p>

              {h.remark && (
                <p className="mt-1 text-sm">
                  {h.remark}
                </p>
              )}
            </div>
          ))}

        </div>
      </div>

    </div>
  );
}