import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getCurrentUser } from '../utils/auth';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const getReadAnnouncements = () => {
        const stored = localStorage.getItem('read_announcements');
        return stored ? JSON.parse(stored) : [];
    };

    const markAnnouncementReadLocally = (id) => {
        const readList = getReadAnnouncements();
        if (!readList.includes(id)) {
            readList.push(id);
            localStorage.setItem('read_announcements', JSON.stringify(readList));
        }
    };

    const fetchNotifications = async (userId) => {
        try {
            let userNotifications = [];
            try {
                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(20);
                if (!error && data) userNotifications = data;
            } catch (e) {
                console.error(e);
            }

            const user = getCurrentUser();
            let annNotifications = [];
            if (user && user.role !== 'admin') {
                try {
                    const { data: annData } = await supabase
                        .from('announcements')
                        .select('*')
                        .eq('is_active', true);
                    if (annData) {
                        const readList = getReadAnnouncements();
                        annNotifications = annData.map(ann => {
                            const annId = `ann-${ann.id}`;
                            return {
                                id: annId,
                                type: 'advisory',
                                title: `[SYSTEM ADVISORY] ${ann.title}`,
                                message: ann.content,
                                read: readList.includes(annId),
                                created_at: ann.created_at
                            };
                        });
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            const merged = [...annNotifications, ...userNotifications]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setNotifications(merged);
            setUnreadCount(merged.filter(n => !n.read).length);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            if (String(notificationId).startsWith('ann-')) {
                markAnnouncementReadLocally(notificationId);
                setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
                return;
            }

            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const toggleRead = async (notificationId, currentReadStatus) => {
        try {
            if (String(notificationId).startsWith('ann-')) {
                if (!currentReadStatus) markAnnouncementReadLocally(notificationId);
                else {
                    const readList = getReadAnnouncements().filter(id => id !== notificationId);
                    localStorage.setItem('read_announcements', JSON.stringify(readList));
                }
                setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: !currentReadStatus } : n));
                setUnreadCount(prev => !currentReadStatus ? Math.max(0, prev - 1) : prev + 1);
                return;
            }

            const { error } = await supabase
                .from('notifications')
                .update({ read: !currentReadStatus })
                .eq('id', notificationId);

            if (error) throw error;
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: !currentReadStatus } : n));
            setUnreadCount(prev => !currentReadStatus ? Math.max(0, prev - 1) : prev + 1);
        } catch (err) {
            console.error('Error toggling notification status:', err);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            if (String(notificationId).startsWith('ann-')) {
                const deletedNotif = notifications.find(n => n.id === notificationId);
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
                if (deletedNotif && !deletedNotif.read) {
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
                return;
            }

            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) throw error;
            const deletedNotif = notifications.find(n => n.id === notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (deletedNotif && !deletedNotif.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const markAllAsRead = async () => {
        const user = getCurrentUser();
        if (!user) return;
        try {
            // Mark local announcements as read
            notifications.forEach(n => {
                if (n.id.startsWith('ann-') && !n.read) {
                    markAnnouncementReadLocally(n.id);
                }
            });

            // Suppress error if the table doesn't have matching rows, just do best effort
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    useEffect(() => {
        let channel = null;

        const setupUser = (user) => {
            if (!user) {
                setNotifications([]);
                setUnreadCount(0);
                if (channel) supabase.removeChannel(channel);
                return;
            }

            fetchNotifications(user.id);

            // Subscribe to real-time notification changes
            if (channel) supabase.removeChannel(channel);
            channel = supabase
                .channel(`user_notifications_${user.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    setNotifications(prev => [payload.new, ...prev].slice(0, 20));
                    setUnreadCount(prev => prev + 1);

                    if (Notification.permission === 'granted') {
                        new Notification(payload.new.title, { body: payload.new.message });
                    }
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, () => {
                    fetchNotifications(user.id);
                })
                .subscribe();
        };

        // Initial setup
        setupUser(getCurrentUser());

        // Listen for auth changes (login/logout)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                // Short delay to allow localStorage to update in auth.js
                setTimeout(() => {
                    setupUser(getCurrentUser());
                }, 500);
            }
        });

        return () => {
            if (channel) supabase.removeChannel(channel);
            if (authListener?.subscription) authListener.subscription.unsubscribe();
        };
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            markAsRead,
            toggleRead,
            deleteNotification,
            markAllAsRead,
            fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
