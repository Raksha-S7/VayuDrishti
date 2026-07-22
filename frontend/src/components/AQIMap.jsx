import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import { getAQILevel } from "../utils/aqi";

function RecenterMap({ city }) {
  const map = useMap();
  useEffect(() => {
    if (city) map.flyTo([city.lat, city.lng], 10, { duration: 1.2 });
  }, [city, map]);
  return null;
}

export default function AQIMap({ cities, selectedCity, onCityClick }) {
  return (
    <MapContainer
      center={[22.5, 80]}
      zoom={5}
      className="w-full h-full rounded-xl"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution=""
      />

      {cities.map((city) => {
        const level = getAQILevel(city.aqi);
        const isSelected = selectedCity?.name === city.name;
        const radius = Math.max(16, Math.min(40, city.aqi / 8));

        return (
          <CircleMarker
            key={city.name}
            center={[city.lat, city.lng]}
            radius={radius}
            pathOptions={{
              fillColor: level.color,
              fillOpacity: isSelected ? 0.9 : 0.65,
              color: isSelected ? "#fff" : level.color,
              weight: isSelected ? 2.5 : 1,
            }}
            eventHandlers={{ click: () => onCityClick(city) }}
          >
            <Popup className="aqi-popup">
              <div style={{ background: "#0F1628", border: `1px solid ${level.color}40`, borderRadius: 8, padding: "12px 16px", minWidth: 160 }}>
                <p style={{ color: "#fff", fontFamily: "Space Grotesk", fontWeight: 600, margin: "0 0 4px 0" }}>{city.name}</p>
                <p style={{ color: level.color, fontFamily: "JetBrains Mono", fontSize: 24, fontWeight: 700, margin: "0 0 4px 0" }}>{city.aqi}</p>
                <p style={{ color: level.color, fontSize: 12, margin: "0 0 6px 0" }}>{city.category}</p>
                <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>PM2.5: {city.pm25} µg/m³</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {selectedCity && <RecenterMap city={selectedCity} />}
    </MapContainer>
  );
}
