"use client";

import Map from "@/components/Map";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { 
  Search, Navigation, Layers, Grid3X3, 
  Crosshair, Plus, Minus, ChevronUp, User,
  ChevronLeft, UserPlus, Settings, HelpCircle, ScanLine, MapPin, Loader2, X,
  Home as HomeIcon, Building2, Ban, ArrowLeftRight, Play
} from "lucide-react";

const HOME_POS: [number, number] = [15.393467, 75.094318];
const OFFICE_POS: [number, number] = [15.372172, 75.134430];

export default function Home() {
  const router = useRouter();
  const [showNoContact, setShowNoContact] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [flyToPosition, setFlyToPosition] = useState<{ pos: [number, number]; zoom?: number; key: number } | null>(null);
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareName, setShareName] = useState("");
  const [shareLocation, setShareLocation] = useState("");
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [routeVisible, setRouteVisible] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const [isIconOrderSwapped, setIsIconOrderSwapped] = useState(false);
  const [markerPos, setMarkerPos] = useState<[number, number]>(OFFICE_POS);
  const [roadPath, setRoadPath] = useState<[number, number][]>([]);
  const [mapZoom, setMapZoom] = useState(18);
  const [currentAddress, setCurrentAddress] = useState<string>("Fetching address...");
  
  // Settings Access Gate
  const [ipv6Code, setIpv6Code] = useState("");
  const [nearCoord, setNearCoord] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Reset authorization when settings are closed
  useEffect(() => {
    if (!showSettings) {
      setIsAuthorized(false);
    }
  }, [showSettings]);
  
  // Animation States
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0); // 0 to 1
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationInput, setDurationInput] = useState("2");
  const [timeLeftText, setTimeLeftText] = useState("");
  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(null);

  const isAtHome = Math.abs(markerPos[0] - HOME_POS[0]) < 0.0001 && Math.abs(markerPos[1] - HOME_POS[1]) < 0.0001;
  const isAtOffice = Math.abs(markerPos[0] - OFFICE_POS[0]) < 0.0001 && Math.abs(markerPos[1] - OFFICE_POS[1]) < 0.0001;


  const startAnimation = (hours: number, pathOverride?: [number, number][], reversedOverride?: boolean, startTimeOverride?: number) => {
    const finalPath = pathOverride || roadPath;
    if (isNaN(hours) || hours <= 0 || finalPath.length < 2) return;
    
    const isNearHome = Math.abs(markerPos[0] - HOME_POS[0]) < 0.001;
    const isNearOffice = Math.abs(markerPos[0] - OFFICE_POS[0]) < 0.001;
    
    // Default to Home -> Office (false) unless we are clearly at the Office side
    let autoReversed = false;
    if (isNearOffice && !isAnimating) {
      autoReversed = true;
    }
    
    const finalReversed = reversedOverride !== undefined ? reversedOverride : autoReversed;
    
    // Sync the slider knob to match the start side
    setRouteVisible(finalReversed);
    
    setIsAnimating(true);
    setAnimationProgress(0);
    startTimeRef.current = startTimeOverride || null;

    // Persist to DB if this is a fresh start
    if (!startTimeOverride) {
      console.log(">>> [Frontend] Saving simulation to MongoDB Atlas...");
      fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          hours,
          startPos: finalPath[0],
          endPos: finalPath[finalPath.length - 1],
          roadPath: finalPath,
          isReversed: finalReversed
        })
      })
      .then(res => res.json())
      .then(json => console.log(">>> [Frontend] Persistence Result:", json))
      .catch(err => console.error(">>> [Frontend] Persist Error:", err));
    }
    
    // We'll scale the REAL animation duration: 1 simulated hour = 1 actual hour
    const totalDurationMs = hours * 3600 * 1000; 
    
    // Check if we are at Home or Office to determine direction
    // If we're at Home, we want to go TO Office. 
    // The roadPath is Home -> Office (calculated in fetchRoadPath).
    const currentPath = finalReversed ? [...finalPath].reverse() : finalPath;

    const animate = (time: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = time;
      }
      
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / totalDurationMs, 1);
      
      setAnimationProgress(progress);
      
      // Multi-segment interpolation logic
      const totalSegments = currentPath.length - 1;
      const segmentFloat = progress * totalSegments;
      const segmentIndex = Math.min(Math.floor(segmentFloat), totalSegments - 1);
      const segmentProgress = segmentFloat - segmentIndex;
      
      const p1 = currentPath[segmentIndex];
      const p2 = currentPath[segmentIndex + 1];
      
      const lat = p1[0] + (p2[0] - p1[0]) * segmentProgress;
      const lng = p1[1] + (p2[1] - p1[1]) * segmentProgress;
      setMarkerPos([lat, lng]);
      
      // Update time left text
      const remainingHoursTotal = hours * (1 - progress);
      const remHours = Math.floor(remainingHoursTotal);
      const remMins = Math.floor((remainingHoursTotal - remHours) * 60);
      
      if (remHours > 0) {
        setTimeLeftText(`${remHours}h ${remMins}m`);
      } else {
        setTimeLeftText(`${remMins}m`);
      }

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        const endPoint = currentPath[currentPath.length - 1];
        
        // Final snapping to exact destination for active states
        const distToHome = Math.sqrt(Math.pow(endPoint[0] - HOME_POS[0], 2) + Math.pow(endPoint[1] - HOME_POS[1], 2));
        const distToOffice = Math.sqrt(Math.pow(endPoint[0] - OFFICE_POS[0], 2) + Math.pow(endPoint[1] - OFFICE_POS[1], 2));
        
        if (distToHome < distToOffice) {
          setMarkerPos(HOME_POS);
          setRouteVisible(isIconOrderSwapped); // If Home is swapped to right, routeVisible should be true
        } else {
          setMarkerPos(OFFICE_POS);
          setRouteVisible(!isIconOrderSwapped); // If Office is NOT swapped, it's on the right, routeVisible=true
        }
      }
    };
    
    requestRef.current = requestAnimationFrame(animate);
  };

  const cancelAnimation = () => {
    setIsAnimating(false);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    fetch("/api/simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" })
    }).catch(err => console.error("Stop Sync Error:", err));
  };

  const fetchRoadPath = async () => {
    try {
      // OSRM expects: lng,lat;lng,lat
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${HOME_POS[1]},${HOME_POS[0]};${OFFICE_POS[1]},${OFFICE_POS[0]}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        setRoadPath(coords);
      }
    } catch (error) {
      console.error("OSRM Fetch Error:", error);
    }
  };

  useEffect(() => {
    fetchRoadPath();
    
    // Recovery Logic
    const recoverSimulation = async () => {
      try {
        const res = await fetch("/api/simulation");
        const json = await res.json();
        if (json.success && json.data) {
          const sim = json.data;
          
          if (sim.isActive) {
            const startTime = new Date(sim.startTime).getTime();
            const totalDurationMs = sim.totalDurationHours * 3600 * 1000;
            const elapsed = Date.now() - startTime;
            const progress = elapsed / totalDurationMs;

            if (progress < 1) {
              console.log(">>> [Frontend] Resuming active journey from MongoDB...");
              setRoadPath(sim.roadPath);
              setIsIconOrderSwapped(sim.isReversed);
              startAnimation(sim.totalDurationHours, sim.roadPath, sim.isReversed, performance.now() - elapsed);
              
              // Autocenter on the current calculated position
              const currentPath = sim.isReversed ? [...sim.roadPath].reverse() : sim.roadPath;
              const totalSegments = currentPath.length - 1;
              const segmentFloat = progress * totalSegments;
              const segmentIndex = Math.min(Math.floor(segmentFloat), totalSegments - 1);
              const segmentProgress = segmentFloat - segmentIndex;
              const p1 = currentPath[segmentIndex];
              const p2 = currentPath[segmentIndex + 1];
              const lat = p1[0] + (p2[0] - p1[0]) * segmentProgress;
              const lng = p1[1] + (p2[1] - p1[1]) * segmentProgress;
              setFlyToPosition({ pos: [lat, lng], zoom: 18, key: Date.now() });
              return;
            }

            // JOURNEY EXPIRED: Calculate actual target based on direction
            const currentPath = sim.isReversed ? [...sim.roadPath].reverse() : sim.roadPath;
            const actualEndPos = currentPath[currentPath.length - 1];
            
            setMarkerPos(actualEndPos as [number, number]);
            console.log(">>> [Frontend] Journey reached destination:", actualEndPos);
          } else {
            console.log(">>> [Frontend] Restoring static position from MongoDB...");
            setMarkerPos(sim.startPos as [number, number]);
          }

          // Sync the slider knob state to match the location
          // Re-calculate based on whatever markerPos was just set to
          const currentPos = sim.isActive 
            ? (sim.isReversed ? sim.roadPath[0] : sim.roadPath[sim.roadPath.length - 1]) 
            : sim.startPos;
          
          // Autocenter on the restored position
          setFlyToPosition({ pos: currentPos as [number, number], zoom: 18, key: Date.now() });
          
          const distToHome = Math.sqrt(Math.pow(currentPos[0] - HOME_POS[0], 2) + Math.pow(currentPos[1] - HOME_POS[1], 2));
          const distToOffice = Math.sqrt(Math.pow(currentPos[0] - OFFICE_POS[0], 2) + Math.pow(currentPos[1] - OFFICE_POS[1], 2));
          if (distToHome < distToOffice) {
            setRouteVisible(isIconOrderSwapped);
          } else {
            setRouteVisible(!isIconOrderSwapped);
          }
        }
      } catch (error) {
        console.error("Recovery Error:", error);
      }
    };
    recoverSimulation();
  }, []);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Reverse geocode markerPos to get a readable address
  const HOME_ADDRESS = "Pixel House Hotel\n779/1, BRTS road, beside 3rd gate APMC,\nAmargol, Hubballi,\nKarnataka 580025";
  const OFFICE_ADDRESS = "Chromosis Technologies Pvt Ltd\nThird Floor, MK Plaza,\nbeside Bank of India, Adhyapak Nagar,\nRajnagar, Vidya Nagar, Hubballi,\nKarnataka 580032";

  useEffect(() => {
    const distToHome = Math.sqrt(Math.pow(markerPos[0] - HOME_POS[0], 2) + Math.pow(markerPos[1] - HOME_POS[1], 2));
    const distToOffice = Math.sqrt(Math.pow(markerPos[0] - OFFICE_POS[0], 2) + Math.pow(markerPos[1] - OFFICE_POS[1], 2));
    const THRESHOLD = 0.0005; // ~50m

    if (distToHome < THRESHOLD) {
      setCurrentAddress(HOME_ADDRESS);
      return;
    }
    if (distToOffice < THRESHOLD) {
      setCurrentAddress(OFFICE_ADDRESS);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${markerPos[0]}&lon=${markerPos[1]}&format=json&addressdetails=1`,
          { headers: { "User-Agent": "GoogleLive/1.0" } }
        );
        const data = await res.json();
        if (data.address) {
          const a = data.address;
          const parts = [
            a.road || a.neighbourhood || a.suburb || '',
            [a.suburb, a.city_district].filter(Boolean).join(', '),
            [a.city || a.town || a.village || '', a.state || ''].filter(Boolean).join(', '),
            [a.postcode || '', a.country || ''].filter(Boolean).join(', ')
          ].filter(p => p.trim() !== '');
          setCurrentAddress(parts.join('\n'));
        } else if (data.display_name) {
          setCurrentAddress(data.display_name);
        }
      } catch (err) {
        console.error("Reverse geocode error:", err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [markerPos]);

  const fetchCurrentLocation = async () => {
    if (!window.isSecureContext) {
      alert("Location requires HTTPS. Please access this site via https:// or localhost.");
      return;
    }
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "User-Agent": "GoogleLive/1.0" } }
          );
          const data = await res.json();
          setShareLocation(data.display_name || `${latitude}, ${longitude}`);
        } catch {
          setShareLocation(`${latitude}, ${longitude}`);
        }
        setFetchingLocation(false);
      },
      (err) => {
        if (err.code === 1) {
          alert("Location permission denied. Please allow location access in your browser settings.");
        } else if (err.code === 2) {
          alert("Location unavailable. Please check your device GPS/location settings.");
        } else {
          alert("Location request timed out. Please try again.");
        }
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleShareSubmit = () => {
    if (!shareName.trim() || !shareLocation.trim()) {
      alert("Please fill in both name and location.");
      return;
    }
    const message =
      `*LIVE LOCATION SHARING*\n\n` +
      `\u{1F464} *${shareName.trim()}* is sharing their\n` +
      `real-time location with you.\n\n` +
      `\u{1F4CD} ${shareLocation.trim()}\n\n` +
      `\u{1F5FA}\uFE0F *View on Map*\n\n` +
      `https://googlelive.vercel.app\n\n` +
      `\u{1F310} Powered by *Google Live*`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/918274958462?text=${encoded}`, '_blank');
    setShowShareForm(false);
    setShareName("");
    setShareLocation("");
  };

  const handleViewClick = () => {
    const matrix = window.prompt("To initialize Augmented Reality (AR) Spatial View, please enter your 16-digit optical retina calibration matrix:", "0x00000000000000");
    if (matrix) {
      window.alert("Critical Security Warning: Unauthorized biometrics detected. The AR lens module failed to sync with the Neural Visual API.");
      const bypass = window.confirm("Attempting physical bypass... Do you want to download uncompressed stereoscopic Lidar metadata locally (approx. 14.8 GB)?");
      if (bypass) {
        window.alert("Virtual RAM allocation error. Please physically connect a secondary eGPU module to your mobile device's charging port to render quantum reality layers.");
      }
    } else {
      window.alert("AR View aborted. Laser sensors cannot be calibrated without matrix input. Contact your hardware manufacturer.");
    }
  };

  const handleDirectionsClick = () => {
    const step1 = window.confirm("Enable High-Accuracy Satellite Uplink Telemetry?");
    if (step1) {
      const step2 = window.confirm("Warning: This requires downloading 4.2GB of offline terrain data caches over cellular network. Proceed?");
      if (step2) {
        window.alert("Satellite uplink established. Routing request sent to Global Navigation Overhead.");
      }
    }
  };

  return (
    <main className="w-screen h-screen overflow-hidden relative bg-gray-100 font-sans text-sm">
      <Map 
        flyTo={flyToPosition} 
        showRoute={routeVisible} 
        markerPos={markerPos} 
        setMarkerPos={setMarkerPos} 
        roadPath={roadPath} 
        isAnimating={isAnimating}
        zoom={mapZoom}
      />

      {/* ========================================= */}
      {/* DESKTOP UI (Hidden before 1000px width)   */}
      {/* ========================================= */}
      <div className="hidden min-[1000px]:flex absolute inset-0 pointer-events-none z-[1000]">
        <div className="flex flex-col h-full w-[400px] p-4 gap-4 pointer-events-auto">
          {/* Logo / Title Area */}
          <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100">
            <div className="bg-blue-600 rounded-lg p-2">
              <Navigation className="w-6 h-6 text-white rotate-45" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 leading-tight">Google Live</h1>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Spatial Metadata Engine</p>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="ml-auto p-4 flex flex-col gap-4 pointer-events-auto">
          {/* Layer Controls */}
          <div className="bg-white rounded-xl p-1.5 flex flex-col items-center gap-2 border border-gray-100">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors group">
              <Layers className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors group">
              <Grid3X3 className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="bg-white rounded border border-gray-200 flex flex-col overflow-hidden">
            <button 
              onClick={() => setMapZoom(prev => Math.min(prev + 1, 20))}
              className="w-8 h-8 flex items-center justify-center text-gray-700 hover:text-black hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="w-5 h-[1px] bg-gray-200 mx-auto" />
            <button 
              onClick={() => setMapZoom(prev => Math.max(prev - 1, 10))}
              className="w-8 h-8 flex items-center justify-center text-gray-700 hover:text-black hover:bg-gray-50 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* MOBILE UI (Default)                      */}
      {/* ========================================= */}
      <div className="flex flex-col h-full w-full min-[1000px]:hidden">
        {/* Floating Top Logo */}
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="bg-gray-700 rounded-full w-12 h-12 flex items-center justify-center border border-gray-600">
            <div className="w-7 h-7 flex items-center justify-center">
              <svg viewBox="0 0 76 116" className="w-full h-full">
                <path fill="#34A853" d="M38 0C17 0 0 17 0 38c0 23.4 38 78 38 78s38-54.6 38-78c0-21-17-38-38-38z"/>
                <path fill="#EA4335" d="M38 0c-21 0-38 17-38 38 0 7.4 2.1 14.3 5.7 20.2L38 0z"/>
                <path fill="#FBBC04" d="M38 0c21 0 38 17 38 38 0 7.4-2.1 14.3-5.7 20.2L38 0z"/>
                <path fill="#4285F4" d="M38 116c0 0-38-54.6-38-78 0-3.5.5-6.9 1.4-10.1L38 116z"/>
                <circle fill="#fff" cx="38" cy="38" r="15"/>
              </svg>
            </div>
          </div>
        </div>










        {/* Floating View Map Button */}
        <div className="absolute bottom-[420px] right-4 z-[1000]">
          <button 
            onClick={handleViewClick}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-800 border border-gray-100 active:scale-95 transition-transform"
          >
            <ScanLine className="w-5 h-5 text-blue-600" />
          </button>
        </div>

        {/* Bottom Sheet UI */}
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[1000] border-t border-gray-100 pb-[env(safe-area-inset-bottom,20px)] pt-3 px-5 flex flex-col touch-none overscroll-none overflow-hidden">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-2"></div>
          
          <div className="flex justify-between items-center mb-0.5">
            <h2 className="text-[22px] font-medium text-gray-900 tracking-tight">Sajal Shaw</h2>
            <button onClick={() => setShowSettings(!showSettings)}>
              <Settings className={`text-gray-900 w-5 h-5 transition-transform duration-500 ${showSettings ? 'rotate-90 text-blue-600' : ''}`} />
            </button>
          </div>

          <div className="h-[1px] w-[calc(100%+2.5rem)] -ml-5 bg-gray-200 my-2" />

          {showSettings ? (
            <div className="flex-1 flex flex-col">
              {isAuthorized ? (
                <>
                  <div className="flex-1 flex flex-col items-center justify-center gap-5 py-10 pt-16">
                    <div className="flex items-center gap-5">
                      <button 
                        onClick={() => {
                          setMarkerPos(HOME_POS);
                          setRouteVisible(isIconOrderSwapped); // If Home is on right, routeVisible=true
                          setFlyToPosition({ pos: HOME_POS, zoom: 18, key: Date.now() });
                          
                          // Persist the static position
                          fetch("/api/simulation", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "save-pos", pos: HOME_POS })
                          }).catch(err => console.error("Save Pos Error:", err));

                          setShowSettings(false);
                          setTimeout(() => setFlyToPosition(null), 2000);
                        }}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-sm ${isAtHome ? 'bg-blue-600 scale-110' : 'bg-blue-50 hover:bg-blue-100'}`}
                      >
                        <HomeIcon className={`w-7 h-7 ${isAtHome ? 'text-white' : 'text-blue-600'}`} />
                      </button>
                      <button 
                        onClick={() => {
                          setMarkerPos(OFFICE_POS);
                          setRouteVisible(!isIconOrderSwapped); // If Office is on right, routeVisible=true
                          setFlyToPosition({ pos: OFFICE_POS, zoom: 18, key: Date.now() });
                          
                          // Persist the static position
                          fetch("/api/simulation", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "save-pos", pos: OFFICE_POS })
                          }).catch(err => console.error("Save Pos Error:", err));

                          setShowSettings(false);
                          setTimeout(() => setFlyToPosition(null), 2000);
                        }}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-sm ${isAtOffice ? 'bg-purple-600 scale-110' : 'bg-purple-50 hover:bg-purple-100'}`}
                      >
                        <Building2 className={`w-7 h-7 ${isAtOffice ? 'text-white' : 'text-purple-600'}`} />
                      </button>
                      <button 
                        onClick={() => setShowSlider(!showSlider)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors shadow-sm ${showSlider ? 'bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                        <Ban className={`w-7 h-7 ${showSlider ? 'text-gray-700' : 'text-gray-400'}`} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Custom slider toggle for routing */}
                  {showSlider && (
                    <div className="flex items-center justify-center gap-3 px-8 pb-8 w-full">
                      <button 
                        onClick={() => {
                          setRouteVisible(false);
                          setMarkerPos(isIconOrderSwapped ? HOME_POS : OFFICE_POS);
                        }}
                        className={`transition-all duration-300 flex-shrink-0 ${!routeVisible ? 'text-red-600 scale-125' : 'text-gray-300'}`}
                      >
                        {isIconOrderSwapped ? <HomeIcon className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </button>
                      
                      <div 
                        className="flex-1 relative h-[2px] bg-red-600 rounded-full cursor-pointer touch-none mx-2 mt-0.5"
                        onClick={() => setRouteVisible(!routeVisible)}
                      >
                        {/* Knob */}
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-[22px] h-[22px] transition-all duration-300 ease-out flex items-center justify-center"
                          style={{ 
                            left: isAnimating 
                              ? `${(routeVisible ? (1 - animationProgress) : animationProgress) * 100}%` 
                              : (routeVisible ? '100%' : '0%'), 
                            transform: 'translate(-50%, -50%)' 
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="w-full h-full text-red-600 fill-current overflow-visible" style={{ filter: 'drop-shadow(0 2px 4px rgba(220,38,38,0.3))' }}>
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.89c-3.14-.4-5.6-2.86-6-6A7.98 7.98 0 0 1 11.89 6c.04 0 .07 0 .11.01 3.23.41 5.76 2.94 6.17 6.17A8 8 0 0 1 11 17.89z" opacity="0.4" />
                            <path d="M8 12.5a4 4 0 1 0 8 0 4 4 0 1 0-8 0z" />
                            <path d="M12 4.5c4.14 0 7.5 3.36 7.5 7.5s-3.36 7.5-7.5 7.5-7.5-3.36-7.5-7.5 3.36-7.5 7.5-7.5m0-1.5C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" />
                            <path d="M10 9a2 2 0 1 1 4 0 2 2 0 1 1-4 0z" opacity="0.7"/>
                            <path d="M9 13a3 3 0 1 0 6 0 3 3 0 1 0-6 0z" opacity="0.5"/>
                          </svg>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setRouteVisible(true);
                          setMarkerPos(isIconOrderSwapped ? OFFICE_POS : HOME_POS);
                        }}
                        className={`transition-all duration-300 flex-shrink-0 ${routeVisible ? 'text-red-600 scale-125' : 'text-gray-300'}`}
                      >
                        {isIconOrderSwapped ? <Building2 className="w-5 h-5" /> : <HomeIcon className="w-5 h-5" />}
                      </button>

                      <button 
                        onClick={() => setIsIconOrderSwapped(!isIconOrderSwapped)}
                        className={`ml-2 transition-colors ${isIconOrderSwapped ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => isAnimating ? cancelAnimation() : setShowDurationModal(true)}
                        className={`ml-4 ${isAnimating ? 'bg-red-600' : 'bg-blue-600'} text-white px-3 py-1 rounded-full flex items-center gap-1.5 hover:opacity-90 transition-all shadow-sm`}
                      >
                        {isAnimating ? <X className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span className="text-[12px] font-bold uppercase tracking-wider">{isAnimating ? 'Stop' : 'Run'}</span>
                      </button>
                    </div>
                  )}

                  {isAnimating && (
                    <div className="px-8 pb-4 text-center">
                      <span className="text-[13px] font-bold text-blue-600 animate-pulse">
                        🚀 {timeLeftText} remaining
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col gap-6 py-10 px-6 bg-white">
                  <div className="space-y-2">
                    <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Network Protocol</label>
                    <input 
                      type="text" 
                      value={ipv6Code}
                      onChange={(e) => setIpv6Code(e.target.value)}
                      placeholder="ipv6 code"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Spatial Sync</label>
                    <input 
                      type="text" 
                      value={nearCoord}
                      onChange={(e) => setNearCoord(e.target.value)}
                      placeholder="near coordinate"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-sans"
                    />
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (ipv6Code === "GOA206" && nearCoord === "GOA206") {
                        setIsAuthorized(true);
                      } else {
                        window.location.reload();
                      }
                    }}
                    className="w-full bg-transparent border-2 border-blue-600 text-blue-600 py-4 rounded-xl font-bold mt-2 hover:bg-blue-50 active:scale-95 transition-all text-sm uppercase tracking-wider"
                  >
                    BACK
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Subheader */}
              <div className="flex items-center text-[13px] text-gray-500 mb-2 gap-1.5 font-medium">
                <span>10 m away</span>
                <span className="text-[10px]">•</span>
                
                {/* Custom Battery Indicator */}
                <div className="flex items-center text-gray-400">
                  <span className="w-[18px] h-[10px] rounded-[2px] border-2 border-gray-400 font-medium flex items-center justify-start relative overflow-hidden p-[1px]">
                     <div className="h-full bg-gray-400 w-[44%] rounded-[1px]" />
                  </span>
                  <span className="w-[2px] h-[4px] bg-gray-400 rounded-r-sm" />
                </div>

                <span className="text-gray-500 ml-[-2px]">44%</span>
                <span className="text-[10px]">•</span>
                <span>9 min ago</span>
              </div>

              <div className="h-[1px] w-[calc(100%+2.5rem)] -ml-5 bg-gray-200 mt-1 mb-0.5" />

              {/* Location & Directions */}
              <div className="flex justify-between items-center py-2.5">
                <p className="text-[14.5px] text-gray-800 leading-[1.35] w-[60%]">
                  {currentAddress.split('\n').map((line, i, arr) => (
                    <span key={i}>{line}{i < arr.length - 1 && <br/>}</span>
                  ))}
                </p>
                <button 
                  onClick={handleDirectionsClick}
                  className="bg-[#E4F6F9] text-[#00607A] px-5 py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-[#d0eff5] transition-colors text-[14px]"
                >
                  <div className="bg-[#00607A] rounded w-[22px] h-[18px] flex items-center justify-center">
                    <Navigation className="w-[11px] h-[11px] text-white fill-white rotate-45 ml-[1px]" />
                  </div>
                  Directions
                </button>
              </div>

              <div className="h-[1px] w-[calc(100%+2.5rem)] -ml-5 bg-gray-200 my-0.5" />

              {/* Notifications */}
              <div className="flex justify-between items-center py-3 text-[14px] text-gray-800">
                <span>Notifications are not available for this person</span>
                <HelpCircle className="w-[20px] h-[20px] text-gray-500" strokeWidth={1.5} />
              </div>

              {/* Share Button */}
              <button 
                onClick={() => setShowShareForm(true)}
                className="w-full bg-[#007b83] active:bg-[#006269] transition-colors text-white py-[12px] rounded-full font-medium mt-2 mb-16 text-[15px]"
              >
                Share location with Sajal Shaw
              </button>
            </>
          )}
        </div>


      </div>

      {/* Share Overlay */}
      {showShareForm && (
        <div className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-end min-[1000px]:items-center min-[1000px]:justify-center">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="bg-white w-full min-[1000px]:max-w-[400px] rounded-t-[32px] min-[1000px]:rounded-[32px] p-6 pt-8 pb-10"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Share your location</h3>
              <button onClick={() => setShowShareForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    value={shareName}
                    onChange={(e) => setShareName(e.target.value)}
                    placeholder="Enter name"
                    className="pl-11 h-12 bg-gray-50 border-gray-100 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Location Details</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    value={shareLocation}
                    onChange={(e) => setShareLocation(e.target.value)}
                    placeholder="Enter or fetch location"
                    className="pl-11 pr-12 h-12 bg-gray-50 border-gray-100 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button 
                    onClick={fetchCurrentLocation}
                    disabled={fetchingLocation}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {fetchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                onClick={handleShareSubmit}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-4 rounded-xl font-bold mt-4 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
              >
                Send via WhatsApp
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* No Contact Modal */}
      {showNoContact && (
        <div className="absolute inset-0 z-[3000] bg-black/40 backdrop-blur-sm flex items-center justify-center px-8">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-[320px] shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Contact Found</h3>
            <p className="text-gray-500 text-[14px] leading-relaxed mb-6">
              We couldn't find a contact associated with this spatial data stream. Please verify the optic matrix calibration.
            </p>
            <button 
              onClick={() => setShowNoContact(false)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Duration Input Modal */}
      {showDurationModal && (
        <div className="absolute inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-md px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-[360px] flex flex-col items-center text-center font-sans"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <Navigation className="w-8 h-8 text-blue-600" />
            </div>
            
            <h3 className="text-[22px] font-bold text-gray-900 mb-2">Simulate Trip</h3>
            <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
              How many hours does it usually take to reach your destination?
            </p>
            
            <div className="relative w-full mb-8">
              <input
                type="number"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                autoFocus
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-[24px] font-bold text-center text-blue-600 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="2"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[14px] font-bold text-gray-400 uppercase tracking-widest">Hrs</span>
            </div>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowDurationModal(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowDurationModal(false);
                  startAnimation(parseFloat(durationInput));
                }}
                className="flex-[1.5] bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
              >
                Start Simulation
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </main>
  );
}

// Simple Bookmark helper
function BookmarkIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}
