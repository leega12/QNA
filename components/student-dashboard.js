
class StudentDashboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.questions = [];
        this.db = firebase.firestore();
        this.auth = firebase.auth();
    }

    connectedCallback() {
        this.render();
        this.attachEventListeners();

        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.userId = user.uid;
                this.fetchQuestions();
            }
        });
    }

    fetchQuestions() {
        this.db.collection('questions').where('studentId', '==', this.userId)
            .orderBy('createdAt', 'desc')
            .onSnapshot(querySnapshot => {
                this.questions = [];
                querySnapshot.forEach(doc => {
                    this.questions.push({ id: doc.id, ...doc.data() });
                });
                this.render();
                this.attachEventListeners();
            });
    }

    async submitQuestion(e) {
        e.preventDefault();
        const subject = this.shadowRoot.querySelector('#subject').value;
        const questionText = this.shadowRoot.querySelector('#question').value;
        const isPrivate = this.shadowRoot.querySelector('#is-private').checked;

        if (!questionText.trim()) return;

        const btn = this.shadowRoot.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '등록 중...';

        try {
            await this.db.collection('questions').add({
                studentId: this.userId,
                subject: subject,
                text: questionText,
                isPrivate: isPrivate,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                answer: null
            });
            e.target.reset();
        } catch (error) {
            alert('질문 등록에 실패했습니다.');
        }
    }

    attachEventListeners() {
        const form = this.shadowRoot.querySelector('#question-form');
        if (form) {
            form.addEventListener('submit', this.submitQuestion.bind(this));
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

    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    max-width: 800px;
                }
                .dashboard {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                /* Question Form */
                .form-card {
                    background: #fff;
                    border-radius: 16px;
                    border: 1px solid #e5e7eb;
                    padding: 24px;
                }
                .form-card h2 {
                    margin: 0 0 20px;
                    font-size: 18px;
                    color: #1f2937;
                }
                .form-row {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .form-group {
                    flex: 1;
                }
                .form-group.subject {
                    flex: 0 0 140px;
                }
                label {
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 6px;
                }
                select, textarea {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    font-size: 15px;
                    font-family: inherit;
                    resize: vertical;
                }
                select:focus, textarea:focus {
                    outline: none;
                    border-color: #3b82f6;
                }
                .checkbox-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 16px;
                }
                .checkbox-group input {
                    width: 18px;
                    height: 18px;
                }
                .checkbox-group label {
                    margin: 0;
                    font-weight: 400;
                    color: #6b7280;
                }
                .submit-btn {
                    width: 100%;
                    padding: 14px;
                    border: none;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #3b82f6, #6366f1);
                    color: #fff;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                }
                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                /* Questions List */
                .list-card {
                    background: #fff;
                    border-radius: 16px;
                    border: 1px solid #e5e7eb;
                    overflow: hidden;
                }
                .list-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .list-header h2 {
                    margin: 0;
                    font-size: 18px;
                    color: #1f2937;
                }
                .question-count {
                    background: #f3f4f6;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    color: #6b7280;
                }
                .question-item {
                    padding: 20px 24px;
                    border-bottom: 1px solid #f3f4f6;
                }
                .question-item:last-child {
                    border-bottom: none;
                }
                .question-meta {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                }
                .subject-badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #fff;
                }
                .private-badge {
                    background: #f3f4f6;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 11px;
                    color: #6b7280;
                }
                .question-date {
                    font-size: 12px;
                    color: #9ca3af;
                    margin-left: auto;
                }
                .question-text {
                    font-size: 15px;
                    color: #1f2937;
                    line-height: 1.6;
                    margin-bottom: 12px;
                }
                .answer-box {
                    background: #f0fdf4;
                    border-left: 3px solid #10b981;
                    padding: 12px 16px;
                    border-radius: 0 8px 8px 0;
                }
                .answer-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #10b981;
                    margin-bottom: 6px;
                }
                .answer-text {
                    font-size: 14px;
                    color: #374151;
                    line-height: 1.6;
                }
                .no-answer {
                    font-size: 13px;
                    color: #9ca3af;
                    font-style: italic;
                }
                .empty-state {
                    padding: 48px 24px;
                    text-align: center;
                    color: #9ca3af;
                }
                .empty-icon {
                    font-size: 48px;
                    margin-bottom: 12px;
                }

                @media (max-width: 600px) {
                    .form-row {
                        flex-direction: column;
                    }
                    .form-group.subject {
                        flex: 1;
                    }
                }
            </style>

            <div class="dashboard">
                <div class="form-card">
                    <h2>질문하기</h2>
                    <form id="question-form">
                        <div class="form-row">
                            <div class="form-group subject">
                                <label for="subject">과목</label>
                                <select id="subject" name="subject">
                                    <option value="math">수학</option>
                                    <option value="science">과학</option>
                                    <option value="english">영어</option>
                                    <option value="history">역사</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="question">질문 내용</label>
                                <textarea id="question" name="question" rows="3" placeholder="궁금한 내용을 자세히 적어주세요" required></textarea>
                            </div>
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="is-private" name="is-private">
                            <label for="is-private">비공개 질문 (선생님만 볼 수 있습니다)</label>
                        </div>
                        <button type="submit" class="submit-btn">질문 등록</button>
                    </form>
                </div>

                <div class="list-card">
                    <div class="list-header">
                        <h2>내 질문</h2>
                        <span class="question-count">${this.questions.length}개</span>
                    </div>
                    ${this.questions.length > 0 ? this.questions.map(q => `
                        <div class="question-item">
                            <div class="question-meta">
                                <span class="subject-badge" style="background: ${this.getSubjectColor(q.subject)}">${this.getSubjectLabel(q.subject)}</span>
                                ${q.isPrivate ? '<span class="private-badge">비공개</span>' : ''}
                                <span class="question-date">${this.formatDate(q.createdAt)}</span>
                            </div>
                            <div class="question-text">${q.text}</div>
                            ${q.answer ? `
                                <div class="answer-box">
                                    <div class="answer-label">선생님 답변</div>
                                    <div class="answer-text">${q.answer}</div>
                                </div>
                            ` : '<div class="no-answer">아직 답변이 없습니다</div>'}
                        </div>
                    `).join('') : `
                        <div class="empty-state">
                            <div class="empty-icon">📝</div>
                            <p>아직 질문이 없습니다.<br>위에서 첫 질문을 해보세요!</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }
}

customElements.define('student-dashboard', StudentDashboard);
