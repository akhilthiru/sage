import { describe, it, expect } from 'vitest';
import {
  ApplicationError,
  ValidationError,
  BusinessRuleError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseOperationError,
  ExternalServiceError,
  success,
  failure,
} from '../../src/errors';

describe('ApplicationError Hierarchy & Result Pattern', () => {
  it('should format ValidationError correctly with and without errors', () => {
    const err = new ValidationError('Invalid payload', { field1: 'Required' });
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.validationErrors).toEqual({ field1: 'Required' });
    const json = err.toJSON();
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.validationErrors).toEqual({ field1: 'Required' });

    const errNoErrors = new ValidationError('Simple invalid');
    expect(errNoErrors.validationErrors).toBeUndefined();
    expect(errNoErrors.toJSON().validationErrors).toBeUndefined();
  });

  it('should format BusinessRuleError correctly with and without rule', () => {
    const err = new BusinessRuleError('Cannot exceed max goals', 'MAX_GOALS_EXCEEDED');
    expect(err.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(err.statusCode).toBe(400);
    expect(err.rule).toBe('MAX_GOALS_EXCEEDED');
    const json = err.toJSON();
    expect(json.rule).toBe('MAX_GOALS_EXCEEDED');

    const errNoRule = new BusinessRuleError('Simple rule error');
    expect(errNoRule.rule).toBeUndefined();
    expect(errNoRule.toJSON().rule).toBeUndefined();
  });

  it('should format AuthorizationError with default and custom message', () => {
    const errDefault = new AuthorizationError();
    expect(errDefault.code).toBe('AUTHORIZATION_ERROR');
    expect(errDefault.statusCode).toBe(403);
    expect(errDefault.message).toBe('Access denied');

    const errCustom = new AuthorizationError('Forbidden resource');
    expect(errCustom.message).toBe('Forbidden resource');
  });

  it('should format NotFoundError with and without resource info', () => {
    const err = new NotFoundError('Goal not found', 'Goal', 'goal-123');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.resourceType).toBe('Goal');
    expect(err.resourceId).toBe('goal-123');
    const json = err.toJSON();
    expect(json.resourceType).toBe('Goal');
    expect(json.resourceId).toBe('goal-123');

    const errNoRes = new NotFoundError('Resource missing');
    expect(errNoRes.resourceType).toBeUndefined();
    expect(errNoRes.toJSON().resourceType).toBeUndefined();
  });

  it('should format ConflictError', () => {
    const err = new ConflictError('User already exists');
    expect(err.code).toBe('CONFLICT');
    expect(err.statusCode).toBe(409);
  });

  it('should format DatabaseOperationError', () => {
    const original = new Error('Connection failed');
    const err = new DatabaseOperationError('DB error occurred', original);
    expect(err.code).toBe('DATABASE_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err.originalError).toBe(original);
  });

  it('should format ExternalServiceError with and without serviceName', () => {
    const err = new ExternalServiceError('OpenAI timeout', 'OpenAI');
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(err.statusCode).toBe(502);
    expect(err.serviceName).toBe('OpenAI');
    const json = err.toJSON();
    expect(json.serviceName).toBe('OpenAI');

    const errNoService = new ExternalServiceError('API timeout');
    expect(errNoService.serviceName).toBeUndefined();
    expect(errNoService.toJSON().serviceName).toBeUndefined();
  });

  it('should support Result success and failure helpers', () => {
    const resSuccess = success({ id: '123' });
    expect(resSuccess.success).toBe(true);
    if (resSuccess.success) {
      expect(resSuccess.data.id).toBe('123');
    }

    const resFailure = failure(new ValidationError('Bad'));
    expect(resFailure.success).toBe(false);
    if (!resFailure.success) {
      expect(resFailure.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
