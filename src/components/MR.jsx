import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

function NumberInput({ value, onChange, min=0, step='any', className='' }) {
  return (
    <input type="number" min={min} step={step} value={value}
      onChange={(e)=>onChange(parseFloat(e.target.value||0))}
      className={`px-2 py-1 bg-slate-800 border border-slate-700 rounded w-24 text-right ${className}`} />
  );
}

function ItemRow({ idx, row, items, onUpdate, onRemove, getStock }) {
  const item = items.find(i=>i.id===row.item_id);
  const stock = useMemo(()=> row.item_id ? (getStock(row.item_id)||0) : 0, [row.item_id, getStock]);
  const overIssue = row.qty_issued > stock + 1e-9;
  const overReq = row.qty_issued > row.qty_requested + 1e-9;
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-slate-800">
      <div className="col-span-4">
        <select value={row.item_id||''} onChange={(e)=>onUpdate({ ...row, item_id: e.target.value?parseInt(e.target.value):null })}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1">
          <option value="">Select item</option>
          {items.map(it=> (
            <option key={it.id} value={it.id}>{it.name} ({it.sku})</option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <NumberInput value={row.qty_requested} onChange={(v)=>onUpdate({ ...row, qty_requested: v })} />
      </div>
      <div className="col-span-2">
        <NumberInput value={row.qty_issued} onChange={(v)=>onUpdate({ ...row, qty_issued: v })} />
      </div>
      <div className="col-span-3 text-xs text-slate-400">
        {row.item_id ? (
          <div className="space-y-0.5">
            <div>Stock: <span className="text-slate-200">{stock}</span> {item?.uom}</div>
            {overIssue && <div className="text-orange-300">Issuing more than stock</div>}
            {overReq && <div className="text-pink-300">Issuing more than requested</div>}
          </div>
        ) : <span className="text-slate-500">Select an item</span>}
      </div>
      <div className="col-span-1 flex justify-end">
        <button onClick={()=>onRemove(idx)} className="px-2 py-1 bg-red-600/80 hover:bg-red-600 rounded">Remove</button>
      </div>
    </div>
  );
}

export default function MR() {
  const [items, setItems] = useState([]);
  const [mrs, setMrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stocks, setStocks] = useState({});

  const [form, setForm] = useState({
    mr_number: '',
    department: '',
    requested_by: '',
    notes: '',
    items: [ { item_id: null, qty_requested: 0, qty_issued: 0 } ],
  });

  useEffect(()=>{
    async function load() {
      setLoading(true);
      try {
        const [it, mr] = await Promise.all([
          api.get('/items'),
          api.get('/material-requests'),
        ]);
        setItems(it||[]);
        setMrs(mr||[]);
      } catch(e) {
        setError(String(e.message||e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getStock = (item_id)=> stocks[item_id];

  useEffect(()=>{
    // Fetch stock levels for selected items
    async function fetchStocks() {
      const ids = Array.from(new Set(form.items.map(r=>r.item_id).filter(Boolean)));
      if (ids.length===0) return;
      const entries = await Promise.all(ids.map(async (id)=>{
        try {
          const res = await api.get(`/stock/current?item_id=${id}`);
          return [id, res.current_stock||0];
        } catch { return [id, 0]; }
      }));
      const map = { ...stocks };
      entries.forEach(([id, val])=>{ map[id]=val; });
      setStocks(map);
    }
    fetchStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.items.map(r=>r.item_id).join(',')]);

  const addLine = ()=> setForm(f=> ({ ...f, items: [...f.items, { item_id: null, qty_requested: 0, qty_issued: 0 }] }));
  const removeLine = (idx)=> setForm(f=> ({ ...f, items: f.items.filter((_,i)=>i!==idx) }));
  const updateLine = (idx, row)=> setForm(f=> ({ ...f, items: f.items.map((r,i)=> i===idx? row : r) }));
  const autoFillIssue = ()=> setForm(f=> ({ ...f, items: f.items.map(r=> ({ ...r, qty_issued: r.qty_requested })) }));

  async function submit() {
    setSaving(true); setError('');
    try {
      // validations
      if (!form.mr_number) throw new Error('MR number is required');
      const cleanItems = form.items
        .filter(r=>r.item_id && (r.qty_requested>0 || r.qty_issued>0))
        .map(r=> ({ item_id: r.item_id, qty_requested: Number(r.qty_requested||0), qty_issued: Number(r.qty_issued||0) }));
      if (cleanItems.length===0) throw new Error('Add at least one item with quantities');
      // simple validation against stock
      for (const r of cleanItems) {
        const st = getStock(r.item_id)||0;
        if (r.qty_issued > st + 1e-9) throw new Error('Issue quantity exceeds stock for one or more lines');
        if (r.qty_issued > r.qty_requested + 1e-9) throw new Error('Issue quantity cannot exceed requested');
      }
      await api.post('/material-requests', {
        mr_number: form.mr_number,
        department: form.department||undefined,
        requested_by: form.requested_by||undefined,
        notes: form.notes||undefined,
        items: cleanItems,
      });
      // refresh
      const mr = await api.get('/material-requests');
      setMrs(mr||[]);
      setForm({ mr_number: '', department: '', requested_by: '', notes: '', items: [ { item_id: null, qty_requested: 0, qty_issued: 0 } ] });
    } catch(e) {
      setError(String(e.message||e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Material Request</h2>
          <div className="text-sm text-slate-400">Create a request and optionally issue stock immediately</div>
        </div>
        {error && <div className="mb-3 p-2 bg-red-900/60 border border-red-700 rounded text-red-100">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input placeholder="MR Number" value={form.mr_number} onChange={(e)=>setForm({...form, mr_number: e.target.value})}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-2" />
          <input placeholder="Department" value={form.department} onChange={(e)=>setForm({...form, department: e.target.value})}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-2" />
          <input placeholder="Requested by" value={form.requested_by} onChange={(e)=>setForm({...form, requested_by: e.target.value})}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-2" />
          <input placeholder="Notes" value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-2" />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Items</h3>
            <div className="flex gap-2">
              <button onClick={autoFillIssue} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded">Auto-fill issue = requested</button>
              <button onClick={addLine} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded">Add Line</button>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 text-sm text-slate-400 border-b border-slate-800 pb-1">
            <div className="col-span-4">Item</div>
            <div className="col-span-2 text-right">Requested</div>
            <div className="col-span-2 text-right">To Issue</div>
            <div className="col-span-3">Availability</div>
            <div className="col-span-1"></div>
          </div>
          {form.items.map((row, idx)=> (
            <ItemRow key={idx} idx={idx} row={row} items={items}
              onUpdate={(r)=>updateLine(idx, r)} onRemove={removeLine} getStock={getStock} />
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button disabled={saving} onClick={()=>setForm({ mr_number: '', department: '', requested_by: '', notes: '', items: [ { item_id: null, qty_requested: 0, qty_issued: 0 } ] })}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50">Reset</button>
          <button disabled={saving} onClick={submit}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded disabled:opacity-50">{saving? 'Saving...' : 'Save MR'}</button>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent MRs</h2>
          {loading && <div className="text-sm text-slate-400">Loading...</div>}
        </div>
        <div className="overflow-auto max-h-[40vh] pr-1">
          <div className="min-w-[720px]">
            {mrs.map(m=> (
              <div key={m.id} className="mb-3 p-3 rounded border border-slate-800 bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{m.mr_number}</div>
                  <div className="text-sm text-slate-400">{m.department} • {m.requested_by} • {m.requested_date}</div>
                </div>
                <div className="mt-2">
                  <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 border-b border-slate-800 pb-1">
                    <div className="col-span-6">Item</div>
                    <div className="col-span-3 text-right">Requested</div>
                    <div className="col-span-3 text-right">Issued</div>
                  </div>
                  {m.items.map((it, iidx)=>{
                    const im = items.find(x=>x.id===it.item_id);
                    return (
                      <div key={iidx} className="grid grid-cols-12 gap-2 py-1 border-b border-slate-900/40">
                        <div className="col-span-6">{im? `${im.name} (${im.sku})` : `#${it.item_id}`}</div>
                        <div className="col-span-3 text-right">{it.qty_requested}</div>
                        <div className="col-span-3 text-right">{it.qty_issued}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {(!mrs || mrs.length===0) && <div className="text-sm text-slate-400">No MRs yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
