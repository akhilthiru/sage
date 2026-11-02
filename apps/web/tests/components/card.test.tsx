import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

describe('Card Component Family', () => {
  it('renders card with all nested sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Monthly stats description</CardDescription>
        </CardHeader>
        <CardContent>Main content body</CardContent>
        <CardFooter>Footer info</CardFooter>
      </Card>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Monthly stats description')).toBeInTheDocument();
    expect(screen.getByText('Main content body')).toBeInTheDocument();
    expect(screen.getByText('Footer info')).toBeInTheDocument();
  });
});
