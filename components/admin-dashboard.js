
class AdminDashboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.users = [];
        this.db = firebase.firestore();
        this.secondaryAuth = null;
    }

    connectedCallback() {
        this.fetchUsers();
    }

    async fetchUsers() {
        this.db.collection('users').onSnapshot(snapshot => {
            this.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.render();
            this.attachEventListeners();
        });
    }

    attachEventListeners() {
        const createForm = this.shadowRoot.querySelector('#create-user-form');
        if (createForm) {
            createForm.addEventListener('submit', this.createUser.bind(this));
        }

        this.shadowRoot.querySelectorAll('.change-role').forEach(select => {
            select.addEventListener('change', this.changeUserRole.bind(this));
        });
        this.shadowRoot.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', this.deleteUser.bind(this));
        });
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

    async createUser(e) {
        e.preventDefault();
        const email = this.shadowRoot.querySelector('#new-email').value.trim();
        const password = this.shadowRoot.querySelector('#new-password').value;
        const role = this.shadowRoot.querySelector('#new-role').value;

        if (!email || !password) {
            alert('이메일과 비밀번호를 입력해 주세요.');
            return;
        }

        try {
            const secondaryAuth = this.getSecondaryAuth();
            const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
            await this.db.collection('users').doc(userCredential.user.uid).set({
                email: userCredential.user.email,
                role
            });
            await secondaryAuth.signOut();
            e.target.reset();
            alert('계정이 생성되었습니다.');
        } catch (error) {
            alert(`계정 생성 실패: ${error.message}`);
        }
    }

    async changeUserRole(e) {
        const userId = e.target.dataset.userId;
        const newRole = e.target.value;
        await this.db.collection('users').doc(userId).update({ role: newRole });
    }

    async deleteUser(e) {
        const userId = e.target.dataset.userId;
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            // Note: This only deletes the user from Firestore. 
            // For a complete solution, you would need a Cloud Function 
            // to delete the user from Firebase Authentication as well.
            await this.db.collection('users').doc(userId).delete();
        }
    }


    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .dashboard-container {
                    width: 90%;
                    max-width: 1200px;
                    margin: 20px auto;
                    padding: 28px;
                    background: var(--surface-color, #fff);
                    border-radius: 16px;
                    border: 1px solid var(--border-color, #e5e7eb);
                    box-shadow: var(--shadow-soft, 0 10px 30px rgba(15, 23, 42, 0.12));
                }
                h2 {
                    color: var(--danger-color, #ef4444);
                    margin-top: 0;
                }
                .admin-section {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-color, #e5e7eb);
                }
                h3 {
                    margin-bottom: 20px;
                }
                 .user-list table {
                    width: 100%;
                    border-collapse: collapse;
                 }
                 .user-list th, .user-list td {
                    padding: 12px 15px;
                    border-bottom: 1px solid var(--border-color, #e5e7eb);
                    text-align: left;
                 }
                 .user-list th {
                    background-color: #f9fafb;
                 }
                input, select, button {
                    padding: 8px 12px;
                    border-radius: 10px;
                    border: 1px solid var(--border-color, #e5e7eb);
                    margin-right: 10px;
                }
                #create-user-form {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    align-items: center;
                }
                #create-user-form button {
                    background: linear-gradient(135deg, #3b82f6, #6366f1);
                    border: none;
                    color: #fff;
                    font-weight: 600;
                }
                button.delete-user {
                    background-color: var(--danger-color, #ef4444);
                    color: #fff;
                    border: none;
                }
            </style>
            <div class="dashboard-container">
                <h2>Admin Dashboard</h2>

                <div class="admin-section">
                    <h3>Create User</h3>
                    <form id="create-user-form">
                        <div>
                            <input type="email" id="new-email" placeholder="Email" required>
                        </div>
                        <div>
                            <input type="password" id="new-password" placeholder="Password" required>
                        </div>
                        <div>
                            <select id="new-role">
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button type="submit">Create Account</button>
                    </form>
                </div>

                <div class="admin-section user-list">
                    <h3>Manage Users</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.users.map(user => `
                                <tr>
                                    <td>${user.email}</td>
                                    <td>
                                        <select class="change-role" data-user-id="${user.id}">
                                            <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                                            <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button class="delete-user" data-user-id="${user.id}">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

            </div>
        `;
    }
}

customElements.define('admin-dashboard', AdminDashboard);
