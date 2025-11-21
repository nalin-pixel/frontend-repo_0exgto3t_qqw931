import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Reports() {
  const [prList, setPrList] = useState([]);
  const [poList, setPoList] = useState([]);
  const [prId, setPrId] = useState('');
  const [poId, setPoId] = useState('');
  const [prReport, setPrReport] = useState(null);
  const [poReport, setPoReport] = useState(null);

  useEffect(()=>{ (async()=>{
    setPrList(await api.get('/purchase-requisitions'));
    setPoList(await api.get('/purchase-orders'));
  })(); },[]);

  const loadPR = async ()=> {
    if(!prId) return;
    setPrReport(await api.get(`/reports/pr-vs-po?pr_id=${prId}`));
  };
  const loadPO = async ()=> {
    if(!poId) return;
    setPoReport(await api.get(`/reports/po-vs-grn?po_id=${poId}`));
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Reports</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">PR vs PO</h3>
          <div className="flex gap-2">
            <select value={prId} onChange={e=>setPrId(e.target.value)} className="px-2 py-1 bg-slate-900 text-white rounded">
              <option value="">Select PR</option>
              {prList.map(pr=> <option key={pr.id} value={pr.id}>{pr.pr_number}</option>)}
            </select>
            <button onClick={loadPR} className="px-2 py-1 bg-blue-600 text-white rounded">Run</button>
          </div>
          {prReport && (
            <div className="text-blue-200 text-sm mt-3">
              {prReport.rows.map((r,idx)=> <div key={idx} className="grid grid-cols-5 gap-2 text-xs border-b border-slate-700 py-1"><div>{r.item_name}</div><div>Req: {r.requested_qty}</div><div>Ord: {r.ordered_qty}</div><div>Var: {r.variance}</div></div>)}
            </div>
          )}
        </div>
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">PO vs GRN</h3>
          <div className="flex gap-2">
            <select value={poId} onChange={e=>setPoId(e.target.value)} className="px-2 py-1 bg-slate-900 text-white rounded">
              <option value="">Select PO</option>
              {poList.map(po=> <option key={po.id} value={po.id}>{po.po_number}</option>)}
            </select>
            <button onClick={loadPO} className="px-2 py-1 bg-blue-600 text-white rounded">Run</button>
          </div>
          {poReport && (
            <div className="text-blue-200 text-sm mt-3">
              {poReport.rows.map((r,idx)=> <div key={idx} className="grid grid-cols-5 gap-2 text-xs border-b border-slate-700 py-1"><div>{r.item_name}</div><div>Ord: {r.ordered_qty}</div><div>Recv: {r.received_qty}</div><div>Var: {r.variance}</div></div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
