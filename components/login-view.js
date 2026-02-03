
class LoginView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.userType = this.getAttribute('user-type') || 'user';
        this.isRegistering = false; // Flag to toggle between login and registration
    }

    connectedCallback() {
        this.render();
        this.attachEventListeners();
    }

    attachEventListeners() {
        this.shadowRoot.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.isRegistering) {
                this.handleRegistration();
            } else {
                this.handleLogin();
            }
        });

        this.shadowRoot.querySelector('#toggle-form').addEventListener('click', () => {
            this.isRegistering = !this.isRegistering;
            this.render();
            this.attachEventListeners();
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

    async handleRegistration() {
        const email = this.shadowRoot.querySelector('#email').value;
        const password = this.shadowRoot.querySelector('#password').value;
        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Add user role to Firestore
            await firebase.firestore().collection('users').doc(user.uid).set({
                email: user.email,
                role: this.userType
            });

        } catch (error) {
            alert(`Registration failed: ${error.message}`);
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                 .login-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 40px;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
                    width: 300px;
                }
                h2 {
                    margin-top: 0;
                    color: #333;
                }
                form {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                }
                input {
                    padding: 12px;
                    margin-bottom: 15px;
                    border-radius: 6px;
                    border: 1px solid #ccc;
                    font-size: 16px;
                }
                button {
                    padding: 12px;
                    border: none;
                    border-radius: 6px;
                    background-color: var(--primary-color, #4a90e2);
                    color: #fff;
                    font-size: 16px;
                    cursor: pointer;
                }
                #toggle-form {
                    margin-top: 15px;
                    background: none;
                    border: none;
                    color: var(--primary-color, #4a90e2);
                    cursor: pointer;
                }
            </style>
            <div class="login-container">
                <h2>${this.isRegistering ? 'Register' : 'Login'} (${this.userType})</h2>
                <form>
                    <input type="email" id="email" placeholder="Email" required>
                    <input type="password" id="password" placeholder="Password" required>
                    <button type="submit">${this.isRegistering ? 'Register' : 'Login'}</button>
                </form>
                <button id="toggle-form">
                    ${this.isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                </button>
            </div>
        `;
    }
}

customElements.define('login-view', LoginView);
