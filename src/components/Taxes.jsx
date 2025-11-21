import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Taxes() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ code: 'VAT', name: 'Value Added Tax', rate_percent: 5, effective_date: new Date().toISOString().slice(0,10), is_active: 1 });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api.get('/taxes');
      setRows(data);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/taxes', form);
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Taxes</h2>
      {error && <div className="text-red-400 mb-3">{error}</div>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">Add/Adjust Tax Rate</h3>
          <form onSubmit={add} className="grid grid-cols-2 gap-2">
            <input value={form.code} onChange={e=>setForm(f=>({...f, code:e.target.value}))} placeholder="Code" className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            <input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} placeholder="Name" className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            <input type="number" step="0.01" value={form.rate_percent} onChange={e=>setForm(f=>({...f, rate_percent: parseFloat(e.target.value)}))} placeholder="Rate %" className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            <input type="date" value={form.effective_date} onChange={e=>setForm(f=>({...f, effective_date:e.target.value}))} className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            <label className="col-span-2 text-blue-200 text-sm flex items-center gap-2"><input type="checkbox" checked={!!form.is_active} onChange={e=>setForm(f=>({...f, is_active: e.target.checked?1:0}))}/> Active</label>
            <button className="col-span-2 px-3 py-2 bg-blue-600 text-white rounded">Save</button>
          </form>
        </div>
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">History</h3>
          <div className="text-blue-200 text-sm max-h-80 overflow-auto">
            <table className="w-full text-left">
              <thead className="text-blue-300">
                <tr><th className="py-1">Code</th><th>Name</th><th>Rate %</th><th>Effective</th><th>Active</th></tr>
              </thead>
              <tbody>
                {rows.map(r=> (
                  <tr key={r.id} className="border-t border-slate-700/50">
                    <td className="py-1">{r.code}</td>
                    <td>{r.name}</td>
                    <td>{r.rate_percent}</td>
                    <td>{r.effective_date}</td>
                    <td>{r.is_active? 'Yes':'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
