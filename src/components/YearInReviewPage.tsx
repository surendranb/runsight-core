// src/components/YearInReviewPage.tsx
import React, { useMemo, useState, useRef } from 'react';
import { User, EnrichedRun } from '../types';
import { Section, Heading } from './common/VisualHierarchy';
import html2canvas from 'html2canvas';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, ComposedChart, Cell
} from 'recharts';
import { 
  Calendar as CalendarIcon, Activity, Heart, Zap, Mountain, 
  Timer as TimerIcon, CheckCircle, Clock, TrendingUp, BatteryCharging,
  ArrowUpRight, ArrowDownRight, Trophy, Download
} from 'lucide-react';

interface YearInReviewPageProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
}

const YEAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const ZONE_COLORS = {
  Z1: '#94a3b8', Z2: '#3b82f6', Z3: '#10b981', Z4: '#f59e0b', Z5: '#ef4444',
};

const DIST_COLORS = {
  sub5: '#94a3b8', d5_6: '#64748b', d6_7: '#475569', d7_8: '#334155',
  d8_9: '#1e293b', d9_10: '#0f172a', d10_15: '#3b82f6', d15_20: '#10b981', over20: '#f59e0b',
};

export const YearInReviewPage: React.FC<YearInReviewPageProps> = ({ user, runs, isLoading, error }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedYears, setSelectedYears] = useState<number[]>([2025, 2024, 2023]);
  const [isCapturing, setIsCapturing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    runs.forEach(run => years.add(new Date(run.start_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [runs, currentYear]);

  const toggleYear = (year: number) => {
    setSelectedYears(prev => prev.includes(year) 
      ? (prev.length > 1 ? prev.filter(y => y !== year) : prev) 
      : [...prev, year].sort((a, b) => b - a)
    );
  };

  const handleShare = async () => {
    if (!captureRef.current) return;
    setIsCapturing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb',
        onclone: (doc) => {
          const els = doc.querySelectorAll('.share-hidden');
          els.forEach(el => (el as HTMLElement).style.display = 'none');
        }
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `RunSight-YearInReview.png`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCapturing(false);
    }
  };

  const getYearColor = (year: number) => {
    const index = availableYears.indexOf(year);
    return YEAR_COLORS[index % YEAR_COLORS.length];
  };

  const processed = useMemo(() => {
    const months = Array(12).fill(0).map((_, i) => ({
      name: new Date(0, i).toLocaleString('default', { month: 'short' }),
      index: i
    }));

    const zonesByYear: Record<number, any> = {};
    const distMixByYear: Record<number, any> = {};
    const chronoByYear: Record<number, any> = {};
    const hrTaxByYear: Record<number, { beats: number, dist: number }> = {};
    const benchByYear: Record<number, any> = {};
    const weeklyHabitByYear: Record<number, number[]> = {};

    const BANDS = [
      { id: 'sub5', min: 0, max: 5 }, { id: 'd5_6', min: 5, max: 6 }, { id: 'd6_7', min: 6, max: 7 },
      { id: 'd7_8', min: 7, max: 8 }, { id: 'd8_9', min: 8, max: 9 }, { id: 'd9_10', min: 9, max: 10 },
      { id: 'd10_15', min: 10, max: 15 }, { id: 'd15_20', min: 15, max: 20 }, { id: 'over20', min: 20, max: Infinity }
    ];

    const CHRONO = [
      { id: 'early', label: 'Early (0-8)', max: 8 }, { id: 'morning', label: 'Morning (8-12)', max: 12 },
      { id: 'afternoon', label: 'Afternoon (12-17)', max: 17 }, { id: 'evening', label: 'Evening (17-21)', max: 21 }, { id: 'night', label: 'Night (21-24)', max: 24 }
    ];

    const yearsToInit = Array.from(new Set([...availableYears, ...selectedYears]));
    yearsToInit.forEach(y => {
      zonesByYear[y] = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0, total: 0 };
      distMixByYear[y] = {}; BANDS.forEach(b => distMixByYear[y][b.id] = 0);
      chronoByYear[y] = {}; CHRONO.forEach(b => chronoByYear[y][b.id] = { effSum: 0, count: 0 });
      hrTaxByYear[y] = { beats: 0, dist: 0 };
      weeklyHabitByYear[y] = Array(53).fill(0);
      benchByYear[y] = { '5k': { paceSum: 0, hrSum: 0, count: 0 }, '10k': { paceSum: 0, hrSum: 0, count: 0 }, '21k': { paceSum: 0, hrSum: 0, count: 0 } };
    });

    yearsToInit.forEach(year => {
      const yRuns = runs.filter(r => new Date(r.start_date).getFullYear() === year);
      const weeks: Set<string>[] = Array(53).fill(null).map(() => new Set());
      yRuns.forEach(r => {
        const d = new Date(r.start_date);
        const start = new Date(year, 0, 1);
        const wIdx = Math.min(52, Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)));
        weeks[wIdx].add(d.toDateString());
      });
      weeklyHabitByYear[year] = weeks.map(s => s.size);
    });

    const yearlyData = months.map(m => {
      const entry: any = { name: m.name };
      yearsToInit.forEach(year => {
        const isFuture = year === currentYear && m.index > currentMonth;
        if (isFuture) { entry[`${year}_dist`] = null; entry[`${year}_pace`] = null; entry[`${year}_efficiency`] = null; entry[`${year}_habit`] = null; return; }
        const mRuns = runs.filter(r => { const d = new Date(r.start_date); return d.getFullYear() === year && d.getMonth() === m.index; });
        const activeDays = new Set(mRuns.map(r => new Date(r.start_date).toDateString())).size;
        const distKm = mRuns.reduce((s, r) => s + (r.distance || 0) / 1000, 0);
        const timeMin = mRuns.reduce((s, r) => s + (r.moving_time || 0) / 60, 0);
        const elev = mRuns.reduce((s, r) => s + (r.total_elevation_gain || 0), 0);
        let effSum = 0, effCount = 0, maxRun = 0;
        mRuns.forEach(r => {
          const hr = r.average_heartrate; const dK = r.distance / 1000; const tM = r.moving_time / 60; const pace = tM / dK;
          const hour = new Date(r.start_date_local || r.start_date).getHours();
          if (hr && hr > 0 && dK > 0) {
            const eff = (dK * 1000 / tM) / hr; effSum += eff * tM; effCount += tM;
            zonesByYear[year].total++;
            if (hr < 135) zonesByYear[year].Z1++; else if (hr < 149) zonesByYear[year].Z2++; else if (hr < 161) zonesByYear[year].Z3++; else if (hr < 173) zonesByYear[year].Z4++; else zonesByYear[year].Z5++;
            hrTaxByYear[year].beats += (hr * tM); hrTaxByYear[year].dist += dK;
            const cB = CHRONO.find(b => hour < b.max); if (cB) { chronoByYear[year][cB.id].effSum += eff; chronoByYear[year][cB.id].count++; }
            // Benchmarks
            let bKey = '';
            if (dK >= 5 && dK < 6) bKey = '5k'; else if (dK >= 10 && dK < 11) bKey = '10k'; else if (dK >= 21) bKey = '21k';
            if (bKey) { benchByYear[year][bKey].paceSum += pace; benchByYear[year][bKey].hrSum += hr; benchByYear[year][bKey].count++; }
          }
          const dB = BANDS.find(b => dK >= b.min && dK < b.max); if (dB) distMixByYear[year][dB.id]++;
          if (dK > maxRun) maxRun = dK;
        });
        entry[`${year}_dist`] = distKm; entry[`${year}_elev`] = elev; entry[`${year}_pace`] = distKm > 0 ? timeMin / distKm : null; entry[`${year}_efficiency`] = effCount > 0 ? effSum / effCount : null; entry[`${year}_habit`] = activeDays; entry[`${year}_longrun`] = maxRun > 0 ? maxRun : null;
      });
      return entry;
    });

    yearsToInit.forEach(year => {
      let rD = 0, rE = 0;
      yearlyData.forEach(m => {
        if (year === currentYear && m.index > currentMonth) { m[`${year}_dist_cum`] = null; m[`${year}_elev_cum`] = null; }
        else { rD += m[`${year}_dist`] || 0; m[`${year}_dist_cum`] = rD; rE += m[`${year}_elev`] || 0; m[`${year}_elev_cum`] = rE; }
      });
    });

    const zoneData = selectedYears.map(year => {
      const s = zonesByYear[year]; const t = s?.total || 1;
      return { year: year.toString(), Z1: s.Z1, Z2: s.Z2, Z3: s.Z3, Z4: s.Z4, Z5: s.Z5, total: s.total };
    });

    const mixData = selectedYears.map(year => {
      const e: any = { year: year.toString() }; BANDS.forEach(b => e[b.id] = distMixByYear[year][b.id]); return e;
    });

    const chronoData = CHRONO.map(b => {
      const e: any = { range: b.label };
      selectedYears.forEach(year => { const s = chronoByYear[year][b.id]; e[year] = s.count > 0 ? Number((s.effSum / s.count).toFixed(2)) : null; });
      return e;
    });

    const hrTaxData = selectedYears.map(year => ({
      year: year.toString(),
      beats: hrTaxByYear[year].dist > 0 ? Math.round(hrTaxByYear[year].beats / hrTaxByYear[year].dist) : 0,
      totalDist: Number(hrTaxByYear[year].dist.toFixed(2))
    })).sort((a, b) => Number(a.year) - Number(b.year));

    const benchData = ['5k', '10k', '21k'].map(k => {
      const e: any = { key: k };
      selectedYears.forEach(year => { 
        const s = benchByYear[year][k]; 
        e[`${year}_pace`] = s.count > 0 ? Number((s.paceSum / s.count).toFixed(2)) : null;
        e[`${year}_hr`] = s.count > 0 ? Math.round(s.hrSum / s.count) : null;
      });
      return e;
    });

    const kpiSummary = selectedYears.map(year => {
      const yR = runs.filter(r => new Date(r.start_date).getFullYear() === year);
      const d = yR.reduce((s, r) => s + (r.distance || 0) / 1000, 0);
      const t = yR.reduce((s, r) => s + (r.moving_time || 0), 0);
      const speed = d > 0 ? (d / (t / 3600)) : 0;
      const prevYear = year - 1;
      const pR = runs.filter(r => new Date(r.start_date).getFullYear() === prevYear);
      const pd = pR.reduce((s, r) => s + (r.distance || 0) / 1000, 0);
      const pc = pR.length;
      const pt = pR.reduce((s, r) => s + (r.moving_time || 0), 0);
      const pspeed = pd > 0 ? (pd / (pt / 3600)) : 0;
      return { year, dist: Number(d.toFixed(2)), count: yR.length, speed: Number(speed.toFixed(2)), d_delta: pd > 0 ? ((d - pd) / pd) * 100 : null, c_delta: pc > 0 ? ((yR.length - pc) / pc) * 100 : null, s_delta: pspeed > 0 ? ((speed - pspeed) / pspeed) * 100 : null };
    });

    return { yearlyData, zoneData, mixData, chronoData, hrTaxData, benchData, kpiSummary, weeklyHabitByYear };
  }, [runs, availableYears, selectedYears, currentYear, currentMonth]);

  const formatPace = (v: number) => { if (!v) return '--:--'; const m = Math.floor(v); const s = Math.round((v - m) * 60); return `${m}:${s.toString().padStart(2, '0')}`; };

  const Delta = ({ val }: { val: number | null }) => {
    if (val === null) return null;
    const isPos = val >= 0;
    return (
      <span className={`text-[10px] ml-1 font-bold flex items-center ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
        ({Math.abs(val).toFixed(1)}% {isPos ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />})
      </span>
    );
  };

  if (isLoading) return <div className="p-20 text-center text-gray-500 font-medium animate-pulse">Crunching years of data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-10" ref={captureRef}>
        <header className="space-y-6">
          <Section title="Year In Review" subtitle="A side-by-side analysis of your physical adaptation and training consistency." level={1} icon={CalendarIcon} background="transparent" className="p-0 border-none shadow-none" actions={
            <button onClick={handleShare} disabled={isCapturing} className={`share-hidden flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${isCapturing ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50 hover:border-blue-200'}`}>
              {isCapturing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              {isCapturing ? 'Capturing...' : 'Download Report'}
            </button>
          } />
          
          <div className="share-hidden bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase ml-2">Compare:</span>
            {availableYears.map(year => {
              const isSelected = selectedYears.includes(year);
              return (
                <button key={year} onClick={() => toggleYear(year)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${isSelected ? 'text-white border-transparent' : 'text-gray-500 bg-white border-gray-200'}`} style={{ backgroundColor: isSelected ? getYearColor(year) : undefined }}>
                  {year} {isSelected && '✓'}
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase">Year</th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase">Distance</th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase">Activities</th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase">Avg Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processed.kpiSummary.map(k => (
                    <tr key={k.year}>
                      <td className="py-4 font-bold text-gray-900 flex items-center">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getYearColor(k.year) }} />
                        {k.year}
                      </td>
                      <td className="py-4"><div className="flex items-center text-lg font-bold text-gray-800">{k.dist.toFixed(0)}km <Delta val={k.d_delta} /></div></td>
                      <td className="py-4"><div className="flex items-center text-lg font-bold text-gray-800">{k.count} <Delta val={k.c_delta} /></div></td>
                      <td className="py-4"><div className="flex items-center text-lg font-bold text-gray-800">{k.speed.toFixed(1)}km/h <Delta val={k.s_delta} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Section title="Consistency Heatmap 🌿" subtitle="Active days per week. Deeper green = more frequent running. Jan → Dec." level={3} icon={CalendarIcon} className="lg:col-span-2">
            <div className="flex flex-col space-y-3 py-4">
              <div className="flex ml-12 mb-1">
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                  <div key={m} className="flex-1 text-[10px] text-gray-400 font-bold uppercase text-center">{m}</div>
                ))}
              </div>
              {selectedYears.map(year => (
                <div key={year} className="flex items-center space-x-4">
                  <div className="w-8 text-xs font-bold text-gray-500">{year}</div>
                  <div className="flex-1 flex gap-[2px]">
                    {processed.weeklyHabitByYear[year]?.map((count, i) => {
                      const colors = ['bg-gray-100', 'bg-emerald-100', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600', 'bg-emerald-700'];
                      return (
                        <div key={i} title={`Week ${i+1}: ${count} active days`} className={`flex-1 h-5 rounded-sm ${colors[Math.min(7, count)] || 'bg-gray-100'} transition-all hover:ring-2 hover:ring-offset-1 hover:ring-emerald-400 cursor-help`} />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Cumulative Distance 📈" subtitle="Year-to-date total volume. Measures macro consistency vs. previous years." level={3} icon={Activity}>
            <div className="h-[300px] w-full"><ResponsiveContainer><LineChart data={processed.yearlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{fontSize: 10}} /><YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><Tooltip contentStyle={{borderRadius: '12px'}} /><Legend iconType="circle" />{selectedYears.map(year => <Line key={year} type="monotone" dataKey={`${year}_dist_cum`} name={`${year}`} stroke={getYearColor(year)} strokeWidth={3} dot={false} />)}</LineChart></ResponsiveContainer></div>
          </Section>

          <Section title="Monthly Volume 🗓️" subtitle="Total distance run each month. Measured in kilometers." level={3} icon={TrendingUp}>
            <div className="h-[300px] w-full"><ResponsiveContainer><LineChart data={processed.yearlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{fontSize: 10}} /><YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><Tooltip /><Legend iconType="circle" />{selectedYears.map(year => <Line key={year} type="monotone" dataKey={`${year}_dist`} name={`${year}`} stroke={getYearColor(year)} strokeWidth={2} dot={{r: 2}} />)}</LineChart></ResponsiveContainer></div>
          </Section>

          <Section title="Distance Mix 🎨" subtitle="Counts of runs per distance bucket. Analyzes training variety and focus." level={3} icon={Trophy}>
            <div className="h-[350px] w-full"><ResponsiveContainer><BarChart data={processed.mixData} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" /><XAxis type="number" domain={[0, 'auto']} allowDecimals={false} hide /><YAxis dataKey="year" type="category" width={40} axisLine={false} tickLine={false} tick={{fontSize: 10}} /><Tooltip /><Legend iconType="circle" /><Bar dataKey="sub5" name="<5k" stackId="a" fill={DIST_COLORS.sub5} /><Bar dataKey="d5_6" name="5-6k" stackId="a" fill={DIST_COLORS.d5_6} /><Bar dataKey="d6_7" name="6-7k" stackId="a" fill={DIST_COLORS.d6_7} /><Bar dataKey="d7_8" name="7-8k" stackId="a" fill={DIST_COLORS.d7_8} /><Bar dataKey="d8_9" name="8-9k" stackId="a" fill={DIST_COLORS.d8_9} /><Bar dataKey="d9_10" name="9-10k" stackId="a" fill={DIST_COLORS.d9_10} /><Bar dataKey="d10_15" name="10-15k" stackId="a" fill={DIST_COLORS.d10_15} /><Bar dataKey="d15_20" name="15-20k" stackId="a" fill={DIST_COLORS.d15_20} /><Bar dataKey="over20" name="20k+" stackId="a" fill={DIST_COLORS.over20} /></BarChart></ResponsiveContainer></div>
          </Section>

          <Section title="Habit Strength ⚓" subtitle="Unique active days per month. Validates the core identity of 'showing up'." level={3} icon={CheckCircle}>
            <div className="h-[300px] w-full"><ResponsiveContainer><LineChart data={processed.yearlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{fontSize: 10}} /><YAxis domain={[0, 31]} axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><Tooltip /><Legend iconType="circle" />{selectedYears.map(year => <Line key={year} type="monotone" dataKey={`${year}_habit`} name={`${year}`} stroke={getYearColor(year)} strokeWidth={2} dot={{r: 2}} />)}</LineChart></ResponsiveContainer></div>
          </Section>

          <Section title="Benchmark Pace ⚡" subtitle="Avg pace for standard 5k, 10k, and 21k distances. Direct speed gain proof." level={3} icon={TimerIcon}>
            <div className="h-[300px] w-full"><ResponsiveContainer><LineChart data={processed.benchData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="key" axisLine={false} tickLine={false} tick={{fontSize: 10}} /><YAxis reversed domain={['auto', 'auto']} axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><Tooltip formatter={(v:any)=>formatPace(v)} /><Legend iconType="circle" />{selectedYears.map(year => <Line key={year} type="monotone" dataKey={`${year}_pace`} name={`${year}`} stroke={getYearColor(year)} strokeWidth={2} connectNulls />)}</LineChart></ResponsiveContainer></div>
          </Section>

          <Section title="Benchmark Heart Rate 💓" subtitle="Physiological cost for standard runs. Average HR for fixed distance buckets." level={3} icon={Heart}>
            <div className="h-[300px] w-full"><ResponsiveContainer><LineChart data={processed.benchData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="key" axisLine={false} tickLine={false} tick={{fontSize: 10}} /><YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><Tooltip /><Legend iconType="circle" />{selectedYears.map(year => <Line key={year} type="monotone" dataKey={`${year}_hr`} name={`${year}`} stroke={getYearColor(year)} strokeWidth={2} connectNulls />)}</LineChart></ResponsiveContainer></div>
          </Section>

          <Section title="Average Pace Trend 🕒" subtitle="Overall monthly avg pace (min/km). Tracks base speed evolution over time." level={3} icon={TimerIcon}>
            <div className="h-[300px] w-full"><ResponsiveContainer><LineChart data={processed.yearlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{fontSize: 10}} /><YAxis reversed domain={['auto', 'auto']} axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><Tooltip formatter={(v:any)=>formatPace(v)} /><Legend iconType="circle" />{selectedYears.map(year => <Line key={year} type="monotone" dataKey={`${year}_pace`} name={`${year}`} stroke={getYearColor(year)} strokeWidth={2} connectNulls dot={false} />)}</LineChart></ResponsiveContainer></div>
          </Section>

          <Section title="Heart Rate Tax 🫀" subtitle="Avg heartbeats per km (Bars) vs Total Volume (Line). Efficiency vs load." level={3} icon={Heart}>
            <div className="h-[300px] w-full"><ResponsiveContainer><ComposedChart data={processed.hrTaxData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 10}} /><YAxis yAxisId="left" domain={[0, 'auto']} axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><Tooltip /><Legend /><Bar yAxisId="left" dataKey="beats" name="Beats/km" radius={[6, 6, 0, 0]}>{processed.hrTaxData.map((e, i) => <Cell key={i} fill={getYearColor(Number(e.year))} />)}</Bar><Line yAxisId="right" type="monotone" dataKey="totalDist" name="Total Distance" stroke="#64748b" strokeWidth={2} /></ComposedChart></ResponsiveContainer></div>
          </Section>

          <Section title="Intensity Distribution ⚡" subtitle="Absolute counts of runs per HR Zone. Verifies the 80/20 training rule." level={3} icon={Zap}>
            <div className="h-[350px] w-full"><ResponsiveContainer><BarChart data={processed.zoneData} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" /><XAxis type="number" domain={[0, 'auto']} allowDecimals={false} hide /><YAxis dataKey="year" type="category" width={40} axisLine={false} tickLine={false} tick={{fontSize: 10}} /><Tooltip content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const total = payload[0].payload.total;
                return (
                  <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100 text-xs">
                    <p className="font-bold mb-2">{label} (Absolute Counts)</p>
                    {payload.map((entry: any) => (
                      <p key={entry.name} style={{ color: entry.fill }}>
                        {entry.name}: {entry.value} runs ({((entry.value/total)*100).toFixed(1)}%)
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }} /><Legend iconType="circle" /><Bar dataKey="Z1" name="Z1" stackId="a" fill={ZONE_COLORS.Z1} /><Bar dataKey="Z2" name="Z2" stackId="a" fill={ZONE_COLORS.Z2} /><Bar dataKey="Z3" name="Z3" stackId="a" fill={ZONE_COLORS.Z3} /><Bar dataKey="Z4" name="Z4" stackId="a" fill={ZONE_COLORS.Z4} /><Bar dataKey="Z5" name="Z5" stackId="a" fill={ZONE_COLORS.Z5} /></BarChart></ResponsiveContainer></div>
          </Section>

          <Section title="Chronotype Efficiency 🕒" subtitle="Meters moved per heartbeat vs Time of Day. Reveals biological performance peaks." level={3} icon={Clock}>
            <div className="h-[300px] w-full"><ResponsiveContainer><BarChart data={processed.chronoData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="range" tick={{fontSize: 10}} axisLine={false} tickLine={false} /><YAxis domain={[0, 1.5]} ticks={[0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5]} axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><Tooltip formatter={(v:any)=>`${v.toFixed(2)} m/beat`} /><Legend iconType="circle" />{selectedYears.map(year => <Bar key={year} dataKey={year} name={`${year}`} fill={getYearColor(year)} radius={[4, 4, 0, 0]} />)}</BarChart></ResponsiveContainer></div>
          </Section>

          <Section title="Long Run Capacity 🏔️" subtitle="Expansion of endurance comfort zone. Measured as Monthly Max run distance." level={3} icon={Mountain}>
            <div className="h-[300px] w-full"><ResponsiveContainer><LineChart data={processed.yearlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{fontSize: 10}} /><YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><Tooltip /><Legend iconType="circle" />{selectedYears.map(year => <Line key={year} type="stepAfter" dataKey={`${year}_longrun`} name={`${year}`} stroke={getYearColor(year)} strokeWidth={2} connectNulls dot={false} />)}</LineChart></ResponsiveContainer></div>
          </Section>

          <Section title="Structural Strength 🏗️" subtitle="Cumulative vertical gain (Elevation). Proxy for leg strength and hill robustness." level={3} icon={BatteryCharging}>
            <div className="h-[300px] w-full"><ResponsiveContainer><AreaChart data={processed.yearlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{fontSize: 10}} /><YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} width={45} tick={{fontSize: 10}} /><Tooltip /><Legend iconType="circle" />{selectedYears.map(year => <Area key={year} type="monotone" dataKey={`${year}_elev_cum`} name={`${year}`} stroke={getYearColor(year)} fill={getYearColor(year)} fillOpacity={0.1} stackId={year} />)}</AreaChart></ResponsiveContainer></div>
          </Section>
        </main>
      </div>
    </div>
  );
};
