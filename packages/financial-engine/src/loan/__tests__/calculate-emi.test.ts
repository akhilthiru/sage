import { describe, it, expect } from 'vitest';
import { calculateEMI } from '../calculate-emi';

describe('calculateEMI', () => {
  describe('Happy Path', () => {
    it('should calculate EMI correctly for standard loan', () => {
      const result = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi).toBe(23536.74);
        expect(result.data.totalPayable).toBe(564881.76);
        expect(result.data.totalInterest).toBe(64881.76);
        expect(result.data.principal).toBe(500000);
        expect(result.data.tenure).toBe(24);
        expect(result.data.interestRate).toBe(12);
      }
    });

    it('should calculate EMI for different loan amounts', () => {
      const result1 = calculateEMI({ principal: 100000, annualInterestRate: 10, tenureMonths: 12 });
      const result2 = calculateEMI({ principal: 1000000, annualInterestRate: 10, tenureMonths: 12 });
      
      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result2.data.emi).toBeCloseTo(result1.data.emi * 10, 1);
      }
    });

    it('should calculate EMI for different tenures', () => {
      const result12 = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 12 });
      const result24 = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      const result36 = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 36 });
      
      expect(result12.success && result24.success && result36.success).toBe(true);
      if (result12.success && result24.success && result36.success) {
        expect(result12.data.emi).toBeGreaterThan(result24.data.emi);
        expect(result24.data.emi).toBeGreaterThan(result36.data.emi);
      }
    });

    it('should calculate EMI for different interest rates', () => {
      const result10 = calculateEMI({ principal: 500000, annualInterestRate: 10, tenureMonths: 24 });
      const result12 = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      const result15 = calculateEMI({ principal: 500000, annualInterestRate: 15, tenureMonths: 24 });
      
      expect(result10.success && result12.success && result15.success).toBe(true);
      if (result10.success && result12.success && result15.success) {
        expect(result10.data.emi).toBeLessThan(result12.data.emi);
        expect(result12.data.emi).toBeLessThan(result15.data.emi);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero interest rate', () => {
      const result = calculateEMI({ principal: 120000, annualInterestRate: 0, tenureMonths: 12 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi).toBe(10000);
        expect(result.data.totalInterest).toBe(0);
        expect(result.data.totalPayable).toBe(120000);
      }
    });

    it('should handle very small principal', () => {
      const result = calculateEMI({ principal: 100, annualInterestRate: 12, tenureMonths: 12 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi).toBeGreaterThan(0);
        expect(result.data.totalPayable).toBeGreaterThan(100);
      }
    });

    it('should handle very large principal (10 crore)', () => {
      const result = calculateEMI({ principal: 100000000, annualInterestRate: 12, tenureMonths: 360 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi).toBeGreaterThan(0);
        expect(result.data.principal).toBe(100000000);
      }
    });

    it('should handle very long tenure (30 years)', () => {
      const result = calculateEMI({ principal: 1000000, annualInterestRate: 12, tenureMonths: 360 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi).toBeGreaterThan(0);
        expect(result.data.tenure).toBe(360);
      }
    });

    it('should handle very low interest rate', () => {
      const result = calculateEMI({ principal: 500000, annualInterestRate: 0.1, tenureMonths: 24 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi).toBeGreaterThan(500000 / 24);
        expect(result.data.totalInterest).toBeGreaterThan(0);
      }
    });

    it('should handle maximum interest rate', () => {
      const result = calculateEMI({ principal: 500000, annualInterestRate: 50, tenureMonths: 24 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi).toBeGreaterThan(0);
        expect(result.data.totalInterest).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Conditions', () => {
    it('should return error for negative principal', () => {
      const result = calculateEMI({ principal: -100000, annualInterestRate: 12, tenureMonths: 12 });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for zero principal', () => {
      const result = calculateEMI({ principal: 0, annualInterestRate: 12, tenureMonths: 12 });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for principal > 10 crore', () => {
      const result = calculateEMI({ principal: 1000000001, annualInterestRate: 12, tenureMonths: 12 });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for negative interest rate', () => {
      const result = calculateEMI({ principal: 100000, annualInterestRate: -5, tenureMonths: 12 });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for interest rate > 50', () => {
      const result = calculateEMI({ principal: 100000, annualInterestRate: 51, tenureMonths: 12 });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for zero tenure', () => {
      const result = calculateEMI({ principal: 100000, annualInterestRate: 12, tenureMonths: 0 });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for negative tenure', () => {
      const result = calculateEMI({ principal: 100000, annualInterestRate: 12, tenureMonths: -12 });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for non-integer tenure', () => {
      const result = calculateEMI({ principal: 100000, annualInterestRate: 12, tenureMonths: 12.5 });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for tenure > 360 months', () => {
      const result = calculateEMI({ principal: 100000, annualInterestRate: 12, tenureMonths: 361 });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Precision', () => {
    it('should round EMI to 2 decimal places', () => {
      const result = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi.toString()).toMatch(/^\d+\.\d{2}$/);
      }
    });

    it('should round total payable to 2 decimal places', () => {
      const result = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalPayable.toString()).toMatch(/^\d+\.\d{2}$/);
      }
    });

    it('should round total interest to 2 decimal places', () => {
      const result = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalInterest.toString()).toMatch(/^\d+\.\d{2}$/);
      }
    });
  });

  describe('Mathematical Properties', () => {
    it('total payable should always be >= principal', () => {
      for (let i = 0; i < 10; i++) {
        const principal = Math.random() * 1000000 + 10000;
        const rate = Math.random() * 20;
        const tenure = Math.floor(Math.random() * 360) + 1;
        
        const result = calculateEMI({ principal, annualInterestRate: rate, tenureMonths: tenure });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.totalPayable).toBeGreaterThanOrEqual(principal);
        }
      }
    });

    it('EMI * tenure should equal total payable', () => {
      const result = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi * result.data.tenure).toBeCloseTo(result.data.totalPayable, 0);
      }
    });

    it('total interest should be total payable - principal', () => {
      const result = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalInterest).toBeCloseTo(
          result.data.totalPayable - result.data.principal,
          2
        );
      }
    });

    it('longer tenure should result in lower EMI', () => {
      const result12 = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 12 });
      const result24 = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      const result36 = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 36 });
      
      expect(result12.success && result24.success && result36.success).toBe(true);
      if (result12.success && result24.success && result36.success) {
        expect(result12.data.emi).toBeGreaterThan(result24.data.emi);
        expect(result24.data.emi).toBeGreaterThan(result36.data.emi);
      }
    });

    it('longer tenure should result in higher total interest', () => {
      const result12 = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 12 });
      const result24 = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      const result36 = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 36 });
      
      expect(result12.success && result24.success && result36.success).toBe(true);
      if (result12.success && result24.success && result36.success) {
        expect(result24.data.totalInterest).toBeGreaterThan(result12.data.totalInterest);
        expect(result36.data.totalInterest).toBeGreaterThan(result24.data.totalInterest);
      }
    });
  });

  describe('Known Values', () => {
    it('should match known EMI calculator results', () => {
      // Using standard EMI formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
      const result = calculateEMI({ principal: 500000, annualInterestRate: 12, tenureMonths: 24 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi).toBe(23536.74);
        expect(result.data.totalPayable).toBe(564881.76);
        expect(result.data.totalInterest).toBe(64881.76);
      }
    });

    it('should match another known calculation', () => {
      const result = calculateEMI({ principal: 1000000, annualInterestRate: 10, tenureMonths: 12 });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emi).toBe(87915.89);
      }
    });
  });
});
