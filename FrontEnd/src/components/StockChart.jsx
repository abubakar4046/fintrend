import React, { useState, useEffect } from 'react';
import { stockAPI } from '../utils/api';
import { formatCurrency } from '../utils/helpers';

const formatMonthDay = (dateStr) => {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

// Screenshot-style chart: blue line + visible axes + light grid + month/day labels.
const LineChart = ({ chartData }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!chartData || chartData.length === 0) return null;

  const prices = chartData.map(d => d.price);
  const minRaw = Math.min(...prices);
  const maxRaw = Math.max(...prices);

  // Match screenshot-like tick spacing (rounded tens)
  const yMin = Math.floor(minRaw / 10) * 10;
  const yMax = Math.ceil(maxRaw / 10) * 10;
  const yStep = Math.max(10, Math.round((yMax - yMin) / 4 / 10) * 10) || 10;
  const yTicks = [];
  for (let v = yMin; v <= yMax + 0.0001; v += yStep) yTicks.push(v);

  const W = 900;
  const H = 320;
  const pad = { top: 18, right: 18, bottom: 44, left: 56 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const pts = chartData.map((d, i) => {
    const x = pad.left + (i / Math.max(1, chartData.length - 1)) * innerW;
    const y = pad.top + (1 - (d.price - yMin) / Math.max(1e-9, (yMax - yMin))) * innerH;
    return { ...d, x, y, i };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

  // ~8 x-axis labels like the screenshot
  const desired = 8;
  const stepX = Math.max(1, Math.floor((chartData.length - 1) / (desired - 1)));
  const xLabelIdxs = [];
  for (let i = 0; i < chartData.length; i += stepX) xLabelIdxs.push(i);
  if (xLabelIdxs[xLabelIdxs.length - 1] !== chartData.length - 1) xLabelIdxs.push(chartData.length - 1);

  return (
    <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="260" style={{ display: 'block' }}>
        <rect x={pad.left} y={pad.top} width={innerW} height={innerH} fill="#ffffff" />

        {/* Horizontal grid + Y axis labels */}
        {yTicks.map((v) => {
          const y = pad.top + (1 - (v - yTicks[0]) / Math.max(1e-9, (yTicks[yTicks.length - 1] - yTicks[0]))) * innerH;
          return (
            <g key={`y-${v}`}>
              <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
              <text x={pad.left - 10} y={y + 4} fontSize="12" fill="#6b7280" textAnchor="end">
                {formatCurrency(Math.round(v))}
              </text>
            </g>
          );
        })}

        {/* Vertical grid + X labels */}
        {xLabelIdxs.map((i) => {
          const p = pts[i];
          return (
            <g key={`x-${i}`}>
              <line x1={p.x} y1={pad.top} x2={p.x} y2={H - pad.bottom} stroke="#eef2f7" />
              <text x={p.x} y={H - pad.bottom + 26} fontSize="12" fill="#6b7280" textAnchor="middle">
                {formatMonthDay(p.date)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} stroke="#9ca3af" />
        <line x1={pad.left} y1={H - pad.bottom} x2={W - pad.right} y2={H - pad.bottom} stroke="#9ca3af" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Hover */}
        {hoveredIndex !== null && pts[hoveredIndex] && (
          <g>
            <line x1={pts[hoveredIndex].x} y1={pad.top} x2={pts[hoveredIndex].x} y2={H - pad.bottom} stroke="#94a3b8" strokeDasharray="4 4" />
            <circle cx={pts[hoveredIndex].x} cy={pts[hoveredIndex].y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
            <rect x={pts[hoveredIndex].x - 70} y={pts[hoveredIndex].y - 58} width="140" height="48" rx="8" fill="#111827" opacity="0.92" />
            <text x={pts[hoveredIndex].x} y={pts[hoveredIndex].y - 38} fontSize="12" fill="#fff" textAnchor="middle" fontWeight="600">
              {formatMonthDay(pts[hoveredIndex].date)}
            </text>
            <text x={pts[hoveredIndex].x} y={pts[hoveredIndex].y - 20} fontSize="14" fill="#fff" textAnchor="middle" fontWeight="700">
              {formatCurrency(pts[hoveredIndex].price)}
            </text>
          </g>
        )}

        {/* Invisible hover columns */}
        {pts.map((p) => (
          <rect
            key={`hit-${p.i}`}
            x={p.x - 6}
            y={pad.top}
            width="12"
            height={innerH}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHoveredIndex(p.i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
      </svg>
    </div>
  );
};

const AreaChart = ({ chartData }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  if (!chartData || chartData.length === 0) return null;

  const prices = chartData.map(d => d.price);
  const minRaw = Math.min(...prices);
  const maxRaw = Math.max(...prices);
  const yMin = Math.floor(minRaw / 10) * 10;
  const yMax = Math.ceil(maxRaw / 10) * 10;
  const yStep = Math.max(10, Math.round((yMax - yMin) / 4 / 10) * 10) || 10;
  const yTicks = [];
  for (let v = yMin; v <= yMax + 0.0001; v += yStep) yTicks.push(v);

  const W = 900;
  const H = 320;
  const pad = { top: 18, right: 18, bottom: 44, left: 56 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const pts = chartData.map((d, i) => {
    const x = pad.left + (i / Math.max(1, chartData.length - 1)) * innerW;
    const y = pad.top + (1 - (d.price - yMin) / Math.max(1e-9, (yMax - yMin))) * innerH;
    return { ...d, x, y, i };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(2)} ${(pad.top + innerH).toFixed(2)} L ${pts[0].x.toFixed(2)} ${(pad.top + innerH).toFixed(2)} Z`;

  const desired = 8;
  const stepX = Math.max(1, Math.floor((chartData.length - 1) / (desired - 1)));
  const xLabelIdxs = [];
  for (let i = 0; i < chartData.length; i += stepX) xLabelIdxs.push(i);
  if (xLabelIdxs[xLabelIdxs.length - 1] !== chartData.length - 1) xLabelIdxs.push(chartData.length - 1);

  return (
    <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="260" style={{ display: 'block' }}>
        <rect x={pad.left} y={pad.top} width={innerW} height={innerH} fill="#ffffff" />

        {yTicks.map((v) => {
          const y = pad.top + (1 - (v - yTicks[0]) / Math.max(1e-9, (yTicks[yTicks.length - 1] - yTicks[0]))) * innerH;
          return (
            <g key={`y-${v}`}>
              <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
              <text x={pad.left - 10} y={y + 4} fontSize="12" fill="#6b7280" textAnchor="end">
                {formatCurrency(Math.round(v))}
              </text>
            </g>
          );
        })}

        {xLabelIdxs.map((i) => {
          const p = pts[i];
          return (
            <g key={`x-${i}`}>
              <line x1={p.x} y1={pad.top} x2={p.x} y2={H - pad.bottom} stroke="#eef2f7" />
              <text x={p.x} y={H - pad.bottom + 26} fontSize="12" fill="#6b7280" textAnchor="middle">
                {formatMonthDay(p.date)}
              </text>
            </g>
          );
        })}

        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} stroke="#9ca3af" />
        <line x1={pad.left} y1={H - pad.bottom} x2={W - pad.right} y2={H - pad.bottom} stroke="#9ca3af" />

        <path d={areaPath} fill="rgba(59, 130, 246, 0.18)" stroke="none" />
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {hoveredIndex !== null && pts[hoveredIndex] && (
          <g>
            <line x1={pts[hoveredIndex].x} y1={pad.top} x2={pts[hoveredIndex].x} y2={H - pad.bottom} stroke="#94a3b8" strokeDasharray="4 4" />
            <circle cx={pts[hoveredIndex].x} cy={pts[hoveredIndex].y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
            <rect x={pts[hoveredIndex].x - 70} y={pts[hoveredIndex].y - 58} width="140" height="48" rx="8" fill="#111827" opacity="0.92" />
            <text x={pts[hoveredIndex].x} y={pts[hoveredIndex].y - 38} fontSize="12" fill="#fff" textAnchor="middle" fontWeight="600">
              {formatMonthDay(pts[hoveredIndex].date)}
            </text>
            <text x={pts[hoveredIndex].x} y={pts[hoveredIndex].y - 20} fontSize="14" fill="#fff" textAnchor="middle" fontWeight="700">
              {formatCurrency(pts[hoveredIndex].price)}
            </text>
          </g>
        )}

        {pts.map((p) => (
          <rect
            key={`hit-${p.i}`}
            x={p.x - 6}
            y={pad.top}
            width="12"
            height={innerH}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHoveredIndex(p.i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
      </svg>
    </div>
  );
};

const CandlestickChart = ({ chartData }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  if (!chartData || chartData.length === 0) return null;

  const highs = chartData.map(d => d.high);
  const lows = chartData.map(d => d.low);
  const minRaw = Math.min(...lows);
  const maxRaw = Math.max(...highs);

  const yMin = Math.floor(minRaw / 10) * 10;
  const yMax = Math.ceil(maxRaw / 10) * 10;
  const yStep = Math.max(10, Math.round((yMax - yMin) / 4 / 10) * 10) || 10;
  const yTicks = [];
  for (let v = yMin; v <= yMax + 0.0001; v += yStep) yTicks.push(v);

  const W = 900;
  const H = 320;
  const pad = { top: 18, right: 18, bottom: 44, left: 56 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const yFor = (v) => pad.top + (1 - (v - yMin) / Math.max(1e-9, (yMax - yMin))) * innerH;

  const step = innerW / Math.max(1, chartData.length);
  const candleW = Math.max(3, Math.min(14, step * 0.6));

  // ~8 x-axis labels
  const desired = 8;
  const stepX = Math.max(1, Math.floor((chartData.length - 1) / (desired - 1)));
  const xLabelIdxs = [];
  for (let i = 0; i < chartData.length; i += stepX) xLabelIdxs.push(i);
  if (xLabelIdxs[xLabelIdxs.length - 1] !== chartData.length - 1) xLabelIdxs.push(chartData.length - 1);

  return (
    <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="260" style={{ display: 'block' }}>
        <rect x={pad.left} y={pad.top} width={innerW} height={innerH} fill="#ffffff" />

        {/* Horizontal grid + Y labels */}
        {yTicks.map((v) => {
          const y = yFor(v);
          return (
            <g key={`y-${v}`}>
              <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
              <text x={pad.left - 10} y={y + 4} fontSize="12" fill="#6b7280" textAnchor="end">
                {formatCurrency(Math.round(v))}
              </text>
            </g>
          );
        })}

        {/* X grid + labels */}
        {xLabelIdxs.map((i) => {
          const x = pad.left + i * step + step / 2;
          return (
            <g key={`x-${i}`}>
              <line x1={x} y1={pad.top} x2={x} y2={H - pad.bottom} stroke="#eef2f7" />
              <text x={x} y={H - pad.bottom + 26} fontSize="12" fill="#6b7280" textAnchor="middle">
                {formatMonthDay(chartData[i].date)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={H - pad.bottom} stroke="#9ca3af" />
        <line x1={pad.left} y1={H - pad.bottom} x2={W - pad.right} y2={H - pad.bottom} stroke="#9ca3af" />

        {/* Candles */}
        {chartData.map((d, i) => {
          const x = pad.left + i * step + step / 2;
          const yHigh = yFor(d.high);
          const yLow = yFor(d.low);
          const yOpen = yFor(d.open);
          const yClose = yFor(d.close);
          const up = d.close >= d.open;
          const color = up ? '#10b981' : '#ef4444';
          const bodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(2, Math.abs(yClose - yOpen));
          return (
            <g key={`c-${i}`}>
              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="2" opacity="0.9" />
              <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} opacity="0.85" rx="1.5" />
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hoveredIndex !== null && chartData[hoveredIndex] && (() => {
          const d = chartData[hoveredIndex];
          const x = pad.left + hoveredIndex * step + step / 2;
          const y = yFor(d.close);
          const boxX = Math.min(W - pad.right - 180, Math.max(pad.left + 10, x - 90));
          const boxY = Math.max(pad.top + 8, y - 78);
          return (
            <g>
              <line x1={x} y1={pad.top} x2={x} y2={H - pad.bottom} stroke="#94a3b8" strokeDasharray="4 4" />
              <circle cx={x} cy={y} r="4.5" fill="#111827" opacity="0.9" />
              <rect x={boxX} y={boxY} width="180" height="64" rx="10" fill="#111827" opacity="0.92" />
              <text x={boxX + 90} y={boxY + 20} fontSize="12" fill="#fff" textAnchor="middle" fontWeight="700">
                {formatMonthDay(d.date)}
              </text>
              <text x={boxX + 10} y={boxY + 40} fontSize="11" fill="#e5e7eb">
                O: {formatCurrency(d.open)}  H: {formatCurrency(d.high)}
              </text>
              <text x={boxX + 10} y={boxY + 56} fontSize="11" fill="#e5e7eb">
                L: {formatCurrency(d.low)}   C: {formatCurrency(d.close)}
              </text>
            </g>
          );
        })()}

        {/* Invisible hover columns */}
        {chartData.map((d, i) => {
          const x = pad.left + i * step;
          return (
            <rect
              key={`hit-${i}`}
              x={x}
              y={pad.top}
              width={step}
              height={innerH}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </svg>
    </div>
  );
};

const StockChart = ({ selectedStock }) => {
  const [timeframe, setTimeframe] = useState(() => {
    try {
      const raw = localStorage.getItem('displaySettings');
      const tf = raw ? JSON.parse(raw)?.defaultTimeframe : null;
      return tf || '1D';
    } catch {
      return '1D';
    }
  });
  const [chartType, setChartType] = useState(() => {
    try {
      const raw = localStorage.getItem('displaySettings');
      return raw ? (JSON.parse(raw)?.chartType || 'line') : 'line';
    } catch {
      return 'line';
    }
  });
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const timeframes = ['1D', '1W', '1M', '3M', '1Y'];

  useEffect(() => {
    const onSettingsChanged = () => {
      try {
        const raw = localStorage.getItem('displaySettings');
        const ds = raw ? JSON.parse(raw) : {};
        if (ds?.chartType) setChartType(ds.chartType);
        if (ds?.defaultTimeframe) setTimeframe(ds.defaultTimeframe);
      } catch {}
    };
    window.addEventListener('settings:changed', onSettingsChanged);
    return () => window.removeEventListener('settings:changed', onSettingsChanged);
  }, []);

  useEffect(() => {
    if (selectedStock) {
      fetchChartData();
    }
  }, [selectedStock, timeframe]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      // Map timeframe to data limit
      const limitMap = {
        '1D': 30,
        '1W': 90,
        '1M': 180,
        '3M': 365,
        '1Y': 730
      };
      const limit = limitMap[timeframe] || 30;
      
      const result = await stockAPI.getStockData(selectedStock, limit);
      if (result && result.data) {
        // Format data for display
        const formattedData = result.data.map(item => ({
          date: item.Date ? String(item.Date).split(' ')[0] : '',
          open: parseFloat(item.Open || 0),
          high: parseFloat(item.High || 0),
          low: parseFloat(item.Low || 0),
          close: parseFloat(item.Close || item['Adj close'] || 0),
          price: parseFloat(item.Close || item['Adj close'] || 0),
          volume: parseFloat(item.Volume || 0)
        })).filter(item => item.price > 0);
        
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h2 className="chart-title">
          {selectedStock}
          <br />
          Price History
        </h2>
        <div className="chart-controls">
          {timeframes.map((tf) => (
            <button
              key={tf}
              className={`chart-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
          <button
            className="chart-btn"
            onClick={fetchChartData}
            style={{ padding: '8px 12px' }}
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p>Loading chart data...</p>
        </div>
      ) : chartData && chartData.length > 0 ? (
        <>
          {/* Key Metrics - Above Chart */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginBottom: '24px',
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Current</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                {formatCurrency(chartData[chartData.length - 1].price)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Min</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                {formatCurrency(Math.min(...chartData.map(d => d.price)))}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Max</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                {formatCurrency(Math.max(...chartData.map(d => d.price)))}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Points</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                {chartData.length}
              </div>
            </div>
          </div>
          
          {/* Chart Type (from Settings -> Display) */}
          {chartType === 'bar' ? (
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px' }}>
              {/* Simple bar chart */}
              <svg viewBox="0 0 900 320" width="100%" height="260" style={{ display: 'block' }}>
                {(() => {
                  const W = 900, H = 320, pad = { top: 18, right: 18, bottom: 44, left: 56 };
                  const innerW = W - pad.left - pad.right;
                  const innerH = H - pad.top - pad.bottom;
                  const vals = chartData.map(d => d.price);
                  const min = Math.min(...vals);
                  const max = Math.max(...vals);
                  const range = max - min || 1;
                  const barW = innerW / Math.max(1, chartData.length);
                  return (
                    <g>
                      <rect x={pad.left} y={pad.top} width={innerW} height={innerH} fill="#ffffff" />
                      {chartData.map((d, i) => {
                        const x = pad.left + i * barW;
                        const h = ((d.price - min) / range) * innerH;
                        return (
                          <rect key={i} x={x} y={pad.top + (innerH - h)} width={Math.max(1, barW - 2)} height={h}
                            fill="#3b82f6" opacity="0.85" />
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>
          ) : chartType === 'candlestick' ? (
            <CandlestickChart chartData={chartData} />
          ) : chartType === 'area' ? (
            <AreaChart chartData={chartData} />
          ) : (
            <LineChart chartData={chartData} />
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
          <p>Chart data for {selectedStock}</p>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
            Chart timeframe: {timeframe}
          </p>
        </div>
      )}
    </div>
  );
};

export default StockChart;