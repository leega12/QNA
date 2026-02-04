
class LoginView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.userType = this.getAttribute('user-type') || 'student';
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
        const btn = this.shadowRoot.querySelector('button');

        btn.disabled = true;
        btn.textContent = '로그인 중...';

        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
        } catch (error) {
            let message = '로그인에 실패했습니다.';
            if (error.code === 'auth/user-not-found') {
                message = '등록되지 않은 계정입니다.';
            } else if (error.code === 'auth/wrong-password') {
                message = '비밀번호가 올바르지 않습니다.';
            } else if (error.code === 'auth/invalid-email') {
                message = '올바른 이메일 형식이 아닙니다.';
            }
            alert(message);
            btn.disabled = false;
            btn.textContent = '로그인';
        }
    }

    render() {
        const labels = {
            student: '학생',
            teacher: '선생님',
            admin: '관리자'
        };
        const colors = {
            student: '#3b82f6',
            teacher: '#10b981',
            admin: '#8b5cf6'
        };

        this.shadowRoot.innerHTML = `
            <style>
                .login-card {
                    background: #fff;
                    border-radius: 16px;
                    border: 1px solid #e5e7eb;
                    padding: 40px;
                    width: 360px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                }
                .login-header {
                    text-align: center;
                    margin-bottom: 32px;
                }
                .login-icon {
                    font-size: 48px;
                    margin-bottom: 12px;
                }
                h2 {
                    margin: 0;
                    font-size: 22px;
                    color: #1f2937;
                }
                .login-type {
                    display: inline-block;
                    margin-top: 8px;
                    padding: 4px 12px;
                    background: ${colors[this.userType]}15;
                    color: ${colors[this.userType]};
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 500;
                }
                form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                }
                input {
                    padding: 14px 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    font-size: 15px;
                    transition: all 0.2s;
                }
                input:focus {
                    outline: none;
                    border-color: ${colors[this.userType]};
                    box-shadow: 0 0 0 3px ${colors[this.userType]}20;
                }
                button {
                    padding: 14px;
                    border: none;
                    border-radius: 10px;
                    background: ${colors[this.userType]};
                    color: #fff;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-top: 8px;
                }
                button:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .helper {
                    text-align: center;
                    font-size: 13px;
                    color: #9ca3af;
                    margin-top: 16px;
                }
                @media (max-width: 480px) {
                    .login-card {
                        width: 100%;
                        padding: 32px 24px;
                    }
                }
            </style>
            <div class="login-card">
                <div class="login-header">
                    <div class="login-icon">${this.userType === 'student' ? '🎒' : this.userType === 'teacher' ? '👨‍🏫' : '⚙️'}</div>
                    <h2>로그인</h2>
                    <span class="login-type">${labels[this.userType]}</span>
                </div>
                <form>
                    <div class="input-group">
                        <label for="email">이메일</label>
                        <input type="email" id="email" placeholder="이메일을 입력하세요" required>
                    </div>
                    <div class="input-group">
                        <label for="password">비밀번호</label>
                        <input type="password" id="password" placeholder="비밀번호를 입력하세요" required>
                    </div>
                    <button type="submit">로그인</button>
                </form>
                <p class="helper">계정 문의는 관리자에게 연락하세요</p>
            </div>
        `;
    }
}

customElements.define('login-view', LoginView);
