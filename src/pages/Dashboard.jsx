import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function Kpi({ label, value, unit, color }) {
  return (
    <div className="kpi" style={{ borderTopColor: color }}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value ?? '-'}{value != null && unit && <small> {unit}</small>}</span>
    </div>
  );
}

function HBars({ data, color = '#0d6efd', labelKey = 'name' }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (!data.length) return <p className="muted">No data</p>;
  return (
    <div className="hbars">
      {data.map((d) => (
        <div className="hbar" key={d[labelKey]}>
          <span className="hbar-label" title={d[labelKey]}>{d[labelKey]}</span>
          <div className="hbar-track"><div className="hbar-fill" style={{ width: (d.count / max) * 100 + '%', background: color }} /></div>
          <span className="hbar-val">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function Columns({ data, labelKey, color = '#0d6efd' }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="cols">
      {data.map((d) => (
        <div className="col" key={d[labelKey]}>
          <span className="col-val">{d.count}</span>
          <div className="col-bar" style={{ height: (d.count / max) * 100 + '%', background: color }} />
          <span className="col-label">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.stats().then(setS).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="page"><div className="err big">{error}</div></div>;
  if (!s) return <div className="page">Loading...</div>;
  const pct = s.total ? Math.round((s.completed / s.total) * 100) : 0;

  return (
    <div className="page dash">
      <div className="atr-dht-div-title" style={{ paddingTop: 0 }}>
        <span className="atr-head-icon"><i className="mdi mdi-view-dashboard-outline" /></span>
        <div>
          <p className="atr-dht-title">Dashboard</p>
          <p className="atr-dht-subtitle">Overview of all legal requests</p>
        </div>
      </div>
      <hr className="atr-hr" />

      <div className="kpis">
        <Kpi label="Total requests" value={s.total} color="#0d6efd" />
        <Kpi label="In progress" value={s.inProgress} color="#ff974a" />
        <Kpi label="Completed" value={`${s.completed} (${pct}%)`} color="#1e8e4a" />
        <Kpi label="Avg. time to complete" value={s.avgDaysToComplete} unit="days" color="#6844ff" />
      </div>

      <div className="dash-grid">
        <section className="card-box wide">
          <h3>Requests by step</h3>
          <Columns data={s.byStep.map((d) => ({ ...d, label: d.step }))} labelKey="label" />
          <p className="muted small">1 Fill out · 2 Submitting · 3 Waiting acceptance · 4 Reviewing · 5 Waiting comment · 6 User approved · 7 Finalizing · 8 Final approval · 9 Signing · 10 Complete</p>
        </section>
        <section className="card-box">
          <h3>By type of request</h3>
          <HBars data={s.byType} />
        </section>
        <section className="card-box">
          <h3>By matter</h3>
          <HBars data={s.byMatter} color="#6844ff" />
        </section>
        <section className="card-box wide">
          <h3>Requests created (last 6 months)</h3>
          <Columns data={s.byMonth} labelKey="month" color="#0778ff" />
        </section>
        <section className="card-box wide">
          <h3>Stalled requests <small className="muted">(no update for 7+ days)</small></h3>
          {s.stalled.length === 0 ? <p className="muted">Nothing stalled 🎉</p> : (
            <table className="tbl"><thead><tr><th>No.</th><th>Title</th><th>Current step</th><th>Days idle</th></tr></thead>
              <tbody>{s.stalled.map((r) => (
                <tr key={r.id}><td><Link to={'/requests/' + r.id}>{r.no}</Link></td><td>{r.title}</td><td>{r.step_name}</td><td>{r.days}</td></tr>
              ))}</tbody></table>
          )}
        </section>
      </div>
    </div>
  );
}
