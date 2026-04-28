import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import RegisterAdmin from './components/RegisterAdmin';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import api from './api';
import './index.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/profile');
                    setUser(res.data);
                } catch (err) {
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading System...</div>;

    return (
        <Router>
            <nav>
                <Link to="/" className="nav-brand" style={{ textDecoration: 'none' }}>Student Reg System</Link>
                <div className="nav-links">
                    {user ? (
                        <>
                            <span style={{ color: 'var(--text-muted)' }}>{user.email} ({user.role})</span>
                            <button onClick={handleLogout} className="btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" style={{ color: 'var(--text-light)' }}>Login</Link>
                        </>
                    )}
                </div>
            </nav>
            
            <main>
                <Routes>
                    <Route path="/" element={<Home user={user} />} />
                    <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login setUser={setUser} />} />
                    <Route path="/register/admin" element={user ? <Navigate to="/dashboard" /> : <RegisterAdmin />} />
                    
                    <Route path="/dashboard" element={
                        !user ? <Navigate to="/login" /> : 
                        user.role === 'admin' ? <AdminDashboard user={user} /> : <StudentDashboard user={user} />
                    } />
                    
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
        </Router>
    );
}

export default App;
