
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
let currentView = 'home';

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
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userRole = userDoc.data().role;
            showDashboard(userRole);
        } else {
            renderInitialView();
        }
    } else {
        if (currentView === 'home' || currentView === 'login') {
            renderInitialView();
        }
    }
});

function renderInitialView() {
    currentView = 'home';
    app.innerHTML = `
      <div class="site-wrapper">
          <!-- Header with Navigation -->
          <header class="site-header" role="banner">
              <div class="header-container">
                  <a href="#" class="site-logo" aria-label="홈으로 이동">
                      <span class="logo-icon">📚</span>
                      <span class="logo-text">Q&A Academy</span>
                  </a>
                  <nav class="main-nav" role="navigation" aria-label="주요 네비게이션">
                      <ul class="nav-list">
                          <li><a href="#features" class="nav-link">서비스 소개</a></li>
                          <li><a href="#how-it-works" class="nav-link">이용 방법</a></li>
                          <li><a href="#subjects" class="nav-link">과목 안내</a></li>
                          <li><a href="#faq" class="nav-link">자주 묻는 질문</a></li>
                      </ul>
                  </nav>
                  <button class="admin-button" data-action="admin" aria-label="관리자 로그인">관리자</button>
              </div>
          </header>

          <!-- Hero Section -->
          <main id="main-content" role="main">
              <section class="hero-section" aria-labelledby="hero-title">
                  <div class="hero-content">
                      <h1 id="hero-title" class="hero-title">학습의 모든 궁금증,<br>전문 교사가 답변합니다</h1>
                      <p class="hero-subtitle">
                          수학, 과학, 영어, 역사 등 다양한 과목에서 막히는 부분이 있으신가요?<br>
                          Q&A Academy에서 빠르고 정확한 답변을 받아보세요.
                      </p>
                      <div class="hero-stats">
                          <div class="stat-item">
                              <span class="stat-number">24시간</span>
                              <span class="stat-label">질문 가능</span>
                          </div>
                          <div class="stat-item">
                              <span class="stat-number">전문 교사</span>
                              <span class="stat-label">직접 답변</span>
                          </div>
                          <div class="stat-item">
                              <span class="stat-number">비공개</span>
                              <span class="stat-label">질문 지원</span>
                          </div>
                      </div>
                      <div class="hero-cta">
                          <button class="btn btn-student" data-action="student" aria-label="학생으로 시작하기">
                              <span class="btn-icon">🎒</span>
                              <span class="btn-content">
                                  <span class="btn-title">학생 계정</span>
                                  <span class="btn-desc">질문하고 답변받기</span>
                              </span>
                          </button>
                          <button class="btn btn-teacher" data-action="teacher" aria-label="교사로 시작하기">
                              <span class="btn-icon">👨‍🏫</span>
                              <span class="btn-content">
                                  <span class="btn-title">선생님 계정</span>
                                  <span class="btn-desc">학생들에게 답변하기</span>
                              </span>
                          </button>
                      </div>
                  </div>
              </section>

              <!-- Features Section -->
              <section id="features" class="features-section" aria-labelledby="features-title">
                  <div class="section-container">
                      <h2 id="features-title" class="section-title">왜 Q&A Academy인가요?</h2>
                      <p class="section-subtitle">효율적인 학습을 위한 최적의 환경을 제공합니다</p>
                      <div class="features-grid">
                          <article class="feature-card">
                              <div class="feature-icon">🎯</div>
                              <h3>명확한 질문 구조</h3>
                              <p>과목별로 체계화된 질문 시스템으로 필요한 답변을 빠르게 찾을 수 있습니다.</p>
                          </article>
                          <article class="feature-card">
                              <div class="feature-icon">⚡</div>
                              <h3>신속한 답변</h3>
                              <p>전문 교사진이 실시간으로 모니터링하며 빠른 시간 내에 답변을 제공합니다.</p>
                          </article>
                          <article class="feature-card">
                              <div class="feature-icon">🔒</div>
                              <h3>개인정보 보호</h3>
                              <p>비공개 질문 기능으로 민감한 질문도 안심하고 물어볼 수 있습니다.</p>
                          </article>
                          <article class="feature-card">
                              <div class="feature-icon">📱</div>
                              <h3>어디서나 접속</h3>
                              <p>PC, 태블릿, 스마트폰 등 모든 기기에서 편리하게 이용할 수 있습니다.</p>
                          </article>
                      </div>
                  </div>
              </section>

              <!-- How It Works Section -->
              <section id="how-it-works" class="how-section" aria-labelledby="how-title">
                  <div class="section-container">
                      <h2 id="how-title" class="section-title">이용 방법</h2>
                      <p class="section-subtitle">간단한 3단계로 시작하세요</p>
                      <div class="steps-container">
                          <div class="step-card">
                              <div class="step-number">1</div>
                              <h3>계정 생성</h3>
                              <p>관리자에게 계정을 요청하거나 기존 계정으로 로그인하세요.</p>
                          </div>
                          <div class="step-arrow">→</div>
                          <div class="step-card">
                              <div class="step-number">2</div>
                              <h3>질문 작성</h3>
                              <p>과목을 선택하고 궁금한 내용을 상세히 작성하세요.</p>
                          </div>
                          <div class="step-arrow">→</div>
                          <div class="step-card">
                              <div class="step-number">3</div>
                              <h3>답변 확인</h3>
                              <p>전문 교사의 답변을 확인하고 학습에 활용하세요.</p>
                          </div>
                      </div>
                  </div>
              </section>

              <!-- Subjects Section -->
              <section id="subjects" class="subjects-section" aria-labelledby="subjects-title">
                  <div class="section-container">
                      <h2 id="subjects-title" class="section-title">지원 과목</h2>
                      <p class="section-subtitle">다양한 과목의 전문 교사가 기다리고 있습니다</p>
                      <div class="subjects-grid">
                          <div class="subject-card subject-math">
                              <div class="subject-icon">📐</div>
                              <h3>수학</h3>
                              <p>대수, 기하, 미적분, 통계 등 모든 수학 분야</p>
                          </div>
                          <div class="subject-card subject-science">
                              <div class="subject-icon">🔬</div>
                              <h3>과학</h3>
                              <p>물리, 화학, 생물, 지구과학 전 영역</p>
                          </div>
                          <div class="subject-card subject-english">
                              <div class="subject-icon">📖</div>
                              <h3>영어</h3>
                              <p>문법, 독해, 작문, 회화 전반</p>
                          </div>
                          <div class="subject-card subject-history">
                              <div class="subject-icon">🏛️</div>
                              <h3>역사</h3>
                              <p>한국사, 세계사, 동아시아사</p>
                          </div>
                      </div>
                  </div>
              </section>

              <!-- FAQ Section -->
              <section id="faq" class="faq-section" aria-labelledby="faq-title">
                  <div class="section-container">
                      <h2 id="faq-title" class="section-title">자주 묻는 질문</h2>
                      <p class="section-subtitle">궁금한 점을 미리 확인해보세요</p>
                      <div class="faq-list" role="list">
                          <details class="faq-item">
                              <summary class="faq-question">
                                  <span>Q. 계정은 어떻게 만드나요?</span>
                                  <span class="faq-toggle">+</span>
                              </summary>
                              <div class="faq-answer">
                                  <p>계정은 관리자가 생성해드립니다. 학교 또는 학원 선생님께 계정 생성을 요청해주세요. 이메일과 비밀번호를 받으시면 바로 로그인하여 사용하실 수 있습니다.</p>
                              </div>
                          </details>
                          <details class="faq-item">
                              <summary class="faq-question">
                                  <span>Q. 답변은 얼마나 빨리 받을 수 있나요?</span>
                                  <span class="faq-toggle">+</span>
                              </summary>
                              <div class="faq-answer">
                                  <p>대부분의 질문은 등록된 교사진이 확인하는 대로 답변을 드립니다. 질문의 복잡도에 따라 다를 수 있지만, 가능한 빠른 시간 내에 답변을 제공하기 위해 노력하고 있습니다.</p>
                              </div>
                          </details>
                          <details class="faq-item">
                              <summary class="faq-question">
                                  <span>Q. 비공개 질문은 누가 볼 수 있나요?</span>
                                  <span class="faq-toggle">+</span>
                              </summary>
                              <div class="faq-answer">
                                  <p>비공개로 설정한 질문은 오직 담당 교사만 확인할 수 있습니다. 다른 학생들에게는 공개되지 않으니 민감한 질문도 안심하고 작성하실 수 있습니다.</p>
                              </div>
                          </details>
                          <details class="faq-item">
                              <summary class="faq-question">
                                  <span>Q. 질문 작성 시 주의사항이 있나요?</span>
                                  <span class="faq-toggle">+</span>
                              </summary>
                              <div class="faq-answer">
                                  <p>더 정확한 답변을 받으시려면 다음 사항을 참고해주세요:</p>
                                  <ul>
                                      <li>질문하는 과목을 정확히 선택해주세요</li>
                                      <li>어떤 부분이 이해가 안 되는지 구체적으로 작성해주세요</li>
                                      <li>관련 공식이나 문제가 있다면 함께 적어주세요</li>
                                      <li>이미 시도해본 풀이 방법이 있다면 알려주세요</li>
                                  </ul>
                              </div>
                          </details>
                          <details class="faq-item">
                              <summary class="faq-question">
                                  <span>Q. 모바일에서도 이용할 수 있나요?</span>
                                  <span class="faq-toggle">+</span>
                              </summary>
                              <div class="faq-answer">
                                  <p>네, Q&A Academy는 반응형 웹으로 제작되어 스마트폰, 태블릿 등 모든 기기에서 편리하게 이용하실 수 있습니다. 별도의 앱 설치 없이 웹 브라우저로 접속하시면 됩니다.</p>
                              </div>
                          </details>
                      </div>
                  </div>
              </section>

              <!-- CTA Section -->
              <section class="cta-section" aria-labelledby="cta-title">
                  <div class="section-container">
                      <h2 id="cta-title" class="cta-title">지금 바로 시작하세요</h2>
                      <p class="cta-subtitle">더 이상 혼자 고민하지 마세요. 전문 교사가 함께합니다.</p>
                      <div class="cta-buttons">
                          <button class="btn btn-student" data-action="student">학생으로 시작</button>
                          <button class="btn btn-teacher" data-action="teacher">선생님으로 시작</button>
                      </div>
                  </div>
              </section>
          </main>

          <!-- Footer -->
          <footer class="site-footer" role="contentinfo">
              <div class="footer-container">
                  <div class="footer-brand">
                      <span class="logo-icon">📚</span>
                      <span class="logo-text">Q&A Academy</span>
                      <p class="footer-tagline">학생과 교사를 위한 학습 질의응답 플랫폼</p>
                  </div>
                  <div class="footer-links">
                      <div class="footer-column">
                          <h4>서비스</h4>
                          <ul>
                              <li><a href="#features">서비스 소개</a></li>
                              <li><a href="#how-it-works">이용 방법</a></li>
                              <li><a href="#subjects">과목 안내</a></li>
                          </ul>
                      </div>
                      <div class="footer-column">
                          <h4>지원</h4>
                          <ul>
                              <li><a href="#faq">자주 묻는 질문</a></li>
                              <li><a href="#" data-action="showTerms">이용약관</a></li>
                              <li><a href="#" data-action="showPrivacy">개인정보처리방침</a></li>
                          </ul>
                      </div>
                      <div class="footer-column">
                          <h4>문의</h4>
                          <ul>
                              <li>이메일: support@qna-academy.com</li>
                              <li>운영시간: 평일 09:00 - 18:00</li>
                          </ul>
                      </div>
                  </div>
                  <div class="footer-bottom">
                      <p>&copy; 2025 Q&A Academy. All rights reserved.</p>
                  </div>
              </div>
          </footer>
      </div>
    `;

    attachInitialViewEvents();
}

