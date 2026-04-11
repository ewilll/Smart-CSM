import React, { useState, useEffect } from 'react';
import { X, Send, Camera, LogOut } from 'lucide-react';
import { updateUserProfile, sendPasswordResetEmail, logoutUser } from '../../utils/auth';
import { supabase } from '../../utils/supabaseClient';

export default function ProfileManagementModal({ isOpen, onClose, user, onUpdate }) {
    const [profileForm, setProfileForm] = useState({ full_name: '', avatar_url: '', phone: '' });
    const [passwordResetLoading, setPasswordResetLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [logoutProgress, setLogoutProgress] = useState(0);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (user) {
            setProfileForm({
                full_name: user.name || '',
                first_name: user.firstName || user.name?.split(', ')[1] || user.name?.split(' ')[0] || '',
                last_name: user.lastName || user.name?.split(', ')[0] || user.name?.split(' ')[1] || '',
                barangay: user.barangay || '',
                avatar_url: user.avatar_url || '',
                phone: user.phone || ''
            });
        }
    }, [user, isOpen]);

    const handleUpdateProfile = async () => {
        try {
            const { success, user: updatedUser, message } = await updateUserProfile(user.id, {
                firstName: profileForm.first_name,
                lastName: profileForm.last_name,
                barangay: profileForm.barangay,
                full_name: profileForm.full_name,
                avatar_url: profileForm.avatar_url,
                phone: profileForm.phone
            });

            if (success) {
                setMessage({ type: 'success', text: 'Profile updated successfully' });
                if (onUpdate) onUpdate(updatedUser);
                setTimeout(() => {
                    setMessage(null);
                    onClose();
                }, 1500);
            } else {
                throw new Error(message);
            }
        } catch (error) {
            console.error('Profile Update Error:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        }
    };

    const handleTriggerPasswordReset = async () => {
        if (!user?.email) return;
        setPasswordResetLoading(true);
        try {
            const { success, message } = await sendPasswordResetEmail(user.email);
            if (success) {
                setMessage({ type: 'success', text: 'Password reset email sent!' });
            } else {
                throw new Error(message);
            }
        } catch (error) {
            console.error('Password Reset Error:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to send reset email' });
        } finally {
            setPasswordResetLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            if (progress <= 100) setLogoutProgress(progress);
            if (progress >= 100) clearInterval(interval);
        }, 50);

        // Redirect after a short delay for the progress bar
        setTimeout(() => {
            logoutUser();
            window.location.href = '/login';
        }, 1000);
    };

    const handleAvatarUpload = async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;

            setUploadingAvatar(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            // Update form state immediately
            setProfileForm(prev => ({ ...prev, avatar_url: data.publicUrl }));
            setMessage({ type: 'success', text: 'New photo uploaded! Remember to save.' });
        } catch (error) {
            console.error('Avatar upload error:', error);
            setMessage({ type: 'error', text: 'Failed to upload image.' });
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden">
            <div className="bg-white rounded-[32px] p-8 max-w-md w-full max-h-[90vh] shadow-2xl animate-scale-up relative border border-slate-100 flex flex-col">
                {/* Critical Navigation: Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-4 -right-4 w-10 h-10 bg-white text-slate-400 rounded-full shadow-xl flex items-center justify-center hover:text-rose-500 hover:scale-110 active:scale-95 transition-all z-[10001] border border-slate-100"
                    title="Close (ESC)"
                >
                    <X size={20} />
                </button>

                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                    <div className="mb-8">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">Account Portal</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage your credentials & session</p>
                    </div>

                    <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-2xl">
                        <div className="relative group">
                            <img
                                src={profileForm.avatar_url || `https://ui-avatars.com/api/?name=${profileForm.full_name || 'User'}&background=2563eb&color=fff`}
                                className="w-16 h-16 rounded-full border-4 border-white shadow-md object-cover"
                                alt="Profile"
                            />
                            <label htmlFor="modal-avatar-upload" className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 text-white rounded-lg shadow-lg border-2 border-white cursor-pointer hover:scale-110 active:scale-95 transition-all">
                                {uploadingAvatar ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Camera size={14} />}
                            </label>
                            <input
                                id="modal-avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                                disabled={uploadingAvatar}
                            />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-800 uppercase">Current Session</p>
                            <p className="text-xs text-slate-500 font-bold">{user?.email}</p>
                            <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded inline-block mt-2 ${user?.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                {user?.role === 'admin' ? 'Administrator' : 'User Account'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">First Name</label>
                                <input
                                    type="text"
                                    value={profileForm.first_name}
                                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Enter first name"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                                <input
                                    type="text"
                                    value={profileForm.last_name}
                                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Enter last name"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Residential Barangay</label>
                            <input
                                type="text"
                                value={profileForm.barangay}
                                onChange={(e) => setProfileForm({ ...profileForm, barangay: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. Barangay Casisang"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Display Name Reference</label>
                            <input
                                type="text"
                                value={profileForm.full_name}
                                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Enter display name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Avatar URL (Optional)</label>
                            <input
                                type="text"
                                value={profileForm.avatar_url}
                                onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="https://example.com/my-photo.jpg"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`mb-4 p-3 rounded-xl text-center font-bold text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleUpdateProfile}
                            className="w-full py-4 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Save Profile
                        </button>

                        <button
                            onClick={handleTriggerPasswordReset}
                            disabled={passwordResetLoading}
                            className="w-full py-4 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                            {passwordResetLoading ? (
                                <>Sending Email...</>
                            ) : (
                                <><Send size={18} /> Reset Password</>
                            )}
                        </button>

                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isLoggingOut ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100'}`}
                            >
                                {isLoggingOut ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                        <span>{logoutProgress}%</span>
                                    </div>
                                ) : (
                                    <><LogOut size={18} /> End Session</>
                                )}
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-4 rounded-xl bg-slate-50 text-slate-400 font-bold uppercase tracking-widest hover:bg-slate-100 transition-all text-[10px]"
                            >
                                Return to Dashboard
                            </button>
                        </div>

                    </div>

                    <div className="pt-8 border-t border-slate-100 shrink-0">
                        <p className="text-[10px] text-center text-slate-400 font-bold px-4">
                            Clicking "End Session" will securely sign you out of {user?.email} on this device.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
