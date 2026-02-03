
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
        this.shadowRoot.querySelector('#question-form').addEventListener('submit', this.submitQuestion.bind(this));

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
                this.render(); // Re-render with the new data
                this.attachEventListeners(); // Re-attach listeners after re-render
            });
    }

    async submitQuestion(e) {
        e.preventDefault();
        const subject = this.shadowRoot.querySelector('#subject').value;
        const questionText = this.shadowRoot.querySelector('#question').value;
        const isPrivate = this.shadowRoot.querySelector('#is-private').checked;

        if (!questionText) return;

        await this.db.collection('questions').add({
            studentId: this.userId,
            subject: subject,
            text: questionText,
            isPrivate: isPrivate,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            answer: null
        });

        e.target.reset(); // Clear the form
    }
    
    attachEventListeners() {
        this.shadowRoot.querySelector('#question-form').addEventListener('submit', this.submitQuestion.bind(this));
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
                    color: var(--primary-color, #4a90e2);
                }
                .question-form {
                    margin-bottom: 30px;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                input[type="text"], select, textarea {
                    width: 100%;
                    padding: 10px;
                    border-radius: 6px;
                    border: 1px solid #ccc;
                    box-sizing: border-box; 
                }
                button {
                    padding: 12px 20px;
                    border: none;
                    border-radius: 6px;
                    background-color: var(--primary-color, #4a90e2);
                    color: #fff;
                    cursor: pointer;
                }
                .question-list {
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }
                 .question-item {
                    padding: 15px;
                    border-bottom: 1px solid #eee;
                }
                 .question-item p:first-child {
                    font-weight: bold;
                 }
                 .no-questions { text-align: center; color: #888; }
            </style>
            <div class="dashboard-container">
                <h2>Student Dashboard</h2>
                
                <div class="question-form">
                    <h3>Ask a Question</h3>
                    <form id="question-form">
                        <div class="form-group">
                            <label for="subject">Subject</label>
                            <select id="subject" name="subject">
                                <option value="math">Math</option>
                                <option value="science">Science</option>
                                <option value="english">English</option>
                                <option value="history">History</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="question">Question</label>
                            <textarea id="question" name="question" rows="5" required></textarea>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="is-private" name="is-private">
                                Ask Privately (only visible to teachers)
                            </label>
                        </div>
                        <button type="submit">Submit Question</button>
                    </form>
                </div>

                <div class="question-list">
                    <h3>My Questions</h3>
                    ${this.questions.length > 0 ? this.questions.map(q => `
                        <div class="question-item">
                            <p>[${q.subject.charAt(0).toUpperCase() + q.subject.slice(1)}] ${q.text}</p>
                            <p><em>${q.answer ? q.answer : 'No answer yet.'}</em></p>
                        </div>
                    `).join('') : '<p class="no-questions">You haven\'t asked any questions yet.</p>'}
                </div>
            </div>
        `;
    }
}

customElements.define('student-dashboard', StudentDashboard);
