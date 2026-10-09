import { useNavigate } from 'react-router-dom';
import { REQUEST_TYPES } from '../data/requestTypes';
import { matterCode } from './TrackingList.jsx';

export default function AllTypeRequest() {
  const nav = useNavigate();
  return (
    <div className="page atr">
      <div className="atr-div-header-title">
        <div className="atr-header-row">
          <div className="atr-dht-div-title">
            <i className="mdi mdi-book-open-page-variant-outline atr-head-icon" style={{ display: 'none' }} />
            <span className="atr-head-icon"><i className="mdi mdi-view-column-outline" /></span>
            <div>
              <p className="atr-dht-title">All Type of Request</p>
              <p className="atr-dht-subtitle">Which type of request are you looking for?</p>
            </div>
          </div>
          <button className="btn btn-primary atr-title-btn-create" onClick={() => nav('/create-requests')}>
            <i className="mdi mdi-plus" /> Create Request
          </button>
        </div>
        <hr className="atr-hr" />
      </div>

      {REQUEST_TYPES.map((t) => (
        <section key={t.name}>
          <p className="atr-title-request-type">{t.name}</p>
          <div className="atr-grid">
            {t.matters.map((m) => (
              <button key={m.name} className="atr-btn-sub-request-type"
                onClick={() => nav('/request-form/' + matterCode(m.name))}>
                <i className="mdi mdi-book-open-blank-variant atr-icon-sub-request-type" style={{ color: m.color }} />
                {m.name}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
