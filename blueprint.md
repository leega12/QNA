# Blueprint: Q&A Site

## 1. Overview

A simple Q&A web application for students and teachers. Students can ask questions, and teachers can answer them. An admin user can manage users.

## 2. Core Features & Design

### Implemented

*   **User Roles:** Student, Teacher, Admin.
*   **Authentication:** Email/password login and registration for each role using Firebase Authentication.
*   **User-specific Dashboards:** Separate dashboards for students, teachers, and admins, implemented as Web Components.
*   **Firebase Integration:** Firebase Hosting, Authentication, and Firestore are initialized.
*   **UI Components:**
    *   `login-view`: A reusable component for login and registration.
    *   `student-dashboard`: Allows students to submit questions and view their past questions and answers.
    *   `teacher-dashboard`: Allows teachers to view all public questions and provide answers.
    *   `admin-dashboard`: Allows admins to manage user roles and delete users from Firestore.
*   **Firestore Database Schema:**
    *   `users` collection: Stores user roles (`uid`, `email`, `role`).
    *   `questions` collection: Stores question details (`uid`, `studentId`, `text`, `subject`, `isPrivate`, `createdAt`, `answer`).
*   **Styling:** A modern, clean design with a consistent color scheme and layout.

## 3. Deployment

The application is deployed to Firebase Hosting. CI/CD can be set up for automatic deployments on code changes.
