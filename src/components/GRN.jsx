import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

export default function GRN() {
  const [poList, setPoList] = useState([]);
  const [grnList, setGrnList] = useState([]);
  const [itemsMaster, setItemsMaster] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [poDetail, setPoDetail] = useState(null); // from /purchase-orders list find by id
  const [poVariance, setPoVariance] = useState(null); // from /reports/po-vs-grn

  const [form, setForm] = useState({
    grn_number: '',
    received_date: new Date().toISOString().slice(0,10),
    notes: '',
    items: [], // { item_id, qty_received }
  });

  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadBase = async () => {
    try {
      const [pos, grns, items] = await Promise.all([
        api.get('/purchase-orders'),
        api.get('/grns'),
        api.get('/items'),
      ]);
      setPoList(pos);
      setGrnList(grns);
      setItemsMaster(items);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(()=>{ loadBase(); },[]);

  const onChoosePO = async (poIdStr) => {
    setSelectedPoId(poIdStr);
    setError(''); setMsg('');
    if (!poIdStr) {
      setPoDetail(null); setPoVariance(null); setForm(f=>({...f, items:[]}));
      return;
    }
    const poId = parseInt(poIdStr);
    const po = poList.find(p=>p.id===poId);
    setPoDetail(po || null);
    try {
      const report = await api.get(`/reports/po-vs-grn?po_id=${poId}`);
      setPoVariance(report);
      // Prefill receive lines with remaining qty (ordered - received) where remaining > 0
      const remainingLines = (report.rows||[]).map(r => ({
        item_id: r.item_id,
        ordered: parseFloat(r.ordered_qty||0),
        received: parseFloat(r.received_qty||0),
        remaining: parseFloat((r.ordered_qty - r.received_qty) || 0),
      })).filter(r => r.remaining > 0).map(r => ({ item_id: r.item_id, qty_received: r.remaining }));
      setForm(f=> ({ ...f, items: remainingLines }));
    } catch (e) {
      setError(e.message);
    }
  };

  const updateLine = (idx, qty) => {
    setForm(f=> ({...f, items: f.items.map((ln,i)=> i===idx ? { ...ln, qty_received: qty } : ln)}));
  };

  const removeLine = (idx) => setForm(f=> ({...f, items: f.items.filter((_,i)=> i!==idx)}));

  const autoFillRemaining = () => {
    if (!poVariance) return;
    const lines = (poVariance.rows||[]).map(r=> ({
      item_id: r.item_id,
      qty_received: Math.max(0, (r.ordered_qty - r.received_qty)),
    })).filter(r=> r.qty_received > 0);
    setForm(f=> ({...f, items: lines}));
  };

  const create = async (e) => {
    e.preventDefault(); setError(''); setMsg('');
    if (!selectedPoId) { setError('Select a PO to receive against'); return; }
    if (!form.grn_number) { setError('GRN number is required'); return; }
    if (!form.items.length) { setError('Add at least one item to receive'); return; }

    // Validate quantities > 0 and not exceeding remaining
    const varianceMap = new Map();
    (poVariance?.rows||[]).forEach(r=> varianceMap.set(r.item_id, {
      ordered: parseFloat(r.ordered_qty||0), received: parseFloat(r.received_qty||0)
    }));

    for (const ln of form.items) {
      const qty = parseFloat(ln.qty_received);
      if (!ln.item_id) { setError('Each line must have an item'); return; }
      if (isNaN(qty) || qty <= 0) { setError('Quantities must be greater than zero'); return; }
      const v = varianceMap.get(ln.item_id);
      if (v) {
        const remaining = (v.ordered - v.received);
        if (qty > remaining + 1e-9) { setError('Quantity exceeds remaining for one or more lines'); return; }
      }
    }

    try {
      const payload = {
        grn_number: form.grn_number,
        po_id: parseInt(selectedPoId),
        received_date: form.received_date,
        status: 'RECEIVED',
        notes: form.notes || undefined,
        items: form.items.map(ln=> ({ item_id: ln.item_id, qty_received: parseFloat(ln.qty_received) })),
      };
      await api.post('/grns', payload);
      setMsg('GRN created and stock updated');
      // Reset form but keep PO selection for rapid entries
      await onChoosePO(selectedPoId);
      setForm(f=> ({ ...f, grn_number: '', notes: '' }));
      // Refresh GRN list
      const grns = await api.get('/grns');
      setGrnList(grns);
    } catch (e) {
      setError(e.message);
    }
  };

  const itemName = (id) => itemsMaster.find(i=>i.id===id)?.name || `#${id}`;

  const remainingByItem = useMemo(()=>{
    const map = new Map();
    (poVariance?.rows||[]).forEach(r=> map.set(r.item_id, (r.ordered_qty - r.received_qty)));
    return map;
  }, [poVariance]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Goods Receipt (GRN)</h2>
      {error && <div className="text-red-400 mb-3">{error}</div>}
      {msg && <div className="text-emerald-400 mb-3">{msg}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">Create GRN</h3>
          <form onSubmit={create} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select value={selectedPoId} onChange={e=>onChoosePO(e.target.value)} className="px-3 py-2 bg-slate-900 text-white rounded outline-none">
                <option value="">Select PO</option>
                {poList.map(po=> <option key={po.id} value={po.id}>{po.po_number}</option>)}
              </select>
              <input value={form.grn_number} onChange={e=>setForm(f=>({...f, grn_number:e.target.value}))} placeholder="GRN number" className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.received_date} onChange={e=>setForm(f=>({...f, received_date:e.target.value}))} className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
              <input value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))} placeholder="Notes" className="px-3 py-2 bg-slate-900 text-white rounded outline-none"/>
            </div>

            <div className="bg-slate-900 rounded p-2">
              <div className="flex justify-between items-center mb-2">
                <div className="text-blue-200 text-sm">Lines to receive</div>
                <button type="button" onClick={autoFillRemaining} className="px-2 py-1 bg-slate-700 text-white rounded text-xs">Auto-fill remaining</button>
              </div>
              <div className="space-y-2">
                {form.items.map((ln, idx)=> (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6 text-blue-200 text-sm">{itemName(ln.item_id)}</div>
                    <div className="col-span-3 text-blue-300 text-xs">Rem: {Math.max(0, (remainingByItem.get(ln.item_id)||0)).toFixed(2)}</div>
                    <input type="number" step="0.01" value={ln.qty_received} onChange={e=>updateLine(idx, parseFloat(e.target.value))} className="col-span-2 px-2 py-1 bg-slate-800 text-white rounded" placeholder="Qty"/>
                    <button type="button" onClick={()=>removeLine(idx)} className="col-span-1 px-2 py-1 bg-rose-600 text-white rounded text-xs">X</button>
                  </div>
                ))}
                {form.items.length===0 && (
                  <div className="text-blue-300 text-sm">No lines. Choose a PO to prefill remaining quantities.</div>
                )}
              </div>
            </div>

            <button className="px-3 py-2 bg-green-600 text-white rounded">Create GRN</button>
          </form>
        </div>

        <div className="bg-slate-800/60 p-4 rounded">
          <h3 className="text-white mb-2">Recent GRNs</h3>
          <div className="text-blue-200 text-sm max-h-96 overflow-auto space-y-2">
            {grnList.map(g=> (
              <div key={g.id} className="border border-slate-700 rounded p-2">
                <div className="flex justify-between text-blue-300"><div>{g.grn_number}</div><div>PO: {poList.find(p=>p.id===g.po_id)?.po_number || g.po_id}</div></div>
                <div className="text-xs">Date: {g.received_date}</div>
                <div className="text-xs">Lines: {g.items.length}</div>
                {g.items.map((it, idx)=> (
                  <div key={idx} className="text-xs flex justify-between"><div>{itemName(it.item_id)}</div><div>{it.qty_received}</div></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
