import { useState } from 'react';
import Nav from './components/Nav';
import Masters from './components/Masters';
import Taxes from './components/Taxes';
import PurchaseOrders from './components/PurchaseOrders';
import Reports from './components/Reports';
import PurchaseRequisitions from './components/PurchaseRequisitions';
import Approvals from './components/Approvals';
import GRN from './components/GRN';

function App() {
  const [tab, setTab] = useState('masters');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-blue-100">
      <Nav current={tab} onChange={setTab} />
      <div className="ml-16 md:ml-60 p-4">
        {tab==='masters' && <Masters />}
        {tab==='taxes' && <Taxes />}
        {tab==='pr' && <PurchaseRequisitions />}
        {tab==='po' && <PurchaseOrders />}
        {tab==='grn' && <GRN />}
        {tab==='reports' && <Reports />}
        {tab==='approvals' && <Approvals />}
        {tab!=='masters' && tab!=='taxes' && tab!=='pr' && tab!=='po' && tab!=='grn' && tab!=='reports' && tab!=='approvals' && (
          <div className="p-6 text-white">Module coming soon</div>
        )}
      </div>
    </div>
  )
}

export default App