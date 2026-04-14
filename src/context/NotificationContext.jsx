import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const channelRef = useRef(null);

    const fetchNotifications = useCallback(async (userId) => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
            setUnreadCount(data?.filter((n) => !n.read).length || 0);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearRealtime = useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
    }, []);

    const markAsRead = async (notificationId) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;
            setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const toggleRead = async (notificationId, currentReadStatus) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: !currentReadStatus })
                .eq('id', notificationId);

            if (error) throw error;
            setNotifications((prev) =>
                prev.map((n) => (n.id === notificationId ? { ...n, read: !currentReadStatus } : n))
            );
            setUnreadCount((prev) => (!currentReadStatus ? Math.max(0, prev - 1) : prev + 1));
        } catch (err) {
            console.error('Error toggling notification status:', err);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

            if (error) throw error;
            const deletedNotif = notifications.find((n) => n.id === notificationId);
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
            if (deletedNotif && !deletedNotif.read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const markAllAsRead = async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) return;
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', uid)
                .eq('read', false);

            if (error) throw error;
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const subscribeForUser = (userId) => {
            clearRealtime();
            if (!userId || cancelled) return;

            const ch = supabase
                .channel(`user_notifications_${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`,
                    },
                    (payload) => {
                        setNotifications((prev) => [payload.new, ...prev].slice(0, 50));
                        setUnreadCount((prev) => prev + 1);
                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            new Notification(payload.new.title, { body: payload.new.message });
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`,
                    },
                    () => {
                        fetchNotifications(userId);
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`,
                    },
                    () => {
                        fetchNotifications(userId);
                    }
                )
                .subscribe();

            channelRef.current = ch;
        };

        const setup = async (userId) => {
            clearRealtime();
            if (!userId) {
                setNotifications([]);
                setUnreadCount(0);
                setLoading(false);
                return;
            }
            await fetchNotifications(userId);
            if (cancelled) return;
            subscribeForUser(userId);
        };

        void supabase.auth.getSession().then(({ data: { session } }) => {
            if (!cancelled) void setup(session?.user?.id ?? null);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            void setup(session?.user?.id ?? null);
        });

        return () => {
            cancelled = true;
            subscription.unsubscribe();
            clearRealtime();
        };
    }, [clearRealtime, fetchNotifications]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                markAsRead,
                toggleRead,
                deleteNotification,
                markAllAsRead,
                fetchNotifications,
            }}
        >
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
