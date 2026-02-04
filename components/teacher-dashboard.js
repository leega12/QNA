
class TeacherDashboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.questions = [];
        this.db = firebase.firestore();
        this.filter = 'unanswered';
    }

    connectedCallback() {
        this.fetchQuestions();
    }

    async fetchQuestions() {
        this.db.collection('questions')
            .orderBy('createdAt', 'desc')
            .onSnapshot(async (querySnapshot) => {
                const questionPromises = querySnapshot.docs.map(async (doc) => {
                    const question = { id: doc.id, ...doc.data() };
                    const userDoc = await this.db.collection('users').doc(question.studentId).get();
                    question.studentEmail = userDoc.exists ? userDoc.data().email : '알 수 없음';
                    return question;
                });

                this.questions = await Promise.all(questionPromises);
                this.render();
                this.attachEventListeners();
            });
    }

    attachEventListeners() {
        this.shadowRoot.querySelectorAll('.answer-form').forEach(form => {
            form.addEventListener('submit', this.submitAnswer.bind(this));
        });

        this.shadowRoot.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filter = e.target.dataset.filter;
                this.render();
                this.attachEventListeners();
            });
        });
    }

    async submitAnswer(e) {
        e.preventDefault();
        const questionId = e.target.dataset.questionId;
        const answerText = e.target.querySelector('textarea').value;

        if (!answerText.trim()) return;

        const btn = e.target.querySelector('button');
        btn.disabled = true;
        btn.textContent = '등록 중...';

        try {
            await this.db.collection('questions').doc(questionId).update({
                answer: answerText
            });
        } catch (error) {
            alert('답변 등록에 실패했습니다.');
            btn.disabled = false;
            btn.textContent = '답변 등록';
        }
    }

    getFilteredQuestions() {
        switch (this.filter) {
            case 'unanswered':
                return this.questions.filter(q => !q.answer);
            case 'answered':
                return this.questions.filter(q => q.answer);
            default:
                return this.questions;
        }
    }

    getSubjectLabel(subject) {
        const labels = {
            math: '수학',
            science: '과학',
            english: '영어',
            history: '역사'
        };
        return labels[subject] || subject;
    }

    getSubjectColor(subject) {
        const colors = {
            math: '#f59e0b',
            science: '#10b981',
            english: '#3b82f6',
            history: '#ec4899'
        };
        return colors[subject] || '#6b7280';
    }

    parseStudentInfo(email) {
        const localPart = email.split('@')[0];
        const match = localPart.match(/^(\d)(\d)(\d{2})\.(.+)$/);
        if (match) {
            return `${match[1]}-${match[2]} ${match[4]}`;
        }
        return email;
    }

    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    render() {
        const filteredQuestions = this.getFilteredQuestions();
        const unansweredCount = this.questions.filter(q => !q.answer).length;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    max-width: 900px;
                }
                .dashboard {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                /* Header */
                .header-card {
                    background: #fff;
                    border-radius: 16px;
                    border: 1px solid #e5e7eb;
                    padding: 20px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                .stats {
                    display: flex;
                    gap: 24px;
                }
                .stat-item {
                    text-align: center;
                }
                .stat-number {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1f2937;
                }
                .stat-number.highlight {
                    color: #ef4444;
                }
                .stat-label {
                    font-size: 13px;
                    color: #6b7280;
                }
                .filter-buttons {
                    display: flex;
                    gap: 8px;
                }
                .filter-btn {
                    padding: 10px 16px;
                    border: 1px solid #e5e7eb;
                    background: #fff;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                .filter-btn:hover {
                    border-color: #10b981;
                }
                .filter-btn.active {
                    background: #10b981;
                    color: #fff;
                    border-color: #10b981;
                }

                /* Question List */
                .questions-container {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .question-card {
                    background: #fff;
                    border-radius: 16px;
                    border: 1px solid #e5e7eb;
                    overflow: hidden;
                }
                .question-header {
                    padding: 16px 20px;
                    background: #f9fafb;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .subject-badge {
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #fff;
                }
                .student-info {
                    font-size: 14px;
                    color: #374151;
                }
                .private-badge {
                    background: #fef3c7;
                    color: #92400e;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .question-date {
                    margin-left: auto;
                    font-size: 13px;
                    color: #9ca3af;
                }
                .question-body {
                    padding: 20px;
                }
                .question-text {
                    font-size: 15px;
                    color: #1f2937;
                    line-height: 1.7;
                    margin-bottom: 16px;
                }

                /* Answer Form */
                .answer-form {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .answer-form textarea {
                    width: 100%;
                    padding: 14px;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    font-size: 14px;
                    font-family: inherit;
                    resize: vertical;
                    min-height: 100px;
                }
                .answer-form textarea:focus {
                    outline: none;
                    border-color: #10b981;
                }
                .answer-form button {
                    align-self: flex-end;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #10b981, #14b8a6);
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .answer-form button:hover:not(:disabled) {
                    transform: translateY(-1px);
                }
                .answer-form button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                /* Existing Answer */
                .answer-box {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-radius: 10px;
                    padding: 16px;
                }
                .answer-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #10b981;
                    margin-bottom: 8px;
                }
                .answer-text {
                    font-size: 14px;
                    color: #374151;
                    line-height: 1.6;
                }

                /* Empty State */
                .empty-state {
                    background: #fff;
                    border-radius: 16px;
                    border: 1px solid #e5e7eb;
                    padding: 60px 24px;
                    text-align: center;
                    color: #9ca3af;
                }
                .empty-icon {
                    font-size: 48px;
                    margin-bottom: 12px;
                }

                @media (max-width: 600px) {
                    .header-card {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .question-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .question-date {
                        margin-left: 0;
                    }
                }
            </style>

            <div class="dashboard">
                <div class="header-card">
                    <div class="stats">
                        <div class="stat-item">
                            <div class="stat-number highlight">${unansweredCount}</div>
                            <div class="stat-label">미답변</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${this.questions.length}</div>
                            <div class="stat-label">전체 질문</div>
                        </div>
                    </div>
                    <div class="filter-buttons">
                        <button class="filter-btn ${this.filter === 'unanswered' ? 'active' : ''}" data-filter="unanswered">미답변</button>
                        <button class="filter-btn ${this.filter === 'answered' ? 'active' : ''}" data-filter="answered">답변완료</button>
                        <button class="filter-btn ${this.filter === 'all' ? 'active' : ''}" data-filter="all">전체</button>
                    </div>
                </div>

                <div class="questions-container">
                    ${filteredQuestions.length > 0 ? filteredQuestions.map(q => `
                        <div class="question-card">
                            <div class="question-header">
                                <span class="subject-badge" style="background: ${this.getSubjectColor(q.subject)}">${this.getSubjectLabel(q.subject)}</span>
                                <span class="student-info">${this.parseStudentInfo(q.studentEmail)}</span>
                                ${q.isPrivate ? '<span class="private-badge">비공개</span>' : ''}
                                <span class="question-date">${this.formatDate(q.createdAt)}</span>
                            </div>
                            <div class="question-body">
                                <div class="question-text">${q.text}</div>
                                ${q.answer ? `
                                    <div class="answer-box">
                                        <div class="answer-label">내 답변</div>
                                        <div class="answer-text">${q.answer}</div>
                                    </div>
                                ` : `
                                    <form class="answer-form" data-question-id="${q.id}">
                                        <textarea placeholder="답변을 입력하세요..." required></textarea>
                                        <button type="submit">답변 등록</button>
                                    </form>
                                `}
                            </div>
                        </div>
                    `).join('') : `
                        <div class="empty-state">
                            <div class="empty-icon">${this.filter === 'unanswered' ? '🎉' : '📭'}</div>
                            <p>${this.filter === 'unanswered' ? '미답변 질문이 없습니다!' : '질문이 없습니다.'}</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }
}

customElements.define('teacher-dashboard', TeacherDashboard);
