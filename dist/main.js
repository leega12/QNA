
import firebaseConfig from './firebase-config.js';
import './components/login-view.js';
import './components/student-dashboard.js';
import './components/teacher-dashboard.js';
import './components/admin-dashboard.js';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const app = document.getElementById('app');

let currentUser = null;

const DEFAULT_ADMIN = {
    email: 'admin@qna.local',
    password: 'Admin!2345'
};

function getSecondaryAuth() {
    let secondaryApp;
    try {
        secondaryApp = firebase.app('secondary');
    } catch (error) {
        secondaryApp = firebase.initializeApp(firebase.app().options, 'secondary');
    }
    return secondaryApp.auth();
}

async function ensureDefaultAdminAccount() {
    try {
        const existing = await db.collection('users')
            .where('email', '==', DEFAULT_ADMIN.email)
            .limit(1)
            .get();

        if (!existing.empty) return;

        const secondaryAuth = getSecondaryAuth();

        try {
            const userCredential = await secondaryAuth.createUserWithEmailAndPassword(
                DEFAULT_ADMIN.email,
                DEFAULT_ADMIN.password
            );
            await db.collection('users').doc(userCredential.user.uid).set({
                email: DEFAULT_ADMIN.email,
                role: 'admin'
            });
            await secondaryAuth.signOut();
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                try {
                    const userCredential = await secondaryAuth.signInWithEmailAndPassword(
                        DEFAULT_ADMIN.email,
                        DEFAULT_ADMIN.password
                    );
                    await db.collection('users').doc(userCredential.user.uid).set({
                        email: DEFAULT_ADMIN.email,
                        role: 'admin'
                    });
                    await secondaryAuth.signOut();
                } catch (signInError) {
                    console.warn('Default admin exists but could not sign in.', signInError);
                }
            }
        }
    } catch (error) {
        console.warn('Failed to verify default admin account.', error);
    }
}

// Listen for auth state changes
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userRole = userDoc.data().role;
            showDashboard(userRole);
        } else {
            renderInitialView();
        }
    } else {
        renderInitialView();
    }
});

function renderInitialView() {
    app.innerHTML = `
      <div class="site-wrapper">
          <header class="site-header">
              <div class="header-container">
                  <div class="site-logo">
                      <span class="logo-icon">📚</span>
                      <span class="logo-text">계성 Q&A</span>
                  </div>
                  <button class="admin-btn" id="admin-btn">관리자</button>
              </div>
          </header>

          <main class="hero-section">
              <div class="hero-content">
                  <h1 class="hero-title">학습 질문, 선생님께 물어보세요</h1>
                  <p class="hero-subtitle">
                      궁금한 내용을 질문하면 담당 선생님이 직접 답변해드립니다.
                  </p>

                  <div class="login-buttons">
                      <button class="btn btn-student" id="student-btn">
                          <span class="btn-icon">🎒</span>
                          <span>학생 로그인</span>
                      </button>
                      <button class="btn btn-teacher" id="teacher-btn">
                          <span class="btn-icon">👨‍🏫</span>
                          <span>선생님 로그인</span>
                      </button>
                  </div>
              </div>
          </main>

          <footer class="site-footer">
              <p>계성고등학교 Q&A 시스템</p>
          </footer>
      </div>
    `;

    document.getElementById('student-btn').addEventListener('click', () => showLogin('student'));
    document.getElementById('teacher-btn').addEventListener('click', () => showLogin('teacher'));
    document.getElementById('admin-btn').addEventListener('click', () => showLogin('admin'));
}

function showLogin(userType) {
    const labels = { student: '학생', teacher: '선생님', admin: '관리자' };

    app.innerHTML = `
        <div class="app-shell">
            <header class="app-header">
                <div class="app-brand">
                    <span class="logo-icon">📚</span>
                    <span>계성 Q&A</span>
                </div>
                <button class="btn-back" id="back-btn">← 돌아가기</button>
            </header>
            <main class="app-content">
                <login-view user-type="${userType}"></login-view>
            </main>
        </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => {
        auth.signOut().then(() => renderInitialView()).catch(() => renderInitialView());
    });
}

function showDashboard(userRole) {
    const labels = { student: '학생', teacher: '선생님', admin: '관리자' };
    let dashboardMarkup = '';

    switch (userRole) {
        case 'student':
            dashboardMarkup = `<student-dashboard></student-dashboard>`;
            break;
        case 'teacher':
            dashboardMarkup = `<teacher-dashboard></teacher-dashboard>`;
            break;
        case 'admin':
            dashboardMarkup = `<admin-dashboard></admin-dashboard>`;
            break;
        default:
            renderInitialView();
            return;
    }

    app.innerHTML = `
        <div class="app-shell">
            <header class="app-header">
                <div class="app-brand">
                    <span class="logo-icon">📚</span>
                    <span>계성 Q&A</span>
                </div>
                <div class="header-right">
                    <span class="user-badge">${labels[userRole]}</span>
                    <span class="user-email">${currentUser?.email || ''}</span>
                    <button class="btn-logout" id="logout-btn">로그아웃</button>
                </div>
            </header>
            <main class="app-content">
                ${dashboardMarkup}
            </main>
        </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.signOut();
    });
}

// Initial render
ensureDefaultAdminAccount();
renderInitialView();
