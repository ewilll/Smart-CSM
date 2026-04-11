import React from 'react';

export default function ServiceTracker({ incident }) {
    if (!incident) return null;

    const stages = [
        { label: 'Reported', key: 'Pending' },
        { label: 'Dispatched', key: 'Dispatched' },
        { label: 'On-Site', key: 'On-Site' },
        { label: 'Resolved', key: 'Resolved' }
    ];

    const isCompleted = (currentStatus, stepKey) => {
        const order = ['Pending', 'In Progress', 'Dispatched', 'On-Site', 'Resolved'];
        const currentIdx = order.indexOf(currentStatus === 'In Progress' ? 'Pending' : currentStatus);
        const stepIdx = order.indexOf(stepKey);
        return currentIdx >= stepIdx;
    };

    const getProgressWidth = (status) => {
        if (status === 'Resolved') return 'calc(100% - 32px)';
        // 66% aligns tightly with the 3rd dot "On-Site" in a flex-between layout
        if (status === 'On-Site') return '66%';
        // 33% aligns with the 2nd dot "Dispatched"
        if (status === 'Dispatched') return '33%';
        // Progress for "Pending" or "In Progress" without dispatch is at the start
        if (status === 'In Progress') return '15%';
        return '0%';
    };

    return (
        <div className="mt-4 pt-4 border-t border-slate-100 w-full mb-4">
            <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Repair Journey</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${incident.status === 'Resolved' ? 'bg-emerald-100 text-emerald-600' :
                        incident.status === 'On-Site' ? 'bg-blue-100 text-blue-600' :
                            'bg-slate-100 text-slate-500'
                    }`}>
                    Current: {incident.status}
                </span>
            </div>

            <div className="flex items-center justify-between relative px-2">
                {/* Background Line */}
                <div className="absolute left-4 right-4 h-0.5 bg-slate-200 top-1/2 -translate-y-1/2 z-0" />

                {/* Progress Line */}
                <div
                    className="absolute left-4 h-0.5 bg-blue-600 top-1/2 -translate-y-1/2 z-0 transition-all duration-1000"
                    style={{ width: getProgressWidth(incident.status) }}
                />

                {stages.map((step) => {
                    const completed = isCompleted(incident.status, step.key);
                    return (
                        <div key={step.label} className="relative z-10 flex flex-col items-center">
                            <div className={`w-4 h-4 rounded-full border-2 transition-all ${completed
                                    ? (step.key === 'Resolved' ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200' : 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200')
                                    : 'bg-white border-slate-200'
                                }`} />
                            <span className={`absolute top-6 whitespace-nowrap text-[9px] font-black uppercase tracking-tighter ${completed ? 'text-slate-800' : 'text-slate-400'
                                }`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
