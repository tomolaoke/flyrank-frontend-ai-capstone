// ============================================================================
// WorkkFlowPreciseForm.jsx
// ----------------------------------------------------------------------------
// WHAT this file is:
//   A self-contained sign-up-style form with three fields: email, password,
//   and confirm password.
//
// WHY it's built this way (plain-English analogy):
//   Think of "react-hook-form" as the form's stage manager — it keeps track
//   of what's been typed, what's been "touched" (clicked into and left), and
//   whether the actor (the form) is ready to go on stage (submit).
//   "zod" is the script supervisor — it holds the rules ("email must look
//   like an email", "password must be 8+ characters") and flags any line
//   that doesn't match the script *before* the show (the API call) starts.
//
// HOW validation timing works here:
//   We only want to nag the user with red error text AFTER they've left a
//   field (been "touched") or after they've tried to submit the whole form.
//   We do NOT want errors popping up while someone is still mid-keystroke on
//   their first pass through the field — that feels aggressive and unhelpful.
//   react-hook-form's `mode: 'onTouched'` handles most of this for us, and we
//   additionally check `formState.touchedFields` / `isSubmitted` when
//   deciding whether to *render* an error message.
//
// WHEN this component would be used:
//   Any screen that needs "create an account" or "reset your password"
//   style input — e.g., the Reyful customer sign-up flow.
// ============================================================================

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ----------------------------------------------------------------------------
// 1. THE SCHEMA (the "script" mentioned above)
// ----------------------------------------------------------------------------
// zod lets us describe the SHAPE and RULES of our data in one place, instead
// of scattering `if (password.length < 8)` checks across the component.
//
// `.refine()` on the whole object (rather than just on `confirmPassword`) is
// how we express a rule that depends on TWO fields at once — "confirmPassword
// must equal password". We attach the resulting error to the `confirmPassword`
// field with `path: ['confirmPassword']` so it renders under the right input.
const workkFlowSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      // zod's built-in .email() checks for a valid "name@domain.tld" shape.
      .email('Please enter a valid email address'),

    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters long'),

    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ----------------------------------------------------------------------------
// 2. THE COMPONENT
// ----------------------------------------------------------------------------
export default function WorkkFlowPreciseForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields, isSubmitted, isSubmitting },
  } = useForm({
    // resolver: 'wires' zod into react-hook-form so every validation run
    // (on change, on blur, on submit) is checked against our schema above.
    resolver: zodResolver(workkFlowSchema),

    // mode: 'onTouched' means: validate a field the first time the user
    // LEAVES it (blur), and then re-validate on every change after that.
    // This is what gives us "don't yell at me while I'm still typing".
    mode: 'onTouched',

    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // ----------------------------------------------------------------------
  // shouldShowError: the single gatekeeper function for "do we render the
  // red error text under this field right now?"
  //
  // WHY we need this on top of what `errors` already gives us:
  //   `errors.email` will be populated by react-hook-form/zod as soon as a
  //   field is invalid — but "invalid" and "should be SHOWN as invalid" are
  //   two different things when we don't want to shame someone before
  //   they've even had a chance to finish typing or leave the field.
  //
  //   So we only show the message if EITHER:
  //     (a) the field has been touched (user clicked in and out at least
  //         once), OR
  //     (b) the whole form has been submitted at least once
  //         (isSubmitted) — this covers the case where someone tabs
  //         through fields quickly and hits "Submit" without ever
  //         triggering a blur event on, say, the last field.
  // ----------------------------------------------------------------------
  const shouldShowError = (fieldName) =>
    Boolean(errors[fieldName]) && (touchedFields[fieldName] || isSubmitted);

  // ----------------------------------------------------------------------
  // onSubmit: this is where a real app would call `fetch('/api/signup', ...)`.
  // For now we simulate that network call with a console.log so this
  // component can be dropped in and wired up to a real backend route later
  // (matching the "integration planned once the backend route exists"
  // approach used elsewhere in this project).
  // ----------------------------------------------------------------------
  const onSubmit = (data) => {
    // NOTE: never log real passwords in a production app! This console.log
    // is here purely as a stand-in for "the data that WOULD be sent to the
    // API", so you can see in devtools that validation + submission works.
    console.log('Form submitted:', data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate // we rely on zod for validation messaging, not the browser's default popups
      aria-label="Sign up form"
    >
      {/* ------------------------------------------------------------ */}
      {/* EMAIL FIELD                                                   */}
      {/* ------------------------------------------------------------ */}
      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          // register() plugs this input into react-hook-form's tracking.
          {...register('email')}
          // aria-invalid tells assistive tech (like screen readers) "this
          // field currently has a validation problem" — independent of
          // whether we're visually rendering the message yet.
          aria-invalid={errors.email ? 'true' : 'false'}
          // aria-describedby links the input to its error message element
          // by id, so a screen reader announces the error when the user
          // focuses the input. We only point at the id when we're actually
          // showing the error, otherwise we omit it (undefined -> no attribute).
          aria-describedby={shouldShowError('email') ? 'email-error' : undefined}
        />
        {shouldShowError('email') && (
          // role="alert" makes screen readers announce this text as soon as
          // it appears, without the user needing to navigate to it manually.
          <p id="email-error" role="alert" className="field-error">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* PASSWORD FIELD                                                */}
      {/* ------------------------------------------------------------ */}
      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={shouldShowError('password') ? 'password-error' : undefined}
        />
        {shouldShowError('password') && (
          <p id="password-error" role="alert" className="field-error">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* CONFIRM PASSWORD FIELD                                        */}
      {/* ------------------------------------------------------------ */}
      <div className="form-field">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          aria-describedby={
            shouldShowError('confirmPassword') ? 'confirmPassword-error' : undefined
          }
        />
        {shouldShowError('confirmPassword') && (
          <p id="confirmPassword-error" role="alert" className="field-error">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Sign Up'}
      </button>
    </form>
  );
}