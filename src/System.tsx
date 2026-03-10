import React, { useState, useEffect } from 'react';
import { 
  Database as DbIcon, 
  Search, 
  BarChart3, 
  Settings, 
  Plus, 
  RefreshCw, 
  FileText, 
  Info,
  ChevronRight,
  Lock,
  Unlock,
  AlertCircle,
  Dna,
  Activity,
  Layers,
  Hash,
  Zap,
  Cpu,
  Terminal,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseInfo, SequenceRecord, TaxonomyStats, OverviewStats } from './types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { geminiService } from './services/geminiService';

const COLORS = ['#141414', '#2D2D2D', '#464646', '#5F5F5F', '#787878', '#919191', '#AAAAAA', '#C3C3C3'];

const RANK_TRANSLATIONS: Record<string, string> = {
  'LEVEL_0': 'LEVEL_0',
  'Domain': 'Domain (域)',
  'Kingdom': 'Kingdom (界)',
  'Phylum': 'Phylum (门)',
  'Class': 'Class (纲)',
  'Order': 'Order (目)',
  'Family': 'Family (科)',
  'Genus': 'Genus (属)',
  'Species': 'Species (种)',
};

export default function FdbcsSystem() {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [activeDb, setActiveDb] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'search' | 'stats' | 'overview' | 'operations'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SequenceRecord[]>([]);
  const [stats, setStats] = useState<TaxonomyStats | null>(null);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [allSequences, setAllSequences] = useState<{accession: string, taxonomy: string}[]>([]);
  const [showTaxaModal, setShowTaxaModal] = useState(false);
  const [showSeqModal, setShowSeqModal] = useState(false);
  const [seqPage, setSeqPage] = useState(1);
  const [paginatedSeqs, setPaginatedSeqs] = useState<{accession: string, taxonomy: string}[]>([]);
  const [loadingSeqs, setLoadingSeqs] = useState(false);
  const seqsPerPage = 50;
  const [selectedRankForList, setSelectedRankForList] = useState<string | null>(null);
  const [opResult, setOpResult] = useState<any>(null);
  const [opLoading, setOpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSeq, setSelectedSeq] = useState<{header: string, sequence: string, taxonomy?: string} | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  useEffect(() => {
    fetchDatabases();
  }, []);

  useEffect(() => {
    if (showSeqModal && activeDb) {
      fetchPaginatedSeqs(seqPage);
    }
  }, [showSeqModal, seqPage, activeDb]);

  const fetchPaginatedSeqs = async (page: number) => {
    setLoadingSeqs(true);
    try {
      const offset = (page - 1) * seqsPerPage;
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dbName: activeDb, 
          query: `SELECT accession, taxonomy FROM sequences LIMIT ${seqsPerPage} OFFSET ${offset}` 
        })
      });
      const data = await res.json();
      if (!data.error) {
        setPaginatedSeqs(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingSeqs(false);
  };

  const fetchDatabases = async (retries = 3) => {
    try {
      const res = await fetch('/api/databases');
      if (!res.ok) throw new Error('Failed to fetch databases');
      const data = await res.json();
      setDatabases(data);
    } catch (err) {
      console.error(err);
      if (retries > 0) {
        setTimeout(() => fetchDatabases(retries - 1), 2000);
      }
    }
  };

  const loadDatabase = async (name: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/databases/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        await fetchDatabases();
        setActiveDb(name);
      } else {
        const data = await res.json();
        console.error(data.error);
        alert(`Failed to load database: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!activeDb || !searchQuery) return;
    setLoading(true);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbName: activeDb,
          query: "SELECT * FROM sequences WHERE accession LIKE ? OR taxonomy LIKE ? OR header LIKE ? LIMIT 50",
          params: [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
        })
      });
      const data = await res.json();
      if (data.error) {
        console.error(data.error);
        setSearchResults([]);
      } else {
        setSearchResults(data);
      }
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (dbName: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbName,
          query: "SELECT value FROM stats WHERE key = 'taxonomy'"
        })
      });
      const data = await res.json();
      if (data.error || data.length === 0) {
        console.error(data.error || "Taxonomy stats not found");
        setStats(null);
      } else {
        setStats(JSON.parse(data[0].value));
      }
    } catch (err) {
      console.error(err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async (dbName: string) => {
    setLoading(true);
    try {
      const [overviewRes, allSeqRes, statsRes] = await Promise.all([
        fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbName, query: "SELECT value FROM stats WHERE key = 'overview'" })
        }),
        fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbName, query: "SELECT accession, taxonomy FROM sequences LIMIT 500" })
        }),
        fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbName, query: "SELECT value FROM stats WHERE key = 'taxonomy'" })
        })
      ]);
      const overviewData = await overviewRes.json();
      const allSeqData = await allSeqRes.json();
      const statsData = await statsRes.json();
      
      if (!overviewData.error && overviewData.length > 0) {
        setOverviewStats(JSON.parse(overviewData[0].value));
      } else {
        setOverviewStats(null);
      }
      
      if (!allSeqData.error) {
        setAllSequences(allSeqData);
      } else {
        setAllSequences([]);
      }
      
      if (!statsData.error && statsData.length > 0) {
        setStats(JSON.parse(statsData[0].value));
      } else {
        setStats(null);
      }
    } catch (err) {
      console.error(err);
      setOverviewStats(null);
      setAllSequences([]);
      setStats(null);
    }
    setLoading(false);
  };

  const fetchSequence = async (accession: string) => {
    setLoading(true);
    try {
      const dbRes = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbName: activeDb,
          query: "SELECT offset, taxonomy FROM sequences WHERE accession = ?",
          params: [accession]
        })
      });
      const dbData = await dbRes.json();
      
      if (dbData.error || dbData.length === 0) {
        console.error(dbData.error || "Sequence not found");
        setSelectedSeq(null);
      } else {
        const seqInfo = dbData[0];
        
        const fastaRes = await fetch('/api/read_fasta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dbName: activeDb,
            offset: seqInfo.offset
          })
        });
        const fastaData = await fastaRes.json();
        
        if (fastaData.error) {
          console.error(fastaData.error);
          setSelectedSeq(null);
        } else {
          // Use taxonomy from response, fallback to search results or all sequences
          const taxonomy = seqInfo.taxonomy || searchResults.find(r => r.accession === accession)?.taxonomy || 
                           allSequences.find(s => s.accession === accession)?.taxonomy;
          setSelectedSeq({ ...fastaData, taxonomy });
        }
      }
    } catch (err) {
      console.error(err);
      setSelectedSeq(null);
    }
    setAiAnalysis(null);
    setLoading(false);
  };

  const analyzeWithAI = async () => {
    if (!selectedSeq?.taxonomy) return;
    setLoading(true);
    try {
      const result = await geminiService.analyzeTaxonomy(selectedSeq.taxonomy);
      setAiAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runOperation = async (type: string) => {
    if (!activeDb) return;
    setOpLoading(true);
    setOpResult(null);
    try {
      const res = await fetch('/api/operations/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName: activeDb, type })
      });
      const data = await res.json();
      setOpResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setOpLoading(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="flex h-screen bg-[#E4E3E0] text-[#141414] font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#141414] flex flex-col bg-[#E4E3E0]">
        <div className="p-6 border-bottom border-[#141414]">
          <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
            <Dna className="w-8 h-8" />
            FDBCS 系统
          </h1>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Fasta Database Control System</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${view === 'dashboard' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
          >
            <DbIcon size={18} />
            <span className="text-sm font-medium">数据库管理</span>
          </button>
          <button 
            onClick={() => { setView('overview'); if (activeDb) fetchOverview(activeDb); }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${view === 'overview' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
            disabled={!activeDb}
          >
            <Activity size={18} />
            <span className="text-sm font-medium">库总览</span>
          </button>
          <button 
            onClick={() => { setView('search'); if (activeDb) handleSearch(); }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${view === 'search' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
            disabled={!activeDb}
          >
            <Search size={18} />
            <span className="text-sm font-medium">序列检索</span>
          </button>
          <button 
            onClick={() => { setView('stats'); if (activeDb) fetchStats(activeDb); }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${view === 'stats' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
            disabled={!activeDb}
          >
            <BarChart3 size={18} />
            <span className="text-sm font-medium">统计报表</span>
          </button>
          <button 
            onClick={() => { setView('operations'); }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${view === 'operations' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
            disabled={!activeDb}
          >
            <Cpu size={18} />
            <span className="text-sm font-medium">操作单元</span>
          </button>
        </nav>

        <div className="p-4 border-t border-[#141414]">
          <div className="bg-[#141414]/5 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">当前上下文</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold truncate">{activeDb || '未选择'}</span>
              {activeDb ? <Lock size={12} className="text-emerald-600" /> : <Unlock size={12} className="opacity-30" />}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-serif italic tracking-tight">数据库清单</h2>
                  <p className="text-sm opacity-60 mt-2">管理并索引您的 eDNA 参考序列库。</p>
                </div>
                <button 
                  onClick={fetchDatabases}
                  className="p-2 hover:bg-[#141414]/5 rounded-full transition-all"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {databases.map((db) => (
                  <div 
                    key={db.name}
                    className={`group relative bg-white border border-[#141414] rounded-2xl p-6 transition-all hover:shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] ${activeDb === db.name ? 'ring-2 ring-emerald-500' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-[#141414] text-[#E4E3E0] rounded-xl">
                        <DbIcon size={24} />
                      </div>
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-[#141414] ${db.status === 'ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {db.status === 'ready' ? '就绪' : (db.status === 'pending' ? '待处理' : '不完整')}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{db.name}</h3>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-xs opacity-60">
                        <FileText size={14} />
                        <span>FASTA: {db.hasFasta ? '已检测到' : '缺失'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs opacity-60">
                        <Info size={14} />
                        <span>元数据: {db.hasMetadata ? '已检测到' : '缺失'}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {db.status === 'ready' ? (
                        <>
                          <button 
                            onClick={() => setActiveDb(db.name)}
                            className="flex-[2] bg-[#141414] text-[#E4E3E0] py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all"
                          >
                            使用该库
                          </button>
                          <button 
                            onClick={() => loadDatabase(db.name)}
                            title="重新初始化索引"
                            className="flex-1 border border-[#141414] text-[#141414] py-2 rounded-lg text-sm font-bold hover:bg-[#141414]/5 transition-all flex items-center justify-center gap-2"
                          >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            <span className="hidden group-hover:inline">重置</span>
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => loadDatabase(db.name)}
                          disabled={loading || !db.hasFasta}
                          className="flex-1 bg-[#141414] text-[#E4E3E0] py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all disabled:opacity-30"
                        >
                          {loading ? '正在索引...' : '初始化索引'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {databases.length === 0 && (
                  <div className="col-span-full py-20 border-2 border-dashed border-[#141414]/20 rounded-3xl flex flex-col items-center justify-center text-center">
                    <AlertCircle size={48} className="opacity-20 mb-4" />
                    <h3 className="text-xl font-bold opacity-40">未找到数据库</h3>
                    <p className="text-sm opacity-40 max-w-xs mt-2">
                      请将您的 <code className="bg-[#141414]/5 px-1 rounded">db.fa</code> 和 <code className="bg-[#141414]/5 px-1 rounded">Metadata.txt</code> 放入 <code className="bg-[#141414]/5 px-1 rounded">data/</code> 目录下的子文件夹中。
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'overview' && !overviewStats && !loading && (
            <motion.div 
              key="overview-empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-4"
            >
              <AlertCircle size={48} className="opacity-20" />
              <h2 className="text-2xl font-bold opacity-60">无法加载数据总览</h2>
              <p className="text-sm opacity-50 max-w-md">
                数据库可能尚未完全初始化，或者索引文件已损坏。请返回“数据库管理”页面重新初始化索引。
              </p>
              <button 
                onClick={() => setView('dashboard')}
                className="mt-4 bg-[#141414] text-[#E4E3E0] px-6 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
              >
                返回数据库管理
              </button>
            </motion.div>
          )}

          {view === 'overview' && overviewStats && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-serif italic tracking-tight">数据库总览</h2>
                  <p className="text-sm opacity-60 mt-2">当前活跃数据库的关键指标与统计摘要。</p>
                </div>
                <button 
                  onClick={() => fetchOverview(activeDb!)}
                  className="p-2 hover:bg-[#141414]/5 rounded-full transition-all"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div 
                  onClick={() => setShowSeqModal(true)}
                  className="bg-white border border-[#141414] rounded-2xl p-6 shadow-sm cursor-pointer hover:border-indigo-500 transition-all group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-all">
                      <Hash size={24} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">序列总数</h3>
                  </div>
                  <div className="flex items-end justify-between border-t border-[#141414]/10 pt-4">
                    <p className="text-4xl font-mono font-bold">{overviewStats.totalSequences.toLocaleString()}</p>
                    <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </div>

                <div 
                  onClick={() => { setShowTaxaModal(true); }}
                  className="bg-white border border-[#141414] rounded-2xl p-6 shadow-sm cursor-pointer hover:border-emerald-500 transition-all group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <Layers size={24} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">物种 (Species)</h3>
                  </div>
                  
                  <div className="space-y-1 mb-4">
                    {stats && Object.entries(stats).sort((a, b) => {
                      const ranks = Object.keys(RANK_TRANSLATIONS);
                      return ranks.indexOf(a[0]) - ranks.indexOf(b[0]);
                    }).slice(0, 4).map(([rank, data]) => (
                      <div key={rank} className="flex justify-between items-center text-[10px] uppercase tracking-widest opacity-60">
                        <span>{RANK_TRANSLATIONS[rank] || rank}</span>
                        <span className="font-mono font-bold">{Object.keys(data).length}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-end justify-between border-t border-[#141414]/10 pt-4">
                    <p className="text-4xl font-mono font-bold">{overviewStats.uniqueTaxonomies.toLocaleString()}</p>
                    <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </div>

                <div className="bg-white border border-[#141414] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                      <Zap size={24} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">总碱基数 (bp)</h3>
                  </div>
                  <p className="text-4xl font-mono font-bold">{overviewStats.totalBasePairs.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-6">
                  <div className="bg-white border border-[#141414] rounded-3xl p-8">
                    <h3 className="text-xl font-bold mb-6">序列长度分布摘要</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-widest opacity-50">平均长度</p>
                        <p className="text-2xl font-mono font-bold">{Math.round(overviewStats.avgLength)} bp</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-widest opacity-50">最大长度</p>
                        <p className="text-2xl font-mono font-bold">{overviewStats.maxLength} bp</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-widest opacity-50">最小长度</p>
                        <p className="text-2xl font-mono font-bold">{overviewStats.minLength} bp</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#141414] text-[#E4E3E0] rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                        <DbIcon size={32} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{activeDb}</h3>
                        <p className="text-sm opacity-60">数据库已就绪，索引状态正常。</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => loadDatabase(activeDb!)}
                        className="border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                      >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        重新初始化
                      </button>
                      <button 
                        onClick={() => setView('search')}
                        className="bg-white text-[#141414] px-8 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all"
                      >
                        进入检索模块
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Taxonomy Breakdown Modal */}
              <AnimatePresence>
                {showTaxaModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => { setShowTaxaModal(false); setSelectedRankForList(null); }}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="relative bg-white border border-[#141414] rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                    >
                      <div className="p-6 border-bottom border-[#141414]/10 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          {selectedRankForList && (
                            <button onClick={() => setSelectedRankForList(null)} className="p-2 hover:bg-[#141414]/5 rounded-full transition-all">
                              <ChevronRight size={24} className="rotate-180" />
                            </button>
                          )}
                          <h3 className="text-2xl font-bold">
                            {selectedRankForList ? `${RANK_TRANSLATIONS[selectedRankForList] || selectedRankForList} 列表` : '分类层级分布'}
                          </h3>
                        </div>
                        <button onClick={() => { setShowTaxaModal(false); setSelectedRankForList(null); }} className="p-2 hover:bg-[#141414]/5 rounded-full transition-all">
                          <Plus size={24} className="rotate-45" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6">
                        {!selectedRankForList ? (
                          <div className="space-y-8">
                            {stats && Object.entries(stats).sort((a, b) => {
                              const ranks = Object.keys(RANK_TRANSLATIONS);
                              return ranks.indexOf(a[0]) - ranks.indexOf(b[0]);
                            }).map(([rank, data]) => {
                              const rankName = RANK_TRANSLATIONS[rank] || rank;
                              const uniqueCount = Object.keys(data).length;
                              
                              return (
                                <div key={rank} className="group">
                                  <div 
                                    onClick={() => setSelectedRankForList(rank)}
                                    className="flex items-center justify-between cursor-pointer hover:bg-[#141414]/5 p-2 -mx-2 rounded-xl transition-all"
                                  >
                                    <h4 className="text-xs font-bold uppercase tracking-widest opacity-50">{rankName}</h4>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg">
                                        {uniqueCount} 个独特单元
                                      </span>
                                      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                  </div>
                                  <div className="mt-4 space-y-2">
                                    {Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => (
                                      <div key={name} className="flex items-center justify-between p-3 bg-[#141414]/5 rounded-xl text-sm">
                                        <span className="font-medium">{name}</span>
                                        <span className="font-mono font-bold text-emerald-600">{count} 条</span>
                                      </div>
                                    ))}
                                    {uniqueCount > 3 && (
                                      <button 
                                        onClick={() => setSelectedRankForList(rank)}
                                        className="w-full text-center text-xs font-bold py-2 opacity-40 hover:opacity-100 transition-all"
                                      >
                                        查看全部 {uniqueCount} 个单元...
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {stats && selectedRankForList && stats[selectedRankForList] && 
                              Object.entries(stats[selectedRankForList])
                                .sort((a, b) => (b[1] as number) - (a[1] as number))
                                .map(([name, count]) => (
                              <div key={name} className="flex items-center justify-between p-4 bg-[#141414]/5 rounded-2xl">
                                <span className="font-bold">{name}</span>
                                <span className="font-mono font-bold text-emerald-600">{count} 条</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Sequence List Modal */}
              <AnimatePresence>
                {showSeqModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowSeqModal(false)}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="relative bg-white border border-[#141414] rounded-3xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                    >
                      <div className="p-6 border-bottom border-[#141414]/10 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Hash size={24} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold">序列列表</h3>
                            <p className="text-sm opacity-60">共 {overviewStats.totalSequences.toLocaleString()} 条序列</p>
                          </div>
                        </div>
                        <button onClick={() => setShowSeqModal(false)} className="p-2 hover:bg-[#141414]/5 rounded-full transition-all">
                          <Plus size={24} className="rotate-45" />
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6">
                        {loadingSeqs ? (
                          <div className="flex justify-center items-center h-full">
                            <RefreshCw size={32} className="animate-spin opacity-50" />
                          </div>
                        ) : (
                          <div className="space-y-2 font-mono text-xs">
                            <div className="grid grid-cols-3 pb-2 border-bottom border-[#141414]/10 opacity-50 font-bold uppercase">
                              <span>Accession</span>
                              <span className="col-span-2">Taxonomy</span>
                            </div>
                            {paginatedSeqs.map((seq, i) => (
                              <div key={i} className="grid grid-cols-3 py-2 border-bottom border-[#141414]/5 hover:bg-[#141414]/5 transition-all">
                                <span className="font-bold">{seq.accession}</span>
                                <span className="col-span-2 opacity-70 truncate" title={seq.taxonomy}>{seq.taxonomy}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-4 border-t border-[#141414]/10 flex justify-between items-center bg-[#141414]/5">
                        <button 
                          onClick={() => setSeqPage(p => Math.max(1, p - 1))}
                          disabled={seqPage === 1 || loadingSeqs}
                          className="px-4 py-2 bg-white border border-[#141414] rounded-lg text-sm font-bold disabled:opacity-50 transition-all"
                        >
                          上一页
                        </button>
                        <span className="text-sm font-mono font-bold">
                          第 {seqPage} 页 / 共 {Math.ceil(overviewStats.totalSequences / seqsPerPage)} 页
                        </span>
                        <button 
                          onClick={() => setSeqPage(p => p + 1)}
                          disabled={seqPage >= Math.ceil(overviewStats.totalSequences / seqsPerPage) || loadingSeqs}
                          className="px-4 py-2 bg-white border border-[#141414] rounded-lg text-sm font-bold disabled:opacity-50 transition-all"
                        >
                          下一页
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {view === 'operations' && (
            <motion.div 
              key="operations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-4xl font-serif italic tracking-tight">数据库操作单元</h2>
                <p className="text-sm opacity-60 mt-2">对当前数据库执行高级生物信息学分析与数据处理。</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-[#141414] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                      <Zap size={20} />
                    </div>
                    <h3 className="font-bold">碱基组成分析</h3>
                  </div>
                  <p className="text-sm opacity-60">计算全库序列的 GC 含量、AT/GC 比例及碱基分布频率。</p>
                  <button 
                    onClick={() => runOperation('nucleotide_composition')}
                    disabled={opLoading}
                    className="w-full bg-[#141414] text-[#E4E3E0] py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {opLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                    开始分析
                  </button>
                </div>

                <div className="bg-white border border-[#141414] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                      <Layers size={20} />
                    </div>
                    <h3 className="font-bold">分类一致性检查</h3>
                  </div>
                  <p className="text-sm opacity-60">检测元数据中的分类路径是否存在逻辑错误或层级缺失。</p>
                  <button 
                    onClick={() => runOperation('taxonomy_audit')}
                    disabled={opLoading}
                    className="w-full bg-[#141414] text-[#E4E3E0] py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {opLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                    开始检查
                  </button>
                </div>
              </div>

              {opResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#141414] text-[#E4E3E0] rounded-2xl p-8 shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Terminal size={20} />
                      分析结果输出
                    </h3>
                    <button 
                      onClick={() => setOpResult(null)}
                      className="text-xs opacity-50 hover:opacity-100 transition-all"
                    >
                      清除结果
                    </button>
                  </div>
                  
                  <div className="bg-[#1D1D1D] rounded-xl p-6 font-mono text-sm overflow-auto max-h-[400px]">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(opResult, null, 2)}
                    </pre>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {view === 'search' && (
            <motion.div 
              key="search"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={20} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="通过 Accession、分类信息或 Header 搜索..."
                    className="w-full bg-white border border-[#141414] rounded-2xl py-4 pl-12 pr-4 text-lg focus:outline-none focus:ring-2 ring-emerald-500 transition-all"
                  />
                </div>
                <button 
                  onClick={handleSearch}
                  className="bg-[#141414] text-[#E4E3E0] px-8 py-4 rounded-2xl font-bold hover:opacity-90 transition-all"
                >
                  搜索
                </button>
              </div>

              <div className="bg-white border border-[#141414] rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#141414]/5 border-b border-[#141414]">
                      <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">编号 (Accession)</th>
                      <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">分类信息 (Taxonomy)</th>
                      <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((res) => (
                      <tr key={res.accession} className="border-b border-[#141414]/10 hover:bg-[#141414]/5 transition-all group">
                        <td className="p-4 font-mono text-sm">{res.accession}</td>
                        <td className="p-4 text-sm opacity-80 max-w-md truncate">{res.taxonomy}</td>
                        <td className="p-4">
                          <button 
                            onClick={() => fetchSequence(res.accession)}
                            className="p-2 hover:bg-[#141414] hover:text-[#E4E3E0] rounded-lg transition-all"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {searchResults.length === 0 && !loading && (
                      <tr>
                        <td colSpan={3} className="p-12 text-center opacity-40">未找到结果。</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {view === 'stats' && stats && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-serif italic tracking-tight">分类阶元分布</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEVEL_0 Distribution */}
                <div className="bg-white border border-[#141414] rounded-3xl p-8">
                  <h3 className="text-xl font-bold mb-6">主要类群 (LEVEL_0)</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(stats['LEVEL_0'] || {}).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {Object.entries(stats['LEVEL_0'] || {}).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Phylum Distribution */}
                <div className="bg-white border border-[#141414] rounded-3xl p-8">
                  <h3 className="text-xl font-bold mb-6">子类群 (Phylum)</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(stats['Phylum'] || {}).slice(0, 8).map(([name, value]) => ({ name, value }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14141420" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <Tooltip cursor={{ fill: '#14141405' }} />
                        <Bar dataKey="value" fill="#141414" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Raw Stats Table */}
              <div className="bg-white border border-[#141414] rounded-3xl p-8">
                <h3 className="text-xl font-bold mb-6">详细统计</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(stats).sort((a, b) => {
                    const ranks = Object.keys(RANK_TRANSLATIONS);
                    return ranks.indexOf(a[0]) - ranks.indexOf(b[0]);
                  }).map(([rank, data]) => (
                    <div key={rank} className="p-4 border border-[#141414]/10 rounded-2xl">
                      <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">{RANK_TRANSLATIONS[rank] || rank}</p>
                      <div className="space-y-2">
                        {Object.entries(data).slice(0, 5).map(([name, count]) => (
                          <div key={name} className="flex justify-between items-center text-xs">
                            <span className="truncate max-w-[120px] font-medium">{name}</span>
                            <span className="font-mono opacity-60">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sequence Detail Modal */}
      <AnimatePresence>
        {selectedSeq && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-[#141414]/40 backdrop-blur-sm"
            onClick={() => setSelectedSeq(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-[#141414] rounded-3xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-[#141414] text-[#E4E3E0]">
                <h3 className="text-xl font-bold truncate pr-8">{selectedSeq.header}</h3>
                <button 
                  onClick={() => setSelectedSeq(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-8 bg-[#141414]/5 space-y-6">
                <div className="bg-white border border-[#141414] rounded-2xl p-6 font-mono text-sm break-all leading-relaxed shadow-inner">
                  {selectedSeq.sequence}
                </div>

                {selectedSeq.taxonomy && (
                  <div className="bg-white border border-[#141414] rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest opacity-50">分类信息</h4>
                      <button 
                        onClick={analyzeWithAI}
                        className="text-xs bg-[#141414] text-[#E4E3E0] px-3 py-1 rounded-lg font-bold hover:opacity-80 transition-all flex items-center gap-2"
                      >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        AI 智能分析
                      </button>
                    </div>
                    <p className="text-sm italic font-serif">{selectedSeq.taxonomy}</p>
                    
                    {aiAnalysis && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 leading-relaxed"
                      >
                        <div className="font-bold mb-1 flex items-center gap-2">
                          <Info size={14} />
                          AI 分析结果
                        </div>
                        {aiAnalysis}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-[#141414] bg-[#E4E3E0] flex justify-between items-center">
                <span className="text-xs font-bold opacity-50 uppercase tracking-widest">长度: {selectedSeq.sequence.length} bp</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`>${selectedSeq.header}\n${selectedSeq.sequence}`);
                  }}
                  className="bg-[#141414] text-[#E4E3E0] px-6 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                >
                  复制 FASTA
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#E4E3E0]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#141414] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold uppercase tracking-widest">正在处理...</p>
          </div>
        </div>
      )}
    </div>
  );
}
