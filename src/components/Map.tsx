"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import type { Map as LeafletMap } from "leaflet";

// Leaflet must be loaded client-side only (no SSR)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const ZoomControl = dynamic(
  () => import("react-leaflet").then((mod) => mod.ZoomControl),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

export default function Map({ flyTo, showRoute = false, markerPos, setMarkerPos, roadPath, isAnimating, zoom = 18 }: { 
  flyTo?: { pos: [number, number]; zoom?: number; key: number } | null; 
  showRoute?: boolean; 
  markerPos: [number, number]; 
  setMarkerPos: (pos: [number, number]) => void;
  roadPath?: [number, number][];
  isAnimating?: boolean;
  zoom?: number;
}) {
  const [isClient, setIsClient] = useState(false);
  const [customIcon, setCustomIcon] = useState<any>(null);
  const [officeIcon, setOfficeIcon] = useState<any>(null);
  const [FlyToHandler, setFlyToHandler] = useState<any>(null);
  const [MarkerFollower, setMarkerFollower] = useState<any>(null);

  const officePos: [number, number] = [15.372172, 75.134430];

  useEffect(() => {
    // Import leaflet CSS on client side
    import("leaflet/dist/leaflet.css");

    // Create custom blue avatar icon
    import("leaflet").then((L) => {
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;position:relative;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(37,99,235,0.2);display:flex;align-items:center;justify-content:center;position:relative;z-index:10;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <div style="width:32px;height:32px;border-radius:50%;overflow:hidden;border:2px solid white;background:#3b82f6;box-shadow:0 2px 6px rgba(0,0,0,0.2);">
                <img src='/image.png' style='width:100%;height:100%;object-fit:cover;' />
              </div>
            </div>
            <div style="width:14px;height:14px;background:#2563eb;border:2px solid white;border-radius:50%;margin-top:-6px;box-shadow:0 1px 3px rgba(0,0,0,0.15);position:relative;z-index:20;"></div>
          </div>
        `,
        iconSize: [48, 62],
        iconAnchor: [24, 62],
      });
      setCustomIcon(icon);

      // Create office building marker icon (flipped upside down)
      const oIcon = L.divIcon({
        className: "",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="position:absolute;top:-64px;width:120px;left:-60px;margin-left:50%;height:120px;background:rgba(253,224,71,0.35);border-radius:50%;z-index:-1;"></div>
            <div style="display:flex;align-items:center;justify-content:center;position:relative;">
              <span style="font-size:28px;line-height:1;">🏢</span>
            </div>
            <span style="font-size:10px;font-weight:600;color:#333;white-space:nowrap;text-shadow:0 0 3px white,0 0 3px white,0 0 3px white,0 0 3px white;margin-top:2px;">Chromosis Technologies Pvt Ltd</span>
          </div>
        `,
        iconSize: [180, 50],
        iconAnchor: [90, 0],
      });
      setOfficeIcon(oIcon);
    });

    // Create handlers and followers
    import("react-leaflet").then((mod) => {
      const { useMap } = mod;
      
      const FlyHandler = ({ flyTo }: { flyTo?: { pos: [number, number]; zoom?: number; key: number } | null }) => {
        const map = useMap();
        useEffect(() => {
          if (flyTo) {
            map.flyTo(flyTo.pos, flyTo.zoom ?? 18, { duration: 1.5 });
            // Apply same offset after flying
            setTimeout(() => {
              map.panBy([0, 260], { animate: true });
            }, 1600);
          }
        }, [flyTo?.key, map]);
        return null;
      };
      setFlyToHandler(() => FlyHandler);

      const Follower = ({ pos, active, zoomLevel }: { pos: [number, number], active: boolean, zoomLevel: number }) => {
        const map = useMap();
        
        // Only set the zoom when it's explicitly changed via buttons
        useEffect(() => {
          if (active) {
            map.setZoom(zoomLevel);
          }
        }, [zoomLevel, active, map]);

        // Follow the position without forcing zoom
        useEffect(() => {
          if (active) {
            map.panTo(pos, { animate: false });
            // Offset the vision significantly upward so the blue dot isn't hidden by the bottom sheet
            map.panBy([0, 260], { animate: false });
          }
        }, [pos, active, map]);
        
        return null;
      };
      setMarkerFollower(() => Follower);
    });

    setIsClient(true);
  }, []);

  useEffect(() => {
    if (flyTo) {
      setMarkerPos(flyTo.pos);
    }
  }, [flyTo, setMarkerPos]);

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200">
        <div className="animate-pulse text-gray-500 text-lg">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[15.372172, 75.134430]}
        zoom={zoom}
        zoomControl={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        {customIcon && (
          <Marker position={markerPos} icon={customIcon} />
        )}
        {showRoute && (
          <Polyline 
            positions={roadPath && roadPath.length > 0 ? roadPath : [markerPos, officePos]} 
            pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8, dashArray: '10, 10' }} 
          />
        )}
        {officeIcon && (
          <Marker position={officePos} icon={officeIcon} />
        )}
        {FlyToHandler && <FlyToHandler flyTo={flyTo} />}
        {MarkerFollower && <MarkerFollower pos={markerPos} active={isAnimating} zoomLevel={zoom} />}
      </MapContainer>
    </div>
  );
}