function attachInitialViewEvents() {
    // Button click events
    app.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            if (action === 'student' || action === 'teacher' || action === 'admin') {
                showLogin(action);
            } else if (action === 'showTerms') {
                e.preventDefault();
                showTermsModal();
            } else if (action === 'showPrivacy') {
                e.preventDefault();
                showPrivacyModal();
            }
        });
    });

    // Smooth scroll for anchor links
    app.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}

function showTermsModal() {
    showModal('이용약관', `
        <h3>제1조 (목적)</h3>
        <p>이 약관은 Q&A Academy(이하 "서비스")가 제공하는 학습 질의응답 서비스의 이용조건 및 절차, 이용자와 서비스의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.</p>

        <h3>제2조 (정의)</h3>
        <p>"이용자"란 본 약관에 따라 서비스가 제공하는 서비스를 받는 회원을 말합니다.</p>

        <h3>제3조 (서비스의 제공)</h3>
        <p>서비스는 다음과 같은 서비스를 제공합니다:</p>
        <ul>
            <li>학습 관련 질문 등록 및 관리</li>
            <li>전문 교사의 답변 제공</li>
            <li>과목별 질문 분류 서비스</li>
        </ul>

        <h3>제4조 (이용자의 의무)</h3>
        <p>이용자는 다음 행위를 하여서는 안 됩니다:</p>
        <ul>
            <li>타인의 개인정보 도용</li>
            <li>서비스 운영을 방해하는 행위</li>
            <li>부적절한 언어 사용</li>
            <li>학습과 무관한 내용 게시</li>
        </ul>
    `);
}

