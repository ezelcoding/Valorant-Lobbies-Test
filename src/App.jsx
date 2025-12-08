import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Copy, Clipboard } from 'lucide-react';

// ⚠️ SUPABASE BİLGİLERİNİZ ⚠️
const SUPABASE_URL = 'https://ovjvtkustkjseveeyrei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92anZ0a3VzdGtqc2V2ZWV5cmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjY2NDUsImV4cCI6MjA4MDQ0MjY0NX0.fEE1tIdD6vDrDx2I9cmMOxtVs6eUbJw8GpWroCcCv2Y';

const ValorantLobbies = () => {
  const [cooldownTime, setCooldownTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const lobbiesPerPage = 10;
  
  const [newLobby, setNewLobby] = useState({
    rankFrom: 'Gold',
    rankTo: 'Only',
    mode: 'Competitive',
    mic: 'Required',
    age: 'All Ages',
    spots: 2,
    code: ''
  });

  const [copiedCode, setCopiedCode] = useState(null);

  const ranks = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal'];
  const gameModes = ['Competitive', 'Unrated', 'Spike Rush', 'Deathmatch'];

  // Fetch lobbies from Supabase using REST API
  const fetchLobbies = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/lobbies?created_at=gte.${fiveMinutesAgo}&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch lobbies');
      
      const data = await response.json();

      const formattedLobbies = data.map(lobby => ({
        ...lobby,
        timeAgo: getTimeAgo(new Date(lobby.created_at)),
        timestamp: new Date(lobby.created_at).getTime()
      }));

      setLobbies(formattedLobbies);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching lobbies:', error);
      setLoading(false);
    }
  };

  // Auto-refresh lobbies every 10 seconds
  useEffect(() => {
    fetchLobbies();
    
    const interval = setInterval(() => {
      fetchLobbies();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Auto-delete old lobbies every 30 seconds
  useEffect(() => {
    const deleteInterval = setInterval(async () => {
      const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
      
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/lobbies?created_at=lt.${fiveMinutesAgo}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          }
        );
      } catch (error) {
        console.error('Error deleting old lobbies:', error);
      }
    }, 30000);

    return () => clearInterval(deleteInterval);
  }, []);

  // Update time ago every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLobbies(prev => prev.map(lobby => ({
        ...lobby,
        timeAgo: getTimeAgo(new Date(lobby.created_at))
      })));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(cooldownTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);

  const getTimeAgo = (date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  };

  const validateLobbyCode = (code) => {
    const regex = /^[A-Z]{3}[0-9]{3}$/;
    return regex.test(code.toUpperCase());
  };

  const handleCreateLobby = async () => {
    if (!validateLobbyCode(newLobby.code)) {
      alert('Invalid lobby code! Must be 3 letters followed by 3 numbers (e.g., ABC123)');
      return;
    }

    if (lobbies.some(l => l.code.toLowerCase() === newLobby.code.toLowerCase())) {
      alert('This lobby code already exists!');
      return;
    }

    const color1 = getRankColorRGB(newLobby.rankFrom);
    const color2 = newLobby.rankTo === 'Only' ? color1 : getRankColorRGB(newLobby.rankTo);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/lobbies`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          rank_from: newLobby.rankFrom,
          rank_to: newLobby.rankTo,
          mode: newLobby.mode,
          mic: newLobby.mic,
          age: newLobby.age,
          code: newLobby.code.toUpperCase(),
          spots: newLobby.spots,
          color1,
          color2
        })
      });

      if (!response.ok) throw new Error('Failed to create lobby');

      setNewLobby({ ...newLobby, code: '' });
      setCooldownTime(60);
      setCurrentPage(1);
      fetchLobbies(); // Refresh immediately
    } catch (error) {
      console.error('Error creating lobby:', error);
      alert('Error creating lobby. Please try again.');
    }
  };

  const handlePasteCode = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const text = await navigator.clipboard.readText();
      const cleanedText = text.trim().toUpperCase().slice(0, 6);
      setNewLobby(prev => ({ ...prev, code: cleanedText }));
    } catch (err) {
      const manualCode = prompt('Paste your lobby code here (6 characters: 3 letters + 3 numbers):');
      if (manualCode) {
        const cleanedText = manualCode.trim().toUpperCase().slice(0, 6);
        setNewLobby(prev => ({ ...prev, code: cleanedText }));
      }
    }
  };

  const getRankColorRGB = (rank) => {
    const colorMap = {
      'Iron': 'rgb(75, 85, 99)',
      'Bronze': 'rgb(120, 53, 15)',
      'Silver': 'rgb(156, 163, 175)',
      'Gold': 'rgb(250, 204, 21)',
      'Platinum': 'rgb(34, 211, 238)',
      'Diamond': 'rgb(168, 85, 247)',
      'Ascendant': 'rgb(16, 185, 129)',
      'Immortal': 'rgb(239, 68, 68)'
    };
    return colorMap[rank] || 'rgb(156, 163, 175)';
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getRankColor = () => 'bg-white/20 backdrop-blur-sm border border-white/30';
  const getModeColor = () => 'bg-white/20 backdrop-blur-sm border border-white/30';
  const getTimeColor = () => 'bg-white/20 backdrop-blur-sm border border-white/30';
  const getAgeColor = () => 'bg-white/20 backdrop-blur-sm border border-white/30';
  const getAgeTextColor = () => 'text-gray-900';
  const getSpotsColor = () => 'bg-white/20 backdrop-blur-sm border border-white/30';

  const getGradientStyle = (color1, color2) => {
    const c1 = color1.replace('rgb(', '').replace(')', '');
    const c2 = color2.replace('rgb(', '').replace(')', '');
    return {
      background: `linear-gradient(to right, 
        rgba(${c1}, 0.2) 0%, 
        rgba(${c1}, 0.6) 20%, 
        rgba(${c1}, 1) 40%, 
        rgba(${c2}, 1) 60%, 
        rgba(${c2}, 0.6) 80%, 
        rgba(${c2}, 0.2) 100%)`
    };
  };

  const indexOfLastLobby = currentPage * lobbiesPerPage;
  const indexOfFirstLobby = indexOfLastLobby - lobbiesPerPage;
  const currentLobbies = lobbies.slice(indexOfFirstLobby, indexOfLastLobby);
  const totalPages = Math.ceil(lobbies.length / lobbiesPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-900">Loading lobbies...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Valorant Lobbies</h1>
          <p className="text-gray-800 text-center mb-4">
            Find and join existing lobbies. <span className="font-semibold">Newly created lobbies will appear at the top instantly.</span>
          </p>
        </div>

        {/* Create Lobby Card */}
        <div className="bg-gray-200/40 backdrop-blur-sm border border-white/40 rounded-3xl p-4 mb-6 shadow-lg">
          <div className="grid items-center mb-3"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr 0.6fr 0.7fr 1fr',
              gap: '0.5rem'
            }}>
            {/* Rank Selection */}
            <div className="flex gap-2">
              <select
                value={newLobby.rankFrom}
                onChange={(e) => setNewLobby({ ...newLobby, rankFrom: e.target.value })}
                className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-900 text-center flex-1 shadow-md"
              >
                {ranks.map(rank => <option key={rank} value={rank}>{rank}</option>)}
              </select>
              <select
                value={newLobby.rankTo}
                onChange={(e) => setNewLobby({ ...newLobby, rankTo: e.target.value })}
                className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-900 text-center flex-1 shadow-md"
              >
                <option value="Only">Only</option>
                {ranks.map(rank => <option key={rank} value={rank}>{rank}</option>)}
              </select>
            </div>

            {/* Game Mode */}
            <select
              value={newLobby.mode}
              onChange={(e) => setNewLobby({ ...newLobby, mode: e.target.value })}
              className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-900 text-center shadow-md"
            >
              {gameModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select>

            {/* Mic Option */}
            <select
              value={newLobby.mic}
              onChange={(e) => setNewLobby({ ...newLobby, mic: e.target.value })}
              className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-900 text-center shadow-md"
            >
              <option value="Required">Required</option>
              <option value="Optional">Optional</option>
            </select>

            {/* Age Option */}
            <select
              value={newLobby.age}
              onChange={(e) => setNewLobby({ ...newLobby, age: e.target.value })}
              className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-900 text-center shadow-md"
            >
              <option value="All Ages">All Ages</option>
              <option value="18+ Only">18+ Only</option>
            </select>

            {/* Spots */}
            <select
              value={newLobby.spots}
              onChange={(e) => setNewLobby({ ...newLobby, spots: parseInt(e.target.value) })}
              className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-900 text-center shadow-md"
            >
              <option value="1">1 spot</option>
              <option value="2">2 spots</option>
              <option value="3">3 spots</option>
              <option value="4">4 spots</option>
            </select>

            {/* Lobby Code Input with Paste Button */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={newLobby.code}
                onChange={(e) => setNewLobby({ ...newLobby, code: e.target.value.toUpperCase() })}
                maxLength={6}
                placeholder="ABC123"
                className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-3 py-1.5 pr-10 text-sm font-semibold text-gray-900 text-center placeholder-gray-600 shadow-md w-full"
              />
              <button
                type="button"
                onClick={handlePasteCode}
                className="absolute right-1 bg-white/40 backdrop-blur-sm border border-white/40 hover:bg-white/50 p-1 rounded-full transition-colors shadow-md"
                title="Paste code"
              >
                <Clipboard className="w-3.5 h-3.5 text-gray-900" />
              </button>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateLobby}
            disabled={cooldownTime > 0 || !newLobby.code}
            className="w-full bg-white/30 backdrop-blur-sm border border-white/40 hover:bg-white/40 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 px-6 py-2 rounded-full font-semibold transition-colors shadow-lg"
          >
            {cooldownTime > 0 ? `Wait ${cooldownTime}s` : 'Create Lobby'}
          </button>
          
          <p className="text-xs text-gray-700 text-center mt-2 italic">
            60 seconds cooldown after creating a new lobby, so double check before creating one.
          </p>
        </div>

        {/* Lobbies */}
        <div className="space-y-3">
          {currentLobbies.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-lg">
              No active lobbies. Create the first one!
            </div>
          ) : (
            currentLobbies.map((lobby) => (
              <div
                key={lobby.id}
                className="rounded-3xl p-3 grid items-center shadow-md"
                style={{
                  ...getGradientStyle(lobby.color1, lobby.color2),
                  gridTemplateColumns: '2fr 1fr 1fr 0.6fr 1fr 0.7fr 1fr',
                  gap: '0.5rem'
                }}
              >
                {/* Column 1: Rank Range */}
                <div className="flex items-center justify-center">
                  <div className={`${getRankColor()} px-3 py-1.5 rounded-full shadow-lg w-full`}>
                    <span className="font-semibold text-gray-900 text-sm block text-center truncate">
                      {lobby.rank_to === 'Only' ? lobby.rank_from : `${lobby.rank_from} - ${lobby.rank_to}`}
                    </span>
                  </div>
                </div>

                {/* Column 2: Mode */}
                <div className="flex items-center justify-center">
                  <div className={`${getModeColor()} px-3 py-1.5 rounded-full shadow-lg w-full`}>
                    <span className="font-semibold text-gray-900 text-sm block text-center truncate">{lobby.mode}</span>
                  </div>
                </div>

                {/* Column 3: Mic */}
                <div className="flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 rounded-full shadow-lg w-full flex items-center justify-center gap-1.5">
                    {lobby.mic === 'Required' ? (
                      <Mic className="w-3.5 h-3.5 text-gray-900 flex-shrink-0" />
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-gray-900 flex-shrink-0" />
                    )}
                    <span className="text-gray-900 font-semibold text-sm truncate">{lobby.mic}</span>
                  </div>
                </div>

                {/* Column 4: Age */}
                <div className="flex items-center justify-center">
                  <div className={`${getAgeColor()} px-3 py-1.5 rounded-full shadow-lg w-full`}>
                    <span className={`${getAgeTextColor()} font-semibold text-sm block text-center truncate`}>{lobby.age}</span>
                  </div>
                </div>

                {/* Column 5: Time Ago */}
                <div className="flex items-center justify-center">
                  <div className={`${getTimeColor()} px-3 py-1.5 rounded-full shadow-lg w-full`}>
                    <span className="text-gray-900 text-sm font-semibold block text-center truncate">{lobby.timeAgo}</span>
                  </div>
                </div>

                {/* Column 6: Remaining Spots */}
                <div className="flex items-center justify-center">
                  <div className={`${getSpotsColor()} px-3 py-1.5 rounded-full shadow-lg w-full`}>
                    <span className="font-semibold text-gray-900 text-sm block text-center truncate">
                      {lobby.spots} {lobby.spots === 1 ? 'spot' : 'spots'}
                    </span>
                  </div>
                </div>

                {/* Column 7: Lobby Code */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => copyToClipboard(lobby.code)}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors shadow-lg w-full flex items-center justify-center gap-1.5"
                    title="Click to copy"
                  >
                    <span className="font-semibold text-gray-900 text-sm truncate">{lobby.code}</span>
                    <Copy className="w-3.5 h-3.5 text-gray-900 flex-shrink-0" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-3 mt-6">
            <div className="flex gap-2">
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`px-4 py-2 rounded-full transition-colors shadow-lg ${
                    currentPage === index + 1
                      ? 'bg-gray-900 text-white border border-gray-900 font-bold'
                      : 'bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 text-gray-900 font-semibold'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-700 text-center italic">
              Lobby listings older than 5 minutes will be automatically deleted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValorantLobbies;
