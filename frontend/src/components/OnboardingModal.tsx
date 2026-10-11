import { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STEPS: Record<string, { title: string; body: string }[]> = {
  Administrator: [
    { title: 'Welcome, Administrator', body: 'You have full access to every module. The navigation bar shows everything your role can reach.' },
    { title: 'Users & roles', body: 'Open User Admin to create users, change roles, deactivate accounts and unlock users after 5 failed logins.' },
    { title: 'Audit Log', body: 'Every login, stock change, PO transition and sale is recorded. Review it under Audit Log.' },
    { title: 'Suppliers', body: 'Only administrators can deactivate a supplier, and only when it has no open purchase orders (BR-5).' },
  ],
  Manager: [
    { title: 'Welcome, Manager', body: 'You oversee purchasing, sales and forecasting.' },
    { title: 'Approve purchase orders', body: 'POs above your approval limit need an Administrator. Rejecting a PO sends it back to Draft with your reason.' },
    { title: 'Forecast & reorder', body: 'The Forecast page predicts demand and can draft a purchase order for any SKU nearing its reorder point in one click.' },
  ],
  'Warehouse Staff': [
    { title: 'Welcome, Warehouse Staff', body: 'You keep physical stock accurate.' },
    { title: 'Inventory & voice commands', body: 'Adjust stock manually, or use Voice: say a command, check the read-back, then confirm.' },
    { title: 'Receiving goods', body: 'Open Purchase Orders and confirm receipt per line. Partial deliveries are supported.' },
  ],
  'Sales Personnel': [
    { title: 'Welcome, Sales', body: 'You record and review sales.' },
    { title: 'Point of sale', body: 'Scan or search a SKU, add it to the cart and check out. A PDF invoice is generated automatically.' },
    { title: 'Returns', body: 'Use the order history to return items; stock is restored automatically.' },
  ],
};

// UD-1 / UD-2 — role-specific walkthrough, shown once per user and reopenable from the header help button.
export default function OnboardingModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const key = user ? `isms_onboarded_${user.userId}` : null;

  useEffect(() => {
    if (!key) return;
    try { if (!localStorage.getItem(key)) setOpen(true); } catch { /* storage unavailable */ }
  }, [key]);

  useEffect(() => {
    const show = () => { setStep(0); setOpen(true); };
    window.addEventListener('isms:help', show);
    return () => window.removeEventListener('isms:help', show);
  }, []);

  if (!open || !user) return null;
  const steps = STEPS[user.role] ?? STEPS.Manager;
  const last = step === steps.length - 1;

  const close = () => {
    try { if (key) localStorage.setItem(key, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" role="dialog" aria-label="Getting started">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1px', color: 'var(--color-ink-mute)' }}>Getting started · {step + 1}/{steps.length}</span>
          <button onClick={close} className="btn-ghost-sm" style={{ padding: '4px 8px' }} aria-label="Close"><X size={14} /></button>
        </div>
        <div className="text-heading-sm" style={{ color: 'var(--color-ink)', marginBottom: 8 }}>{steps[step].title}</div>
        <div style={{ fontSize: 14, color: 'var(--color-ink-secondary)', fontWeight: 300, lineHeight: 1.5, minHeight: 64 }}>{steps[step].body}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="btn-ghost-sm"><ChevronLeft size={13} /> Back</button>
          {last
            ? <button onClick={close} className="btn-primary-sm">Done</button>
            : <button onClick={() => setStep((s) => s + 1)} className="btn-primary-sm">Next <ChevronRight size={13} /></button>}
        </div>
      </div>
    </div>
  );
}
