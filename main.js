
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
      <div class="button-container">
          <button class="btn btn-student">학생</button>
          <button class="btn btn-teacher">선생님</button>
      </div>
      <button class="admin-button">관리자 모드</button>
      <button id="logout-button" style="display: none;">Logout</button>
    `;

    app.querySelector('.btn-student').addEventListener('click', () => showLogin('student'));
    app.querySelector('.btn-teacher').addEventListener('click', () => showLogin('teacher'));
    app.querySelector('.admin-button').addEventListener('click', () => showLogin('admin'));
    app.querySelector('#logout-button').addEventListener('click', () => auth.signOut());
}

function showLogin(userType) {
    app.innerHTML = `<login-view user-type="${userType}"></login-view>`;
}

function showDashboard(userRole) {
    const logoutButton = app.querySelector('#logout-button');
    if(logoutButton) logoutButton.style.display = 'block';

    switch (userRole) {
        case 'student':
            app.innerHTML = `<student-dashboard></student-dashboard>`;
            break;
        case 'teacher':
            app.innerHTML = `<teacher-dashboard></teacher-dashboard>`;
            break;
        case 'admin':
            app.innerHTML = `<admin-dashboard></admin-dashboard>`;
            break;
        default:
            renderInitialView();
    }
}

// Event listener for login success (now handled by onAuthStateChanged)

// Initial render
renderInitialView();
