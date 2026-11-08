const os = require('os');
const path = require('path');
const request = require('supertest');

// Set up the environment before the app is loaded
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_INVITE_CODE = 'test-invite';
process.env.DB_PATH = path.join(os.tmpdir(), `portal-test-${process.pid}-${Date.now()}.sqlite`);

// No real emails or ERP calls in tests
jest.mock('../mailer', () => ({ sendEmail: jest.fn() }));
jest.mock('../erpService', () => ({ verifyAndFetchStudent: jest.fn() }));

const app = require('../server');
const db = require('../db');

const waitForTables = () =>
    new Promise((resolve, reject) => {
        let tries = 0;
        const check = () => {
            db.get(`SELECT name FROM sqlite_master WHERE name = 'enrollments'`, (err, row) => {
                if (row) return resolve();
                if (++tries > 50) return reject(new Error('Database tables were not created'));
                setTimeout(check, 100);
            });
        };
        check();
    });

const register = (user) => request(app).post('/api/register').send(user);
const login = async (email, password) => {
    const res = await request(app).post('/api/login').send({ email, password });
    return res.body.token;
};

const student = { name: 'Asha', email: 'asha@example.com', student_id: 'S001', password: 'pass1234', role: 'student' };
const student2 = { name: 'Ravi', email: 'ravi@example.com', student_id: 'S002', password: 'pass1234', role: 'student' };
const admin = { name: 'Prof Rao', email: 'rao@example.com', student_id: 'T001', password: 'adminpass', role: 'admin', admin_code: 'test-invite' };

let studentToken, student2Token, adminToken;

beforeAll(async () => {
    await waitForTables();
    await register(student);
    await register(student2);
    await register(admin);
    studentToken = await login(student.email, student.password);
    student2Token = await login(student2.email, student2.password);
    adminToken = await login(admin.email, admin.password);
});

afterAll((done) => {
    db.close(() => done());
});

describe('register and login', () => {
    test('registering the same email twice is rejected', async () => {
        const res = await register(student);
        expect(res.status).toBe(400);
    });

    test('login returns a token and the user', async () => {
        const res = await request(app).post('/api/login').send({ email: student.email, password: student.password });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(student.email);
    });

    test('wrong password is rejected', async () => {
        const res = await request(app).post('/api/login').send({ email: student.email, password: 'nope' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid password');
    });

    test('unknown user is rejected', async () => {
        const res = await request(app).post('/api/login').send({ email: 'ghost@example.com', password: 'x' });
        expect(res.status).toBe(400);
    });
});

describe('admin registration', () => {
    const adminAttempt = { name: 'Sneaky', email: 'sneaky@example.com', student_id: 'X1', password: 'pass1234', role: 'admin' };

    test('admin sign-up without the invite code is rejected', async () => {
        const res = await register(adminAttempt);
        expect(res.status).toBe(403);
    });

    test('admin sign-up with a wrong invite code is rejected', async () => {
        const res = await register({ ...adminAttempt, admin_code: 'guess' });
        expect(res.status).toBe(403);
    });

    test('the rejected account was not created', async () => {
        const res = await request(app).post('/api/login').send({ email: adminAttempt.email, password: adminAttempt.password });
        expect(res.status).toBe(400);
    });

    test('admin sign-up with the right invite code gives an admin', async () => {
        const res = await request(app).post('/api/login').send({ email: admin.email, password: admin.password });
        expect(res.body.user.role).toBe('admin');
    });

    test('a student sign-up always gives a student', async () => {
        const res = await request(app).post('/api/login').send({ email: student.email, password: student.password });
        expect(res.body.user.role).toBe('student');
    });
});

describe('access control', () => {
    test('courses need a token', async () => {
        const res = await request(app).get('/api/courses');
        expect(res.status).toBe(401);
    });

    test('a garbage token is rejected', async () => {
        const res = await request(app).get('/api/courses').set('Authorization', 'Bearer not-a-token');
        expect(res.status).toBe(401);
    });

    test('a student cannot create a course', async () => {
        const res = await request(app)
            .post('/api/courses')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ title: 'Hack 101', capacity: 5 });
        expect(res.status).toBe(403);
    });

    test('an admin can create a course', async () => {
        const res = await request(app)
            .post('/api/courses')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Data Structures', description: 'Basics', capacity: 30 });
        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
    });
});

describe('enrollment', () => {
    let openCourseId, tinyCourseId;

    beforeAll(async () => {
        const open = await request(app)
            .post('/api/courses')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Operating Systems', capacity: 10 });
        openCourseId = open.body.id;

        const tiny = await request(app)
            .post('/api/courses')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Seminar', capacity: 1 });
        tinyCourseId = tiny.body.id;
    });

    const enroll = (token, course_id) =>
        request(app).post('/api/enroll').set('Authorization', `Bearer ${token}`).send({ course_id });

    test('a student can request enrollment', async () => {
        const res = await enroll(studentToken, openCourseId);
        expect(res.status).toBe(201);
    });

    test('requesting the same course twice is rejected', async () => {
        const res = await enroll(studentToken, openCourseId);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/already/i);
    });

    test('an unknown course is rejected', async () => {
        const res = await enroll(studentToken, 9999);
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Course not found');
    });

    test('a full course is rejected', async () => {
        const first = await enroll(studentToken, tinyCourseId);
        expect(first.status).toBe(201);
        const second = await enroll(student2Token, tinyCourseId);
        expect(second.status).toBe(400);
        expect(second.body.error).toBe('Course is full');
    });

    test('enrollment needs a token', async () => {
        const res = await request(app).post('/api/enroll').send({ course_id: openCourseId });
        expect(res.status).toBe(401);
    });
});
