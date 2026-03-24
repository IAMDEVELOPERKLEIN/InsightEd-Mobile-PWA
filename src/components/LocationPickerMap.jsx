import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon not displaying correctly in some bundlers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const PHILIPPINES_CENTER = [12.8797, 121.7740];
const DEFAULT_ZOOM = 6;

function DraggableMarker({ position, setPosition, onLocationSelect, disabled }) {
    const markerRef = useRef(null);

    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const newPos = marker.getLatLng();
                    setPosition(newPos);
                    onLocationSelect(newPos.lat, newPos.lng);
                }
            },
        }),
        [onLocationSelect, setPosition],
    );

    return (
        <Marker
            draggable={!disabled}
            eventHandlers={disabled ? {} : eventHandlers}
            position={position}
            ref={markerRef}
        >
            <Popup>School Location</Popup>
        </Marker>
    );
}

function MapEvents({ setPosition, onLocationSelect, disabled }) {
    const map = useMap();

    // Fix for off-center pins: invalidate size when the container element changes size
    useEffect(() => {
        if (!map) return;
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });
        const container = map.getContainer();
        resizeObserver.observe(container);
        return () => resizeObserver.unobserve(container);
    }, [map]);

    useMapEvents({
        click(e) {
            if (!disabled) {
                setPosition(e.latlng);
                onLocationSelect(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
}

// COMPONENT: Aggressively center map and invalidate size (handles CSS transitions)
function RobustCenter({ position }) {
    const map = useMap();
    useEffect(() => {
        const lat = position.lat || position[0];
        const lng = position.lng || position[1];
        
        if (!lat || !lng || (lat === PHILIPPINES_CENTER[0] && lng === PHILIPPINES_CENTER[1])) return;

        const performCenter = () => {
            if (map) {
                map.invalidateSize();
                map.setView([lat, lng], 16);
            }
        };

        // Aggressive centering strategy: 
        // Call multiple times to catch the end of any CSS transitions (framer-motion, etc)
        performCenter();
        const t1 = setTimeout(performCenter, 100);
        const t2 = setTimeout(performCenter, 500);
        const t3 = setTimeout(performCenter, 1000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [position, map]);
    return null;
}

const LocationPickerMap = ({ latitude, longitude, onLocationSelect, onChange, disabled = false, userLocation = null, className = "h-[400px]" }) => {
    // Support both prop names for compatibility
    const handleLocationSelect = onLocationSelect || onChange;
    // Initial position state
    const [position, setPosition] = useState(PHILIPPINES_CENTER);

    // Sync internal state with props when they change (validating they exist)
    useEffect(() => {
        if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
            setPosition({ lat: parseFloat(latitude), lng: parseFloat(longitude) });
        }
    }, [latitude, longitude]);

    return (
        <div className={`w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner relative z-0 ${className}`}>
            {/* Map */}
            <MapContainer
                center={position.lat ? position : PHILIPPINES_CENTER}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Click Listener */}
                <MapEvents setPosition={setPosition} onLocationSelect={onLocationSelect} disabled={disabled} />

                {/* Aggressive Recenter */}
                <RobustCenter position={position} />

                {/* School Marker */}
                <DraggableMarker
                    position={position}
                    setPosition={setPosition}
                    onLocationSelect={handleLocationSelect}
                    disabled={disabled}
                />

                {/* User Location Marker & Geofence Visual (Read-Only) */}
                {userLocation && (
                    <>
                        <Marker position={[userLocation.lat, userLocation.lng]} opacity={0.7}>
                            <Popup>You are Here</Popup>
                        </Marker>
                        {/* Draw a line connecting them? Optional. For now just circle around user or school? 
                            The requirement is "copy the map". Register had school geofence. 
                            Let's add the 200m circle around the SCHOOL to show the zone.
                        */}
                        <Circle
                            center={position}
                            radius={200} // standard geofence
                            pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                        />
                    </>
                )}
            </MapContainer>

            {/* Disabled Overlay Removed to allow Panning/Zooming but keep Marker Read-Only */}
        </div>
    );
};

export default LocationPickerMap;
