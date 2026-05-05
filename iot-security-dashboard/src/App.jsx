import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ethers } from 'ethers';
import { Shield, ShieldAlert, Activity, Database, Key, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getContract, CONTRACT_ADDRESS } from './contractConfig';

// Assume socket server is on localhost:3001
const socket = io('http://localhost:3001');

function App() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, blocked: 0 });
  const [adminDeviceId, setAdminDeviceId] = useState('');
  const [contract, setContract] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('Disconnected');
  const [tamperAlerts, setTamperAlerts] = useState({});
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  useEffect(() => {
    // Initialize Web3
    const initWeb3 = async () => {
      try {
        const c = await getContract();
        setContract(c);
        setNetworkStatus('Secured');
      } catch (error) {
        console.error("Failed to connect to blockchain", error);
        setNetworkStatus('Connection Error');
      }
    };
    initWeb3();

    // Listen to mock or real socket events
    socket.on('newLog', (log) => {
      setLogs((prev) => [log, ...prev].slice(0, 50));
      setStats((prev) => {
        const isVerified = log.status === 'Verified';
        return {
          total: prev.total + 1,
          verified: prev.verified + (isVerified ? 1 : 0),
          blocked: prev.blocked + (!isVerified ? 1 : 0)
        };
      });
    });

    socket.on('initialLogs', (initialLogs) => {
      setLogs(initialLogs);
      // Calculate stats based on initial logs
      let total = initialLogs.length;
      let verified = 0;
      let blocked = 0;
      initialLogs.forEach(log => {
        if (log.status === 'Verified') verified++;
        else blocked++;
      });
      setStats(prev => ({
        total: prev.total + total,
        verified: prev.verified + verified,
        blocked: prev.blocked + blocked
      }));
    });

    return () => {
      socket.off('newLog');
      socket.off('initialLogs');
    };
  }, []);

  const handleAuthorize = async (e) => {
    e.preventDefault();
    if (!contract || !adminDeviceId) return;
    setIsAuthorizing(true);
    try {
      const tx = await contract.authorizeDevice(adminDeviceId);
      await tx.wait();
      alert(`Successfully authorized ${adminDeviceId}`);
      setAdminDeviceId('');
    } catch (error) {
      console.error(error);
      alert("Authorization failed. Ensure you are the admin.");
    }
    setIsAuthorizing(false);
  };

  const handleIntegrityCheck = async (deviceId, localHash, logId) => {
    if (!contract) return;
    try {
      const onChainHash = await contract.getLatestHash(deviceId);
      if (onChainHash === localHash) {
        setTamperAlerts(prev => ({ ...prev, [logId]: 'verified' }));
      } else {
        setTamperAlerts(prev => ({ ...prev, [logId]: 'tampered' }));
      }
    } catch (error) {
      console.error(error);
      setTamperAlerts(prev => ({ ...prev, [logId]: 'error' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-6">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-gray-800">
        <div className="flex items-center space-x-3 mb-4 md:mb-0">
          <div className="bg-emerald-500/20 p-3 rounded-lg border border-emerald-500/30">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
              IoT Hybrid Security
            </h1>
            <p className="text-gray-400 text-sm">Decentralized Access Control & Integrity</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-800 shadow-inner">
            <Activity className={`w-4 h-4 ${networkStatus === 'Secured' ? 'text-emerald-400' : 'text-rose-500 animate-pulse'}`} />
            <span className="text-sm font-medium">Blockchain: {networkStatus}</span>
          </div>
          <div className="flex items-center space-x-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-800 shadow-inner truncate max-w-[200px]">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium truncate">{CONTRACT_ADDRESS}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Stats Overview */}
          <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl p-6 border border-gray-800 shadow-xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center text-gray-100">
              <Activity className="w-5 h-5 mr-2 text-cyan-400" />
              System Metrics
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 flex justify-between items-center transition-all hover:bg-gray-800">
                <span className="text-gray-400 text-sm">Total Logs</span>
                <span className="text-2xl font-bold text-gray-100">{stats.total}</span>
              </div>
              <div className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/20 flex justify-between items-center transition-all hover:bg-emerald-900/30">
                <span className="text-emerald-400/80 text-sm">Verified on Chain</span>
                <span className="text-2xl font-bold text-emerald-400">{stats.verified}</span>
              </div>
              <div className="bg-rose-900/20 p-4 rounded-xl border border-rose-500/20 flex justify-between items-center transition-all hover:bg-rose-900/30">
                <span className="text-rose-400/80 text-sm">Blocked Attempts</span>
                <span className="text-2xl font-bold text-rose-400">{stats.blocked}</span>
              </div>
            </div>
          </div>

          {/* Admin Panel */}
          <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl p-6 border border-gray-800 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-100">
              <Key className="w-5 h-5 mr-2 text-amber-400" />
              Admin Control
            </h2>
            <p className="text-xs text-gray-400 mb-4">Whitelist a new IoT device by its ID directly on the blockchain.</p>
            <form onSubmit={handleAuthorize} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Device ID (e.g. ESP32_01)"
                  value={adminDeviceId}
                  onChange={(e) => setAdminDeviceId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-gray-200 placeholder-gray-600"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAuthorizing || !contract}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
              >
                {isAuthorizing ? 'Authorizing...' : 'Authorize Device'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Content - Live Security Feed */}
        <div className="lg:col-span-3">
          <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800 shadow-xl overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/80">
              <h2 className="text-lg font-semibold flex items-center text-gray-100">
                <Database className="w-5 h-5 mr-2 text-indigo-400" />
                Live Security Feed
              </h2>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 bg-gray-950/50 uppercase border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Device ID</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Data (Temp)</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Hash (Truncated)</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                    <th className="px-6 py-4 font-medium tracking-wider text-right">Integrity Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Activity className="w-10 h-10 text-gray-700" />
                          <p>Waiting for sensor logs...</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/30 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-mono text-xs">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-300">
                          {log.deviceId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-gray-800 text-gray-300 py-1 px-2 rounded font-mono">
                            {log.temp}°C
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500" title={log.hash}>
                          {log.hash ? `${log.hash.substring(0, 10)}...` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.status === 'Verified' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="w-3 h-3 mr-1" /> Verified
                            </span>
                          ) : log.status === 'Pending' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Activity className="w-3 h-3 mr-1 animate-spin" /> Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3 h-3 mr-1" /> Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {tamperAlerts[idx] === 'verified' ? (
                            <span className="inline-flex items-center text-emerald-400 text-xs font-medium">
                              <CheckCircle className="w-4 h-4 mr-1" /> Match
                            </span>
                          ) : tamperAlerts[idx] === 'tampered' ? (
                            <span className="inline-flex items-center text-rose-500 text-xs font-bold animate-pulse">
                              <AlertTriangle className="w-4 h-4 mr-1" /> TAMPER ALERT
                            </span>
                          ) : tamperAlerts[idx] === 'error' ? (
                            <span className="text-gray-500 text-xs">Error</span>
                          ) : (
                            <button
                              onClick={() => handleIntegrityCheck(log.deviceId, log.hash, idx)}
                              className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
