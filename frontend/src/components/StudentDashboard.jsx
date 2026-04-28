import { useState, useEffect } from 'react';
import api from '../api';

export default function StudentDashboard({ user }) {
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [activeTab, setActiveTab] = useState('profile');
    
    // Update Request State
    const [updateRequestText, setUpdateRequestText] = useState('');
    const [isRequestingUpdate, setIsRequestingUpdate] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [cRes, eRes] = await Promise.all([
                api.get('/courses'),
                api.get('/enrollments')
            ]);
            setCourses(cRes.data);
            setEnrollments(eRes.data);
        } catch (err) {
            console.error(err);
        }
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

    const handleRequestUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/students/request-update', { details: updateRequestText });
            alert('Update request sent successfully to the system admin.');
            setUpdateRequestText('');
            setIsRequestingUpdate(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Error sending request');
        }
    };

    const isEnrolled = (courseId) => {
        return enrollments.some(e => e.course_id === courseId && e.status !== 'rejected');
    };

    const getInitials = (name) => {
        if (!name) return 'S';
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name[0].toUpperCase();
    };

    const profile = user.profile_data || {};
    const top = profile.topDetails || {};
    const allotment = profile.allotmentDetails || {};
    const personal = profile.personalDetails || {};
    const comm = profile.communicationDetails || {};
    const address = comm.correspondenceAddress || {};

    const approvedEnrollments = enrollments.filter(e => e.status === 'approved');

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <button 
                    onClick={() => setActiveTab('profile')} 
                    className={activeTab === 'profile' ? 'btn-primary' : ''} 
                    style={{ background: activeTab === 'profile' ? 'var(--primary-color)' : 'transparent', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: activeTab === 'profile' ? 'white' : 'var(--text-light)', cursor: 'pointer', fontWeight: 600 }}>
                    My Profile
                </button>
                <button 
                    onClick={() => setActiveTab('courses')} 
                    className={activeTab === 'courses' ? 'btn-primary' : ''} 
                    style={{ background: activeTab === 'courses' ? 'var(--primary-color)' : 'transparent', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: activeTab === 'courses' ? 'white' : 'var(--text-light)', cursor: 'pointer', fontWeight: 600 }}>
                    Courses & Enrollments
                </button>
                <button 
                    onClick={() => setActiveTab('attendance')} 
                    className={activeTab === 'attendance' ? 'btn-primary' : ''} 
                    style={{ background: activeTab === 'attendance' ? 'var(--primary-color)' : 'transparent', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: activeTab === 'attendance' ? 'white' : 'var(--text-light)', cursor: 'pointer', fontWeight: 600 }}>
                    Attendance
                </button>
            </div>

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Top Banner Profile */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '1rem', display: 'flex', gap: '2rem', alignItems: 'center', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))' }}>
                        <div style={{ width: '150px', height: '150px', borderRadius: '1rem', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', color: 'white', fontWeight: 'bold', flexShrink: 0, border: '4px solid rgba(255,255,255,0.1)' }}>
                            {getInitials(top.name || user.name)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h1 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '2rem' }}>{top.name || user.name}</h1>
                                    <span className="badge badge-approved" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>{top.admissionStatus || 'Verified'}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Registration No</div>
                                    <div style={{ color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: 'bold' }}>{top.registrationNo || user.student_id}</div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Programme</div>
                                    <div style={{ fontWeight: '500' }}>{top.programme || 'B. Tech.'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Branch</div>
                                    <div style={{ fontWeight: '500' }}>{top.branch || 'Not Specified'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Semester</div>
                                    <div style={{ fontWeight: '500' }}>{top.semester || 'Not Specified'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Joining Year</div>
                                    <div style={{ fontWeight: '500' }}>{top.joiningYear || 'Not Specified'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Request Update Section */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsRequestingUpdate(!isRequestingUpdate)}>
                            <h3 style={{ margin: 0, color: 'var(--warning)' }}>Request Profile Update</h3>
                            <button style={{ background: 'transparent', border: '1px solid var(--warning)', color: 'var(--warning)', padding: '0.4rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                                {isRequestingUpdate ? 'Cancel' : 'Request Update'}
                            </button>
                        </div>
                        
                        {isRequestingUpdate && (
                            <form onSubmit={handleRequestUpdate} style={{ marginTop: '1rem' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    If any of your details are incorrect, describe the changes needed below. This will be securely emailed to the system developer (2004situ@gmail.com) for manual correction.
                                </p>
                                <textarea 
                                    value={updateRequestText}
                                    onChange={(e) => setUpdateRequestText(e.target.value)}
                                    placeholder="E.g., My branch is showing as Mechanical but I am in IT..."
                                    rows="4"
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-dark)', border: '1px solid var(--border-color)', color: 'white', marginBottom: '1rem', resize: 'vertical' }}
                                />
                                <button type="submit" style={{ background: 'var(--warning)', color: 'black', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Send Update Request
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Three Pillars */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Allotment Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem 0.5rem', fontSize: '0.9rem' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Batch:</div><div>{allotment.batch || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Admission Type:</div><div>{allotment.admissionType || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Fee Type:</div><div>{allotment.feeType || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Category:</div><div>{allotment.category || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Seat Category:</div><div>{allotment.seatCategory || '-'}</div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Personal Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem 0.5rem', fontSize: '0.9rem' }}>
                                <div style={{ color: 'var(--text-muted)' }}>DOB:</div><div>{personal.dob || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Gender:</div><div>{personal.gender || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Blood Group:</div><div>{personal.bloodGroup || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Father Name:</div><div>{personal.fatherName || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Mother Name:</div><div>{personal.motherName || '-'}</div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Communication Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem 0.5rem', fontSize: '0.9rem' }}>
                                <div style={{ color: 'var(--text-muted)' }}>Student Mobile:</div><div>{comm.studentMobile || user.phone || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Student Email:</div><div>{comm.studentEmail || user.email || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Parent Mobile:</div><div>{comm.parentMobile || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>Guardian:</div><div>{address.guardian || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}>City/State:</div><div>{address.villageCity ? `${address.villageCity}, ${address.state}` : '-'}</div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* TAB: COURSES */}
            {activeTab === 'courses' && (
                <div className="glass-panel" style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0 }}>Course Catalog & Applications</h2>
                        <span className="badge badge-approved" style={{ fontSize: '1rem' }}>Total Enrollments: {enrollments.length}</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {/* Courses List */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Available Courses</h3>
                            {courses.length === 0 ? <p>No courses available.</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {courses.map(c => (
                                        <div key={c.id} style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <h4 style={{ margin: 0 }}>{c.title}</h4>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cap: {c.capacity}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                                {c.target_semester && c.target_semester !== 'All' && (
                                                    <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)' }}>{c.target_semester}</span>
                                                )}
                                                {c.target_branches && c.target_branches !== 'All' && (
                                                    <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)' }}>{c.target_branches}</span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{c.description}</p>
                                            {isEnrolled(c.id) ? (
                                                <button className="btn-primary" disabled style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed', background: 'var(--surface-dark)' }}>Requested</button>
                                            ) : (
                                                <button className="btn-primary" onClick={() => handleEnroll(c.id)} style={{ width: '100%' }}>Request Enrollment</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Applications List */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>My Application Status</h3>
                            {enrollments.length === 0 ? <p>No applications yet.</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {enrollments.map(e => (
                                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '0.5rem' }}>
                                            <span style={{ fontWeight: 500 }}>{e.course_title}</span>
                                            <span className={`badge badge-${e.status}`}>{e.status.toUpperCase()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: ATTENDANCE */}
            {activeTab === 'attendance' && (
                <div className="glass-panel" style={{ marginTop: '1rem' }}>
                    <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>My Attendance</h2>
                    
                    {approvedEnrollments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <p>You don't have any approved courses yet.</p>
                            <p style={{ fontSize: '0.9rem' }}>Attendance will be tracked here once an admin approves your enrollment.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {approvedEnrollments.map(e => {
                                const conducted = e.classes_conducted || 0;
                                const attended = e.classes_attended || 0;
                                const percentage = conducted > 0 ? Math.round((attended / conducted) * 100) : 0;
                                const statusColor = percentage >= 75 ? 'var(--success)' : (percentage >= 50 ? 'var(--warning)' : 'var(--danger)');
                                
                                return (
                                <div key={e.id} style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>{e.course_title}</h4>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            Attended {attended} of {conducted} classes held
                                        </span>
                                        <span style={{ fontWeight: 'bold', color: statusColor }}>
                                            {conducted > 0 ? `${percentage}%` : '-'}
                                        </span>
                                    </div>
                                    
                                    <div style={{ height: '8px', background: 'var(--surface-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            height: '100%', 
                                            width: conducted > 0 ? `${percentage}%` : '0%', 
                                            background: statusColor,
                                            transition: 'width 0.5s ease-in-out'
                                        }}></div>
                                    </div>
                                    
                                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            Total Planned: {e.total_classes}
                                        </span>
                                        <span>
                                            {conducted === 0 ? <span style={{ color: 'var(--text-muted)' }}>Classes haven't started</span> : 
                                                percentage < 75 ? <span style={{ color: 'var(--danger)' }}>Minimum 75% required</span> : 
                                                <span style={{ color: 'var(--success)' }}>On track</span>}
                                        </span>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
