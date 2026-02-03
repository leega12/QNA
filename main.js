
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
                    console.warn('Default admin exists but could not sign in with the configured password.', signInError);
                }
            } else {
                console.warn('Failed to create default admin account.', error);
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
        // User is signed in, get user role from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userRole = userDoc.data().role;
            showDashboard(userRole);
        } else {
            // Handle case where user exists in Auth but not in Firestore
            renderInitialView(); 
        }
    } else {
        // User is signed out
        renderInitialView();
    }
});

function renderInitialView() {
    app.innerHTML = `
      <div class="initial-view">
          <div class="hero-card">
              <h1 class="hero-title">학습 Q&A 플랫폼</h1>
              <p class="hero-subtitle">필요한 정보를 빠르게 찾고, 신뢰할 수 있는 답변을 받는 공간입니다.</p>
              <div class="hero-features">
                  <div class="hero-feature">명확한 질문 구조</div>
                  <div class="hero-feature">신속한 답변 흐름</div>
                  <div class="hero-feature">개인 질문 보호</div>
              </div>
              <div class="button-container">
                  <button class="btn btn-student" data-action="student" aria-label="학생 계정 로그인">학생 계정</button>
                  <span class="button-divider" aria-hidden="true">|</span>
                  <button class="btn btn-teacher" data-action="teacher" aria-label="선생님 계정 로그인">선생님 계정</button>
              </div>
          </div>
          <button class="admin-button" data-action="admin">관리자 모드</button>
      </div>
    `;

    app.removeEventListener('click', handleInitialViewClick);
    app.addEventListener('click', handleInitialViewClick);
}

function handleInitialViewClick(e) {
    const action = e.target?.dataset?.action;
    if (!action) return;
    app.removeEventListener('click', handleInitialViewClick);
    showLogin(action);
}

function showLogin(userType) {
    app.innerHTML = `
        <div class="app-shell">
            <header class="app-header">
                <div class="app-brand">Q&A Academy</div>
                <button class="btn-secondary" id="home-button">처음 화면</button>
            </header>
            <main class="app-content">
                <login-view user-type="${userType}"></login-view>
            </main>
        </div>
    `;

    app.querySelector('#home-button').addEventListener('click', () => auth.signOut());
}

function showDashboard(userRole) {
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
                <div class="app-brand">Q&A Academy</div>
                <div>
                    <button class="btn-secondary" id="home-button">처음 화면</button>
                    <button class="btn-danger" id="logout-button">로그아웃</button>
                </div>
            </header>
            <main class="app-content">
                ${dashboardMarkup}
            </main>
        </div>
    `;

    app.querySelector('#home-button').addEventListener('click', () => auth.signOut());
    app.querySelector('#logout-button').addEventListener('click', () => auth.signOut());
}

// Event listener for login success (now handled by onAuthStateChanged)

// Initial render
ensureDefaultAdminAccount();
renderInitialView();