function showPrivacyModal() {
    showModal('개인정보처리방침', `
        <h3>1. 수집하는 개인정보 항목</h3>
        <p>Q&A Academy는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
        <ul>
            <li>필수항목: 이메일 주소</li>
            <li>자동수집: 서비스 이용 기록, 접속 로그</li>
        </ul>

        <h3>2. 개인정보의 수집 및 이용목적</h3>
        <p>수집한 개인정보는 다음의 목적을 위해 활용됩니다:</p>
        <ul>
            <li>회원 관리: 회원제 서비스 이용에 따른 본인확인</li>
            <li>서비스 제공: 질문 및 답변 서비스 제공</li>
        </ul>

        <h3>3. 개인정보의 보유 및 이용기간</h3>
        <p>개인정보는 수집 및 이용목적이 달성된 후에는 지체 없이 파기합니다.</p>

        <h3>4. 개인정보의 파기절차 및 방법</h3>
        <p>전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</p>

        <h3>5. 개인정보 보호책임자</h3>
        <p>개인정보 보호에 관한 문의는 support@qna-academy.com으로 연락해 주시기 바랍니다.</p>
    `);
}

function showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" role="dialog" aria-labelledby="modal-title" aria-modal="true">
            <div class="modal-header">
                <h2 id="modal-title">${title}</h2>
                <button class="modal-close" aria-label="닫기">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Focus trap
    closeBtn.focus();
}

