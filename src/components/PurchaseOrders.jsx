import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

export default function PurchaseOrders() {
  const [pos, setPOs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [prs, setPRs] = useState([]);
  const [form, setForm] = useState({ po_number: '', supplier_id: '', pr_id: '', order_date: new Date().toISOString().slice(0,10), items: [] , tax_code: 'VAT' });
  const [newLine, setNewLine] = useState({ item_id: '', qty_ordered: 1, unit_price: 0 });
  const [error, setError] = useState('');
  const [totals, setTotals] = useState(null);

  const load = async () => {
    try {
      const [po, s, i, pr] = await Promise.all([
        api.get('/purchase-orders'),
        api.get('/suppliers'),
        api.get('/items'),
        api.get('/purchase-requisitions'),
      ]);
      setPOs(po); setSuppliers(s); setItems(i); setPRs(pr);
    } catch (e) { setError(e.message); }
  };
  useEffect(()=>{ load(); },[]);

  useEffect(()=>{ // recalc totals on change
    if (form.po_id) {
      api.get(`/purchase-orders/${form.po_id}/totals?tax_code=${encodeURIComponent(form.tax_code||'')}`).then(setTotals).catch(()=>{});
    }
  }, [form.po_id, form.tax_code]);

  const onSelectPR = (prIdStr) => {
    const prId = prIdStr ? parseInt(prIdStr) : '';
    setForm(f=> ({...f, pr_id: prId, items: [], supplier_id: ''}));
    if (!prId) return;
    const pr = prs.find(p=>p.id===prId);
    if (!pr) return;
    // Prefill items from PR
    const derived = (pr.items||[]).map(li=> ({
      item_id: li.item_id,
      qty_ordered: parseFloat(li.qty_kgs ?? li.qty_bags ?? 0) || 0,
      unit_price: parseFloat(li.unit_price ?? 0) || 0,
    }));
    setForm(f=> ({...f, pr_id: prId, items: derived}));
  };

  const addLine = () => {
    if(!newLine.item_id) return;
    setForm(f=>({...f, items:[...f.items, {...newLine, item_id: parseInt(newLine.item_id)}]}));
    setNewLine({ item_id:'', qty_ordered:1, unit_price:0 });
  };

  const create = async (e) => {
    e.preventDefault(); setError(''); setTotals(null);
    if(!form.po_number){ setError('PO reference number is required'); return; }
    if(!form.pr_id && !form.supplier_id){ setError('Select a PR or choose a supplier'); return; }
    if(form.items.length === 0 && !form.pr_id){ setError('Add at least one item or select a PR'); return; }
    try {
      const payload = {
        po_number: form.po_number,
        order_date: form.order_date,
        tax_code: form.tax_code || undefined,
        pr_id: form.pr_id || undefined,
        supplier_id: form.pr_id ? undefined : (form.supplier_id ? parseInt(form.supplier_id) : undefined),
        items: form.items,
      };
      const res = await api.post('/purchase-orders', payload);
      setForm({ po_number:'', supplier_id:'', pr_id:'', order_date: new Date().toISOString().slice(0,10), items: [], tax_code: 'VAT', po_id: res.id });
      load();
    } catch (e) { setError(e.message); }
  };

  const approve = async (poId, decision) => {
    try {
      await api.post(`/purchase-orders/${poId}/approve`, { decision });
      load();
    } catch (e) { setError(e.message); }
  };

  const selectedPR = useMemo(()=> prs.find(p=>p.id === (typeof form.pr_id==='number' ? form.pr_id : parseInt(form.pr_id))) , [prs, form.pr_id]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Purchase Orders</h2>
      {error && <div className="text-red-400 mb-3">{error}</div>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">Create PO</h3>
          <form onSubmit={create} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={form.po_number} onChange={e=>setForm(f=>({...f, po_number:e.target.value}))} placeholder="PO ref no" className="w-full px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
              <input type="date" value={form.order_date} onChange={e=>setForm(f=>({...f, order_date:e.target.value}))} className="w-full px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select value={form.pr_id} onChange={e=>onSelectPR(e.target.value)} className="w-full px-3 py-2 bg-slate-900 text-white rounded outline-none">
                <option value="">Select PR (prefill)</option>
                {prs.map(pr => (
                  <option key={pr.id} value={pr.id}>{pr.pr_number} — {pr.customer_name || ''} / {pr.customer_ref_no || ''}</option>
                ))}
              </select>
              {selectedPR ? (
                <input disabled value={`Supplier: ${selectedPR.supplier_name || '-'} | Tax: ${selectedPR.tax_code || '-'} (${selectedPR.tax_percent ?? '-'}%)`} className="w-full px-3 py-2 bg-slate-900 text-blue-200 rounded outline-none"/>
              ) : (
                <select value={form.supplier_id} onChange={e=>setForm(f=>({...f, supplier_id:e.target.value}))} className="w-full px-3 py-2 bg-slate-900 text-white rounded outline-none">
                  <option value="">Select supplier</option>
                  {suppliers.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>

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
              <label className="text-blue-200 text-sm">VAT/Tax code</label>
              <input value={form.tax_code} onChange={e=>setForm(f=>({...f, tax_code:e.target.value}))} className="px-2 py-1 bg-slate-900 text-white rounded"/>
            </div>
            <button className="px-3 py-2 bg-green-600 text-white rounded">Create</button>
          </form>
          {form.po_id && totals && (
            <div className="mt-4 text-blue-200 text-sm">
              <div>Subtotal: {totals.subtotal}</div>
              <div>Tax ({totals.tax_percent}%): {totals.tax_amount}</div>
              <div className="font-semibold">Grand Total: {totals.grand_total}</div>
              {totals?.tax && <div className="text-xs">Applied: {totals.tax.code} — {totals.tax.rate_percent}%</div>}
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
                <div className="text-xs">Approval: {po.approval_status || 'PENDING'} {po.approval_level ? `(L${po.approval_level})` : ''}</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={()=>approve(po.id,'approve')} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">Approve</button>
                  <button onClick={()=>approve(po.id,'reject')} className="px-2 py-1 bg-rose-600 text-white rounded text-xs">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
