- When working on a Pull Request, always check for feedback from CodeRabbit or other AI reviewers in the thread and ensure your suggestions align with or resolve their flags.
- Before each task, you must first complete the following steps:
  1. Provide a full plan of your changes.
  2. Provide a list of behaviors that you'll change.
  3. Provide a list of test cases to add.
- Before you add any code, always check if you can just re-use
  or re-configure any existing code to achieve the result.
- Always follow the DRY principle and avoid code duplication.
- Avoid hard-coded numbers and use shared constants instead.
- If you add new code or change existing code, always verify that everything still works by running `npm run ci`. Complete the task only after all checks pass.
- Always use TDD: write a failing test implementing the request, solve with code, and check that tests become green.
