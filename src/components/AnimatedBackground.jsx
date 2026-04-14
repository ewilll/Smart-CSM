import React from 'react';

export default function AnimatedBackground() {
    return (
        <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
            <div
                className="absolute inset-0 bg-slate-50 dark:bg-slate-900"
            />
            <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
                style={{
                    backgroundImage: 'radial-gradient(#94a3b8 0.5px, transparent 0.5px)',
                    backgroundSize: '24px 24px',
                }}
            />
        </div>
    );
}
