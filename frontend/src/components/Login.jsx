import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Login({ setUser }) {
    const [isStudent, setIsStudent] = useState(true);
    const [credentials, setCredentials] = useState({ idOrEmail: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let res;
            if (isStudent) {
                // Students authenticate via the ERP endpoint
                res = await api.post('/erp-login', { 
                    student_id: credentials.idOrEmail, 
                    erp_password: credentials.password 
                });
            } else {
                // Admins authenticate via the standard endpoint
                res = await api.post('/login', { 
                    email: credentials.idOrEmail, 
                    password: credentials.password 
                });
            }
            
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
            <div className="glass-panel">
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Welcome Back</h2>
                
                {/* Tabs */}
                <div style={{ display: 'flex', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                    <button 
                        onClick={() => { setIsStudent(true); setError(''); setCredentials({ idOrEmail: '', password: '' }); }}
                        style={{ flex: 1, padding: '0.5rem', background: 'transparent', borderBottom: isStudent ? '2px solid var(--primary-color)' : 'none', color: isStudent ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                        Student
                    </button>
                    <button 
                        onClick={() => { setIsStudent(false); setError(''); setCredentials({ idOrEmail: '', password: '' }); }}
                        style={{ flex: 1, padding: '0.5rem', background: 'transparent', borderBottom: !isStudent ? '2px solid var(--warning)' : 'none', color: !isStudent ? 'var(--warning)' : 'var(--text-muted)' }}>
                        Administrator
                    </button>
                </div>

                {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{isStudent ? 'Student ID' : 'Admin Email'}</label>
                        <input 
                            type={isStudent ? 'text' : 'email'} 
                            value={credentials.idOrEmail} 
                            onChange={e => setCredentials({...credentials, idOrEmail: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>{isStudent ? 'ERP Password' : 'Password'}</label>
                        <input 
                            type="password" 
                            value={credentials.password} 
                            onChange={e => setCredentials({...credentials, password: e.target.value})} 
                            required 
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem', background: isStudent ? 'var(--primary-color)' : 'var(--warning)', color: isStudent ? 'white' : 'black' }}>
                        {loading ? 'Verifying...' : (isStudent ? 'Login via ERP' : 'Admin Login')}
                    </button>
                </form>

                {isStudent ? (
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        <p>First time? Just log in with your Student ID and ERP password. We'll set up your profile automatically!</p>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Don't have an admin account? </span>
                        <Link to="/register/admin" style={{ color: 'var(--warning)' }}>Register Admin</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
