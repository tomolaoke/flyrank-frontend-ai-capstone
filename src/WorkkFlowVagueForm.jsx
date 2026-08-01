import React, { useState } from "react";

/*
  =============================================================
  SETTINGS FORM — with client-side validation
  =============================================================

  WHAT this file is:
  A self-contained React component that renders an account
  settings form (name, email, phone, password change, and
  notification preferences), validates every field as the user
  types, and only allows submission when everything is valid.

  HOW it works (big picture):
  1. We keep all form values in one state object ("formData").
  2. Every time a field changes, we re-run its own validation
     rule and store any error message in a second state object
     ("errors").
  3. On submit, we validate everything one more time (in case
     the user never touched a field) before calling onSubmit.
  4. A little "fuel gauge" style password-strength bar gives
     instant visual feedback — a nod to Tommy's Reyful project.

  WHERE you'd plug this in:
  Drop this file into src/components/SettingsForm.jsx in any
  React app (Vite, CRA, Next.js "use client" page, etc). It has
  no external dependencies beyond React itself, so it will work
  even before you wire up a real backend — the onSubmit prop is
  where you'd eventually call your API (e.g. PUT /api/users/me).

  WHY validate on the frontend AND not just the backend:
  Frontend validation is about *user experience* — instant
  feedback so people fix mistakes before they even hit submit.
  It is NOT a security measure. You must always re-validate on
  the backend too, because a malicious user can bypass the
  frontend entirely (e.g. by calling your API directly).
*/

// -------------------------------------------------------------
// VALIDATION RULES
// -------------------------------------------------------------
// Each function takes the *current value* of a field (and
// sometimes the whole form, for fields like "confirm password"
// that depend on another field) and returns either:
//   - an empty string ""      -> valid, no error
//   - a human-readable string -> invalid, shown under the field
// Keeping these as small pure functions makes them easy to test
// and easy to reuse (e.g. re-run all of them on submit).

function validateFullName(value) {
  if (!value.trim()) return "Enter your full name.";
  if (value.trim().length < 2) return "That name looks too short.";
  return "";
}

function validateEmail(value) {
  if (!value.trim()) return "Enter your email address.";
  // Simple, readable pattern: something@something.something
  // This isn't a bulletproof RFC-5322 validator (nothing short
  // one is), it just catches the obvious typos.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) return "That email address doesn't look right.";
  return "";
}

function validatePhone(value) {
  if (!value.trim()) return "Enter your phone number.";
  // Accepts Nigerian numbers in either local format (0XXXXXXXXXX,
  // 11 digits) or international format (+234XXXXXXXXXX).
  // We strip spaces/dashes first so "080 1234 5678" still passes.
  const digitsOnly = value.replace(/[\s-]/g, "");
  const localPattern = /^0\d{10}$/; // e.g. 08012345678
  const intlPattern = /^\+234\d{10}$/; // e.g. +2348012345678
  if (!localPattern.test(digitsOnly) && !intlPattern.test(digitsOnly)) {
    return "Use a Nigerian number like 0801 234 5678 or +234 801 234 5678.";
  }
  return "";
}

function getPasswordStrength(value) {
  // Returns a score from 0 (empty/very weak) to 4 (strong).
  // We check for four independent criteria and count how many
  // are met — this is a simple heuristic, not a real entropy
  // calculation, but it's easy to explain to a user in the UI.
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return score;
}

function validatePassword(value) {
  if (!value) return "Choose a new password.";
  if (value.length < 8) return "Use at least 8 characters.";
  if (getPasswordStrength(value) < 3) {
    return "Add an uppercase letter, a number, or a symbol to strengthen it.";
  }
  return "";
}

function validateConfirmPassword(confirmValue, passwordValue) {
  if (!confirmValue) return "Confirm your new password.";
  if (confirmValue !== passwordValue) return "Passwords don't match.";
  return "";
}

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------

