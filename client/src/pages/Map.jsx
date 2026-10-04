
import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function Map() {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const [d, setD] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load complaints
  useEffect(() => {
    async function load() {
      try {
        const data = await api('/map/complaints');
        setD(data);
      } catch (err) {
        console.error('Map loading failed:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Create map
  useEffect(() => {
    if (!ref.current) return;

    const map = L.map(ref.current).setView(
      [15.34, 76.46],
      12
    );

    mapRef.current = map;

    L.tileLayer(
      import.meta.env.VITE_MAP_TILE_URL ||
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors'
      }
    ).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add complaint markers
  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    // Remove old markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const points = [];

    d.forEach((c) => {
      const lat = Number(c.latitude);
      const lng = Number(c.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const description = escapeHtml(
        (c.description || '').slice(0, 120)
      );

      const publicId = escapeHtml(
        c.public_id || ''
      );

      const category = escapeHtml(
        c.category || 'Issue'
      );

      const status = escapeHtml(
        c.status || ''
      );

      const priority = escapeHtml(
        c.final_priority || 'Medium'
      );

      const popupHtml = `
        <div>
          <strong>${publicId}</strong>
          <br>
          ${category}
          <br>
          Status: ${status}
          <br>
          Priority: ${priority}
          <br>
          ${description}
        </div>
      `;

      L.marker([lat, lng])
        .addTo(map)
        .bindPopup(popupHtml);

      points.push([lat, lng]);
    });

    // Automatically zoom to markers
    if (points.length === 1) {
      map.setView(points[0], 16);
    }

    if (points.length > 1) {
      map.fitBounds(points, {
        padding: [40, 40]
      });
    }
  }, [d]);

  return (
    <div>
      <h1 className="text-3xl font-black">
        Civic Map
      </h1>

      <p className="mt-2 text-slate-600">
        Only reports available to your role are shown.
      </p>

      {loading && (
        <p className="mt-3 text-sm text-slate-500">
          Loading complaints...
        </p>
      )}

      {!loading && d.length === 0 && (
        <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">
          No complaints with a saved location are available.
        </div>
      )}

      <div
        ref={ref}
        className="mt-5 h-[70vh] rounded-2xl shadow-sm"
      />
    </div>
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
