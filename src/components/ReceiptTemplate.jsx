import React from 'react';
import { LucideDroplets, Receipt, User, Calendar, MapPin, Hash, Zap } from 'lucide-react';

const ReceiptTemplate = ({ bill, user }) => {
    if (!bill || !user) return null;

    const isPaid = bill.status === 'Paid';

    return (
        <div id={`receipt-${bill.id}`} className="receipt-print-only fixed left-[-9999px] top-0 w-[210mm] bg-white p-12 font-sans text-slate-800">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <LucideDroplets size={32} />
                        <span className="text-2xl font-black tracking-tighter uppercase text-slate-900">PrimeWater</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Smart CSM Management System</p>
                    <p className="text-xs text-slate-500 mt-2">123 Utility Road, Innovation District<br />Metropolis, QC 1100</p>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">
                        {isPaid ? 'Official Receipt' : 'Statement of Account'}
                    </h1>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {bill.status}
                        </span>
                        <p className="text-xs font-bold text-slate-400 mt-2">No: #{bill.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                </div>
            </div>

            {/* Billing & Resident Info */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">Billed To</h3>
                    <div className="space-y-2">
                        <p className="text-lg font-black text-slate-900">{user.full_name || 'Resident'}</p>
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                            <Hash size={14} className="text-slate-300" />
                            <span>Account: {bill.account_no}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                            <MapPin size={14} className="text-slate-300" />
                            <span>{user.barangay || 'Registered Barangay'}</span>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">Billing Details</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Billing Period</span>
                            <span className="font-bold text-slate-800">{new Date(bill.reading_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Reading Date</span>
                            <span className="font-bold text-slate-800">{new Date(bill.reading_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Due Date</span>
                            <span className="font-bold text-rose-600">{new Date(bill.due_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Consumption Logic */}
            <div className="mb-12">
                <table className="w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="py-4 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Consumption</th>
                            <th className="py-4 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate / m³</th>
                            <th className="py-4 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 border-b border-slate-100">
                        <tr>
                            <td className="py-6 px-6">
                                <p className="font-bold text-slate-800">Water Consumption Fee</p>
                                <p className="text-xs text-slate-400 mt-1 uppercase font-black tracking-widest">Standard Residential Rate</p>
                            </td>
                            <td className="py-6 px-6 text-right font-bold text-slate-700">{bill.consumption} m³</td>
                            <td className="py-6 px-6 text-right font-bold text-slate-700">₱35.00</td>
                            <td className="py-6 px-6 text-right font-black text-slate-900">₱{(bill.consumption * 35).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td className="py-6 px-6">
                                <p className="font-bold text-slate-800">Environmental & Maintenance Fee</p>
                                <p className="text-xs text-slate-400 mt-1 uppercase font-black tracking-widest">Fixed Infrastructure Charge</p>
                            </td>
                            <td className="py-6 px-6 text-right font-bold text-slate-700">--</td>
                            <td className="py-6 px-6 text-right font-bold text-slate-700">Fixed</td>
                            <td className="py-6 px-6 text-right font-black text-slate-900">₱{(bill.amount - (bill.consumption * 35)).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end mb-20">
                <div className="w-80 space-y-4">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-500 uppercase tracking-widest">
                        <span>Total Payable</span>
                        <span className="text-2xl font-black text-slate-900">₱{bill.amount.toLocaleString()}</span>
                    </div>
                    {isPaid && (
                        <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <span className="text-[10px] font-black uppercase tracking-widest">Amount Paid</span>
                            <span className="text-lg font-black tracking-tight">₱{bill.amount.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-12 border-t border-slate-100">
                <div className="flex items-center gap-4 text-slate-400">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${bill.id}`}
                            alt="Verification QR"
                            className="w-16 h-16 opacity-50 grayscale"
                        />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Verification Link</p>
                        <p className="text-xs font-mono">primewater-csm.v2/verify/{bill.id.slice(0, 12)}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 italic">"Clean water for a better future"</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Computer Generated Receipt - No Signature Required</p>
                </div>
            </div>

            {/* Print Styles Injection */}
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .receipt-print-only, .receipt-print-only * {
                        visibility: visible;
                    }
                    .receipt-print-only {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        padding: 30mm;
                    }
                    .fixed { position: static !important; }
                }
            `}</style>
        </div>
    );
};

export default ReceiptTemplate;