function showLogin(userType) {
    currentView = 'login';
    const userTypeLabels = {
        student: '학생',
        teacher: '선생님',
        admin: '관리자'
    };

    app.innerHTML = `
        <div class="app-shell">
            <header class="app-header" role="banner">
                <a href="#" class="app-brand" id="home-button" aria-label="홈으로 이동">
                    <span class="logo-icon">📚</span>
                    Q&A Academy
                </a>
                <nav class="header-nav" role="navigation">
                    <span class="user-type-badge">${userTypeLabels[userType]} 로그인</span>
                    <button class="btn-secondary" id="back-button">
                        <span aria-hidden="true">←</span> 돌아가기
                    </button>
                </nav>
            </header>
            <main id="main-content" class="app-content" role="main">
                <login-view user-type="${userType}"></login-view>
            </main>
        </div>
    `;

    app.querySelector('#home-button').addEventListener('click', (e) => {
        e.preventDefault();
        renderInitialView();
    });
    app.querySelector('#back-button').addEventListener('click', () => renderInitialView());
}

function showDashboard(userRole) {
    currentView = 'dashboard';
    let dashboardMarkup = '';
    const roleLabels = {
        student: '학생',
        teacher: '선생님',
        admin: '관리자'
    };

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
            <header class="app-header" role="banner">
                <a href="#" class="app-brand" id="home-link" aria-label="홈으로 이동">
                    <span class="logo-icon">📚</span>
                    Q&A Academy
                </a>
                <nav class="header-nav" role="navigation">
                    <span class="user-role-badge">${roleLabels[userRole]}</span>
                    <span class="user-email">${currentUser?.email || ''}</span>
                    <button class="btn-secondary" id="home-button">처음 화면</button>
                    <button class="btn-danger" id="logout-button">로그아웃</button>
                </nav>
            </header>
            <main id="main-content" class="app-content" role="main">
                ${dashboardMarkup}
            </main>
            <footer class="dashboard-footer">
                <p>문의: support@qna-academy.com | <a href="#" id="show-help">도움말</a></p>
            </footer>
        </div>
    `;

    app.querySelector('#home-link').addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut();
    });
    app.querySelector('#home-button').addEventListener('click', () => auth.signOut());
    app.querySelector('#logout-button').addEventListener('click', () => auth.signOut());
    app.querySelector('#show-help').addEventListener('click', (e) => {
        e.preventDefault();
        showHelpModal(userRole);
    });
}

function showHelpModal(userRole) {
    const helpContent = {
        student: `
            <h3>질문 작성하기</h3>
            <ol>
                <li>과목을 선택하세요 (수학, 과학, 영어, 역사)</li>
                <li>질문 내용을 상세하게 작성하세요</li>
                <li>필요시 비공개 옵션을 선택하세요</li>
                <li>"질문 등록" 버튼을 클릭하세요</li>
            </ol>
            <h3>답변 확인하기</h3>
            <p>내 질문 목록에서 답변이 달린 질문을 확인할 수 있습니다. 새로운 답변이 등록되면 실시간으로 업데이트됩니다.</p>
            <h3>좋은 질문 작성 팁</h3>
            <ul>
                <li>구체적인 문제나 개념을 명시하세요</li>
                <li>이미 시도해본 방법이 있다면 함께 적어주세요</li>
                <li>관련 공식이나 조건이 있다면 포함해주세요</li>
            </ul>
        `,
        teacher: `
            <h3>질문 확인하기</h3>
            <p>학생들이 등록한 공개 질문 목록이 표시됩니다. 비공개 질문은 해당 학생의 목록에서만 확인할 수 있습니다.</p>
            <h3>답변 작성하기</h3>
            <ol>
                <li>답변할 질문을 선택하세요</li>
                <li>답변 내용을 입력하세요</li>
                <li>"답변 등록" 버튼을 클릭하세요</li>
            </ol>
            <h3>좋은 답변 작성 팁</h3>
            <ul>
                <li>학생의 수준에 맞는 설명을 해주세요</li>
                <li>단계별로 풀이 과정을 설명해주세요</li>
                <li>관련 개념이나 공식도 함께 알려주세요</li>
            </ul>
        `,
        admin: `
            <h3>사용자 관리</h3>
            <p>새로운 사용자를 생성하거나 기존 사용자의 역할을 변경할 수 있습니다.</p>
            <h3>사용자 생성</h3>
            <ol>
                <li>이메일 주소를 입력하세요</li>
                <li>비밀번호를 설정하세요 (6자 이상)</li>
                <li>역할을 선택하세요 (학생/교사/관리자)</li>
                <li>"사용자 생성" 버튼을 클릭하세요</li>
            </ol>
            <h3>역할 변경</h3>
            <p>사용자 목록에서 역할을 선택하여 변경할 수 있습니다.</p>
        `
    };

    showModal('도움말', helpContent[userRole] || '<p>도움말을 불러올 수 없습니다.</p>');
}

// Initial render
ensureDefaultAdminAccount();
renderInitialView();
