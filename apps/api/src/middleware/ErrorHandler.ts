import { ApiResponse } from '../types/http';

export class ErrorHandler {
  static handle(error: unknown): Response {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    let status = 500;
    let code = 'INTERNAL_SERVER_ERROR';

    if (message.startsWith('FORBIDDEN:') || message.startsWith('MTLS_VERIFICATION_REQUIRED:')) {
      status = 403;
      code = message.startsWith('MTLS_VERIFICATION_REQUIRED:') ? 'MTLS_VERIFICATION_REQUIRED' : 'FORBIDDEN';
    } else if (message.startsWith('UNAUTHORIZED:')) {
      status = 401;
      code = 'UNAUTHORIZED';
    } else if (message.startsWith('GEO_ANOMALY_DETECTED:')) {
      status = 401;
      code = 'GEO_ANOMALY_DETECTED';
    } else if (message.startsWith('SECURITY_NONCE_VIOLATION:')) {
      status = 401;
      code = 'SECURITY_NONCE_VIOLATION';
    } else if (message.startsWith('INVALID_CREDENTIALS:')) {
      status = 401;
      code = 'INVALID_CREDENTIALS';
    } else if (message.startsWith('USER_EXISTS:') || message.startsWith('CONFLICT:')) {
      status = 409;
      code = message.startsWith('USER_EXISTS:') ? 'USER_EXISTS' : 'CONFLICT';
    } else if (
      message.startsWith('NOT_FOUND:') ||
      message.startsWith('NOTE_NOT_FOUND:') ||
      message.startsWith('MEDIA_NOT_FOUND:')
    ) {
      status = 404;
      code = 'NOT_FOUND';
    } else if (
      message.startsWith('BAD_REQUEST:') ||
      message.startsWith('INVALID_INPUT:') ||
      message.startsWith('USERNAME_REQUIRED:') ||
      message.startsWith('AUTH_TOKEN_REQUIRED:')
    ) {
      status = 400;
      code = 'BAD_REQUEST';
    }

    const cleanMessage = message.includes(': ') ? message.split(': ').slice(1).join(': ') : message;

    const responseBody: ApiResponse = {
      success: false,
      error: {
        code,
        message: cleanMessage,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseBody), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
