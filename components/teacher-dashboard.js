
class TeacherDashboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.questions = [];
        this.db = firebase.firestore();
    }

    connectedCallback() {
        this.fetchQuestions();
    }

    async fetchQuestions() {
        this.db.collection('questions').where('isPrivate', '==', false)
            .orderBy('createdAt', 'desc')
            .onSnapshot(async (querySnapshot) => {
                const questionPromises = querySnapshot.docs.map(async (doc) => {
                    const question = { id: doc.id, ...doc.data() };
                    const userDoc = await this.db.collection('users').doc(question.studentId).get();
                    question.studentEmail = userDoc.exists ? userDoc.data().email : 'Unknown Student';
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
    }

    async submitAnswer(e) {
        e.preventDefault();
        const questionId = e.target.dataset.questionId;
        const answerText = e.target.querySelector('textarea').value;

        if (!answerText) return;

        await this.db.collection('questions').doc(questionId).update({
            answer: answerText
        });
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
                    color: var(--secondary-color, #50e3c2);
                }
                .question-list {
                    margin-top: 20px;
                }
                .question-item {
                    padding: 20px;
                    border: 1px solid #eee;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    background: #f9f9f9;
                }
                .question-header {
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .answer-form textarea {
                    width: 100%;
                    padding: 10px;
                    border-radius: 6px;
                    border: 1px solid #ccc;
                    box-sizing: border-box;
                    margin-bottom: 10px;
                }
                 button {
                    padding: 10px 18px;
                    border: none;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                }
                .btn-submit {
                     background-color: var(--secondary-color, #50e3c2);
                }
                .student-name {
                    font-size: 0.9em;
                    color: #777;
                }
                .no-questions { text-align: center; color: #888; }
            </style>
            <div class="dashboard-container">
                <h2>Teacher Dashboard</h2>
                <div class="question-list">
                    <h3>New Questions</h3>
                     ${this.questions.length > 0 ? this.questions.map(q => `
                        <div class="question-item">
                            <p class="question-header">[${q.subject}] ${q.text}</p>
                            <p class="student-name">From: ${q.studentEmail} ${q.isPrivate ? '(Private)' : ''}</p>
                            ${q.answer ? `
                                <p><em>Answered: ${q.answer}</em></p>
                                <button class="btn-edit" data-question-id="${q.id}">Edit Answer</button>
                            ` : `
                                <form class="answer-form" data-question-id="${q.id}">
                                    <textarea rows="4" placeholder="Type your answer here..." required></textarea>
                                    <button type="submit" class="btn-submit">Submit Answer</button>
                                </form>
                            `}
                        </div>
                    `).join('') : '<p class="no-questions">No public questions yet.</p>'}
                </div>
            </div>
        `;
    }
}

customElements.define('teacher-dashboard', TeacherDashboard);
