import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Approvals() {
  const [docType, setDocType] = useState('PO');
  const [stages, setStages] = useState([{ name: 'Manager' }, { name: 'Finance' }]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError(''); setMsg('');
    try {
      const path = docType === 'PO' ? '/approvals/po-flow' : '/approvals/pr-flow';
      const res = await api.get(path);
      const rows = Array.isArray(res?.stages) ? res.stages : [];
      setStages(rows.length ? rows.map((s, idx) => ({ name: s.name || s.stage || `Level ${idx+1}` })) : []);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [docType]);

  const addStage = () => setStages(s => [...s, { name: '' }]);
  const removeStage = (idx) => setStages(s => s.filter((_,i)=>i!==idx));
  const updateStage = (idx, name) => setStages(s => s.map((row,i)=> i===idx ? { ...row, name } : row));

  const save = async () => {
    setLoading(true); setError(''); setMsg('');
    try {
      const payload = { doc_type: docType, stages: stages.map((s, i) => ({ level: i+1, name: (s.name||'').trim() || `Level ${i+1}` })) };
      const path = docType === 'PO' ? '/approvals/po-flow' : '/approvals/pr-flow';
      await api.post(path, payload);
      setMsg('Approval flow saved');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Approval Flows</h2>
      {error && <div className="text-red-400 mb-3">{error}</div>}
      {msg && <div className="text-emerald-400 mb-3">{msg}</div>}

      <div className="flex gap-2 mb-4">
        <button onClick={()=>setDocType('PO')} className={`px-3 py-1 rounded ${docType==='PO'?'bg-blue-600 text-white':'bg-slate-800 text-blue-200'}`}>PO Flow</button>
        <button onClick={()=>setDocType('PR')} className={`px-3 py-1 rounded ${docType==='PR'?'bg-blue-600 text-white':'bg-slate-800 text-blue-200'}`}>PR Flow</button>
      </div>

      <div className="bg-slate-800/60 rounded p-4">
        <div className="text-blue-200 text-sm mb-2">Define the approval stages in order. The first approver is Level 1.</div>
        <div className="space-y-2">
          {stages.map((st, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2 text-blue-300">Level {idx+1}</div>
              <input value={st.name} onChange={e=>updateStage(idx, e.target.value)} placeholder={`Stage name e.g., Manager`} className="col-span-8 px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
              <button onClick={()=>removeStage(idx)} className="col-span-2 px-3 py-2 bg-rose-600 text-white rounded">Remove</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={addStage} className="px-3 py-2 bg-slate-700 text-white rounded">Add Stage</button>
          <button onClick={save} disabled={loading} className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-60">{loading?'Saving...':'Save Flow'}</button>
        </div>
      </div>

      {docType==='PO' && (
        <div className="mt-6 text-blue-200 text-sm">
          <div className="font-semibold text-blue-300 mb-1">Tips</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Stages are versioned by effective save; new POs snapshot the latest flow automatically.</li>
            <li>Approvals progress one level per Approve. Reject immediately cancels the document.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
