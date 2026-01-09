import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { predictionAPI, stockAPI } from '../utils/api';
import '../styles/exportReport.css';

const ExportReport = ({ stockData, predictionData, sentimentData }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);

  const symbol = useMemo(() => (stockData?.symbol || 'AAPL').toUpperCase(), [stockData?.symbol]);

  const handleExport = async () => {
    setExportLoading(true);
    setExportError(null);
    
    try {
    if (exportFormat === 'csv') {
      exportAsCSV();
    } else if (exportFormat === 'pdf') {
        await exportAsPDF();
    } else if (exportFormat === 'json') {
      exportAsJSON();
    }
    } catch (e) {
      console.error('Export failed:', e);
      setExportError(e?.message || 'Export failed');
    } finally {
    setExportLoading(false);
    }
  };

  const exportAsCSV = () => {
    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `FinTrend_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const drawMiniLineChartToDataUrl = (prices) => {
    // Returns a PNG dataURL (no external libs). Used only when includeCharts is enabled.
    const width = 900;
    const height = 260;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const vals = prices.map(p => p.price);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;

    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    // grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * innerH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // axes
    ctx.strokeStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, height - pad.bottom);
    ctx.lineTo(width - pad.right, height - pad.bottom);
    ctx.stroke();

    // line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    prices.forEach((p, idx) => {
      const x = pad.left + (idx / Math.max(1, prices.length - 1)) * innerW;
      const y = pad.top + (1 - (p.price - min) / range) * innerH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    return canvas.toDataURL('image/png');
  };

  const fetchReportData = async () => {
    // Always try to fetch fresh data (works for Dashboard where predictionData is null).
    const latestResp = await stockAPI.getLatestStockData(symbol);
    const latest = latestResp?.latest || null;

    const histResp = await stockAPI.getStockData(symbol, 30);
    const hist = histResp?.data || [];

    let prediction = predictionData;
    if (!prediction) {
      try {
        const predResp = await predictionAPI.predict({
          symbol,
          model_type: 'LSTM',
          sentiment_type: 'nonsentiment',
          num_csvs: 50,
          prediction_length: 3
        });
        prediction = predResp;
      } catch (e) {
        // Prediction is optional for PDF; don't fail the whole report.
        console.warn('Prediction fetch failed (skipping in report):', e);
        prediction = null;
      }
    }

    return { latest, hist, prediction, sentiment: sentimentData || null };
  };

  const exportAsPDF = async () => {
    const { latest, hist, prediction, sentiment } = await fetchReportData();

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    const title = `FinTrend Report — ${symbol}`;
    const dateStr = new Date().toLocaleString();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, 40, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated: ${dateStr}`, 40, 68);
    doc.setTextColor(0, 0, 0);

    // Stock snapshot
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Stock Snapshot', 40, 95);
    doc.setFont('helvetica', 'normal');

    const close = latest ? (latest.Close ?? latest['Adj close']) : null;
    const vol = latest?.Volume ?? null;
    const lastDate = latest?.Date ? String(latest.Date).split('T')[0] : 'N/A';

    autoTable(doc, {
      startY: 105,
      head: [['Symbol', 'Last Date', 'Close', 'Volume']],
      body: [[
        symbol,
        lastDate,
        close != null ? `$${Number(close).toFixed(2)}` : 'N/A',
        vol != null ? Number(vol).toLocaleString() : 'N/A'
      ]],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    let y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 18 : 150;

    // Optional mini chart
    if (includeCharts && hist.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Price History (Last 30 Days)', 40, y);
      y += 10;

      const series = hist
        .map(r => ({
          date: r.Date ? String(r.Date).split(' ')[0] : '',
          price: Number(r.Close ?? r['Adj close'] ?? 0)
        }))
        .filter(p => p.price > 0);

      const img = drawMiniLineChartToDataUrl(series);
      if (img) {
        const imgW = pageW - 80;
        const imgH = 180;
        doc.addImage(img, 'PNG', 40, y, imgW, imgH);
        y += imgH + 18;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text('(Chart could not be rendered)', 40, y + 12);
        doc.setTextColor(0, 0, 0);
        y += 28;
      }
    }

    // Recent prices table
    if (hist.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Recent Prices (Last 10)', 40, y);
      y += 10;

      const rows = hist.slice(-10).map(r => {
        const price = Number(r.Close ?? r['Adj close'] ?? 0);
        return [
          r.Date ? String(r.Date).split(' ')[0] : 'N/A',
          price ? `$${price.toFixed(2)}` : 'N/A',
          r.Volume != null ? Number(r.Volume).toLocaleString() : 'N/A'
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Close', 'Volume']],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [17, 24, 39] }
      });
      y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 18 : y + 100;
    }

    // Prediction section (if available)
    if (prediction?.predictions?.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Prediction (LSTM)', 40, y);
      y += 10;

      const currentPrice = Number(prediction.current_price ?? 0);
      const preds = prediction.predictions.map((p, i) => [`Step ${i + 1}`, `$${Number(p).toFixed(2)}`]);

      autoTable(doc, {
        startY: y,
        head: [['Current', currentPrice ? `$${currentPrice.toFixed(2)}` : 'N/A']],
        body: preds,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [16, 185, 129] }
      });
      y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 18 : y + 120;
    }

    // Sentiment section (if available)
    if (sentiment) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Sentiment', 40, y);
      y += 10;
      autoTable(doc, {
        startY: y,
        head: [['Overall', 'Score', 'Articles']],
        body: [[sentiment.overall ?? 'N/A', sentiment.score ?? 'N/A', sentiment.totalArticles ?? 'N/A']],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [99, 102, 241] }
      });
    }

    doc.save(`FinTrend_Report_${symbol}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportAsJSON = () => {
    const jsonData = {
      exportDate: new Date().toISOString(),
      stockData: stockData || { symbol: 'AAPL', price: 178.45 },
      predictionData: predictionData || { trend: 'Bullish', confidence: 85 },
      sentimentData: sentimentData || { overall: 'Positive', score: 0.68 }
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `FinTrend_Report_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSVContent = () => {
    let csv = 'FinTrend Analysis Report\n';
    csv += `Export Date,${new Date().toLocaleString()}\n\n`;
    
    csv += 'Stock Information\n';
    csv += 'Symbol,Price,Change,Change %\n';
    csv += `${stockData?.symbol || 'AAPL'},${stockData?.price || '178.45'},${stockData?.change || '2.34'},${stockData?.changePercent || '1.33%'}\n\n`;
    
    csv += 'Prediction Results\n';
    csv += 'Trend,Confidence,Predicted Price,Model Used\n';
    csv += `${predictionData?.trend || 'Bullish'},${predictionData?.confidence || '85%'},${predictionData?.predictedPrice || '185.67'},${predictionData?.model || 'LSTM'}\n\n`;
    
    csv += 'Sentiment Analysis\n';
    csv += 'Overall Sentiment,Sentiment Score,Total Articles\n';
    csv += `${sentimentData?.overall || 'Positive'},${sentimentData?.score || '0.68'},${sentimentData?.totalArticles || '15'}\n\n`;
    
    return csv;
  };

  return (
    <div className="export-report-container">
      <div className="export-header">
        <h3>📥 Export Report</h3>
        <p>Download your analysis data for offline use</p>
      </div>

      <div className="export-options">
        <div className="option-group">
          <label>Export Format</label>
          <div className="format-buttons">
            <button
              className={`format-btn ${exportFormat === 'csv' ? 'active' : ''}`}
              onClick={() => setExportFormat('csv')}
            >
              📊 CSV
            </button>
            <button
              className={`format-btn ${exportFormat === 'pdf' ? 'active' : ''}`}
              onClick={() => setExportFormat('pdf')}
            >
              📄 PDF
            </button>
            <button
              className={`format-btn ${exportFormat === 'json' ? 'active' : ''}`}
              onClick={() => setExportFormat('json')}
            >
              🔧 JSON
            </button>
          </div>
        </div>

        <div className="option-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeCharts}
              onChange={(e) => setIncludeCharts(e.target.checked)}
            />
            <span>Include charts and visualizations (PDF only)</span>
          </label>
        </div>

        <div className="export-info">
          <h4>Export will include:</h4>
          <ul>
            <li>✅ Stock information and current prices</li>
            <li>✅ Prediction results and trend forecasts</li>
            <li>✅ Sentiment analysis data</li>
            <li>✅ Technical indicators</li>
            <li>✅ Historical data points</li>
            {includeCharts && exportFormat === 'pdf' && <li>✅ Charts and graphs</li>}
          </ul>
        </div>

        <button
          className="export-btn"
          onClick={handleExport}
          disabled={exportLoading}
        >
          {exportLoading ? '⏳ Exporting...' : `📥 Export as ${exportFormat.toUpperCase()}`}
        </button>

        {exportError && (
          <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>
            ❌ {exportError}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportReport;
