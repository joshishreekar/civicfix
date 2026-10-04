
import {
  useEffect,
  useRef,
  useState
} from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function ComplaintMap({
  latitude,
  longitude,
  publicId
}) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    const map = L.map(mapRef.current).setView(
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
        `<b>${publicId}</b><br/>Problem location`
      )
      .openPopup();

    return () => {
      map.remove();
    };
  }, [latitude, longitude, publicId]);

  return (
    <div
      ref={mapRef}
      className="h-full w-full"
    />
  );
}

export default function Department() {
  const [stats, setStats] = useState({});
  const [d, setD] = useState([]);
  const [mapComplaint, setMapComplaint] =
    useState(null);

  useEffect(() => {
    api('/departments/stats')
      .then(setStats)
      .catch(console.error);

    api('/departments/complaints')
      .then(setD)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-black">
        Department Dashboard
      </h1>

      {/* STATISTICS */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Total', stats.total],
          ['New', stats.new],
          ['In Progress', stats.in_progress],
          ['Resolved', stats.resolved],
          ['High', stats.high],
          ['Critical', stats.critical]
        ].map((x) => (
          <div
            className="rounded-2xl bg-white p-4 shadow-sm"
            key={x[0]}
          >
            <p className="text-xs text-slate-500">
              {x[0]}
            </p>

            <b className="text-2xl">
              {x[1] || 0}
            </b>
          </div>
        ))}
      </div>

      {/* ASSIGNED COMPLAINTS */}
      <div className="mt-7 rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">
            Assigned complaints
          </h2>

          <span className="text-sm text-slate-500">
            {d.length} reports
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {d.slice(0, 10).map((c) => {
            const hasLocation =
              c.latitude !== null &&
              c.latitude !== undefined &&
              c.longitude !== null &&
              c.longitude !== undefined &&
              Number.isFinite(
                Number(c.latitude)
              ) &&
              Number.isFinite(
                Number(c.longitude)
              );

            return (
              <div
                className="rounded-xl border p-4"
                key={c.id}
              >
                {/* COMPLAINT HEADER */}
                <Link
                  to={`/complaints/${c.id}`}
                  className="block"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <b>
                      {c.public_id}{' '}
                      ·{' '}
                      {c.category ||
                        'Unclassified'}
                    </b>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-sm">
                      {c.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm">
                    {c.description}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Priority:{' '}
                    {c.final_priority}
                  </p>
                </Link>

                {/* LOCATION */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        📍 Problem Location
                      </p>

                      {hasLocation ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {Number(
                            c.latitude
                          ).toFixed(6)}
                          ,{' '}
                          {Number(
                            c.longitude
                          ).toFixed(6)}
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
                      <b>Address:</b>{' '}
                      {c.address}
                    </p>
                  )}

                  {c.landmark && (
                    <p className="mt-1 text-sm text-slate-600">
                      <b>Landmark:</b>{' '}
                      {c.landmark}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {d.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
              No complaints assigned to this
              department.
            </div>
          )}
        </div>
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
