import { describe, it, expect } from 'vitest';
import {
  success,
  failure,
  validationError,
  calculationError,
  insufficientFundsError,
  invalidDateError
} from '../result';

describe('Result helper functions', () => {
  it('should create success Result', () => {
    const res = success({ value: 123 });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.value).toBe(123);
    }
  });

  it('should create failure Result with custom error', () => {
    const err = validationError('Invalid parameter', 'amount');
    const res = failure(err);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('VALIDATION_ERROR');
      expect(res.error.field).toBe('amount');
    }
  });

  it('should create calculationError', () => {
    const err = calculationError('Math overflow', { step: 2 });
    expect(err.code).toBe('CALCULATION_ERROR');
    expect(err.details?.step).toBe(2);
  });

  it('should create insufficientFundsError', () => {
    const err = insufficientFundsError('Shortfall detected', { required: 5000 });
    expect(err.code).toBe('INSUFFICIENT_FUNDS');
    expect(err.details?.required).toBe(5000);
  });

  it('should create invalidDateError', () => {
    const err = invalidDateError('Date in past', 'targetDate');
    expect(err.code).toBe('INVALID_DATE');
    expect(err.field).toBe('targetDate');
  });
});
