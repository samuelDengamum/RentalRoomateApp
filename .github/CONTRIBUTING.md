# Contributing to RentalHub

Thank you for your interest in contributing to our platform! By participating in this project, you agree to abide by our Code of Conduct.

## How Can I Contribute?

### 1. Reporting Bugs
*   Ensure the bug was not already reported by searching on GitHub under Issues.
*   If you're unable to find an open issue addressing the problem, open a new one. Be sure to include a title and clear description, as much relevant information as possible, and a code sample or an executable test case demonstrating the expected behavior that is not occurring.

### 2. Suggesting Enhancements
*   Open a new issue with a clear title and description.
*   Provide a compelling reason for the new feature and how it improves the application.

### 3. Pull Requests
*   **Fork the repo** and create your branch from `main`.
*   If you've added code that should be tested, add tests.
*   If you've changed APIs, update the documentation.
*   Ensure the test suite passes.
*   Make sure your code lints.
*   Issue that pull request!

## Coding Conventions

### TypeScript / Backend
*   Use TypeScript for robust variable typing.
*   Add **JSDoc Style comments** to controllers, middleware, and core utilities.
*   Use `async/await` pattern over bare Promises.
*   Extract shared business logic to `services/`.
*   Maintain a clear structure. Follow typical REST paradigms.

### React / Frontend
*   We use Functional Components with React Hooks.
*   Prop types should be defined through TypeScript Interfaces correctly typed.
*   Keep components small, and extract them if they grow too large.
*   CSS should ideally be modular or well scoped to avoid specificity clashes.

## Style Guide
Check our `.prettierrc` or ESLint setup if available. Otherwise, standard JavaScript style applies. Ensure 2 space indention and camelCase naming conventions.

Thank you for helping us make the platform better!
