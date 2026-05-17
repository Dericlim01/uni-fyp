import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ethers } from 'ethers';
import { Shield, ShieldAlert, Activity, Database, Key, CheckCircle, XCircle, AlertTriangle, Search, Filter } from 'lucide-react';
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
  const [isAuditing, setIsAuditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterDevice, setFilterDevice] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Derived: filtered view of logs
  const filteredLogs = logs.filter(log => {
    const matchDevice = filterDevice === '' || (log.deviceId || '').toLowerCase().includes(filterDevice.toLowerCase());
    const matchStatus = filterStatus === 'All' || log.status === filterStatus;
    return matchDevice && matchStatus;
  });

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
      setLogs((prev) => [log, ...prev]);
      setCurrentPage(1); // jump to newest on incoming log
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
    });

    // Receive accurate stats from the gateway (counts from full database)
    socket.on('statsUpdate', (newStats) => {
      setStats(newStats);
    });

    // Listen for batch integrity audit results
    socket.on('verifyAllResults', (results) => {
      const alertMap = {};
      results.forEach(r => { alertMap[r.logId] = r.status; });
      setTamperAlerts(prev => ({ ...prev, ...alertMap }));
      setIsAuditing(false);
    });

    return () => {
      socket.off('newLog');
      socket.off('initialLogs');
      socket.off('statsUpdate');
      socket.off('verifyAllResults');
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

  const handleVerifyAll = () => {
    setIsAuditing(true);
    setTamperAlerts({});
    socket.emit('verifyAll');
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

          {/* Database Integrity Audit */}
          <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl p-6 border border-gray-800 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-100">
              <ShieldAlert className="w-5 h-5 mr-2 text-indigo-400" />
              Database Audit
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Verify all MongoDB records by recomputing their SHA-256 hashes. Detects if data was manually tampered in the database.
            </p>
            <button
              onClick={handleVerifyAll}
              disabled={isAuditing}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              {isAuditing ? 'Auditing...' : 'Verify All Records'}
            </button>
            {Object.keys(tamperAlerts).length > 0 && (
              <div className="mt-4 p-3 rounded-lg border text-xs font-medium" style={{
                background: Object.values(tamperAlerts).some(v => v === 'tampered')
                  ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                borderColor: Object.values(tamperAlerts).some(v => v === 'tampered')
                  ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                color: Object.values(tamperAlerts).some(v => v === 'tampered')
                  ? '#fb7185' : '#6ee7b7'
              }}>
                {Object.values(tamperAlerts).filter(v => v === 'tampered').length > 0
                  ? `🚨 ${Object.values(tamperAlerts).filter(v => v === 'tampered').length} tampered record(s) found!`
                  : `✅ All ${Object.values(tamperAlerts).length} records verified — no tampering detected.`
                }
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Live Security Feed */}
        <div className="lg:col-span-3">
          <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/80">
              <h2 className="text-lg font-semibold flex items-center text-gray-100">
                <Database className="w-5 h-5 mr-2 text-indigo-400" />
                Live Security Feed
              </h2>
              <div className="flex items-center space-x-3">
                {/* Live indicator */}
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                {/* Page-size selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Rows:</span>
                  <select
                    id="page-size-select"
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="px-6 py-3 border-b border-gray-800 bg-gray-950/40 flex flex-wrap gap-3 items-center">
              {/* Device search */}
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                <input
                  id="filter-device-input"
                  type="text"
                  placeholder="Search device ID…"
                  value={filterDevice}
                  onChange={e => { setFilterDevice(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                />
                {filterDevice && (
                  <button
                    onClick={() => { setFilterDevice(''); setCurrentPage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label="Clear device filter"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status pills */}
              <div className="flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-gray-500 mr-1" />
                {['All', 'Verified', 'Pending', 'Rejected/Unauthorized', 'Rejected/Tampered'].map(status => {
                  const active = filterStatus === status;
                  const colorMap = {
                    All: active ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'border-gray-700 text-gray-400 hover:bg-gray-700/50',
                    Verified: active ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-gray-700 text-gray-400 hover:bg-gray-700/50',
                    Pending: active ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'border-gray-700 text-gray-400 hover:bg-gray-700/50',
                    'Rejected/Unauthorized': active ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' : 'border-gray-700 text-gray-400 hover:bg-gray-700/50',
                    'Rejected/Tampered': active ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'border-gray-700 text-gray-400 hover:bg-gray-700/50',
                  };
                  return (
                    <button
                      key={status}
                      id={`filter-status-${status.toLowerCase()}`}
                      onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${colorMap[status]}`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>

              {/* Active filter summary */}
              {(filterDevice || filterStatus !== 'All') && (
                <span className="text-xs text-gray-500 ml-auto">
                  {filteredLogs.length} result{filteredLogs.length !== 1 ? 's' : ''}
                  <button
                    onClick={() => { setFilterDevice(''); setFilterStatus('All'); setCurrentPage(1); }}
                    className="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors underline"
                  >
                    Clear all
                  </button>
                </span>
              )}
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
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Filter className="w-10 h-10 text-gray-700" />
                          <p>No logs match the current filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
                      const safePage = Math.min(currentPage, totalPages);
                      const pageStart = (safePage - 1) * pageSize;
                      const pageLogs = filteredLogs.slice(pageStart, pageStart + pageSize);
                      return pageLogs.map((log, relIdx) => {
                        const globalIdx = pageStart + relIdx;
                        const alertKey = log._id || globalIdx;
                        return (
                          <tr key={log._id || globalIdx} className="hover:bg-gray-800/30 transition-colors group">
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
                              ) : log.status === 'Rejected/Tampered' ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Tampered
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  <XCircle className="w-3 h-3 mr-1" /> Rejected
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {tamperAlerts[alertKey] === 'verified' ? (
                                <span className="inline-flex items-center text-emerald-400 text-xs font-medium">
                                  <CheckCircle className="w-4 h-4 mr-1" /> Match
                                </span>
                              ) : tamperAlerts[alertKey] === 'tampered' ? (
                                <span className="inline-flex items-center text-rose-500 text-xs font-bold animate-pulse">
                                  <AlertTriangle className="w-4 h-4 mr-1" /> TAMPER ALERT
                                </span>
                              ) : tamperAlerts[alertKey] === 'error' ? (
                                <span className="text-gray-500 text-xs">Error</span>
                              ) : (
                                <button
                                  onClick={() => handleIntegrityCheck(log.deviceId, log.hash, alertKey)}
                                  className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                  Verify
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredLogs.length > 0 && (() => {
              const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
              const safePage = Math.min(currentPage, totalPages);
              const pageStart = (safePage - 1) * pageSize;
              return (
                <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/80 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Showing <span className="text-gray-300 font-medium">{pageStart + 1}</span>–<span className="text-gray-300 font-medium">{Math.min(pageStart + pageSize, filteredLogs.length)}</span> of <span className="text-gray-300 font-medium">{filteredLogs.length}</span> {filterDevice || filterStatus !== 'All' ? 'filtered' : ''} entries
                  </p>
                  <div className="flex items-center space-x-1">
                    <button
                      id="pagination-first"
                      onClick={() => setCurrentPage(1)}
                      disabled={safePage === 1}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="First page"
                    >
                      «
                    </button>
                    <button
                      id="pagination-prev"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      ‹ Prev
                    </button>

                    {/* Page number pills */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, i) =>
                        item === '...' ? (
                          <span key={`ellipsis-${i}`} className="px-2 text-gray-600 text-xs">…</span>
                        ) : (
                          <button
                            key={item}
                            id={`pagination-page-${item}`}
                            onClick={() => setCurrentPage(item)}
                            className={`w-8 h-8 rounded-lg text-xs font-medium border transition-all ${item === safePage
                              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                              : 'border-gray-700 text-gray-400 hover:bg-gray-700/50'
                              }`}
                          >
                            {item}
                          </button>
                        )
                      )
                    }

                    <button
                      id="pagination-next"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Next ›
                    </button>
                    <button
                      id="pagination-last"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={safePage === totalPages}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Last page"
                    >
                      »
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
