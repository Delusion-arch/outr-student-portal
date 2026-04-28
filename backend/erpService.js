const https = require('https');

function getERPLoginTokens() {
    return new Promise((resolve, reject) => {
        https.get('https://outr-erp.cet.edu.in/login', (res) => {
            const cookies = res.headers['set-cookie'] || [];
            const sessionCookie = cookies.find(c => c.startsWith('ci_session'));
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const match = data.match(/name="ctoken" value="(loginFrmStudent[^"]+)"/);
                if (match && sessionCookie) {
                    resolve({ ctoken: match[1], cookie: sessionCookie.split(';')[0] });
                } else {
                    reject(new Error('Could not find CSRF token or session cookie.'));
                }
            });
        }).on('error', reject);
    });
}

function performERPLogin(studentId, password, tokens) {
    return new Promise((resolve, reject) => {
        const querystring = require('querystring');
        const postData = querystring.stringify({
            studregno: studentId,
            pword: password,
            ctoken: tokens.ctoken,
            utype: '1'
        });

        const options = {
            hostname: 'outr-erp.cet.edu.in',
            port: 443,
            path: '/login/process1',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'Cookie': tokens.cookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    // The ERP returns an array where the first element contains resSuccess
                    if (json[0] && json[0].resSuccess === 1) {
                        // Check if the server issued a new cookie for the active session
                        const newCookies = res.headers['set-cookie'] || [];
                        const newSessionCookie = newCookies.find(c => c.startsWith('ci_session')) 
                                                 ? newCookies.find(c => c.startsWith('ci_session')).split(';')[0] 
                                                 : tokens.cookie;
                        resolve(newSessionCookie);
                    } else {
                        reject(new Error(json[0]?.msg || 'Invalid Credentials'));
                    }
                } catch (e) {
                    reject(new Error('Failed to parse ERP response'));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function fetchERPProfile(cookie) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'outr-erp.cet.edu.in',
            port: 443,
            path: '/stud-profile', // Actual Profile path
            method: 'GET',
            headers: {
                'Cookie': cookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Attempt to scrape the student's name from the dashboard.
                // --- DUMP HTML FOR ANALYSIS ---
                try {
                    require('fs').writeFileSync(
                        require('path').join(__dirname, 'erp_dump.html'), 
                        data
                    );
                } catch (e) {
                    console.error("Failed to dump HTML:", e);
                }
                // ------------------------------

                // Generic Regex parser for all <dt> / <dd> pairs
                const results = {};
                const regex = /<dt[^>]*>(.*?)<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/igs;
                let match;
                while ((match = regex.exec(data)) !== null) {
                    let rawKey = match[1].replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/:$/, '').trim();
                    let keyLines = rawKey.split(/[\r\n]+/);
                    let key = keyLines[keyLines.length - 1].trim();
                    
                    let value = match[2].replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
                    if (key && !value.includes('[email')) {
                        results[key] = value;
                    }
                }

                // Also get Name from the header
                let nameMatch = data.match(/<h4[^>]*class="card-header[^"]*"[^>]*>(?:<i[^>]*><\/i>)?([^<]+)/i) || 
                                data.match(/Name[\s:]*<\/td>\s*<td[^>]*>\s*([A-Za-z\s]+)/i);

                let parsedName = nameMatch ? nameMatch[1].trim() : null;

                resolve({
                    name: parsedName,
                    email: results['Student Email'] || null,
                    branch: results['Branch'] || null,
                    semester: results['Semester'] || null,
                    phone: results['Student Mobile (WhatsApp)'] || results['Student Mobile'] || null,
                    rawExtractedData: results
                });
            });
        }).on('error', reject);
    });
}

