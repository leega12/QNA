
class AdminDashboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.users = [];
        this.db = firebase.firestore();
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
        this.shadowRoot.querySelectorAll('.change-role').forEach(select => {
            select.addEventListener('change', this.changeUserRole.bind(this));
        });
        this.shadowRoot.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', this.deleteUser.bind(this));
        });
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
                    padding: 20px;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
                }
                h2 {
                    color: var(--danger-color, #d0021b);
                }
                .admin-section {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
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
                    border-bottom: 1px solid #ddd;
                    text-align: left;
                 }
                 .user-list th {
                    background-color: #f2f2f2;
                 }
                select, button {
                    padding: 8px 12px;
                    border-radius: 6px;
                    border: 1px solid #ccc;
                    margin-right: 10px;
                }
                button.delete-user {
                    background-color: var(--danger-color, #d0021b);
                    color: #fff;
                    border: none;
                }
            </style>
            <div class="dashboard-container">
                <h2>Admin Dashboard</h2>

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
