// ============================================================================
// WorkkFlowPreciseForm.test.js
// ----------------------------------------------------------------------------
// WHAT: Unit tests for WorkkFlowPreciseForm using Jest + React Testing
//       Library (RTL).
//
// WHY we test this way (plain-English analogy):
//   RTL encourages testing a component the way a REAL USER would use it —
//   clicking into fields, typing, tabbing away, clicking "Submit" — rather
//   than poking at internal React state directly. That way, if we ever swap
//   out react-hook-form or zod for something else, these tests still hold up
//   as long as the on-screen behavior stays the same.
//
// HOW we trigger validation in tests:
//   Our form only shows errors after a field is "touched" (blurred) or after
//   the whole form is submitted. So each test either (a) types into a field
//   and then tabs/clicks away to blur it, or (b) clicks "Submit" directly to
//   trigger validation on every field at once.
// ============================================================================

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkkFlowPreciseForm from './WorkkFlowPreciseForm';

// Small helper so every test doesn't have to repeat this boilerplate.
function setup() {
  const user = userEvent.setup();
  render(<WorkkFlowPreciseForm />);
  return {
    user,
    emailInput: screen.getByLabelText(/email/i),
    passwordInput: screen.getByLabelText(/^password$/i),
    confirmInput: screen.getByLabelText(/confirm password/i),
    submitButton: screen.getByRole('button', { name: /sign up/i }),
  };
}

describe('WorkkFlowPreciseForm', () => {
  // A console.log spy is set up fresh for every test and restored afterward,
  // so we can assert on submission behavior without polluting real logs.
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  // --------------------------------------------------------------------
  // 1. Valid email passes (no error message shown after blur)
  // --------------------------------------------------------------------
  test('shows no email error when a valid email is entered and the field is blurred', async () => {
    const { user, emailInput, passwordInput } = setup();

    await user.type(emailInput, 'tommy@example.com');
    // Clicking into the next field blurs the email input, which is what
    // triggers our "onTouched" validation.
    await user.click(passwordInput);

    await waitFor(() => {
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');
  });

  // --------------------------------------------------------------------
  // 2. Invalid email fails (error message appears after blur)
  // --------------------------------------------------------------------
  test('shows an email error when an invalid email is entered and the field is blurred', async () => {
    const { user, emailInput, passwordInput } = setup();

    await user.type(emailInput, 'not-an-email');
    await user.click(passwordInput); // blur the email field

    const error = await screen.findByText(/please enter a valid email address/i);
    expect(error).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
  });

  // --------------------------------------------------------------------
  // 3. Password too short fails
  // --------------------------------------------------------------------
  test('shows a password error when the password is shorter than 8 characters', async () => {
    const { user, passwordInput, confirmInput } = setup();

    await user.type(passwordInput, 'short1');
    await user.click(confirmInput); // blur the password field

    const error = await screen.findByText(/password must be at least 8 characters long/i);
    expect(error).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
  });

  // --------------------------------------------------------------------
  // 4. Confirm password mismatch fails
  // --------------------------------------------------------------------
  test('shows a mismatch error when confirm password does not match password', async () => {
    const { user, passwordInput, confirmInput, submitButton } = setup();

    await user.type(passwordInput, 'validPassword123');
    await user.type(confirmInput, 'differentPassword123');
    await user.click(submitButton); // submit to force full-form validation

    const error = await screen.findByText(/passwords do not match/i);
    expect(error).toBeInTheDocument();
    expect(confirmInput).toHaveAttribute('aria-invalid', 'true');
  });

  // --------------------------------------------------------------------
  // 5. Successful form submission logs data (simulated API call)
  // --------------------------------------------------------------------
  test('logs form data on successful submission with all valid fields', async () => {
    const { user, emailInput, passwordInput, confirmInput, submitButton } = setup();

    await user.type(emailInput, 'tommy@example.com');
    await user.type(passwordInput, 'validPassword123');
    await user.type(confirmInput, 'validPassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith('Form submitted:', {
        email: 'tommy@example.com',
        password: 'validPassword123',
        confirmPassword: 'validPassword123',
      });
    });

    // Sanity check: no error messages should be visible on a successful submit.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});