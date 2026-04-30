import {
  type ArgumentsHost,
  HttpStatus,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ZodError, z } from 'zod';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: Record<string, jest.Mock>;
  let mockHost: ArgumentsHost;

  const originalEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
    } as unknown as ArgumentsHost;
  });

  afterAll(() => {
    process.env['NODE_ENV'] = originalEnv;
  });

  it('handles HttpException with string message', () => {
    const ex = new UnauthorizedException('Invalid credentials');
    filter.catch(ex, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Invalid credentials',
        statusCode: 401,
      }),
    );
  });

  it('handles HttpException with object message', () => {
    const ex = new BadRequestException({
      message: ['email is required', 'password is required'],
    });
    filter.catch(ex, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'email is required; password is required',
        statusCode: 400,
      }),
    );
  });

  it('maps ForbiddenException with resource denial to 404', () => {
    const ex = new ForbiddenException(
      'You do not have access to this organization',
    );
    filter.catch(ex, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Not found',
        statusCode: 404,
      }),
    );
  });

  it('maps ForbiddenException with "cannot" to 404', () => {
    const ex = new ForbiddenException('You cannot create tasks in this organization');
    filter.catch(ex, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('passes through NotFoundException as-is', () => {
    const ex = new NotFoundException('Task not found');
    filter.catch(ex, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Task not found',
        statusCode: 404,
      }),
    );
  });

  it('handles ZodError with readable validation message', () => {
    const schema = z.object({ email: z.string().email() });
    let zodError: ZodError | undefined;
    try {
      schema.parse({ email: 'not-an-email' });
    } catch (e) {
      zodError = e as ZodError;
    }

    filter.catch(zodError as ZodError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = mockResponse.json.mock.calls[0][0] as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body.error).toContain('email');
    expect(body.statusCode).toBe(400);
  });

  it('handles unknown errors with safe message in production', () => {
    process.env['NODE_ENV'] = 'production';
    const prodFilter = new AllExceptionsFilter();

    prodFilter.catch(new Error('database connection string leaked'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Internal server error',
        statusCode: 500,
      }),
    );
    // No stack or details in production
    const body = mockResponse.json.mock.calls[0][0] as Record<string, unknown>;
    expect(body.stack).toBeUndefined();
    expect(body.details).toBeUndefined();
  });

  it('includes stack and details in development', () => {
    process.env['NODE_ENV'] = 'development';
    const devFilter = new AllExceptionsFilter();

    devFilter.catch(new Error('debug info'), mockHost);

    const body = mockResponse.json.mock.calls[0][0] as Record<string, unknown>;
    expect(body.details).toBe('debug info');
    expect(body.stack).toBeDefined();
  });

  it('handles non-Error thrown values', () => {
    filter.catch('string error', mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
      }),
    );
  });
});
