import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string | string[];
  details?: ValidationErrorDetail[];
  path: string;
  timestamp: string;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}

interface HttpExceptionDetails {
  statusCode: number;
  code: string;
  message: string | string[];
  details?: ValidationErrorDetail[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown) => typeof item === 'string')
  );
}

function getValidationDetails(
  value: unknown,
): ValidationErrorDetail[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const details = value.flatMap((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.field !== 'string' ||
      typeof item.message !== 'string'
    ) {
      return [];
    }

    return [{ field: item.field, message: item.message }];
  });

  return details.length > 0 ? details : undefined;
}

function normalizeCode(value: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'HTTP_ERROR';
}

function getDefaultCode(statusCode: number): string {
  return normalizeCode(STATUS_CODES[statusCode] ?? `HTTP ${statusCode}`);
}

function getHttpExceptionDetails(
  exception: HttpException,
): HttpExceptionDetails {
  const statusCode = exception.getStatus();
  const exceptionResponse: unknown = exception.getResponse();

  if (typeof exceptionResponse === 'string') {
    return {
      statusCode,
      code: getDefaultCode(statusCode),
      message: exceptionResponse,
    };
  }

  if (isRecord(exceptionResponse)) {
    const responseMessage = exceptionResponse.message;
    const responseCode = exceptionResponse.code;
    const responseError = exceptionResponse.error;
    const responseDetails = getValidationDetails(exceptionResponse.details);

    const message =
      typeof responseMessage === 'string' || isStringArray(responseMessage)
        ? responseMessage
        : (STATUS_CODES[statusCode] ?? 'Request failed');
    const codeSource =
      typeof responseCode === 'string'
        ? responseCode
        : typeof responseError === 'string'
          ? responseError
          : (STATUS_CODES[statusCode] ?? `HTTP ${statusCode}`);

    return {
      statusCode,
      code: normalizeCode(codeSource),
      message,
      ...(responseDetails ? { details: responseDetails } : {}),
    };
  }

  return {
    statusCode,
    code: getDefaultCode(statusCode),
    message: STATUS_CODES[statusCode] ?? 'Request failed',
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

    const details =
      exception instanceof HttpException
        ? getHttpExceptionDetails(exception)
        : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
          };

    const body: ErrorResponse = {
      ...details,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response.status(details.statusCode).json(body);
  }
}
