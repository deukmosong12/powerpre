import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../api';
import {
    Chart, CategoryScale, LineController, LineElement,
    PointElement, LinearScale, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './RetrieveUser.css';

import ButtonArrow  from '../../../img/button-arrow.js';
import TopmenuLine  from '../../../img/topmenu-line.js';
import SidemenuLine from '../../../img/sidemenu-line.js';
import UserImg      from '../../../img/user-img.js';

Chart.register(LineController, CategoryScale, LineElement, PointElement, LinearScale, Tooltip, Legend);

const COLORS = [
    { bg: 'rgb(58,98,213)',  border: 'rgba(58,98,213,0.8)'  },
    { bg: 'rgb(220,80,80)',  border: 'rgba(220,80,80,0.8)'  },
    { bg: 'rgb(40,180,100)', border: 'rgba(40,180,100,0.8)' },
    { bg: 'rgb(200,140,0)',  border: 'rgba(200,140,0,0.8)'  },
];

const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
        tooltip: { enabled: true },
        legend:  { display: true, position: 'top' },
    },
    scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 12 } },
        y: { ticks: { callback: v => v.toLocaleString() + ' kWh' } },
    },
};

const thStyle = { padding: '10px 14px', textAlign: 'center', borderBottom: '2px solid #2a52c0' };
const tdStyle = { padding: '8px 14px',  textAlign: 'center', borderBottom: '1px solid #e0e4f0' };

