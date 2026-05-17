import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Camera, Wallet, Pencil, CheckCircle2, Cloud, Sun, CloudRain, Navigation  } from 'lucide-react';
import { saveCheckIn, getAllCheckIns, deleteCheckIn, saveApiCache, getApiCache, getCurrentUserId } from '../db';
import { API_BASE_URL } from '../config';

export default function Itinerary({ onSelectLocation, refreshTrigger }) {
  const [schedule, setSchedule] = useState([]);
  const [checkIns, setCheckIns] = useState([]); // Track local overrides
  const [loading, setLoading] = useState(true);
  const [activeDayId, setActiveDayId] = useState(null);
  const [weather, setWeather] = useState({});

    const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
    };

    const formatDistance = (distanceKm) => {
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)} m`;
        }

        if (distanceKm >= 100) {
            return `${Math.round(distanceKm).toLocaleString()} km`;
        }

        return `${distanceKm.toFixed(1)} km`;
    };


  const fetchWeather = async (lat, lon, locationId) => {
    const cacheKey = `weather_${locationId}`;
    try {
      // 1. Try to get LIVE weather from your Python server
      const res = await fetch(`${API_BASE_URL}/api/integrations/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error("Offline");
      const liveData = await res.json();
      
      // 2. Save it to offline cache!
      await saveApiCache(cacheKey, liveData);
      setWeather(prev => ({ ...prev, [locationId]: liveData }));
    } catch (err) {
      // 3. If offline, gracefully load the last known weather from IndexedDB
      const cached = await getApiCache(cacheKey);
      if (cached) {
        setWeather(prev => ({ ...prev, [locationId]: cached.data }));
      }
    }
  };

    const getDefaultDayId = (days) => {
    if (!days || days.length === 0) return null;

    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);

    // Exact match: today is one of the trip days
    const todayDay = days.find(day => day.date === todayString);
    if (todayDay) return todayDay.id;

    // Before trip: use first day
    if (todayString < days[0].date) {
        return days[0].id;
    }

    // After trip: use last day
    if (todayString > days[days.length - 1].date) {
        return days[days.length - 1].id;
    }

    // During trip but no exact match, fallback to first day
    return days[0].id;
    };

    const loadData = async () => {
    try {
        // Fetch planned schedule from backend
        const res = await fetch(`${API_BASE_URL}/api/itinerary/`);
        const data = await res.json();

        // Fetch actual check-ins from local DB
        const currentUserId = getCurrentUserId();
        const localCheckIns = await getAllCheckIns();
        const userCheckIns = localCheckIns.filter(c => c.user_id === currentUserId);

        setSchedule(data);
        setCheckIns(userCheckIns);

        // Set Day 1 as active the first time
        if (!activeDayId && data.length > 0) {
        setActiveDayId(getDefaultDayId(data));
        }

    } catch (err) {
        console.error("Failed to fetch itinerary", err);
    }

    setLoading(false);
    };

    const [userPosition, setUserPosition] = useState(null);

    useEffect(() => {
    loadData();
    }, [refreshTrigger]);

    const currentDay = schedule.find(d => d.id === activeDayId) || schedule[0];
    const currentDayIndex = schedule.findIndex(d => d.id === currentDay?.id) + 1;
    //const bannerImage = `/trip-banners/day-${currentDayIndex}.png`;
    const bannerImage = `${import.meta.env.BASE_URL}trip-banners/day-${currentDayIndex}.png`;
    
    useEffect(() => {
    if (!currentDay) return;

    currentDay.locations.forEach(loc => {
        if (loc.lat && loc.lon && !weather[loc.id]) {
        fetchWeather(loc.lat, loc.lon, loc.id);
        }
    });
    }, [currentDay?.id]);

    
    useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        (position) => {
        setUserPosition({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
        });
        },
        (error) => {
        console.warn("Geolocation unavailable:", error);
        },
        {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
        }
    );
    }, []);


    const openMap = (loc) => {
    if (!loc.lat || !loc.lon) {
        alert("這個地點沒有 GPS 座標");
        return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lon}`;
    window.open(url, "_blank", "noopener,noreferrer");
    };
  
  // Priority 1: The Toggle (Switches between NOW and Planned Time)
  const handleToggleCheckIn = async (locId, isCurrentlyCheckedIn) => {
    if (isCurrentlyCheckedIn) {
      // If already checked in, UNDO it!
      await deleteCheckIn(locId, getCurrentUserId());
    } else {
      // If not checked in, set time to NOW!
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await saveCheckIn(locId, timeString, getCurrentUserId());
    }
    loadData(); // Refresh UI
  };

  // Priority 1: Manual Override (User types the time)
  const handleTimeChange = async (locId, e) => {
    const newTime = e.target.value;
    if (newTime) {
      await saveCheckIn(locId, newTime, getCurrentUserId());
      loadData(); // Refresh UI
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">載入行程中...</div>;
  if (schedule.length === 0) return <div className="p-8 text-center text-gray-500">尚無行程資料</div>;

  //const currentDay = schedule.find(d => d.id === activeDayId) || schedule[0];

  return (
    <div className="pb-24 animate-fade-in">
        <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
        <img 
            src={bannerImage}
            alt={currentDay.title}
            className="w-full h-full object-cover"
            onError={(e) => {
            //e.currentTarget.src = "/trip-banners/default.png";
            e.currentTarget.src = `${import.meta.env.BASE_URL}trip-banners/default.png`;
            }}
        />
        </div>

      <div className="sticky top-0 z-30 bg-[#f8f5f2]/95 backdrop-blur-sm shadow-sm pt-3 pb-3">
        <div className="flex overflow-x-auto gap-3 px-4 pb-1 scrollbar-hide">
            {schedule.map((day, index) => (
                <button 
                  key={day.id} 
                  onClick={() => setActiveDayId(day.id)}
                  className={`flex-shrink-0 w-14 h-16 rounded-xl flex flex-col items-center justify-center transition-all ${activeDayId === day.id ? 'bg-[#e85a4f] text-white shadow-md scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}
                >
                    <span className="text-[10px] font-bold">Day {index + 1}</span>
                    <span className="text-lg font-bold">{day.date.split('-')[2]}</span>
                </button>
            ))}
        </div>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {currentDay.locations.map(loc => {
          // Check if we have a local check-in override!
          const checkInRecord = checkIns.find(c => c.location_id === loc.id);
          const isCheckedIn = !!checkInRecord;
          const displayTime = isCheckedIn ? checkInRecord.actual_time : loc.time;

          return (
            <div key={loc.id} className={`bg-white p-4 rounded-2xl shadow-sm border transition-all duration-300 ${isCheckedIn ? 'border-[#e85a4f]/30 ring-1 ring-[#e85a4f]/10' : 'border-gray-100'}`}>
              
              <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-colors ${isCheckedIn ? 'bg-[#e85a4f]/10 text-[#e85a4f]' : 'bg-gray-100 text-gray-500'}`}>
                          {isCheckedIn ? <CheckCircle2 size={18} /> : <MapPin size={18} />}
                      </div>
                      <div>
                          {/* THE MAGIC TIME INPUT */}
                          <input 
                            type="time"
                            value={displayTime}
                            onChange={(e) => handleTimeChange(loc.id, e)}
                            className={`font-mono text-xl font-bold bg-transparent outline-none cursor-pointer hover:bg-gray-50 rounded px-1 -ml-1 transition-colors ${isCheckedIn ? 'text-[#e85a4f]' : 'text-gray-800'}`}
                          />
                          <h3 className="text-md font-bold text-gray-800 mt-0.5">{loc.name}</h3>
                          {/* Live Weather and distance */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {weather[loc.id] && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 bg-blue-50 w-max px-2 py-0.5 rounded-md">
                                {weather[loc.id].symbol.includes('rain') ? <CloudRain size={12} /> : 
                                weather[loc.id].symbol.includes('cloud') ? <Cloud size={12} /> : 
                                <Sun size={12} />}
                                <span>{weather[loc.id].temperature}°C</span>
                                </div>
                            )}

                            {userPosition && loc.lat && loc.lon && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 w-max px-2 py-0.5 rounded-md">
                                <Navigation size={12} />
                                <span>
                                    {formatDistance(
                                    calculateDistanceKm(userPosition.lat, userPosition.lon, loc.lat, loc.lon)
                                    )}
                                </span>
                                </div>
                            )}
                            </div>
                      </div>
                  </div>
                  
                  {/* The Functional Toggle! */}
                  <button 
                    onClick={() => handleToggleCheckIn(loc.id, isCheckedIn)}
                    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors duration-300 ${isCheckedIn ? 'bg-[#10B981]' : 'bg-gray-200'}`}
                  >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isCheckedIn ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
              </div>

              {/* Action Buttons */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                    <button
                        onClick={() => onSelectLocation(loc, currentDay.id, 'note')}
                        className="py-2 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 flex items-center justify-center gap-1 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                        <Pencil size={14} /> 筆記
                    </button>

                    <button
                        onClick={() => onSelectLocation(loc, currentDay.id, 'expense')}
                        className="py-2 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 flex items-center justify-center gap-1 text-xs font-bold hover:bg-green-50 hover:text-green-600 transition-colors"
                    >
                        <Wallet size={14} /> 記帳
                    </button>

                    <button
                        onClick={() => onSelectLocation(loc, currentDay.id, 'photo')}
                        className="py-2 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 flex items-center justify-center gap-1 text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                        <Camera size={14} /> 拍照
                    </button>

                    <button
                        onClick={() => openMap(loc)}
                        disabled={!loc.lat || !loc.lon}
                        className={`py-2 rounded-lg border border-gray-100 flex items-center justify-center gap-1 text-xs font-bold transition-colors ${
                        loc.lat && loc.lon
                            ? 'bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600'
                            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                        <Navigation size={14} /> 地圖
                    </button>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}