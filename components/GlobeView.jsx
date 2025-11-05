"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

const normalize = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim();

export default function GlobeView() {
  const globeRef = useRef(null);
  const [features, setFeatures] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/countries");
        const data = await res.json();
        const feats = Array.isArray(data?.features) ? data.features : data?.features || [];
        // normalize properties a bit for robust search
        feats.forEach((f) => {
          f.__name = (
            f?.properties?.ADMIN ||
            f?.properties?.admin ||
            f?.properties?.name ||
            f?.properties?.NAME ||
            f?.properties?.NAME_LONG ||
            f?.properties?.geounit ||
            f?.properties?.sovereignt ||
            ""
          ).toString();
          f.__iso = (f?.properties?.ISO_A3 || f?.properties?.iso_a3 || f?.id || "").toString();
        });
        if (active) setFeatures(feats);
      } catch (e) {
        // noop
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // auto-rotate
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls?.();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.6;
      controls.enableZoom = true;
    }
  }, [globeRef.current]);

  const handleSearch = () => {
    const q = normalize(query);
    if (!q) return;
    const match = features.find((f) => {
      const name = normalize(f.__name);
      const alt = normalize(f?.properties?.SOVEREIGNT || f?.properties?.BRK_NAME || "");
      const iso2 = normalize(f?.properties?.ISO_A2 || f?.properties?.iso_a2 || "");
      const iso3 = normalize(f.__iso);
      return (
        name === q ||
        name.includes(q) ||
        alt.includes(q) ||
        iso2 === q ||
        iso3 === q
      );
    });
    if (match) {
      setSelected(match);
      focusCountry(match);
    }
  };

  const focusCountry = (feature) => {
    try {
      // find centroid: average of polygon coords in lat/lng; fallback to bbox center
      const coords = feature.geometry.coordinates;
      const type = feature.geometry.type;
      let flat = [];
      if (type === "Polygon") flat = coords[0];
      if (type === "MultiPolygon") flat = coords[0][0];
      let lon = 0, lat = 0;
      flat.slice(0, Math.min(200, flat.length)).forEach(([x, y]) => { lon += x; lat += y; });
      const n = Math.max(1, Math.min(200, flat.length));
      lon /= n; lat /= n;
      const g = globeRef.current;
      if (g && g.pointOfView) {
        g.pointOfView({ lat, lng: lon, altitude: 1.6 }, 1000);
      }
    } catch {}
  };

  const polygonData = useMemo(() => features, [features]);

  return (
    <div className="container">
      <div className="header">
        <div className="title">3D Rotating Globe ? Country Highlighter</div>
        <div className="search">
          <input
            placeholder="Search country (name or ISO code)?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
        <div className="helper">Examples: India, United States, BRA, DE, JPN</div>
      </div>
      <div className="main">
        <div className="canvasWrap">
          <Globe
            ref={globeRef}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            polygonsData={polygonData}
            polygonCapColor={(d) => (selected && d === selected ? "rgba(34,197,94,0.85)" : "rgba(59,130,246,0.18)")}
            polygonSideColor={() => "rgba(30,58,138,0.35)"}
            polygonStrokeColor={(d) => (selected && d === selected ? "rgba(16,185,129,1)" : "rgba(59,130,246,0.5)")}
            polygonAltitude={(d) => (selected && d === selected ? 0.06 : 0.01)}
            polygonsTransitionDuration={400}
            onPolygonClick={(d) => { setSelected(d); focusCountry(d); }}
          />
        </div>
        <div className="badge">Data: Natural Earth (via public sources)</div>
      </div>
    </div>
  );
}
