
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function ComplaintMap({ latitude, longitude, publicId }) {
  const mapRef = useState(null)[0];

  useEffect(() => {
    if (!latitude || !longitude) return;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const map = L.map(mapRef).setView(
      [lat, lng],
      16
    );

    L.tileLayer(
      import.meta.env.VITE_MAP_TILE_URL ||
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '© OpenStreetMap contributors'
      }
    ).addTo(map);

    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(
        `<b>${publicId}</b><br/>Reported location`
      )
      .openPopup();

    return () => {
      map.remove();
    };
  }, [latitude, longitude, publicId]);

  return (
    <div
      ref={(el) => {
        if (el) {
          mapRef = el;
        }
      }}
      className="h-56 w-full rounded-xl"
    />
  );
}

export default function DepartmentComplaints() {
  const [d, setD] = useState([]);
  const [search, setSearch] = useState('');
  const [mapComplaint, setMapComplaint] =
    useState(null);

  async function load() {
    try {
      const result = await api(
        '/departments/complaints?search=' +
          encodeURIComponent(search)
      );

      setD(result);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-black">
        Complaints
      </h1>

      <div className="mt-5 flex gap-2">
        <input
          className="flex-1 rounded-xl border p-3"
          placeholder="Search complaint ID or keyword"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <button
          onClick={load}
          className="rounded-xl bg-emerald-700 px-4 text-white"
        >
          Search
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {d.map((c) => {
          const hasLocation =
            c.latitude !== null &&
            c.latitude !== undefined &&
            c.longitude !== null &&
            c.longitude !== undefined &&
            Number.isFinite(Number(c.latitude)) &&
            Number.isFinite(Number(c.longitude));

          return (
            <div
              className="rounded-2xl bg-white p-5 shadow-sm"
              key={c.id}
            >
              <Link
                to={`/complaints/${c.id}`}
                className="block"
              >
                <div className="flex justify-between gap-3">
                  <b>{c.public_id}</b>

                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-sm">
                    {c.status}
                  </span>
                </div>

                <p className="mt-2">
                  {c.category || 'Unclassified'} ·{' '}
                  {c.final_priority}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {c.description}
                </p>
              </Link>

              {/* LOCATION */}
              <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      📍 Problem Location
                    </p>

                    {hasLocation ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {Number(c.latitude).toFixed(6)},{' '}
                        {Number(c.longitude).toFixed(6)}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">
                        Location not available
                      </p>
                    )}
                  </div>

                  {hasLocation && (
                    <button
                      type="button"
                      onClick={() =>
                        setMapComplaint(c)
                      }
                      className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                    >
                      🗺️ View Map
                    </button>
                  )}
                </div>

                {c.address && (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium">
                      Address:
                    </span>{' '}
                    {c.address}
                  </p>
                )}

                {c.landmark && (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">
                      Landmark:
                    </span>{' '}
                    {c.landmark}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MAP MODAL */}
      {mapComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="font-bold">
                  Problem Location
                </h2>

                <p className="text-sm text-slate-500">
                  {mapComplaint.public_id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMapComplaint(null)
                }
                className="rounded-xl border px-4 py-2"
              >
                Close
              </button>
            </div>

            <div className="h-[500px]">
              <ComplaintMap
                latitude={
                  mapComplaint.latitude
                }
                longitude={
                  mapComplaint.longitude
                }
                publicId={
                  mapComplaint.public_id
                }
              />
            </div>

            <div className="border-t p-4 text-sm text-slate-600">
              <b>Coordinates:</b>{' '}
              {Number(
                mapComplaint.latitude
              ).toFixed(6)}
              ,{' '}
              {Number(
                mapComplaint.longitude
              ).toFixed(6)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
