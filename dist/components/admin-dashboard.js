
class AdminDashboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.users = [];
        this.db = firebase.firestore();
        this.secondaryAuth = null;
        this.DEFAULT_PASSWORD = 'keisung1906';
    }

    connectedCallback() {
        this.fetchUsers();
    }

    async fetchUsers() {
        this.db.collection('users').where('role', '==', 'student').onSnapshot(snapshot => {
            this.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.users.sort((a, b) => {
                const aInfo = this.parseStudentInfo(a.email);
                const bInfo = this.parseStudentInfo(b.email);
                if (aInfo.grade !== bInfo.grade) return aInfo.grade - bInfo.grade;
                if (aInfo.class !== bInfo.class) return aInfo.class - bInfo.class;
                return aInfo.number - bInfo.number;
            });
            this.render();
            this.attachEventListeners();
        });
    }

    parseStudentInfo(email) {
        // email format: 1101.홍길동@school.com -> 1학년 1반 01번 홍길동
        const localPart = email.split('@')[0];
        const match = localPart.match(/^(\d)(\d)(\d{2})\.(.+)$/);
        if (match) {
            return {
                grade: parseInt(match[1]),
                class: parseInt(match[2]),
                number: parseInt(match[3]),
                name: match[4],
                display: `${match[1]}학년 ${match[2]}반 ${match[3]}번 ${match[4]}`
            };
        }
        return { grade: 0, class: 0, number: 0, name: email, display: email };
    }

    attachEventListeners() {
        const fileInput = this.shadowRoot.querySelector('#excel-file');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileUpload.bind(this));
        }

        const userSelect = this.shadowRoot.querySelector('#user-select');
        if (userSelect) {
            userSelect.addEventListener('change', this.handleUserSelect.bind(this));
        }

        const deleteBtn = this.shadowRoot.querySelector('#delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', this.deleteSelectedUser.bind(this));
        }

        const resetBtn = this.shadowRoot.querySelector('#reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', this.resetPassword.bind(this));
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
            const data = await this.readExcelFile(file);
            if (data.length === 0) {
                statusEl.innerHTML = '<p class="error">엑셀 파일에서 데이터를 찾을 수 없습니다.</p>';
                return;
            }

            statusEl.innerHTML = `<p class="loading">총 ${data.length}개의 계정을 생성 중...</p>`;

            let successCount = 0;
            let failCount = 0;
            const errors = [];

            for (const row of data) {
                const email = row.email || row['이메일'] || row['아이디'] || row['Email'] || row['ID'];
                if (!email) continue;

                const emailStr = email.toString().trim();
                if (!emailStr) continue;

                try {
                    await this.createSingleUser(emailStr, 'student');
                    successCount++;
                } catch (error) {
                    if (error.code !== 'auth/email-already-in-use') {
                        failCount++;
                        errors.push(`${emailStr}: ${error.message}`);
                    } else {
                        successCount++; // 이미 있는 계정도 성공으로 처리
                    }
                }
            }

            statusEl.innerHTML = `
                <p class="success">완료: ${successCount}개 계정 처리됨</p>
                ${failCount > 0 ? `<p class="error">실패: ${failCount}개</p>` : ''}
                ${errors.length > 0 ? `<details><summary>오류 상세</summary><pre>${errors.join('\n')}</pre></details>` : ''}
            `;
            e.target.value = '';
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
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    resolve(jsonData);
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

    handleUserSelect(e) {
        const actionBtns = this.shadowRoot.querySelector('.action-buttons');
        if (e.target.value) {
            actionBtns.style.display = 'flex';
        } else {
            actionBtns.style.display = 'none';
        }
    }

    async deleteSelectedUser() {
        const select = this.shadowRoot.querySelector('#user-select');
        const userId = select.value;
        if (!userId) return;

        const user = this.users.find(u => u.id === userId);
        const info = this.parseStudentInfo(user.email);

        if (confirm(`정말 "${info.display}" 계정을 삭제하시겠습니까?`)) {
            try {
                await this.db.collection('users').doc(userId).delete();
                this.shadowRoot.querySelector('#manage-status').innerHTML =
                    '<p class="success">계정이 삭제되었습니다.</p>';
                select.value = '';
                this.shadowRoot.querySelector('.action-buttons').style.display = 'none';
            } catch (error) {
                this.shadowRoot.querySelector('#manage-status').innerHTML =
                    `<p class="error">삭제 실패: ${error.message}</p>`;
            }
        }
    }

    async resetPassword() {
        const select = this.shadowRoot.querySelector('#user-select');
        const userId = select.value;
        if (!userId) return;

        const user = this.users.find(u => u.id === userId);
        const info = this.parseStudentInfo(user.email);

        if (confirm(`"${info.display}" 계정의 비밀번호를 초기화(${this.DEFAULT_PASSWORD})하시겠습니까?`)) {
            this.shadowRoot.querySelector('#manage-status').innerHTML =
                `<p class="info">비밀번호 초기화는 Firebase Admin SDK가 필요합니다.<br>
                현재는 학생에게 비밀번호 재설정 이메일을 보내거나,<br>
                계정을 삭제 후 다시 생성해주세요.</p>`;
        }
    }

    render() {
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
                    font-size: 20px;
                    color: #1f2937;
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
                    font-size: 48px;
                    margin-bottom: 12px;
                }
                .upload-box p {
                    color: #6b7280;
                    margin: 8px 0;
                }
                .file-input-wrapper {
                    margin-top: 16px;
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
                    transition: transform 0.2s;
                }
                .file-label:hover {
                    transform: translateY(-2px);
                }
                #upload-status {
                    margin-top: 16px;
                }

                /* Manage Section */
                select {
                    width: 100%;
                    padding: 14px;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    font-size: 15px;
                    background: #fff;
                    cursor: pointer;
                }
                select:focus {
                    outline: none;
                    border-color: #3b82f6;
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
                #manage-status {
                    margin-top: 16px;
                }

                /* User List */
                .user-count {
                    background: #f0f9ff;
                    padding: 16px;
                    border-radius: 10px;
                    text-align: center;
                    color: #3b82f6;
                    font-weight: 600;
                }

                /* Status Messages */
                .success { color: #10b981; }
                .error { color: #ef4444; }
                .info { color: #3b82f6; line-height: 1.6; }
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
            </style>

            <div class="dashboard">
                <!-- Upload Section -->
                <div class="section">
                    <h2>학생 계정 일괄 등록</h2>
                    <p class="section-desc">
                        엑셀 파일(.xlsx)을 업로드하면 학생 계정이 자동으로 생성됩니다.<br>
                        초기 비밀번호: <strong>${this.DEFAULT_PASSWORD}</strong>
                    </p>
                    <div class="upload-box">
                        <div class="upload-icon">📊</div>
                        <p>엑셀 파일의 첫 번째 열에 이메일 주소가 있어야 합니다</p>
                        <p>예: 1101.홍길동@school.com (1학년1반01번)</p>
                        <div class="file-input-wrapper">
                            <input type="file" id="excel-file" accept=".xlsx,.xls">
                            <label for="excel-file" class="file-label">엑셀 파일 선택</label>
                        </div>
                    </div>
                    <div id="upload-status"></div>
                </div>

                <!-- Manage Section -->
                <div class="section">
                    <h2>학생 계정 관리</h2>
                    <p class="section-desc">학생을 선택하여 계정을 삭제하거나 비밀번호를 초기화할 수 있습니다.</p>

                    <select id="user-select">
                        <option value="">학생 선택...</option>
                        ${this.users.map(user => {
                            const info = this.parseStudentInfo(user.email);
                            return `<option value="${user.id}">${info.display}</option>`;
                        }).join('')}
                    </select>

                    <div class="action-buttons">
                        <button class="btn btn-danger" id="delete-btn">계정 삭제</button>
                        <button class="btn btn-warning" id="reset-btn">비밀번호 초기화</button>
                    </div>
                    <div id="manage-status"></div>
                </div>

                <!-- Stats Section -->
                <div class="section">
                    <div class="user-count">
                        등록된 학생 수: ${this.users.length}명
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('admin-dashboard', AdminDashboard);
