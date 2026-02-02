import { useState } from 'react';
import { Zap, Info, FileText } from 'lucide-react';
import { parseElectricityFile } from './utils/dataParser';
import { calculateComparison } from './utils/calculator';
import type { ComparisonResult } from './utils/calculator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area
} from 'recharts';

function App() {
  const [consumptionFile, setConsumptionFile] = useState<File | null>(null);
  const [priceFile, setPriceFile] = useState<File | null>(null);
  const [fixedPrice, setFixedPrice] = useState<number>(8.5);
  const [margin, setMargin] = useState<number>(0.5);
  const [results, setResults] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (!consumptionFile || !priceFile) {
      setError("Valitse molemmat tiedostot jatkaaksesi.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const consumptionData = await parseElectricityFile(consumptionFile);
      const priceData = await parseElectricityFile(priceFile);

      const res = calculateComparison(consumptionData, priceData, fixedPrice, margin);
      setResults(res);
    } catch (err: any) {
      setError("Virhe tiedostojen käsittelyssä: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>ElectricityExplorer</h1>
        <p className="subtitle">Löydä säästöt sähkösopimuksessasi</p>
      </header>

      <div className="grid">
        <div className="card">
          <h2><Zap size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Sopimustiedot</h2>
          <div className="input-group">
            <label>Kiinteä hinta (snt/kWh)</label>
            <input
              type="number"
              value={fixedPrice}
              onChange={(e) => setFixedPrice(parseFloat(e.target.value))}
              step="0.01"
            />
          </div>
          <div className="input-group">
            <label>Pörssisähkön marginaali (snt/kWh)</label>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(parseFloat(e.target.value))}
              step="0.01"
            />
          </div>

          <button className="btn" onClick={handleCalculate} disabled={loading}>
            {loading ? "Lasketaan..." : "Laske vertailu"}
          </button>

          {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}
        </div>

        <div className="card">
          <h2><FileText size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Tiedostot</h2>

          <div className="input-group">
            <label>Sähkönkulutus (Excel/CSV)</label>
            <input type="file" onChange={(e) => setConsumptionFile(e.target.files?.[0] || null)} accept=".xlsx,.csv" />
            {consumptionFile && <p style={{ fontSize: '0.8rem', color: 'var(--success)' }}>✓ {consumptionFile.name}</p>}
          </div>

          <div className="input-group">
            <label>Pörssihinnat (Excel/CSV)</label>
            <input type="file" onChange={(e) => setPriceFile(e.target.files?.[0] || null)} accept=".xlsx,.csv" />
            {priceFile && <p style={{ fontSize: '0.8rem', color: 'var(--success)' }}>✓ {priceFile.name}</p>}
          </div>

          <div className="info-box" style={{ background: 'var(--glass)', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <Info size={16} style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} />
              Vinkki: Hae kulutusdata Oma.Datahubista ja hinta-arkisto esim. Sahkotin.fi -palvelusta.
            </p>
          </div>
        </div>
      </div>

      {results && (
        <div className="grid">
          <div className="card results-hero">
            <h3>Arvioitu säästö vuosi/jaksovälillä</h3>
            <span className={`savings-amount ${results.savings >= 0 ? 'savings-positive' : 'savings-negative'}`}>
              {results.savings >= 0 ? '+' : ''}{results.savings.toFixed(2)} €
            </span>
            <p>{results.savings >= 0 ? 'Säästit pörssisähköllä verrattuna kiinteään hintaan.' : 'Kiinteä hinta tuli halvemmaksi tässä jaksossa.'}</p>

            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Pörssisähkö yhteensä</span>
                <span className="stat-value">{results.spotTotal.toFixed(2)} €</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Kiinteä yhteensä</span>
                <span className="stat-value">{results.fixedTotal.toFixed(2)} €</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Erotus</span>
                <span className="stat-value">{Math.abs(results.savings).toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>Kustannukset kuukausittain</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                    formatter={(value) => [`${Number(value).toFixed(2)} €`]}
                  />
                  <Legend />
                  <Bar name="Pörssisähkö (€)" dataKey="spotPrice" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar name="Kiinteähintainen (€)" dataKey="fixedPrice" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>Hintaeron kertyminen</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={results.monthlyData}>
                  <defs>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                    formatter={(value) => [`${Number(value).toFixed(2)} €`]}
                  />
                  <Area type="monotone" name="Kumulatiivinen säästö (€)" dataKey="cumulativeSavings" stroke="var(--primary)" fillOpacity={1} fill="url(#colorSavings)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
