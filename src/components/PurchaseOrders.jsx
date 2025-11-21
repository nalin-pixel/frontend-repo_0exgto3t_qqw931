import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

export default function PurchaseOrders() {
  const [pos, setPOs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ po_number: '', supplier_id: '', items: [] , tax_code: 'VAT' });
  const [newLine, setNewLine] = useState({ item_id: '', qty_ordered: 1, unit_price: 0 });
  const [error, setError] = useState('');
  const [totals, setTotals] = useState(null);

  const load = async () => {
    try {
      const [po, s, i] = await Promise.all([api.get('/purchase-orders'), api.get('/suppliers'), api.get('/items')]);
      setPOs(po); setSuppliers(s); setItems(i);
    } catch (e) { setError(e.message); }
  };
  useEffect(()=>{ load(); },[]);

  useEffect(()=>{ // recalc totals on change
    if (form.po_id) {
      api.get(`/purchase-orders/${form.po_id}/totals?tax_code=${encodeURIComponent(form.tax_code||'')}`).then(setTotals).catch(()=>{});
    }
  }, [form.po_id, form.tax_code]);

  const addLine = () => {
    if(!newLine.item_id) return;
    setForm(f=>({...f, items:[...f.items, {...newLine, item_id: parseInt(newLine.item_id)}]}));
    setNewLine({ item_id:'', qty_ordered:1, unit_price:0 });
  };

  const create = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { po_number: form.po_number, supplier_id: parseInt(form.supplier_id), items: form.items };
      const res = await api.post('/purchase-orders', payload);
      setForm({ po_number:'', supplier_id:'', items: [], tax_code: 'VAT', po_id: res.id });
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Purchase Orders</h2>
      {error && <div className="text-red-400 mb-3">{error}</div>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">Create PO</h3>
          <form onSubmit={create} className="space-y-3">
            <input value={form.po_number} onChange={e=>setForm(f=>({...f, po_number:e.target.value}))} placeholder="PO number" className="w-full px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            <select value={form.supplier_id} onChange={e=>setForm(f=>({...f, supplier_id:e.target.value}))} className="w-full px-3 py-2 bg-slate-900 text-white rounded outline-none">
              <option value="">Select supplier</option>
              {suppliers.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="bg-slate-900 rounded p-2">
              <div className="grid grid-cols-4 gap-2">
                <select value={newLine.item_id} onChange={e=>setNewLine(l=>({...l, item_id:e.target.value}))} className="px-2 py-1 bg-slate-800 text-white rounded">
                  <option value="">Select item</option>
                  {items.map(i=> <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
                </select>
                <input type="number" step="0.01" value={newLine.qty_ordered} onChange={e=>setNewLine(l=>({...l, qty_ordered: parseFloat(e.target.value)}))} className="px-2 py-1 bg-slate-800 text-white rounded" placeholder="Qty"/>
                <input type="number" step="0.01" value={newLine.unit_price} onChange={e=>setNewLine(l=>({...l, unit_price: parseFloat(e.target.value)}))} className="px-2 py-1 bg-slate-800 text-white rounded" placeholder="Unit price"/>
                <button type="button" onClick={addLine} className="px-2 py-1 bg-blue-600 text-white rounded">Add</button>
              </div>
              <div className="text-blue-200 text-sm mt-2 space-y-1">
                {form.items.map((ln,idx)=> <div key={idx} className="flex justify-between"><div>#{idx+1}</div><div>{items.find(i=>i.id===ln.item_id)?.name}</div><div>{ln.qty_ordered} x {ln.unit_price}</div></div>)}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-blue-200 text-sm">Tax code</label>
              <input value={form.tax_code} onChange={e=>setForm(f=>({...f, tax_code:e.target.value}))} className="px-2 py-1 bg-slate-900 text-white rounded"/>
            </div>
            <button className="px-3 py-2 bg-green-600 text-white rounded">Create</button>
          </form>
          {form.po_id && totals && (
            <div className="mt-4 text-blue-200 text-sm">
              <div>Subtotal: {totals.subtotal}</div>
              <div>Tax ({totals.tax_percent}%): {totals.tax_amount}</div>
              <div className="font-semibold">Grand Total: {totals.grand_total}</div>
              <div className="text-xs">Applied: {totals?.tax?.code} — {totals?.tax?.rate_percent}%</div>
            </div>
          )}
        </div>
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">Recent POs</h3>
          <div className="text-blue-200 text-sm max-h-96 overflow-auto space-y-2">
            {pos.map(po=> (
              <div key={po.id} className="border border-slate-700 rounded p-2">
                <div className="flex justify-between text-blue-300"><div>{po.po_number}</div><div>Status: {po.status}</div></div>
                <div className="text-xs">Supplier: {suppliers.find(s=>s.id===po.supplier_id)?.name || po.supplier_id}</div>
                <div className="text-xs">Lines: {po.items.length}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
