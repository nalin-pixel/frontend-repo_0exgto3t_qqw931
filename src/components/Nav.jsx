import { useState } from 'react';
import { Menu, PackageSearch, Receipt, ShoppingCart, ClipboardList, Truck, BookOpen, Percent } from 'lucide-react';

export default function Nav({ current, onChange }) {
  const [open, setOpen] = useState(true);
  const items = [
    { key: 'masters', label: 'Masters', icon: PackageSearch },
    { key: 'pr', label: 'PR', icon: ClipboardList },
    { key: 'po', label: 'PO', icon: ShoppingCart },
    { key: 'grn', label: 'GRN', icon: Truck },
    { key: 'mr', label: 'MR', icon: Receipt },
    { key: 'reports', label: 'Reports', icon: BookOpen },
    { key: 'taxes', label: 'Taxes', icon: Percent },
  ];
  return (
    <div className={`bg-slate-900/70 text-slate-100 border-r border-slate-800 ${open ? 'w-60' : 'w-16'} transition-all duration-300 h-screen fixed left-0 top-0`}> 
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <button className="p-2 hover:bg-slate-800 rounded" onClick={() => setOpen(!open)}>
          <Menu size={20} />
        </button>
        {open && <div className="font-semibold">Procure+ Inventory</div>}
      </div>
      <div className="py-2">
        {items.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => onChange(key)} className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-800 ${current===key?'bg-slate-800':''}`}>
            <Icon size={18} />
            {open && <span>{label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
