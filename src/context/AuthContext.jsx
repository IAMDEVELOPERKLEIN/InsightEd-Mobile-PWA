
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

                try {
                    const res = await fetch('/api/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        signal: controller.signal
                    });
                    if (res.ok) {
                        const userData = await res.json();
                        // Sync localStorage
                        if (userData.uid) localStorage.setItem('uid', userData.uid);
                        if (userData.role) localStorage.setItem('userRole', userData.role);
                        if (userData.email) localStorage.setItem('userEmail', userData.email);
                        if (userData.account_category) localStorage.setItem('accountCategory', userData.account_category);
                        
                        setUser(userData);
                    } else {
                        // Token invalid or expired
                        localStorage.removeItem('token');
                        setUser(null);
                    }
                } catch (err) {
                    if (err.name === 'AbortError') {
                        console.warn("Auth initialization timed out.");
                    } else {
                        console.error("Auth init error:", err);
                    }
                    setUser(null);
                } finally {
                    clearTimeout(timeoutId);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('token', token);
        if (userData.uid) localStorage.setItem('uid', userData.uid);
        if (userData.role) localStorage.setItem('userRole', userData.role);
        if (userData.email) localStorage.setItem('userEmail', userData.email);
        if (userData.account_category) localStorage.setItem('accountCategory', userData.account_category);
        
        localStorage.setItem('remembered_user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
