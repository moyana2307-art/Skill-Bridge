import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the SkillBridge AI brand in the navigation', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/SkillBridge AI/i);
  expect(brandElements.length).toBeGreaterThan(0);
});

test('renders the landing page headline', () => {
  render(<App />);
  expect(screen.getByText(/Build skills/i)).toBeInTheDocument();
});
