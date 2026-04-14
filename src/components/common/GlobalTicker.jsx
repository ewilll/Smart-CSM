import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { AlertTriangle, Info, Zap, X } from 'lucide-react';

export default function GlobalTicker() {
    const [activeAnnouncements, setActiveAnnouncements] = useState([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        fetchActiveAnnouncements();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('public:announcements')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'announcements' },
                () => {
                    fetchActiveAnnouncements();
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.warn('GlobalTicker: Table "announcements" not found or access denied. Ticker will remain hidden.');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchActiveAnnouncements = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setActiveAnnouncements(data);
        } catch (err) {
            console.error('Error fetching global ticker announcements:', err);
        }
    };

    if (!isVisible || activeAnnouncements.length === 0) return null;

    return (
        <div className="bg-rose-600 text-white z-[999] relative flex w-full min-h-[40px] items-stretch overflow-hidden group/ticker">
            <div className="flex shrink-0 items-center gap-2 border-r border-rose-500/70 bg-rose-700 px-3 sm:px-4 py-2 font-black text-[10px] uppercase tracking-widest shadow-[4px_0_12px_rgba(0,0,0,0.15)]">
                <Zap size={14} className="shrink-0 text-amber-300" aria-hidden />
                <span className="hidden sm:inline leading-tight">System advisory</span>
                <span className="sm:hidden leading-tight">Advisory</span>
            </div>

            <div className="flex-1 min-w-0 py-2 pl-3 pr-12 overflow-hidden pointer-events-none flex items-center">
                <div className="animate-marquee whitespace-nowrap flex items-center">
                    {activeAnnouncements.map((ann, idx) => (
                        <span key={ann.id} className="mx-8 flex items-center gap-2 text-xs font-bold font-mono tracking-tight">
                            {ann.type === 'Emergency' ? <AlertTriangle size={12} className="text-amber-300" /> : <Info size={12} className="text-blue-200" />}
                            <span className="uppercase text-white/80">[{ann.type}]</span> {ann.title} - {ann.content}
                        </span>
                    ))}
                    {/* Duplicate for seamless scrolling */}
                    {activeAnnouncements.map((ann, idx) => (
                        <span key={ann.id + 'dup'} className="mx-8 flex items-center gap-2 text-xs font-bold font-mono tracking-tight">
                            {ann.type === 'Emergency' ? <AlertTriangle size={12} className="text-amber-300" /> : <Info size={12} className="text-blue-200" />}
                            <span className="uppercase text-white/80">[{ann.type}]</span> {ann.title} - {ann.content}
                        </span>
                    ))}
                </div>
            </div>

            {/* Dismiss Button */}
            <button
                type="button"
                onClick={() => setIsVisible(false)}
                className="absolute right-0 top-0 bottom-0 px-3 sm:px-4 bg-rose-700/80 hover:bg-rose-800 transition-colors flex items-center justify-center z-20 pointer-events-auto"
                title="Dismiss Advisory"
            >
                <X size={16} />
            </button>
        </div>
    );
}
