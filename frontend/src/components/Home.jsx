import { Link, Navigate } from 'react-router-dom';

export default function Home({ user }) {
    if (user) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <div className="container" style={{ marginTop: '10vh', textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Student Registration System</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
                A streamlined, modern platform for managing academic registrations and course enrollments.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ flex: '1', minWidth: '300px', maxWidth: '400px' }}>
                    <h2 style={{ marginBottom: '1rem' }}>For Students</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Create an account to browse available courses and submit enrollment requests instantly.
                    </p>
                    <Link to="/login" className="btn-primary" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
                        Login / Auto-Register via ERP
                    </Link>
                </div>

                <div className="glass-panel" style={{ flex: '1', minWidth: '300px', maxWidth: '400px' }}>
                    <h2 style={{ marginBottom: '1rem' }}>For Administrators</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Manage course offerings, track student registrations, and approve enrollments easily.
                    </p>
                    <Link to="/register/admin" className="btn-primary" style={{ background: 'var(--surface-dark)', border: '1px solid var(--border-color)', width: '100%', display: 'block', textAlign: 'center' }}>
                        Register as Admin
                    </Link>
                </div>
            </div>

            <div style={{ marginTop: '4rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>Already have an account?</p>
                <Link to="/login" className="btn-primary" style={{ marginTop: '1rem', padding: '0.75rem 3rem' }}>
                    Login Here
                </Link>
            </div>
        </div>
    );
}
