import { useRef, useState } from 'react';
import { fmtSize } from '../api';

export default function FileDrop({ files, onChange, label = 'เอกสารแนบ (Attachments)' }) {
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  const add = (list) => onChange([...files, ...Array.from(list)]);
  return (
    <div className="filedrop-wrap">
      <label>{label}</label>
      <div className={'filedrop' + (over ? ' over' : '')}
        onClick={() => ref.current.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}>
        <i className="mdi mdi-cloud-upload-outline" />
        <span>คลิกหรือลากไฟล์มาวางที่นี่ (Click or drop files, max 20 MB each)</span>
        <input ref={ref} type="file" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={i}>
              <i className="mdi mdi-paperclip" /> <span className="fn">{f.name}</span>
              <span className="fs">{fmtSize(f.size)}</span>
              <button type="button" className="x" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                <i className="mdi mdi-close" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
