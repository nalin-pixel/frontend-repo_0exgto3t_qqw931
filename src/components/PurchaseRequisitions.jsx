import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function PurchaseRequisitions() {
  const [prs, setPRs] = useState([]);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ pr_number: '', requested_by: '', department: '', requested_date: new Date().toISOString().slice(0,10), notes: '', items: [] });
  const [newLine, setNewLine] = useState({ item_id: '', qty: 1, target_price: 0, notes: '' });

  const load = async () => {
    try {
      const [pr, it] = await Promise.all([api.get('/purchase-requisitions'), api.get('/items')]);
      setPRs(pr); setItems(it);
    } catch (e) { setError(e.message); }
  };
  useEffect(()=>{ load(); },[]);

  const addLine = () => {
    if(!newLine.item_id) return;
    setForm(f=> ({...f, items:[...f.items, {...newLine, item_id: parseInt(newLine.item_id)}]}));
    setNewLine({ item_id:'', qty:1, target_price:0, notes:'' });
  };

  const create = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, items: form.items };
      await api.post('/purchase-requisitions', payload);
      setForm({ pr_number:'', requested_by:'', department:'', requested_date: new Date().toISOString().slice(0,10), notes:'', items: [] });
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Purchase Requisitions</h2>
      {error && <div className="text-red-400 mb-3">{error}</div>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">Create PR</h3>
          <form onSubmit={create} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={form.pr_number} onChange={e=>setForm(f=>({...f, pr_number:e.target.value}))} placeholder="PR number" className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
              <input value={form.requested_by} onChange={e=>setForm(f=>({...f, requested_by:e.target.value}))} placeholder="Requested by" className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
              <input value={form.department} onChange={e=>setForm(f=>({...f, department:e.target.value}))} placeholder="Department" className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
              <input type="date" value={form.requested_date} onChange={e=>setForm(f=>({...f, requested_date:e.target.value}))} className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            </div>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))} placeholder="Notes" className="w-full px-3 py-2 bg-slate-900 text-white rounded outline-none"/>

            <div className="bg-slate-900 rounded p-2">
              <div className="grid grid-cols-5 gap-2">
                <select value={newLine.item_id} onChange={e=>setNewLine(l=>({...l, item_id:e.target.value}))} className="px-2 py-1 bg-slate-800 text-white rounded">
                  <option value="">Select item</option>
                  {items.map(i=> <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
                </select>
                <input type="number" step="0.01" value={newLine.qty} onChange={e=>setNewLine(l=>({...l, qty: parseFloat(e.target.value)}))} className="px-2 py-1 bg-slate-800 text-white rounded" placeholder="Qty"/>
                <input type="number" step="0.01" value={newLine.target_price} onChange={e=>setNewLine(l=>({...l, target_price: parseFloat(e.target.value)}))} className="px-2 py-1 bg-slate-800 text-white rounded" placeholder="Target price"/>
                <input value={newLine.notes} onChange={e=>setNewLine(l=>({...l, notes:e.target.value}))} className="px-2 py-1 bg-slate-800 text-white rounded" placeholder="Line notes"/>
                <button type="button" onClick={addLine} className="px-2 py-1 bg-blue-600 text-white rounded">Add</button>
              </div>
              <div className="text-blue-200 text-sm mt-2 space-y-1">
                {form.items.map((ln,idx)=> (
                  <div key={idx} className="flex justify-between">
                    <div>#{idx+1}</div>
                    <div>{items.find(i=>i.id===ln.item_id)?.name}</div>
                    <div>{ln.qty} @ target {ln.target_price}</div>
                  </div>
                ))}
              </div>
            </div>

            <button className="px-3 py-2 bg-green-600 text-white rounded">Create PR</button>
          </form>
        </div>

        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">Recent PRs</h3>
          <div className="text-blue-200 text-sm max-h-96 overflow-auto space-y-2">
            {prs.map(pr=> (
              <div key={pr.id} className="border border-slate-700 rounded p-2">
                <div className="flex justify-between text-blue-300"><div>{pr.pr_number}</div><div>Status: {pr.status}</div></div>
                <div className="text-xs">Dept: {pr.department || '-'} | By: {pr.requested_by || '-'}</div>
                <div className="text-xs">Requested: {pr.requested_date}</div>
                <div className="text-xs">Lines: {pr.items.length}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
