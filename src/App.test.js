import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  var linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
