import { useState, useEffect } from 'react';
import api from '../api';

export default function Dashboard({ user }) {
    if (!user) return null;

    return (
        <div className="container">
            <h1 style={{ marginBottom: '2rem' }}>Welcome, {user.name}</h1>
            {user.role === 'admin' ? <AdminDashboard /> : <StudentDashboard />}
        </div>
    );
}

function StudentDashboard() {
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [cRes, eRes] = await Promise.all([
            api.get('/courses'),
            api.get('/enrollments')
        ]);
        setCourses(cRes.data);
        setEnrollments(eRes.data);
    };

    const handleEnroll = async (course_id) => {
        try {
            await api.post('/enroll', { course_id });
            alert('Enrollment requested successfully!');
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Error enrolling');
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="glass-panel">
                <h2>Available Courses</h2>
                <table>
                    <thead><tr><th>Title</th><th>Capacity</th><th>Action</th></tr></thead>
                    <tbody>
                        {courses.map(c => (
                            <tr key={c.id}>
                                <td>{c.title}</td>
                                <td>{c.capacity}</td>
                                <td>
                                    <button className="btn-primary" onClick={() => handleEnroll(c.id)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                                        Enroll
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="glass-panel">
                <h2>My Enrollments</h2>
                <table>
                    <thead><tr><th>Course</th><th>Status</th></tr></thead>
                    <tbody>
                        {enrollments.map(e => (
                            <tr key={e.id}>
                                <td>{e.course_title}</td>
                                <td>
                                    <span className={`badge badge-${e.status}`}>{e.status.toUpperCase()}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AdminDashboard() {
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [newCourse, setNewCourse] = useState({ title: '', description: '', capacity: '', prerequisites: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [cRes, eRes] = await Promise.all([
            api.get('/courses'),
            api.get('/enrollments')
        ]);
        setCourses(cRes.data);
        setEnrollments(eRes.data);
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await api.post('/courses', newCourse);
            alert('Course created');
            setNewCourse({ title: '', description: '', capacity: '', prerequisites: '' });
            fetchData();
        } catch (err) {
            alert('Error creating course');
        }
    };

    const handleApproval = async (id, status) => {
        try {
            await api.put(`/enrollments/${id}`, { status });
            fetchData();
        } catch (err) {
            alert('Error updating status');
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="glass-panel">
                <h2>Manage Enrollments</h2>
                <table>
                    <thead><tr><th>Student</th><th>Course</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {enrollments.map(e => (
                            <tr key={e.id}>
                                <td>{e.student_name}</td>
                                <td>{e.course_title}</td>
                                <td><span className={`badge badge-${e.status}`}>{e.status.toUpperCase()}</span></td>
                                <td>
                                    {e.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn-primary" onClick={() => handleApproval(e.id, 'approved')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--success)' }}>Approve</button>
                                            <button className="btn-danger" onClick={() => handleApproval(e.id, 'rejected')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Reject</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="glass-panel">
                <h2>Add New Course</h2>
                <form onSubmit={handleCreateCourse}>
                    <div className="form-group">
                        <label>Title</label>
                        <input type="text" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} required />
                    </div>
                    <div className="form-group">
                        <label>Capacity</label>
                        <input type="number" value={newCourse.capacity} onChange={e => setNewCourse({...newCourse, capacity: e.target.value})} required />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Create Course</button>
                </form>

                <h3 style={{ marginTop: '2rem' }}>Existing Courses</h3>
                <table>
                    <thead><tr><th>Title</th><th>Capacity</th></tr></thead>
                    <tbody>
                        {courses.map(c => (
                            <tr key={c.id}>
                                <td>{c.title}</td>
                                <td>{c.capacity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