export default function SettingsForm({ onSubmit }) {
  // formData holds what's currently typed into every field.
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    notifyOrderUpdates: true,
    notifyPromotions: false,
  });

  // errors holds the current validation message for each field.
  // An empty string (or missing key) means "no error right now".
  const [errors, setErrors] = useState({});

  // touched tracks which fields the user has actually interacted
  // with, so we don't show "required" errors before they've even
  // had a chance to type anything (that would feel accusatory).
  const [touched, setTouched] = useState({});

  // submitState drives the confirmation banner after a successful
  // save — purely cosmetic, resets if the user edits again.
  const [submitState, setSubmitState] = useState("idle"); // idle | success

  // Runs the correct validator for a single field name+value and
  // writes the result into the errors object.
  function runFieldValidation(name, value, currentForm) {
    let message = "";
    if (name === "fullName") message = validateFullName(value);
    if (name === "email") message = validateEmail(value);
    if (name === "phone") message = validatePhone(value);
    if (name === "password") message = validatePassword(value);
    if (name === "confirmPassword") {
      message = validateConfirmPassword(value, currentForm.password);
    }
    return message;
  }

  // Shared handler for every text input. We read name/value/type
  // straight off the DOM event so one function covers every field.
  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    const nextForm = { ...formData, [name]: nextValue };
    setFormData(nextForm);
    setSubmitState("idle"); // any edit invalidates the "saved" banner

    // Only re-validate fields that actually have a validator
    // (checkboxes like notification toggles don't need one).
    if (["fullName", "email", "phone", "password", "confirmPassword"].includes(name)) {
      const message = runFieldValidation(name, nextValue, nextForm);
      setErrors((prev) => ({ ...prev, [name]: message }));

      // If the password field changes, "confirm password" may now
      // be right or wrong too, so we re-check it in step.
      if (name === "password" && touched.confirmPassword) {
        const confirmMessage = validateConfirmPassword(nextForm.confirmPassword, nextValue);
        setErrors((prev) => ({ ...prev, confirmPassword: confirmMessage }));
      }
    }
  }

  // Marks a field as "touched" the first time the user leaves it,
  // so its error message becomes eligible to display.
  function handleBlur(event) {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    // Re-validate every field, right now, regardless of "touched"
    // state — this catches anyone who tabs straight to the submit
    // button without visiting a field at all.
    const fieldNames = ["fullName", "email", "phone", "password", "confirmPassword"];
    const nextErrors = {};
    fieldNames.forEach((name) => {
      nextErrors[name] = runFieldValidation(name, formData[name], formData);
    });

    setErrors(nextErrors);
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    const formIsValid = fieldNames.every((name) => nextErrors[name] === "");
    if (!formIsValid) return; // stop here — don't call onSubmit

    setSubmitState("success");
    if (typeof onSubmit === "function") onSubmit(formData);
  }

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabels = ["Very weak", "Weak", "Okay", "Good", "Strong"];
  const strengthColors = ["#D64545", "#D64545", "#F2994A", "#2D9C6F", "#2D9C6F"];

  // Small helper so JSX below stays readable: only show an error
  // once the field has been touched (or the form was submitted).
  function errorFor(name) {
    return touched[name] ? errors[name] : "";
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-wide uppercase text-[#F2994A] mb-1">
            Account
          </p>
          <h1 className="text-2xl font-bold text-[#1B2A41]">Settings</h1>
          <p className="text-sm text-[#6B7785] mt-1">
            Update your profile and password. Changes are validated as you type.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-[#E4E1D8] rounded-xl shadow-sm overflow-hidden"
        >
          {/* ---------------- PROFILE SECTION ---------------- */}
          <div className="p-6 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6B7785]">
              Profile
            </h2>

            <Field
              label="Full name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errorFor("fullName")}
              placeholder="Ada Okafor"
            />

            <Field
              label="Email address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errorFor("email")}
              placeholder="ada@example.com"
            />

            <Field
              label="Phone number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errorFor("phone")}
              placeholder="0801 234 5678"
            />
          </div>

          <div className="border-t border-[#E4E1D8]" />

          {/* ---------------- PASSWORD SECTION ---------------- */}
          <div className="p-6 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6B7785]">
              Password
            </h2>

            <Field
              label="New password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errorFor("password")}
              placeholder="At least 8 characters"
            />

            {/* Fuel-gauge style strength meter — only shown once
                the user has started typing a password. */}
            {formData.password && (
              <div>
                <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-[#EFEDE4]">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full transition-colors"
                      style={{
                        backgroundColor:
                          i < passwordStrength ? strengthColors[passwordStrength] : "transparent",
                      }}
                    />
                  ))}
                </div>
                <p
                  className="text-xs mt-1 font-medium"
                  style={{ color: strengthColors[passwordStrength] }}
                >
                  {strengthLabels[passwordStrength]}
                </p>
              </div>
            )}

            <Field
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errorFor("confirmPassword")}
              placeholder="Re-enter your new password"
            />
          </div>

          <div className="border-t border-[#E4E1D8]" />

          {/* ---------------- NOTIFICATIONS SECTION ---------------- */}
          <div className="p-6 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6B7785]">
              Notifications
            </h2>

            <Toggle
              label="Order and delivery updates"
              name="notifyOrderUpdates"
              checked={formData.notifyOrderUpdates}
              onChange={handleChange}
            />
            <Toggle
              label="Promotions and offers"
              name="notifyPromotions"
              checked={formData.notifyPromotions}
              onChange={handleChange}
            />
          </div>

          <div className="border-t border-[#E4E1D8]" />

          {/* ---------------- SUBMIT ---------------- */}
          <div className="p-6 flex items-center justify-between">
            {submitState === "success" ? (
              <p className="text-sm font-medium text-[#2D9C6F]">Settings saved.</p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="bg-[#1B2A41] hover:bg-[#25384f] active:scale-[0.98] transition-all text-white text-sm font-semibold px-5 py-2.5 rounded-lg"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SMALL PRESENTATIONAL SUBCOMPONENTS
// -------------------------------------------------------------
// Pulling these out keeps the main component's JSX focused on
// *structure* (which fields, in which order) rather than repeating
// the same label/input/error markup five times over.

function Field({ label, name, type = "text", value, onChange, onBlur, error, placeholder }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-[#1B2A41] mb-1.5">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        // We still set aria-invalid / aria-describedby even though
        // the visible error only shows once "touched" — screen
        // readers should know a field is invalid as soon as it is.
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-[#1B2A41] placeholder:text-[#B5B2A8] outline-none transition-colors focus:ring-2 ${
          error
            ? "border-[#D64545] focus:ring-[#D64545]/20"
            : "border-[#E4E1D8] focus:border-[#1B2A41] focus:ring-[#1B2A41]/10"
        }`}
      />
      {error && (
        <p id={`${name}-error`} className="text-xs text-[#D64545] mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}

function Toggle({ label, name, checked, onChange }) {
  return (
    <label htmlFor={name} className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-sm text-[#1B2A41]">{label}</span>
      <span className="relative inline-block w-10 h-6">
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className="absolute inset-0 rounded-full transition-colors"
          style={{ backgroundColor: checked ? "#F2994A" : "#E4E1D8" }}
        />
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </span>
    </label>
  );
}