
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function Report() {
  const [f, setF] = useState({
    description: '',
    landmark: '',
    latitude: '',
    longitude: '',
    address: '',
    categoryId: ''
  });

  const [image, setImage] = useState(null);
  const [ai, setAi] = useState(null);
  const [err, setErr] = useState('');
  const [locationMode, setLocationMode] = useState('');
  const [showMap, setShowMap] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const nav = useNavigate();

  /*
  |--------------------------------------------------------------------------
  | Use browser GPS
  |--------------------------------------------------------------------------
  */
  function geo() {
    setErr('');
    setLocationMode('gps');

    if (!navigator.geolocation) {
      setErr('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const latitude = p.coords.latitude;
        const longitude = p.coords.longitude;

        setF((x) => ({
          ...x,
          latitude,
          longitude
        }));

        // If map is already open, move map and marker
        if (mapInstance.current) {
          const position = [latitude, longitude];

          mapInstance.current.setView(position, 17);

          if (markerRef.current) {
            markerRef.current.setLatLng(position);
          } else {
            markerRef.current = L.marker(position, {
              draggable: true
            }).addTo(mapInstance.current);

            markerRef.current.on('dragend', handleMarkerDrag);
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);

        if (error.code === 1) {
          setErr(
            'Location permission was denied. You can choose the location manually on the map.'
          );
        } else {
          setErr(
            'Unable to get your current location. You can choose the location manually on the map.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Handle map click
  |--------------------------------------------------------------------------
  */
  function handleMapClick(e) {
    const latitude = Number(e.latlng.lat.toFixed(6));
    const longitude = Number(e.latlng.lng.toFixed(6));

    setF((x) => ({
      ...x,
      latitude,
      longitude
    }));

    setLocationMode('map');

    if (markerRef.current) {
      markerRef.current.setLatLng([
        latitude,
        longitude
      ]);
    } else {
      markerRef.current = L.marker(
        [latitude, longitude],
        {
          draggable: true
        }
      ).addTo(mapInstance.current);

      markerRef.current.on(
        'dragend',
        handleMarkerDrag
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Handle dragging the pin
  |--------------------------------------------------------------------------
  */
  function handleMarkerDrag(e) {
    const position = e.target.getLatLng();

    const latitude = Number(
      position.lat.toFixed(6)
    );

    const longitude = Number(
      position.lng.toFixed(6)
    );

    setF((x) => ({
      ...x,
      latitude,
      longitude
    }));

    setLocationMode('map');
  }

  /*
  |--------------------------------------------------------------------------
  | Open map
  |--------------------------------------------------------------------------
  */
  function openMap() {
    setErr('');
    setShowMap(true);
    setLocationMode('map');
  }

  /*
  |--------------------------------------------------------------------------
  | Initialize Leaflet map when opened
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (!showMap || !mapRef.current) {
      return;
    }

    if (mapInstance.current) {
      return;
    }

    const existingLat = Number(f.latitude);
    const existingLng = Number(f.longitude);

    const hasExistingLocation =
      Number.isFinite(existingLat) &&
      Number.isFinite(existingLng) &&
      existingLat !== 0 &&
      existingLng !== 0;

    const defaultPosition = hasExistingLocation
      ? [existingLat, existingLng]
      : [15.34, 76.46];

    const defaultZoom = hasExistingLocation
      ? 17
      : 12;

    const map = L.map(mapRef.current).setView(
      defaultPosition,
      defaultZoom
    );

    mapInstance.current = map;

    L.tileLayer(
      import.meta.env.VITE_MAP_TILE_URL ||
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '© OpenStreetMap contributors'
      }
    ).addTo(map);

    map.on('click', handleMapClick);

    if (hasExistingLocation) {
      markerRef.current = L.marker(
        [existingLat, existingLng],
        {
          draggable: true
        }
      ).addTo(map);

      markerRef.current.on(
        'dragend',
        handleMarkerDrag
      );
    }

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
  }, [showMap]);

  /*
  |--------------------------------------------------------------------------
  | Submit complaint
  |--------------------------------------------------------------------------
  */
  async function submit(e) {
    e.preventDefault();
    setErr('');

    if (!f.latitude || !f.longitude) {
      setErr(
        'Please choose the complaint location using your current location or the map.'
      );
      return;
    }

    const fd = new FormData();

    Object.entries(f).forEach(([k, v]) => {
      fd.append(k, v);
    });

    if (image) {
      fd.append('image', image);
    }

    try {
      const r = await api('/complaints', {
        method: 'POST',
        body: fd
      });

      setAi(r.ai);

      nav(
        `/complaints/${r.complaint.id}`
      );
    } catch (e) {
      if (e.data?.duplicates) {
        setErr(
          `${e.message}. Review similar reports before continuing, then submit again if appropriate.`
        );
      } else {
        setErr(
          e.message ||
            'Unable to submit complaint.'
        );
      }
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-black">
        Report an issue
      </h1>

      <p className="mt-2 text-slate-600">
        AI assists classification; you remain in
        control of the report.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 space-y-5"
      >
        {/* IMAGE */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <label className="font-semibold">
            Problem image
          </label>

          <input
            className="mt-3 w-full rounded-xl border p-3"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(e) =>
              setImage(e.target.files[0])
            }
          />

          {image && (
            <img
              className="mt-4 max-h-72 rounded-xl object-cover"
              src={URL.createObjectURL(image)}
              alt="Problem preview"
            />
          )}
        </div>

        {/* DESCRIPTION */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <label className="font-semibold">
            Describe the problem
          </label>

          <textarea
            required
            rows="6"
            className="mt-3 w-full rounded-xl border p-3"
            placeholder="Describe the problem..."
            value={f.description}
            onChange={(e) =>
              setF({
                ...f,
                description: e.target.value
              })
            }
          />
        </div>

        {/* LOCATION */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <b>Location</b>

            <p className="mt-1 text-sm text-slate-500">
              Choose where the civic problem is
              located.
            </p>
          </div>

          {/* LOCATION BUTTONS */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={geo}
              className={`rounded-xl border p-4 text-left transition ${
                locationMode === 'gps'
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold">
                📍 Use My Current Location
              </div>

              <div className="mt-1 text-sm text-slate-500">
                Use your phone/browser GPS location.
              </div>
            </button>

            <button
              type="button"
              onClick={openMap}
              className={`rounded-xl border p-4 text-left transition ${
                locationMode === 'map'
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold">
                🗺️ Choose Other Location
              </div>

              <div className="mt-1 text-sm text-slate-500">
                Open the map and place a pin.
              </div>
            </button>
          </div>

          {/* MAP */}
          {showMap && (
            <div className="mt-4 overflow-hidden rounded-2xl border">
              <div className="bg-slate-50 p-3 text-sm">
                <b>Choose the problem location</b>
                <p className="mt-1 text-slate-500">
                  Click on the map to place the pin.
                  You can also drag the pin to adjust
                  the location.
                </p>
              </div>

              <div
                ref={mapRef}
                className="h-[400px] w-full"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3">
                <div className="text-sm">
                  {f.latitude && f.longitude ? (
                    <>
                      <span className="font-semibold">
                        Selected:
                      </span>{' '}
                      {f.latitude},{' '}
                      {f.longitude}
                    </>
                  ) : (
                    <span className="text-slate-500">
                      Click the map to select a
                      location.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowMap(false)
                  }
                  className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* COORDINATES */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-xl border p-3"
              placeholder="Latitude"
              value={f.latitude}
              onChange={(e) =>
                setF({
                  ...f,
                  latitude: e.target.value
                })
              }
            />

            <input
              className="rounded-xl border p-3"
              placeholder="Longitude"
              value={f.longitude}
              onChange={(e) =>
                setF({
                  ...f,
                  longitude: e.target.value
                })
              }
            />
          </div>

          <input
            className="mt-3 w-full rounded-xl border p-3"
            placeholder="Address / landmark"
            value={f.address}
            onChange={(e) =>
              setF({
                ...f,
                address: e.target.value
              })
            }
          />

          <input
            className="mt-3 w-full rounded-xl border p-3"
            placeholder="Landmark / additional location details"
            value={f.landmark}
            onChange={(e) =>
              setF({
                ...f,
                landmark: e.target.value
              })
            }
          />
        </div>

        {/* AI */}
        {ai && (
          <div className="rounded-2xl bg-emerald-50 p-5">
            <b>AI analysis</b>

            <p className="mt-2">
              {ai.problem_summary ||
                'Analysis unavailable'}
            </p>
          </div>
        )}

        {/* ERROR */}
        {err && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700">
            {err}
          </div>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-700 p-4 font-bold text-white hover:bg-emerald-800"
        >
          Submit Report
        </button>
      </form>
    </div>
  );
}
