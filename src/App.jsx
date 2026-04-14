  import { useState, useEffect } from 'react';
  import axios from 'axios';

  const ALL_ASSETS = [
    { id: 'BTCUSDT', name: 'Bitcoin',  color: '#F7931A', type: 'Crypto' },
    { id: 'ETHUSDT', name: 'Ethereum', color: '#8B5CF6', type: 'Crypto' },
    { id: 'SOLUSDT', name: 'Solana',   color: '#14F195', type: 'Crypto' },
    { id: 'BNBUSDT', name: 'BNB',      color: '#F3BA2F', type: 'Crypto' },
    { id: 'XRPUSDT', name: 'XRP',      color: '#00AAE4', type: 'Crypto' },
    { id: 'AAPL',    name: 'Apple',    color: '#E8E8E8', type: 'Stock'  },
    { id: 'TSLA',    name: 'Tesla',    color: '#E82127', type: 'Stock'  },
    { id: 'GLD',     name: 'Gold',     color: '#FFD700', type: 'Macro'  },
    { id: 'SPY',     name: 'S&P 500',  color: '#4ADE80', type: 'Macro'  },
  ];

const TWELVE_DATA_API_KEY = import.meta.env.VITE_TWELVE_DATA_KEY;

  const toReturns = (prices) =>
    prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);

  const pearson = (x, y) => {
    const n = x.length;
    if (n === 0) return 0;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    const num = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0);
    const den =
      Math.sqrt(x.reduce((s, xi) => s + (xi - mx) ** 2, 0)) *
      Math.sqrt(y.reduce((s, yi) => s + (yi - my) ** 2, 0));
    return den === 0 ? 0 : num / den;
  };

  const getResult = (r, nameA, nameB) => {
    if (r > 0.7)  return { label: 'Strongly correlated',   color: '#4ADE80', sub: `${nameA} and ${nameB} tend to rise and fall together.` };
    if (r > 0.4)  return { label: 'Moderately correlated', color: '#A3E635', sub: `Some shared movement, but not always in sync.` };
    if (r > 0)    return { label: 'Weakly correlated',     color: '#94A3B8', sub: `Mostly independent. Minor shared tendencies.` };
    if (r > -0.4) return { label: 'Weakly inverse',        color: '#94A3B8', sub: `Mostly independent. Slight opposite tendencies.` };
    if (r > -0.7) return { label: 'Moderately inverse',    color: '#FB923C', sub: `They often move in opposite directions.` };
    return               { label: 'Strongly inverse',      color: '#F87171', sub: `When ${nameA} rises, ${nameB} tends to fall.` };
  };

  export default function App() {
    const [prices,  setPrices]  = useState({});
    const [loading, setLoading] = useState(true);
    const [assetA,  setAssetA]  = useState(null);
    const [assetB,  setAssetB]  = useState(null);

    

    useEffect(() => {
      const fetchAll = async () => {
        try {
          const fetched = {};
          for (const a of ALL_ASSETS.filter(a => a.type === 'Crypto')) {
            const res = await axios.get(
              `https://api.binance.com/api/v3/klines?symbol=${a.id}&interval=1d&limit=30`
            );
            fetched[a.id] = res.data.map(d => parseFloat(d[4]));
          }
          const others = ALL_ASSETS.filter(a => a.type !== 'Crypto');
          const ids    = others.map(a => a.id).join(',');
          const res    = await axios.get(
            `https://api.twelvedata.com/time_series?symbol=${ids}&interval=1day&outputsize=30&apikey=${TWELVE_DATA_API_KEY}`
          );
          others.forEach(a => {
            const s = res.data[a.id];
            if (s?.values) fetched[a.id] = s.values.map(v => parseFloat(v.close)).reverse();
          });
          setPrices(fetched);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchAll();
    }, []);

    const handleSelect = (id) => {
      if (!assetA)              { setAssetA(id); return; }
      if (id === assetA)        { setAssetA(assetB); setAssetB(null); return; }
      if (!assetB)              { setAssetB(id); return; }
      if (id === assetB)        { setAssetB(null); return; }
      setAssetB(id);
    };

    const result = (() => {
      if (!assetA || !assetB || !prices[assetA] || !prices[assetB]) return null;
      const pa = prices[assetA], pb = prices[assetB];
      const n  = Math.min(pa.length, pb.length);
      const r  = pearson(toReturns(pa.slice(-n)), toReturns(pb.slice(-n)));
      const nameA = ALL_ASSETS.find(a => a.id === assetA)?.name;
      const nameB = ALL_ASSETS.find(a => a.id === assetB)?.name;
      return { r, ...getResult(r, nameA, nameB) };
    })();

    const getName  = id => ALL_ASSETS.find(a => a.id === id)?.name  || id;
    const getColor = id => ALL_ASSETS.find(a => a.id === id)?.color || '#fff';

    const grouped = [
      { label: 'Crypto', assets: ALL_ASSETS.filter(a => a.type === 'Crypto') },
      { label: 'Stocks', assets: ALL_ASSETS.filter(a => a.type === 'Stock')  },
      { label: 'Macro',  assets: ALL_ASSETS.filter(a => a.type === 'Macro')  },
    ];

    const stepA = assetA ? 'done'   : 'active';
    const stepB = assetA ? (assetB ? 'done' : 'active') : '';

    return (
      <div className="app">
        <h1 className="heading">SynchroMesh</h1>
        <p className="subheading">Select two assets · see how they correlate · 30-day returns</p>

      
        <div className="steps">
          <div className={`step ${stepA}`}>
            <div className="step-num">{assetA ? '✓' : '1'}</div>
            <span>{assetA ? getName(assetA) : 'Pick first asset'}</span>
          </div>
          <span className="divider-dot">·</span>
          <div className={`step ${stepB}`}>
            <div className="step-num">{assetB ? '✓' : '2'}</div>
            <span>{assetB ? getName(assetB) : 'Pick second asset'}</span>
          </div>
        </div>

        {loading ? (
          <p className="loading">Fetching market data...</p>
        ) : (
          <>
          
            {grouped.map(g => (
              <div key={g.label}>
                <p className="group-label">{g.label}</p>
                <div className="pills">
                  {g.assets.map(a => {
                    const isA = assetA === a.id;
                    const isB = assetB === a.id;
                    return (
                      <button
                        key={a.id}
                        className={`pill${isA ? ' selected-a' : isB ? ' selected-b' : ''}`}
                        style={isA || isB ? { background: a.color, borderColor: a.color } : {}}
                        onClick={() => handleSelect(a.id)}
                      >
                        {a.name}
                        {isA && <span className="pill-tag">A</span>}
                        {isB && <span className="pill-tag">B</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

           
            {result ? (
              <div className="result-card">
                
                <div className="pair-row">
                  <div className="pair-asset">
                    <div className="asset-dot" style={{ background: getColor(assetA) }} />
                    {getName(assetA)}
                  </div>
                  <span className="pair-arrow">↔</span>
                  <div className="pair-asset">
                    <div className="asset-dot" style={{ background: getColor(assetB) }} />
                    {getName(assetB)}
                  </div>
                </div>

                
                <div className="score-block">
                  <div className="score-number" style={{ color: result.color }}>
                    {result.r.toFixed(2)}
                  </div>
                  <div className="score-label" style={{ color: result.color }}>
                    {result.label}
                  </div>
                </div>

               
                <div className="slider-wrap">
                  <div className="slider-track">
                    <div className="slider-dot" style={{
                      left: `${((result.r + 1) / 2) * 100}%`,
                      background: result.color,
                    }} />
                  </div>
                  <div className="slider-labels">
                    <span>-1 · opposite</span>
                    <span>0 · no link</span>
                    <span>+1 · together</span>
                  </div>
                </div>

                
                <div className="explanation">{result.sub}</div>

                <button className="reset-btn" onClick={() => { setAssetA(null); setAssetB(null); }}>
                  reset
                </button>
              </div>
            ) : (assetA || assetB) ? (
              <div className="waiting">
                {assetA ? `${getName(assetA)} selected — pick one more` : 'Pick an asset above'}
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }