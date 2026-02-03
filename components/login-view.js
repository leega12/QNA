
class LoginView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.userType = this.getAttribute('user-type') || 'user';
    }

    connectedCallback() {
        this.render();
        this.attachEventListeners();
    }

    attachEventListeners() {
        this.shadowRoot.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    async handleLogin() {
        const email = this.shadowRoot.querySelector('#email').value;
        const password = this.shadowRoot.querySelector('#password').value;
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
        } catch (error) {
            alert(`Login failed: ${error.message}`);
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                 .login-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 42px 40px;
                    background: var(--surface-color, #fff);
                    border-radius: 16px;
                    border: 1px solid var(--border-color, #e5e7eb);
                    box-shadow: var(--shadow-soft, 0 10px 30px rgba(15, 23, 42, 0.12));
                    width: 360px;
                }
                h2 {
                    margin-top: 0;
                    color: var(--text-color, #1f2937);
                    font-size: 22px;
                }
                form {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                }
                input {
                    padding: 12px 14px;
                    margin-bottom: 15px;
                    border-radius: 10px;
                    border: 1px solid var(--border-color, #e5e7eb);
                    font-size: 16px;
                    outline: none;
                }
                input:focus {
                    border-color: var(--primary-color, #3b82f6);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                }
                button {
                    padding: 12px;
                    border: none;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #3b82f6, #6366f1);
                    color: #fff;
                    font-size: 16px;
                    cursor: pointer;
                    font-weight: 600;
                }
                .helper-text {
                    margin-top: 12px;
                    font-size: 13px;
                    color: var(--muted-text-color, #6b7280);
                    text-align: center;
                }
                @media (max-width: 480px) {
                    .login-container {
                        width: 100%;
                        margin: 0 16px;
                    }
                }
            </style>
            <div class="login-container">
                <h2>Login (${this.userType})</h2>
                <form>
                    <input type="email" id="email" placeholder="Email" required>
                    <input type="password" id="password" placeholder="Password" required>
                    <button type="submit">Login</button>
                </form>
                <div class="helper-text">계정은 관리자만 생성할 수 있습니다.</div>
            </div>
        `;
    }
}

customElements.define('login-view', LoginView);