const RetrieveUser = () => {
    const [id, setId]               = useState('');
    const [isAdmin, setIsAdmin]     = useState(false);
    const [buildings, setBuildings] = useState([]);
    const [leftId,  setLeftId]      = useState(null);
    const [rightId, setRightId]     = useState(null);
    const [dataCache, setDataCache] = useState({});
    const [chartData, setChartData] = useState(null);
    const [compareTable, setCompareTable] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state) {
            setId(location.state.id);
            setIsAdmin(location.state.isAdmin);
        }
    }, [location.state]);

    useEffect(() => {
        if (!id) return;
        api.get(`/building/list?userId=${id}`)
            .then(res => {
                setBuildings(res.data);
                if (res.data.length > 0) setLeftId(res.data[0].id);
            })
            .catch(() => alert('건물 목록을 불러오는데 실패했습니다.'));
    }, [id]);

    const loadBuilding = (buildingId, buildingList) => {
        if (!buildingId || dataCache[buildingId]) return;
        api.get(`/forecast/${buildingId}/latest`)
            .then(res => {
                const job = res.data;
                if (job.status !== 'DONE') {
                    setDataCache(prev => ({ ...prev, [buildingId]: { status: job.status } }));
                    return;
                }
                api.get(`/forecast/${buildingId}/monthly`)
                    .then(mRes => {
                        const bName = (buildingList || buildings).find(b => b.id === buildingId)?.name || String(buildingId);
                        setDataCache(prev => ({
                            ...prev,
                            [buildingId]: {
                                status:   'DONE',
                                monthly:  mRes.data,
                                bill:     job.estimatedBill,
                                totalKwh: job.totalKwh,
                                name:     bName,
                            },
                        }));
                    });
            })
            .catch(() => {});
    };

    useEffect(() => { loadBuilding(leftId,  buildings); }, [leftId,  buildings]);
    useEffect(() => { loadBuilding(rightId, buildings); }, [rightId, buildings]);

    useEffect(() => {
        const ids   = [leftId, rightId].filter(Boolean);
        const ready = ids.every(bid => dataCache[bid]?.status === 'DONE');
        if (!ready || ids.length === 0) { setChartData(null); setCompareTable(null); return; }

        const allLabels = [...new Set(
            ids.flatMap(bid => (dataCache[bid].monthly || []).map(m => m.yearMonth))
        )].sort();

        const datasets = ids.map((bid, i) => {
            const map = Object.fromEntries((dataCache[bid].monthly || []).map(m => [m.yearMonth, m.totalKwh]));
            return {
                label:           dataCache[bid].name || `건물 ${bid}`,
                data:            allLabels.map(ym => map[ym] ?? null),
                fill:            false,
                backgroundColor: COLORS[i % COLORS.length].bg,
                borderColor:     COLORS[i % COLORS.length].border,
                tension:         0.3,
                pointRadius:     4,
            };
        });

        setChartData({ labels: allLabels, datasets });

        if (ids.length === 2) {
            const lMap = Object.fromEntries((dataCache[leftId].monthly  || []).map(m => [m.yearMonth, m.totalKwh]));
            const rMap = Object.fromEntries((dataCache[rightId].monthly || []).map(m => [m.yearMonth, m.totalKwh]));
            setCompareTable(allLabels.map(ym => {
                const l    = lMap[ym] ?? null;
                const r    = rMap[ym] ?? null;
                const rate = (l && r) ? (((r - l) / l) * 100).toFixed(1) : null;
                return { ym, l, r, rate };
            }));
        } else {
            setCompareTable(null);
        }
    }, [leftId, rightId, dataCache]);

    const nav       = (path) => navigate(path, { state: { id, isAdmin } });
    const leftData  = leftId  ? dataCache[leftId]  : null;
    const rightData = rightId ? dataCache[rightId] : null;

    return (
        <div className="retrieve-user">
            <div className="overlap-wrapper">
                <div className="overlap">
                    <div className="overlap-group">
                        <div className="topmenu">
                            <div className="div">
                                <div className="text-wrapper">{id} 님</div>
                                <div className="logout-button" onClick={() => navigate('/')}>로그아웃</div>
                                <TopmenuLine className="topmenu-line" />
                                <UserImg className="user-img" />
                            </div>
                        </div>
                        <div className="sidemenu">
                            <div className="overlap-2">
                                <div className="home-button" onClick={() => nav('/home')}>⚡️전력 예측 시스템⚡️</div>
                                <SidemenuLine className="sidemenu-line" />
                                <div className="reg-button" onClick={() => nav('/register')}>
                                    <div className="text-wrapper-2">데이터 등록하기</div>
                                    <ButtonArrow className="img" />
                                </div>
                                <div className="ret-button" onClick={() => nav(isAdmin ? '/retrieve/admin' : '/retrieve/user')}>
                                    <div className="text-wrapper-2">데이터 조회하기</div>
                                    <ButtonArrow className="img" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ position:'absolute', top:118, left:280, display:'flex', gap:20, alignItems:'flex-end' }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            <span style={{ fontSize:13, color:'#3a62d5', fontWeight:700 }}>📌 기준 건물</span>
                            <select
                                className="pred-graph-bname-box"
                                style={{ position:'static', width:180 }}
                                value={leftId || ''}
                                onChange={e => setLeftId(Number(e.target.value))}>
                                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div style={{ fontSize:20, color:'#999', paddingBottom:8 }}>vs</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            <span style={{ fontSize:13, color:'#dc5050', fontWeight:700 }}>📊 비교 건물 (선택)</span>
                            <select
                                className="pred-graph-bname-box"
                                style={{ position:'static', width:180 }}
                                value={rightId || ''}
                                onChange={e => setRightId(e.target.value ? Number(e.target.value) : null)}>
                                <option value="">-- 비교 안함 --</option>
                                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="pred-graph">
                        <div className="pred-graph-text-wrapper">
                            <div className="pred-graph-text">전력 수요 그래프</div>
                        </div>
                        <div className="pred-graph-box">
                            {!chartData
                                ? <p className="status-msg">건물을 선택하면 예측 결과가 표시됩니다.</p>
                                : <Line data={chartData} options={chartOptions} className="line-graph" />}
                        </div>
                    </div>

                    <div style={{ position:'absolute', top:700, left:280, display:'flex', gap:20 }}>
                        {[{ id: leftId, d: leftData, label:'기준', ci:0 }, { id: rightId, d: rightData, label:'비교', ci:1 }]
                            .filter(x => x.id && x.d?.status === 'DONE')
                            .map(x => (
                                <div key={x.id} style={{
                                    background:'#f0f4ff', borderRadius:16, padding:'16px 28px',
                                    borderLeft:`5px solid ${COLORS[x.ci].bg}`, minWidth:230,
                                }}>
                                    <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>
                                        {x.d.name} <span style={{ color:'#888', fontWeight:400 }}>({x.label})</span>
                                    </div>
                                    <div style={{ fontSize:14, color:'#333' }}>
                                        연간 예상 전력: <b>{Math.round(x.d.totalKwh).toLocaleString()} kWh</b>
                                    </div>
                                    <div style={{ fontSize:14, color:'#e05500', marginTop:4 }}>
                                        연간 예상 전기세: <b>{Math.round(x.d.bill).toLocaleString()}원</b>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {compareTable && (
                        <div style={{ position:'absolute', top:840, left:280, right:40, paddingBottom:60 }}>
                            <div style={{ fontWeight:700, fontSize:16, marginBottom:10, color:'#3a62d5' }}>
                                📋 월별 전력량 비교 (기준 건물 대비 변화율)
                            </div>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14, background:'#fff', borderRadius:12, overflow:'hidden' }}>
                                <thead>
                                    <tr style={{ background:'#3a62d5', color:'#fff' }}>
                                        <th style={thStyle}>월</th>
                                        <th style={thStyle}>{leftData?.name} 기준 (kWh)</th>
                                        <th style={thStyle}>{rightData?.name} 비교 (kWh)</th>
                                        <th style={thStyle}>변화율</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {compareTable.map((row, i) => {
                                        const rate = parseFloat(row.rate);
                                        return (
                                            <tr key={row.ym} style={{ background: i % 2 === 0 ? '#f8f9ff' : '#fff' }}>
                                                <td style={{ ...tdStyle, fontWeight:600 }}>{row.ym}</td>
                                                <td style={tdStyle}>{row.l != null ? Math.round(row.l).toLocaleString() : '-'}</td>
                                                <td style={tdStyle}>{row.r != null ? Math.round(row.r).toLocaleString() : '-'}</td>
                                                <td style={{
                                                    ...tdStyle,
                                                    color:      rate > 0 ? '#d32f2f' : rate < 0 ? '#388e3c' : '#555',
                                                    fontWeight: 700,
                                                }}>
                                                    {row.rate != null
                                                        ? `${rate > 0 ? '▲' : rate < 0 ? '▼' : ''}${Math.abs(rate)}%`
                                                        : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RetrieveUser;