async function verifyAndFetchStudent(studentId, password) {
    try {
        if (!studentId || !password) {
            throw new Error('Student ID and Password are required.');
        }

        // --- DEVELOPMENT TEST BYPASS ---
        if (studentId.toLowerCase().startsWith('test')) {
            return {
                name: 'PRIYANKAR MALLICK',
                email: '2004situ@gmail.com',
                student_id: studentId,
                role: 'student',
                profile_data: JSON.stringify({
                    topDetails: {
                        registrationNo: studentId,
                        applicationNo: studentId,
                        name: 'PRIYANKAR MALLICK',
                        rank: '',
                        admissionStatus: 'Admission Complete',
                        joiningYear: '2023, Batch(23)',
                        semester: '6th Semester',
                        programme: 'B. Tech.',
                        progrType: 'SSP',
                        branch: 'Information Technology'
                    },
                    allotmentDetails: {
                        batch: '23',
                        joiningYear: '2023',
                        admissionDt: '',
                        admissionType: 'SSP',
                        feeType: 'General',
                        isTFW: 'N',
                        isPC: 'N',
                        seatCategory: 'SC',
                        category: 'SC',
                        caste: '',
                        ojeeRank: ''
                    },
                    personalDetails: {
                        dob: '06/06/2004',
                        gender: 'M',
                        fatherName: 'Sruti Ranjan Mallick',
                        fatherOccupation: 'Government Employee',
                        fatherAadhar: '',
                        motherName: 'Priya Rani Mallick',
                        motherOccupation: '',
                        motherAadhar: '',
                        annualIncome: '0',
                        bloodGroup: 'O+',
                        motherTongue: 'Odia'
                    },
                    communicationDetails: {
                        landline: '08249098075',
                        parentMobile: '8249098075',
                        studentMobile: '6370083032',
                        studentEmail: '2004situ@gmail.com',
                        parentEmail: '',
                        correspondenceAddress: {
                            guardian: 'Sruti Ranjan Mallick',
                            doorNo: '',
                            street: 'Fmnagar',
                            villageCity: 'Karanjia',
                            state: 'Odisha'
                        }
                    }
                })
            };
        }
        // -------------------------------

        // 1. Get tokens
        const tokens = await getERPLoginTokens();
        
        // 2. Perform Login and get the active session cookie
        const activeCookie = await performERPLogin(studentId, password, tokens);
        
        // 3. Fetch Dashboard and scrape profile details
        let profile = await fetchERPProfile(activeCookie);
        
        // Fallback if regex scraping fails but login succeeded
        if (!profile.name || profile.name.length < 2) {
            profile.name = `Student (${studentId})`;
        }
        if (!profile.email) {
            profile.email = `${studentId}@cet.edu.in`;
        }

        return {
            name: profile.name,
            email: profile.email,
            student_id: studentId,
            role: 'student',
            profile_data: JSON.stringify({
                topDetails: {
                    registrationNo: studentId,
                    applicationNo: profile.rawExtractedData['Application No'] || studentId,
                    name: profile.name,
                    rank: profile.rawExtractedData['Rank'] || '',
                    admissionStatus: profile.rawExtractedData['Admission Status'] || 'Verified',
                    joiningYear: profile.rawExtractedData['Joining Year'] || '',
                    semester: profile.rawExtractedData['Semester'] || profile.semester,
                    programme: profile.rawExtractedData['Programme'] || '',
                    progrType: profile.rawExtractedData['Progr. Type'] || '',
                    branch: profile.rawExtractedData['Branch'] || profile.branch
                },
                allotmentDetails: {
                    batch: profile.rawExtractedData['Batch'] || '',
                    joiningYear: profile.rawExtractedData['Joining Year'] || '',
                    admissionDt: profile.rawExtractedData['Admission Dt'] || '',
                    admissionType: profile.rawExtractedData['Admission Type'] || '',
                    feeType: profile.rawExtractedData['Fee Type'] || '',
                    isTFW: profile.rawExtractedData['Is TFW'] || '',
                    isPC: profile.rawExtractedData['Is PC'] || '',
                    seatCategory: profile.rawExtractedData['Seat Category'] || '',
                    category: profile.rawExtractedData['Category'] || '',
                    caste: profile.rawExtractedData['Caste'] || '',
                    ojeeRank: profile.rawExtractedData['OJEE Rank'] || ''
                },
                personalDetails: {
                    dob: profile.rawExtractedData['DOB'] || '',
                    gender: profile.rawExtractedData['Gender'] || '',
                    fatherName: profile.rawExtractedData['Father Name'] || '',
                    fatherOccupation: profile.rawExtractedData['Father Occupation'] || '',
                    fatherAadhar: profile.rawExtractedData['Father Aadhar'] || '',
                    motherName: profile.rawExtractedData['Mother Name'] || '',
                    motherOccupation: profile.rawExtractedData['Mother Occupation'] || '',
                    motherAadhar: profile.rawExtractedData['Mother Aadhar'] || '',
                    annualIncome: profile.rawExtractedData['Annual Income'] || '',
                    bloodGroup: profile.rawExtractedData['Blood Group'] || '',
                    motherTongue: profile.rawExtractedData['Mother Tongue'] || ''
                },
                communicationDetails: {
                    landline: profile.rawExtractedData['Landline'] || '',
                    parentMobile: profile.rawExtractedData['Parent Mobile'] || '',
                    studentMobile: profile.rawExtractedData['Student Mobile (WhatsApp)'] || profile.phone,
                    studentEmail: profile.rawExtractedData['Student Email'] || profile.email,
                    parentEmail: profile.rawExtractedData['Parent Email'] || '',
                    correspondenceAddress: {
                        guardian: profile.rawExtractedData['Guardian'] || '',
                        doorNo: profile.rawExtractedData['Door No'] || '',
                        street: profile.rawExtractedData['Street'] || '',
                        villageCity: profile.rawExtractedData['Villege/City'] || '',
                        state: profile.rawExtractedData['State'] || ''
                    }
                }
            })
        };

    } catch (error) {
        throw new Error(error.message || 'ERP Verification Failed');
    }
}

module.exports = { verifyAndFetchStudent };
