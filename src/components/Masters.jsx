import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Masters() {
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', sku: '', itemName: '', uom: 'pcs' });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [s, i] = await Promise.all([api.get('/suppliers'), api.get('/items')]);
      setSuppliers(s); setItems(i);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  const addSupplier = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/suppliers', { name: form.name });
      setForm({ ...form, name: '' });
      load();
    } catch (e) { setError(e.message); }
  };

  const addItem = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/items', { sku: form.sku, name: form.itemName, uom: form.uom });
      setForm({ ...form, sku: '', itemName: '' });
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Masters</h2>
      {error && <div className="text-red-400 mb-3">{error}</div>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">Suppliers</h3>
          <form onSubmit={addSupplier} className="flex gap-2 mb-3">
            <input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} placeholder="Supplier name" className="flex-1 px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            <button className="px-3 py-2 bg-blue-600 text-white rounded">Add</button>
          </form>
          <ul className="text-blue-200 text-sm space-y-1 max-h-60 overflow-auto">
            {suppliers.map(s=> <li key={s.id} className="border-b border-slate-700/50 py-1">{s.name}</li>)}
          </ul>
        </div>
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">Items</h3>
          <form onSubmit={addItem} className="grid grid-cols-4 gap-2 mb-3">
            <input value={form.sku} onChange={e=>setForm(f=>({...f, sku:e.target.value}))} placeholder="SKU" className="col-span-1 px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            <input value={form.itemName} onChange={e=>setForm(f=>({...f, itemName:e.target.value}))} placeholder="Name" className="col-span-2 px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            <input value={form.uom} onChange={e=>setForm(f=>({...f, uom:e.target.value}))} placeholder="UOM" className="col-span-1 px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            <button className="col-span-4 px-3 py-2 bg-blue-600 text-white rounded">Add</button>
          </form>
          <ul className="text-blue-200 text-sm space-y-1 max-h-60 overflow-auto">
            {items.map(i=> <li key={i.id} className="border-b border-slate-700/50 py-1">{i.sku} — {i.name}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
