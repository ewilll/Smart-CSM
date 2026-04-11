import React, { useState } from 'react';
import ProfileManagementModal from '../modals/ProfileManagementModal';

/**
 * Shared Header for Admin/User Dashboard Pages
 * @param {string} title - Main page title (e.g., "Help & Support")
 * @param {string} subtitle - Subtitle (e.g., "Guidance, FAQs & Contact")
 * @param {React.ReactNode} icon - Icon component to display
 * @param {string} iconBgColor - Background color for icon container (default: bg-gradient-to-br from-blue-600 to-indigo-600)
 * @param {object} user - Current user object
 * @param {function} onUpdateUser - Callback to update user state after profile change
 */
export default function AdminHeader({ title, subtitle, icon, iconBgColor, user, onUpdateUser }) {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    if (!user) return null;

    return (
        <>
            <header className="top-bar flex items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-3 sm:gap-6">
                    <div className={`p-3 sm:p-4 rounded-[18px] sm:rounded-[22px] text-white shadow-xl shadow-blue-500/20 ${iconBgColor || 'bg-gradient-to-br from-blue-600 to-indigo-600'} shrink-0`}>
                        {React.cloneElement(icon, { size: 20, className: 'sm:w-7 sm:h-7' })}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none mb-1 sm:mb-2 truncate">{title}</h2>
                        <p className="text-[10px] sm:text-sm text-slate-500 font-bold uppercase tracking-widest truncate">{subtitle}</p>
                    </div>
                </div>

                {/* Profile Action - Click to Open Modal */}
                <div
                    onClick={() => setIsProfileModalOpen(true)}
                    className="profile-actions flex items-center gap-4 cursor-pointer group"
                >
                    <div className="user-profile bg-white pl-3 pr-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 transition-all group-hover:shadow-md group-hover:border-blue-200">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-black text-slate-800 uppercase group-hover:text-blue-600 transition-colors">
                                {user.name || 'User'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                                {user.role === 'admin' ? 'ADMIN' : 'MEMBER'}
                            </p>
                        </div>
                        <img
                            src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=0D8ABC&color=fff`}
                            className="avatar w-10 h-10 rounded-full border-2 border-slate-100 group-hover:border-blue-500 transition-colors object-cover"
                            alt="User"
                        />
                    </div>
                </div>
            </header>

            <ProfileManagementModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
                onUpdate={onUpdateUser}
            />
        </>
    );
}
