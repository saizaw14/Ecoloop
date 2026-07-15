import { FirebaseError } from 'firebase/app';

type AuthField = 'email' | 'password';

export type AuthFieldError = {
  field: AuthField;
  message: string;
};

export function getLoginAuthError(error: unknown): AuthFieldError {
  if (!(error instanceof FirebaseError)) {
    return {
      field: 'password',
      message: 'Something went wrong. Please try again.',
    };
  }

  switch (error.code) {
    case 'auth/invalid-email':
      return {
        field: 'email',
        message: 'Please enter a valid email address.',
      };
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return {
        field: 'password',
        message: 'Your email or password is incorrect.',
      };
    case 'auth/too-many-requests':
      return {
        field: 'password',
        message: 'Too many attempts. Please wait a moment and try again.',
      };
    case 'auth/network-request-failed':
      return {
        field: 'password',
        message: 'Network error. Please check your internet connection and try again.',
      };
    default:
      return {
        field: 'password',
        message: 'Authentication failed. Please try again.',
      };
  }
}

export function getSignupAuthError(error: unknown): AuthFieldError {
  if (!(error instanceof FirebaseError)) {
    return {
      field: 'email',
      message: 'Something went wrong. Please try again.',
    };
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return {
        field: 'email',
        message: 'That email is already in use. Try logging in instead.',
      };
    case 'auth/invalid-email':
      return {
        field: 'email',
        message: 'Please enter a valid email address.',
      };
    case 'auth/weak-password':
      return {
        field: 'password',
        message: 'Your password is too weak. Please use at least 6 characters.',
      };
    case 'auth/network-request-failed':
      return {
        field: 'email',
        message: 'Network error. Please check your internet connection and try again.',
      };
    default:
      return {
        field: 'email',
        message: 'Authentication failed. Please try again.',
      };
  }
}

export function getPasswordResetAuthError(error: unknown): AuthFieldError {
  if (!(error instanceof FirebaseError)) {
    return {
      field: 'email',
      message: 'Something went wrong. Please try again.',
    };
  }

  switch (error.code) {
    case 'auth/invalid-email':
      return {
        field: 'email',
        message: 'Please enter a valid email address.',
      };
    case 'auth/user-not-found':
      return {
        field: 'email',
        message: 'No account was found for that email address.',
      };
    case 'auth/too-many-requests':
      return {
        field: 'email',
        message: 'Too many reset attempts. Please wait a moment and try again.',
      };
    case 'auth/network-request-failed':
      return {
        field: 'email',
        message: 'Network error. Please check your internet connection and try again.',
      };
    default:
      return {
        field: 'email',
        message: 'Could not send the reset email. Please try again.',
      };
  }
}
