
class AdminDashboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.students = [];
        this.teachers = [];
        this.db = firebase.firestore();
        this.secondaryAuth = null;
        this.DEFAULT_PASSWORD = 'keisung1906';

        // 학생 필터 상태
        this.selectedGrade = '';
        this.selectedClass = '';
    }

    connectedCallback() {
        this.fetchUsers();
    }

    async fetchUsers() {
        // 학생 목록
        this.db.collection('users').where('role', '==', 'student').onSnapshot(snapshot => {
            this.students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.students.sort((a, b) => {
                const aInfo = this.parseStudentInfo(a.email);
                const bInfo = this.parseStudentInfo(b.email);
                if (aInfo.grade !== bInfo.grade) return aInfo.grade - bInfo.grade;
                if (aInfo.class !== bInfo.class) return aInfo.class - bInfo.class;
                return aInfo.number - bInfo.number;
            });
            this.render();
            this.attachEventListeners();
        });

        // 교사 목록
        this.db.collection('users').where('role', '==', 'teacher').onSnapshot(snapshot => {
            this.teachers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.teachers.sort((a, b) => {
                const aName = this.parseTeacherName(a.email);
                const bName = this.parseTeacherName(b.email);
                return aName.localeCompare(bName, 'ko');
            });
            this.render();
            this.attachEventListeners();
        });
    }

    parseStudentInfo(email) {
        const localPart = email.split('@')[0];
        // 형식: 1101.홍길동 -> 1학년 1반 01번 홍길동
        const match = localPart.match(/^(\d)(\d)(\d{2})\.(.+)$/);
        if (match) {
            return {
                grade: parseInt(match[1]),
                class: parseInt(match[2]),
                number: parseInt(match[3]),
                name: match[4],
                display: `${match[3]}. ${match[4]}`
            };
        }
        return { grade: 0, class: 0, number: 0, name: email, display: email };
    }

    parseTeacherName(email) {
        const localPart = email.split('@')[0];
        return localPart;
    }

    attachEventListeners() {
        // 엑셀 파일 업로드
        const fileInput = this.shadowRoot.querySelector('#excel-file');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileUpload.bind(this));
        }

        // 학생 학년 선택
        const gradeSelect = this.shadowRoot.querySelector('#grade-select');
        if (gradeSelect) {
            gradeSelect.addEventListener('change', (e) => {
                this.selectedGrade = e.target.value;
                this.selectedClass = '';
                this.render();
                this.attachEventListeners();
            });
        }

        // 학생 반 선택
        const classSelect = this.shadowRoot.querySelector('#class-select');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                this.selectedClass = e.target.value;
                this.render();
                this.attachEventListeners();
            });
        }

        // 학생 선택
        const studentSelect = this.shadowRoot.querySelector('#student-select');
        if (studentSelect) {
            studentSelect.addEventListener('change', (e) => {
                const btns = this.shadowRoot.querySelector('#student-actions');
                btns.style.display = e.target.value ? 'flex' : 'none';
            });
        }

        // 학생 삭제/초기화 버튼
        const studentDeleteBtn = this.shadowRoot.querySelector('#student-delete-btn');
        if (studentDeleteBtn) {
            studentDeleteBtn.addEventListener('click', () => this.deleteUser('student'));
        }
        const studentResetBtn = this.shadowRoot.querySelector('#student-reset-btn');
        if (studentResetBtn) {
            studentResetBtn.addEventListener('click', () => this.resetUserPassword('student'));
        }

        // 교사 선택
        const teacherSelect = this.shadowRoot.querySelector('#teacher-select');
        if (teacherSelect) {
            teacherSelect.addEventListener('change', (e) => {
                const btns = this.shadowRoot.querySelector('#teacher-actions');
                btns.style.display = e.target.value ? 'flex' : 'none';
            });
        }

        // 교사 삭제/초기화 버튼
        const teacherDeleteBtn = this.shadowRoot.querySelector('#teacher-delete-btn');
        if (teacherDeleteBtn) {
            teacherDeleteBtn.addEventListener('click', () => this.deleteUser('teacher'));
        }
        const teacherResetBtn = this.shadowRoot.querySelector('#teacher-reset-btn');
        if (teacherResetBtn) {
            teacherResetBtn.addEventListener('click', () => this.resetUserPassword('teacher'));
        }
    }

    getSecondaryAuth() {
        if (this.secondaryAuth) return this.secondaryAuth;
        let secondaryApp;
        try {
            secondaryApp = firebase.app('secondary');
        } catch (error) {
            secondaryApp = firebase.initializeApp(firebase.app().options, 'secondary');
        }
        this.secondaryAuth = secondaryApp.auth();
        return this.secondaryAuth;
    }

    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const statusEl = this.shadowRoot.querySelector('#upload-status');
        statusEl.innerHTML = '<p class="loading">파일을 읽는 중...</p>';

        try {
            const workbook = await this.readExcelFile(file);

            let totalSuccess = 0;
            let totalFail = 0;
            const errors = [];

            // 모든 시트 처리
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                // 첫 행(헤더) 제외, A2부터 시작
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0) continue;

                    let email = '';
                    let role = 'student';

                    if (sheetName === '교사용') {
                        // 교사용: 이름, 아이디
                        const name = row[0];
                        email = row[1];
                        role = 'teacher';
                    } else if (sheetName === '1학년') {
                        // 1학년: 학년, 반, 번호, 이름, 아이디
                        email = row[4];
                    } else {
                        // 2학년, 3학년: 반, 번호, 이름, 아이디
                        email = row[3];
                    }

                    if (!email || typeof email !== 'string') continue;
                    email = email.toString().trim();
                    if (!email) continue;

                    try {
                        await this.createSingleUser(email, role);
                        totalSuccess++;
                        statusEl.innerHTML = `<p class="loading">처리 중... (${totalSuccess}개 완료)</p>`;
                    } catch (error) {
                        if (error.code === 'auth/email-already-in-use') {
                            totalSuccess++;
                        } else {
                            totalFail++;
                            errors.push(`${email}: ${error.message}`);
                        }
                    }
                }
            }

            statusEl.innerHTML = `
                <p class="success">완료: ${totalSuccess}개 계정 처리됨</p>
                ${totalFail > 0 ? `<p class="error">실패: ${totalFail}개</p>` : ''}
                ${errors.length > 0 ? `<details><summary>오류 상세</summary><pre>${errors.join('\n')}</pre></details>` : ''}
            `;

            // 파일 입력 초기화
            const fileInput = this.shadowRoot.querySelector('#excel-file');
            if (fileInput) fileInput.value = '';

        } catch (error) {
            statusEl.innerHTML = `<p class="error">파일 처리 오류: ${error.message}</p>`;
        }
    }

    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    resolve(workbook);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async createSingleUser(email, role) {
        const secondaryAuth = this.getSecondaryAuth();
        const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, this.DEFAULT_PASSWORD);
        await this.db.collection('users').doc(userCredential.user.uid).set({
            email: userCredential.user.email,
            role: role
        });
        await secondaryAuth.signOut();
    }

    async deleteUser(type) {
        const selectId = type === 'student' ? '#student-select' : '#teacher-select';
        const select = this.shadowRoot.querySelector(selectId);
        const userId = select.value;
        if (!userId) return;

        const user = type === 'student'
            ? this.students.find(u => u.id === userId)
            : this.teachers.find(u => u.id === userId);

        const displayName = type === 'student'
            ? this.parseStudentInfo(user.email).display
            : this.parseTeacherName(user.email);

        if (confirm(`정말 "${displayName}" 계정을 삭제하시겠습니까?`)) {
            try {
                await this.db.collection('users').doc(userId).delete();
                alert('계정이 삭제되었습니다.');
            } catch (error) {
                alert(`삭제 실패: ${error.message}`);
            }
        }
    }

    async resetUserPassword(type) {
        const selectId = type === 'student' ? '#student-select' : '#teacher-select';
        const select = this.shadowRoot.querySelector(selectId);
        const userId = select.value;
        if (!userId) return;

        const user = type === 'student'
            ? this.students.find(u => u.id === userId)
            : this.teachers.find(u => u.id === userId);

        const displayName = type === 'student'
            ? this.parseStudentInfo(user.email).display
            : this.parseTeacherName(user.email);

        alert(`"${displayName}" 계정의 비밀번호 초기화:\n\n비밀번호 초기화는 Firebase Admin SDK가 필요합니다.\n현재는 계정을 삭제 후 다시 생성해주세요.`);
    }

    getGrades() {
        const grades = [...new Set(this.students.map(s => this.parseStudentInfo(s.email).grade))];
        return grades.filter(g => g > 0).sort((a, b) => a - b);
    }

    getClasses(grade) {
        const classes = [...new Set(
            this.students
                .filter(s => this.parseStudentInfo(s.email).grade === parseInt(grade))
                .map(s => this.parseStudentInfo(s.email).class)
        )];
        return classes.filter(c => c > 0).sort((a, b) => a - b);
    }

    getStudentsInClass(grade, classNum) {
        return this.students.filter(s => {
            const info = this.parseStudentInfo(s.email);
            return info.grade === parseInt(grade) && info.class === parseInt(classNum);
        });
    }

    render() {
        const grades = this.getGrades();
        const classes = this.selectedGrade ? this.getClasses(this.selectedGrade) : [];
        const studentsInClass = (this.selectedGrade && this.selectedClass)
            ? this.getStudentsInClass(this.selectedGrade, this.selectedClass)
            : [];

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    max-width: 800px;
                }
                .dashboard {
                    background: #fff;
                    border-radius: 16px;
                    border: 1px solid #e5e7eb;
                    overflow: hidden;
                }
                .section {
                    padding: 24px;
                    border-bottom: 1px solid #e5e7eb;
                }
                .section:last-child {
                    border-bottom: none;
                }
                h2 {
                    margin: 0 0 8px;
                    font-size: 18px;
                    color: #1f2937;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                h2 .icon {
                    font-size: 20px;
                }
                .section-desc {
                    color: #6b7280;
                    font-size: 14px;
                    margin-bottom: 20px;
                }

                /* Upload Section */
                .upload-box {
                    border: 2px dashed #e5e7eb;
                    border-radius: 12px;
                    padding: 32px;
                    text-align: center;
                    background: #f9fafb;
                    transition: all 0.2s;
                }
                .upload-box:hover {
                    border-color: #3b82f6;
                    background: #f0f9ff;
                }
                .upload-icon {
                    font-size: 40px;
                    margin-bottom: 12px;
                }
                .upload-box p {
                    color: #6b7280;
                    margin: 6px 0;
                    font-size: 14px;
                }
                .upload-box .hint {
                    font-size: 12px;
                    color: #9ca3af;
                }
                input[type="file"] {
                    display: none;
                }
                .file-label {
                    display: inline-block;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #3b82f6, #6366f1);
                    color: #fff;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    margin-top: 12px;
                    transition: transform 0.2s;
                }
                .file-label:hover {
                    transform: translateY(-2px);
                }
                #upload-status {
                    margin-top: 16px;
                }

                /* Select Sections */
                .select-row {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .select-group {
                    flex: 1;
                }
                .select-group label {
                    display: block;
                    font-size: 13px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 6px;
                }
                select {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    font-size: 14px;
                    background: #fff;
                    cursor: pointer;
                }
                select:focus {
                    outline: none;
                    border-color: #3b82f6;
                }
                select:disabled {
                    background: #f3f4f6;
                    cursor: not-allowed;
                }
                .action-buttons {
                    display: none;
                    gap: 12px;
                    margin-top: 16px;
                }
                .btn {
                    flex: 1;
                    padding: 12px 20px;
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-danger {
                    background: #ef4444;
                    color: #fff;
                }
                .btn-danger:hover {
                    background: #dc2626;
                }
                .btn-warning {
                    background: #f59e0b;
                    color: #fff;
                }
                .btn-warning:hover {
                    background: #d97706;
                }

                /* Stats */
                .stats-row {
                    display: flex;
                    gap: 16px;
                }
                .stat-box {
                    flex: 1;
                    background: #f0f9ff;
                    padding: 16px;
                    border-radius: 10px;
                    text-align: center;
                }
                .stat-box.green {
                    background: #f0fdf4;
                }
                .stat-number {
                    font-size: 24px;
                    font-weight: 700;
                    color: #3b82f6;
                }
                .stat-box.green .stat-number {
                    color: #10b981;
                }
                .stat-label {
                    font-size: 13px;
                    color: #6b7280;
                }

                /* Status Messages */
                .success { color: #10b981; }
                .error { color: #ef4444; }
                .loading { color: #6b7280; }
                details {
                    margin-top: 12px;
                    font-size: 13px;
                }
                summary {
                    cursor: pointer;
                    color: #6b7280;
                }
                pre {
                    background: #f3f4f6;
                    padding: 12px;
                    border-radius: 8px;
                    overflow-x: auto;
                    font-size: 12px;
                    margin-top: 8px;
                }

                @media (max-width: 600px) {
                    .select-row {
                        flex-direction: column;
                    }
                    .stats-row {
                        flex-direction: column;
                    }
                }
            </style>

            <div class="dashboard">
                <!-- Upload Section -->
                <div class="section">
                    <h2><span class="icon">📊</span> 계정 일괄 등록</h2>
                    <p class="section-desc">
                        엑셀 파일을 업로드하면 학생/교사 계정이 자동으로 생성됩니다.<br>
                        초기 비밀번호: <strong>${this.DEFAULT_PASSWORD}</strong>
                    </p>
                    <div class="upload-box">
                        <div class="upload-icon">📁</div>
                        <p><strong>시트별 형식:</strong></p>
                        <p class="hint">1학년: 학년, 반, 번호, 이름, 아이디 (A2~)</p>
                        <p class="hint">2학년/3학년: 반, 번호, 이름, 아이디 (A2~)</p>
                        <p class="hint">교사용: 이름, 아이디 (A2~)</p>
                        <input type="file" id="excel-file" accept=".xlsx,.xls">
                        <label for="excel-file" class="file-label">엑셀 파일 선택</label>
                    </div>
                    <div id="upload-status"></div>
                </div>

                <!-- Student Management Section -->
                <div class="section">
                    <h2><span class="icon">🎒</span> 학생 계정 관리</h2>
                    <p class="section-desc">학년, 반을 선택한 후 학생을 선택하세요.</p>

                    <div class="select-row">
                        <div class="select-group">
                            <label>학년</label>
                            <select id="grade-select">
                                <option value="">학년 선택</option>
                                ${grades.map(g => `
                                    <option value="${g}" ${this.selectedGrade == g ? 'selected' : ''}>${g}학년</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="select-group">
                            <label>반</label>
                            <select id="class-select" ${!this.selectedGrade ? 'disabled' : ''}>
                                <option value="">반 선택</option>
                                ${classes.map(c => `
                                    <option value="${c}" ${this.selectedClass == c ? 'selected' : ''}>${c}반</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="select-group">
                            <label>학생</label>
                            <select id="student-select" ${!this.selectedClass ? 'disabled' : ''}>
                                <option value="">학생 선택</option>
                                ${studentsInClass.map(s => {
                                    const info = this.parseStudentInfo(s.email);
                                    return `<option value="${s.id}">${info.display}</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="action-buttons" id="student-actions">
                        <button class="btn btn-danger" id="student-delete-btn">계정 삭제</button>
                        <button class="btn btn-warning" id="student-reset-btn">비밀번호 초기화</button>
                    </div>
                </div>

                <!-- Teacher Management Section -->
                <div class="section">
                    <h2><span class="icon">👨‍🏫</span> 교사 계정 관리</h2>
                    <p class="section-desc">교사를 선택하여 계정을 관리하세요.</p>

                    <select id="teacher-select">
                        <option value="">교사 선택</option>
                        ${this.teachers.map(t => `
                            <option value="${t.id}">${this.parseTeacherName(t.email)}</option>
                        `).join('')}
                    </select>
                    <div class="action-buttons" id="teacher-actions">
                        <button class="btn btn-danger" id="teacher-delete-btn">계정 삭제</button>
                        <button class="btn btn-warning" id="teacher-reset-btn">비밀번호 초기화</button>
                    </div>
                </div>

                <!-- Stats Section -->
                <div class="section">
                    <div class="stats-row">
                        <div class="stat-box">
                            <div class="stat-number">${this.students.length}</div>
                            <div class="stat-label">등록된 학생</div>
                        </div>
                        <div class="stat-box green">
                            <div class="stat-number">${this.teachers.length}</div>
                            <div class="stat-label">등록된 교사</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('admin-dashboard', AdminDashboard);
