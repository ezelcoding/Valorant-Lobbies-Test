import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Copy, Clipboard } from 'lucide-react';

const ValorantLobbies = () => {
  const [cooldownTime, setCooldownTime] = useState(0);
  const [newLobby, setNewLobby] = useState({
    rankFrom: 'Gold',
    rankTo: 'Only',
    mode: 'Competitive',
    mic: 'Required',
    age: 'All Ages',
    spots: 2,
    code: ''
  });

  const [lobbies, setLobbies] = useState([
    {
      id: 1,
      rankFrom: 'Gold',
      rankTo: 'Platinum',
      mode: 'Competitive',
      timeAgo: '3 minutes ago',
      mic: 'Required',
      age: '18+ Only',
      code: 'GLD123',
      spots: 2,
      color1: 'rgb(250, 204, 21)',
      color2: 'rgb(34, 211, 238)'
    },
    {
      id: 2,
      rankFrom: 'Platinum',
      rankTo: 'Diamond',
      mode: 'Unrated',
      timeAgo: '15 minutes ago',
      mic: 'Optional',
      age: 'All Ages',
      code: 'PLT456',
      spots: 1,
      color1: 'rgb(34, 211, 238)',
      color2: 'rgb(168, 85, 247)'
    },
    {
      id: 3,
      rankFrom: 'Diamond',
      rankTo: 'Only',
      mode: 'Competitive',
      timeAgo: '1 hour ago',
      mic: 'Required',
      age: '18+ Only',
      code: 'DMD789',
      spots: 3,
      color1: 'rgb(168, 85, 247)',
      color2: 'rgb(168, 85, 247)'
    },
    {
      id: 4,
      rankFrom: 'Silver',
      rankTo: 'Gold',
      mode: 'Spike Rush',
      timeAgo: '2 hours ago',
      mic: 'Optional',
      age: 'All Ages',
      code: 'SLV234',
      spots: 4,
      color1: 'rgb(156, 163, 175)',
      color2: 'rgb(250, 204, 21)'
    },
    {
      id: 5,
      rankFrom: 'Immortal',
      rankTo: 'Only',
      mode: 'Competitive',
      timeAgo: '5 minutes ago',
      mic: 'Required',
      age: '18+ Only',
      code: 'IMM567',
      spots: 2,
      color1: 'rgb(239, 68, 68)',
      color2: 'rgb(239, 68, 68)'
    },
    {
      id: 6,
      rankFrom: 'Bronze',
      rankTo: 'Silver',
      mode: 'Unrated',
      timeAgo: '30 minutes ago',
      mic: 'Optional',
      age: 'All Ages',
      code: 'BRZ890',
      spots: 3,
      color1: 'rgb(120, 53, 15)',
      color2: 'rgb(156, 163, 175)'
    },
    {
      id: 7,
      rankFrom: 'Gold',
      rankTo: 'Only',
      mode: 'Deathmatch',
      timeAgo: '45 minutes ago',
      mic: 'Optional',
      age: 'All Ages',
      code: 'GLD678',
      spots: 2,
      color1: 'rgb(250, 204, 21)',
      color2: 'rgb(250, 204, 21)'
    },
    {
      id: 8,
      rankFrom: 'Platinum',
      rankTo: 'Diamond',
      mode: 'Competitive',
      timeAgo: '20 minutes ago',
      mic: 'Required',
      age: '18+ Only',
      code: 'PLT901',
      spots: 4,
      color1: 'rgb(34, 211, 238)',
      color2: 'rgb(168, 85, 247)'
    },
    {
      id: 9,
      rankFrom: 'Diamond',
      rankTo: 'Ascendant',
      mode: 'Unrated',
      timeAgo: '1 hour ago',
      mic: 'Optional',
      age: 'All Ages',
      code: 'DMD234',
      spots: 2,
      color1: 'rgb(168, 85, 247)',
      color2: 'rgb(16, 185, 129)'
    },
    {
      id: 10,
      rankFrom: 'Iron',
      rankTo: 'Bronze',
      mode: 'Spike Rush',
      timeAgo: '3 hours ago',
      mic: 'Required',
      age: 'All Ages',
      code: 'IRN567',
      spots: 3,
      color1: 'rgb(75, 85, 99)',
      color2: 'rgb(120, 53, 15)'
    }
  ]);

  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(cooldownTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);

  const ranks = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal'];
  const gameModes = ['Competitive', 'Unrated', 'Spike Rush', 'Deathmatch'];

  const validateLobbyCode = (code) => {
    const regex = /^[A-Z]{3}[0-9]{3}$/;
    return regex.test(code.toUpperCase());
  };

  const handleCreateLobby = () => {
    if (!validateLobbyCode(newLobby.code)) {
      alert('Invalid lobby code! Must be 3 letters followed by 3 numbers (e.g., ABC123)');
      return;
    }

    if (lobbies.some(l => l.code.toLowerCase() === newLobby.code.toLowerCase())) {
      alert('This lobby code already exists!');
      return;
    }

    const rankIndex = ranks.indexOf(newLobby.rankFrom);
    const color1 = getRankColorRGB(newLobby.rankFrom);
    const color2 = newLobby.rankTo === 'Only' ? color1 : getRankColorRGB(newLobby.rankTo);

    const lobby = {
      id: Date.now(),
      rankFrom: newLobby.rankFrom,
      rankTo: newLobby.rankTo,
      mode: newLobby.mode,
      timeAgo: 'Just now',
      mic: newLobby.mic,
      age: newLobby.age,
      code: newLobby.code.toUpperCase(),
      spots: newLobby.spots,
      color1,
      color2,
      timestamp: Date.now()
    };

    setLobbies([lobby, ...lobbies]);
    setNewLobby({ ...newLobby, code: '' });
    setCooldownTime(60);
  };

  const handlePasteCode = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const text = await navigator.clipboard.readText();
      const cleanedText = text.trim().toUpperCase().slice(0, 6);
      setNewLobby(prev => ({ ...prev, code: cleanedText }));
    } catch (err) {
      // Try alternative method using execCommand
      try {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        document.execCommand('paste');
        const pastedText = input.value.trim().toUpperCase().slice(0, 6);
        setNewLobby(prev => ({ ...prev, code: pastedText }));
        document.body.removeChild(input);
      } catch (error) {
        // Manual paste fallback
        const manualCode = prompt('Paste your lobby code here (6 characters: 3 letters + 3 numbers):');
        if (manualCode) {
          const cleanedText = manualCode.trim().toUpperCase().slice(0, 6);
          setNewLobby(prev => ({ ...prev, code: cleanedText }));
        }
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

  const getRankColor = (rankFrom, rankTo) => {
    return 'bg-white/20 backdrop-blur-sm border border-white/30';
  };

  const getModeColor = (mode) => {
    return 'bg-white/20 backdrop-blur-sm border border-white/30';
  };

  const getTimeColor = (timeAgo) => {
    return 'bg-white/20 backdrop-blur-sm border border-white/30';
  };

  const getAgeColor = (age) => {
    if (age === 'All Ages') return 'bg-white/20 backdrop-blur-sm border border-white/30';
    return 'bg-white/20 backdrop-blur-sm border border-white/30';
  };

  const getAgeTextColor = (age) => {
    return 'text-gray-900';
  };

  const getSpotsColor = (spots) => {
    return 'bg-white/20 backdrop-blur-sm border border-white/30';
  };

  const getMicIcon = (micStatus) => {
    if (micStatus === 'Required') {
      return (
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-1.5 rounded-full shadow-lg">
          <Mic className="w-4 h-4 text-gray-900" />
          <span className="text-gray-900 font-semibold text-sm">Required</span>
        </div>
      );
    } else if (micStatus === 'Optional') {
      return (
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-1.5 rounded-full shadow-lg">
          <Mic className="w-4 h-4 text-gray-900" />
          <span className="text-gray-900 font-semibold text-sm">Optional</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-1.5 rounded-full shadow-lg">
          <MicOff className="w-4 h-4 text-gray-900" />
          <span className="text-gray-900 font-semibold text-sm">Not Required</span>
        </div>
      );
    }
  };

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
          {lobbies.map((lobby) => (
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
                <div className={`${getRankColor(lobby.rankFrom, lobby.rankTo)} px-3 py-1.5 rounded-full shadow-lg w-full`}>
                  <span className="font-semibold text-gray-900 text-sm block text-center truncate">
                    {lobby.rankTo === 'Only' ? lobby.rankFrom : `${lobby.rankFrom} - ${lobby.rankTo}`}
                  </span>
                </div>
              </div>

              {/* Column 2: Mode */}
              <div className="flex items-center justify-center">
                <div className={`${getModeColor(lobby.mode)} px-3 py-1.5 rounded-full shadow-lg w-full`}>
                  <span className="font-semibold text-gray-900 text-sm block text-center truncate">{lobby.mode}</span>
                </div>
              </div>

              {/* Column 4: Mic */}
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

              {/* Column 5: Age */}
              <div className="flex items-center justify-center">
                <div className={`${getAgeColor(lobby.age)} px-3 py-1.5 rounded-full shadow-lg w-full`}>
                  <span className={`${getAgeTextColor(lobby.age)} font-semibold text-sm block text-center truncate`}>{lobby.age}</span>
                </div>
              </div>

              {/* Column 3: Time Ago */}
              <div className="flex items-center justify-center">
                <div className={`${getTimeColor(lobby.timeAgo)} px-3 py-1.5 rounded-full shadow-lg w-full`}>
                  <span className="text-gray-900 text-sm font-semibold block text-center truncate">{lobby.timeAgo}</span>
                </div>
              </div>

              {/* Column 7: Remaining Spots */}
              <div className="flex items-center justify-center">
                <div className={`${getSpotsColor(lobby.spots)} px-3 py-1.5 rounded-full shadow-lg w-full`}>
                  <span className="font-semibold text-gray-900 text-sm block text-center truncate">
                    {lobby.spots} {lobby.spots === 1 ? 'spot' : 'spots'}
                  </span>
                </div>
              </div>

              {/* Column 6: Lobby Code */}
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default ValorantLobbies;
