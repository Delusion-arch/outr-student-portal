import { useState, useEffect } from 'react';
import api from '../api';

export default function AdminDashboard({ user }) {
    const [stats, setStats] = useState({ students: 0, courses: 0, pendingEnrollments: 0 });
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [students, setStudents] = useState([]);
    const [newCourse, setNewCourse] = useState({ title: '', description: '', capacity: '', prerequisites: '', target_semester: '', target_branches: '', total_classes: '' });
    const [activeTab, setActiveTab] = useState('overview');
    
    // Per-class attendance state
    const [selectedCourseForAttendance, setSelectedCourseForAttendance] = useState('');
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [presentStudents, setPresentStudents] = useState([]);
    
    // Analytics state
    const [analyticsData, setAnalyticsData] = useState([]);

    const fetchData = async () => {
        try {
            const [statRes, cRes, eRes, sRes] = await Promise.all([
                api.get('/stats'),
                api.get('/courses'),
                api.get('/enrollments/all'),
                api.get('/students')
            ]);
            setStats(statRes.data);
            setCourses(cRes.data);
            setEnrollments(eRes.data);
            setStudents(sRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await api.post('/courses', newCourse);
            alert('Course created successfully');
            setNewCourse({ title: '', description: '', capacity: '', prerequisites: '', target_semester: '', target_branches: '', total_classes: '' });
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

    // Fetch attendance for a specific date when course/date changes
    useEffect(() => {
        if (!selectedCourseForAttendance || !attendanceDate) return;
        
        api.get(`/courses/${selectedCourseForAttendance}/attendance/${attendanceDate}`)
            .then(res => {
                const present = res.data.filter(r => r.status === 'Present').map(r => r.student_id);
                setPresentStudents(present);
            })
            .catch(err => console.error(err));
            
        // Also fetch analytics when course changes
        api.get(`/courses/${selectedCourseForAttendance}/analytics`)
            .then(res => setAnalyticsData(res.data))
            .catch(err => console.error(err));
    }, [selectedCourseForAttendance, attendanceDate]);

    const handleStartCourse = async (id) => {
        try {
            await api.put(`/courses/${id}/start`);
            alert('Course started successfully! You can now track attendance.');
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Error starting course');
        }
    };

    const toggleStudentPresence = (studentId) => {
        setPresentStudents(prev => 
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const submitAttendance = async () => {
        if (!selectedCourseForAttendance) return alert('Select a course first.');
        
        try {
            await api.post(`/courses/${selectedCourseForAttendance}/attendance`, {
                date: attendanceDate,
                present_student_ids: presentStudents
            });
            alert(`Attendance saved for ${attendanceDate}`);
            fetchData(); // refresh overview stats
        } catch (err) {
            alert(err.response?.data?.error || 'Error saving attendance');
        }
    };

    const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
    const courseOptions = [...new Set(approvedEnrollments.map(e => e.course_id))].map(id => {
        return courses.find(c => c.id === id);
    }).filter(Boolean);
    const studentsInSelectedCourse = approvedEnrollments.filter(e => e.course_id === parseInt(selectedCourseForAttendance));

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0 }}>Admin Portal</h1>
                <div style={{ color: 'var(--text-muted)' }}>Logged in as <strong style={{ color: 'var(--warning)' }}>{user.name}</strong></div>
            </div>
            
            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', overflowX: 'auto' }}>
                <button 
                    onClick={() => setActiveTab('overview')} 
                    style={{ background: activeTab === 'overview' ? 'var(--warning)' : 'transparent', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: activeTab === 'overview' ? 'black' : 'var(--text-light)', cursor: 'pointer', fontWeight: 600 }}>
                    Dashboard
                </button>
                <button 
                    onClick={() => setActiveTab('enrollments')} 
                    style={{ background: activeTab === 'enrollments' ? 'var(--warning)' : 'transparent', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: activeTab === 'enrollments' ? 'black' : 'var(--text-light)', cursor: 'pointer', fontWeight: 600 }}>
                    Enrollment Requests {stats.pendingEnrollments > 0 && <span style={{ background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', marginLeft: '0.5rem' }}>{stats.pendingEnrollments}</span>}
                </button>
                <button 
                    onClick={() => setActiveTab('attendance')} 
                    style={{ background: activeTab === 'attendance' ? 'var(--warning)' : 'transparent', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: activeTab === 'attendance' ? 'black' : 'var(--text-light)', cursor: 'pointer', fontWeight: 600 }}>
                    Attendance Tracking
                </button>
                <button 
                    onClick={() => setActiveTab('analytics')} 
                    style={{ background: activeTab === 'analytics' ? 'var(--warning)' : 'transparent', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: activeTab === 'analytics' ? 'black' : 'var(--text-light)', cursor: 'pointer', fontWeight: 600 }}>
                    Course Analytics
                </button>
                <button 
                    onClick={() => setActiveTab('courses')} 
                    style={{ background: activeTab === 'courses' ? 'var(--warning)' : 'transparent', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: activeTab === 'courses' ? 'black' : 'var(--text-light)', cursor: 'pointer', fontWeight: 600 }}>
                    Course Management
                </button>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ textAlign: 'center' }}>
                            <h3 style={{ color: 'var(--text-muted)' }}>Total Students</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{stats.students}</div>
                        </div>
                        <div className="glass-panel" style={{ textAlign: 'center' }}>
                            <h3 style={{ color: 'var(--text-muted)' }}>Total Courses</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.courses}</div>
                        </div>
                        <div className="glass-panel" style={{ textAlign: 'center' }}>
                            <h3 style={{ color: 'var(--text-muted)' }}>Pending Approvals</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>{stats.pendingEnrollments}</div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ marginTop: '1rem' }}>
                        <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Registered Students</h2>
                        {students.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No students registered yet.</p> : (
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '0.5rem' }}>ID</th>
                                        <th style={{ color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '0.5rem' }}>Name</th>
                                        <th style={{ color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '0.5rem' }}>Email</th>
                                        <th style={{ color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '0.5rem' }}>Student ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(s => (
                                        <tr key={s.id} style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
                                            <td style={{ padding: '1rem', borderRadius: '0.5rem 0 0 0.5rem' }}>{s.id}</td>
                                            <td style={{ padding: '1rem', fontWeight: 500 }}>{s.name}</td>
                                            <td style={{ padding: '1rem' }}>{s.email}</td>
                                            <td style={{ padding: '1rem', borderRadius: '0 0.5rem 0.5rem 0' }}>{s.student_id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* TAB: ENROLLMENTS */}
            {activeTab === 'enrollments' && (
                <div className="glass-panel">
                    <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Enrollment Requests</h2>
                    {enrollments.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No enrollment requests found.</p> : (
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                            <thead>
                                <tr>
                                    <th style={{ color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '0.5rem' }}>Student</th>
                                    <th style={{ color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '0.5rem' }}>Course</th>
                                    <th style={{ color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '0.5rem' }}>Status</th>
                                    <th style={{ color: 'var(--text-muted)', textAlign: 'right', paddingBottom: '0.5rem' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrollments.map(e => (
                                    <tr key={e.id} style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
                                        <td style={{ padding: '1rem', borderRadius: '0.5rem 0 0 0.5rem', fontWeight: 500 }}>{e.student_name}</td>
                                        <td style={{ padding: '1rem' }}>{e.course_title}</td>
                                        <td style={{ padding: '1rem' }}><span className={`badge badge-${e.status}`}>{e.status.toUpperCase()}</span></td>
                                        <td style={{ padding: '1rem', borderRadius: '0 0.5rem 0.5rem 0', textAlign: 'right' }}>
                                            {e.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => handleApproval(e.id, 'approved')} style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', border: '1px solid var(--success)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Approve</button>
                                                    <button onClick={() => handleApproval(e.id, 'rejected')} style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Reject</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* TAB: ATTENDANCE */}
            {activeTab === 'attendance' && (
                <div className="glass-panel">
                    <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Per-Class Attendance Tracking</h2>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                            <label>Select Course</label>
                            <select 
                                value={selectedCourseForAttendance} 
                                onChange={e => {
                                    setSelectedCourseForAttendance(e.target.value);
                                    const c = courses.find(course => course.id === parseInt(e.target.value));
                                    if (c && c.start_date && attendanceDate < c.start_date) {
                                        setAttendanceDate(c.start_date);
                                    }
                                }}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-dark)', border: '1px solid var(--border-color)', color: 'white' }}
                            >
                                <option value="">-- Choose Course --</option>
                                {courseOptions.filter(c => c.start_date).map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                            <label>Class Date</label>
                            <input 
                                type="date" 
                                value={attendanceDate} 
                                min={selectedCourseForAttendance ? courses.find(c => c.id === parseInt(selectedCourseForAttendance))?.start_date : undefined}
                                onChange={e => setAttendanceDate(e.target.value)} 
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-dark)', border: '1px solid var(--border-color)', color: 'white' }}
                            />
                        </div>
                    </div>

                    {selectedCourseForAttendance && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>Students ({studentsInSelectedCourse.length})</h3>
                                    {studentsInSelectedCourse.length > 0 && (
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            Classes Conducted: <strong style={{ color: 'white' }}>{studentsInSelectedCourse[0].classes_conducted || 0}</strong> / {studentsInSelectedCourse[0].total_classes} Planned
                                        </div>
                                    )}
                                </div>
                                <button onClick={submitAttendance} style={{ background: 'var(--warning)', color: 'black', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>Save Attendance</button>
                            </div>
                            
                            {studentsInSelectedCourse.length === 0 ? <p style={{ color: 'var(--warning)' }}>No approved students in this course.</p> : (
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ color: 'var(--text-muted)', textAlign: 'center', paddingBottom: '0.5rem', width: '80px' }}>Present</th>
                                            <th style={{ color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '0.5rem' }}>Student Name</th>
                                            <th style={{ color: 'var(--text-muted)', textAlign: 'right', paddingBottom: '0.5rem' }}>Attendance Stats</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentsInSelectedCourse.map(e => {
                                            const conducted = e.classes_conducted || 0;
                                            const attended = e.classes_attended || 0;
                                            const percentage = conducted > 0 ? Math.round((attended / conducted) * 100) : 0;
                                            const isLow = conducted > 0 && percentage < 75;
                                            
                                            return (
                                            <tr key={e.id} style={{ background: 'rgba(15, 23, 42, 0.4)', cursor: 'pointer', borderLeft: isLow ? '4px solid var(--danger)' : '4px solid transparent' }} onClick={() => toggleStudentPresence(e.student_id)}>
                                                <td style={{ padding: '1rem', borderRadius: '0.5rem 0 0 0.5rem', textAlign: 'center' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={presentStudents.includes(e.student_id)}
                                                        onChange={() => toggleStudentPresence(e.student_id)}
                                                        style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                                                        onClick={ev => ev.stopPropagation()}
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem', fontWeight: 500, color: isLow ? 'var(--danger)' : 'inherit' }}>
                                                    {e.student_name}
                                                    {isLow && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', background: 'rgba(239,68,68,0.2)', padding: '2px 6px', borderRadius: '4px' }}>Low Attendance</span>}
                                                </td>
                                                <td style={{ padding: '1rem', borderRadius: '0 0.5rem 0.5rem 0', textAlign: 'right', color: 'var(--text-muted)' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ fontWeight: 'bold', color: isLow ? 'var(--danger)' : (conducted > 0 ? 'var(--success)' : 'var(--text-muted)') }}>
                                                            {conducted > 0 ? `${percentage}%` : '-'}
                                                        </span>
                                                        <span style={{ fontSize: '0.8rem' }}>{attended} / {conducted}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: ANALYTICS */}
            {activeTab === 'analytics' && (
                <div className="glass-panel">
                    <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Course Analytics</h2>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="form-group" style={{ flex: 1, maxWidth: '400px' }}>
                            <label>Select Started Course</label>
                            <select 
                                value={selectedCourseForAttendance} 
                                onChange={e => setSelectedCourseForAttendance(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-dark)', border: '1px solid var(--border-color)', color: 'white' }}
                            >
                                <option value="">-- Choose Course --</option>
                                {courses.filter(c => c.start_date).map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedCourseForAttendance && analyticsData.length > 0 && (
                        <div>
                            <h3 style={{ marginBottom: '1rem' }}>Day-by-Day Attendance Trend</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {analyticsData.map(day => {
                                    const percentage = Math.round((day.present_count / day.total_count) * 100);
                                    const statusColor = percentage >= 75 ? 'var(--success)' : (percentage >= 50 ? 'var(--warning)' : 'var(--danger)');
                                    return (
                                        <div key={day.date} style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '0.5rem', borderLeft: `4px solid ${statusColor}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 'bold' }}>{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                <span style={{ fontWeight: 'bold', color: statusColor }}>{percentage}%</span>
                                            </div>
                                            <div style={{ height: '8px', background: 'var(--surface-dark)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                                <div style={{ height: '100%', width: `${percentage}%`, background: statusColor }}></div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {day.present_count} / {day.total_count} Students Present
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {selectedCourseForAttendance && analyticsData.length === 0 && (
                        <p style={{ color: 'var(--text-muted)' }}>No attendance records found for this course yet.</p>
                    )}
                </div>
            )}

            {/* TAB: COURSES */}
            {activeTab === 'courses' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                    <div className="glass-panel">
                        <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Add New Course</h2>
                        <form onSubmit={handleCreateCourse}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Title</label>
                                    <input type="text" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} required />
                                </div>
                                <div className="form-group">
                                    <label>Capacity (Max Students)</label>
                                    <input type="number" value={newCourse.capacity} onChange={e => setNewCourse({...newCourse, capacity: e.target.value})} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label>Target Semester</label>
                                    <select value={newCourse.target_semester} onChange={e => setNewCourse({...newCourse, target_semester: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-dark)', border: '1px solid var(--border-color)', color: 'white' }}>
                                        <option value="All">All Semesters</option>
                                        <option value="1st Semester">1st Semester</option>
                                        <option value="2nd Semester">2nd Semester</option>
                                        <option value="3rd Semester">3rd Semester</option>
                                        <option value="4th Semester">4th Semester</option>
                                        <option value="5th Semester">5th Semester</option>
                                        <option value="6th Semester">6th Semester</option>
                                        <option value="7th Semester">7th Semester</option>
                                        <option value="8th Semester">8th Semester</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Target Branch</label>
                                    <select value={newCourse.target_branches} onChange={e => setNewCourse({...newCourse, target_branches: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-dark)', border: '1px solid var(--border-color)', color: 'white' }}>
                                        <option value="All">All Branches</option>
                                        <option value="Information Technology">Information Technology</option>
                                        <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                                        <option value="Civil Engineering">Civil Engineering</option>
                                        <option value="Electrical Engineering">Electrical Engineering</option>
                                        <option value="Instrumentation and Electronics Engineering">Instrumentation and Electronics Engineering</option>
                                        <option value="Biotechnology">Biotechnology</option>
                                        <option value="Fashion Technology">Fashion Technology</option>
                                        <option value="Textile Engineering">Textile Engineering</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Total Classes</label>
                                    <input type="number" placeholder="e.g. 40" value={newCourse.total_classes} onChange={e => setNewCourse({...newCourse, total_classes: e.target.value})} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} rows="4" />
                            </div>
                            <button type="submit" style={{ background: 'var(--warning)', color: 'black', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', width: '100%', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Create Course</button>
                        </form>
                    </div>

                    <div className="glass-panel">
                        <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Course List</h2>
                        {courses.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No courses created.</p> : (
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '0.5rem' }}>Title</th>
                                        <th style={{ color: 'var(--text-muted)', textAlign: 'right', paddingBottom: '0.5rem' }}>Capacity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courses.map(c => (
                                        <tr key={c.id} style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
                                            <td style={{ padding: '1rem', borderRadius: '0.5rem 0 0 0.5rem', fontWeight: 500 }}>
                                                {c.title}
                                                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                                    {c.start_date ? (
                                                        <span style={{ color: 'var(--success)' }}>Started: {c.start_date}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--warning)' }}>Not Started</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>{c.capacity}</td>
                                            <td style={{ padding: '1rem', borderRadius: '0 0.5rem 0.5rem 0', textAlign: 'right' }}>
                                                {!c.start_date && (
                                                    <button onClick={() => handleStartCourse(c.id)} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                        Start Course
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
