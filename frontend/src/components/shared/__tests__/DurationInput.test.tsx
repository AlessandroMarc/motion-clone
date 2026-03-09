import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DurationInput } from '../DurationInput';

// jsdom doesn't support ResizeObserver or pointer capture APIs used by Radix/cmdk
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false;
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => {};
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => {};
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

describe('DurationInput', () => {
  const defaultProps = {
    value: 60,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with formatted duration value', () => {
    render(<DurationInput {...defaultProps} />);
    expect(screen.getByText('1 hr')).toBeInTheDocument();
  });

  it('renders with placeholder when value is 0', () => {
    render(
      <DurationInput {...defaultProps} value={0} placeholder="Pick duration" />
    );
    expect(screen.getByText('Pick duration')).toBeInTheDocument();
  });

  it('renders with label when provided', () => {
    render(<DurationInput {...defaultProps} label="Duration" />);
    expect(screen.getByText('Duration')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(<DurationInput {...defaultProps} error="Duration is required" />);
    expect(screen.getByText('Duration is required')).toBeInTheDocument();
  });

  it('opens popover when trigger button is clicked', async () => {
    render(<DurationInput {...defaultProps} />);
    const button = screen.getByRole('combobox');
    await userEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Type a number (e.g. 30, 1.5)...')
      ).toBeInTheDocument();
    });
  });

  it('shows common presets when popover opens with no input', async () => {
    render(<DurationInput {...defaultProps} />);
    await userEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('15 minutes')).toBeInTheDocument();
      expect(screen.getByText('30 minutes')).toBeInTheDocument();
      expect(screen.getByText('1 hour')).toBeInTheDocument();
      expect(screen.getByText('2 hours')).toBeInTheDocument();
      expect(screen.getByText('3 hours')).toBeInTheDocument();
    });
  });

  it('calls onChange with correct minutes when preset is selected', async () => {
    const onChange = jest.fn();
    render(<DurationInput {...defaultProps} onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('30 minutes')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('30 minutes'));
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it('formats various duration values correctly', () => {
    const { rerender } = render(<DurationInput {...defaultProps} value={30} />);
    expect(screen.getByText('30 min')).toBeInTheDocument();

    rerender(<DurationInput {...defaultProps} value={90} />);
    expect(screen.getByText('1 hr 30 min')).toBeInTheDocument();

    rerender(<DurationInput {...defaultProps} value={120} />);
    expect(screen.getByText('2 hrs')).toBeInTheDocument();

    rerender(<DurationInput {...defaultProps} value={270} />);
    expect(screen.getByText('4 hrs 30 min')).toBeInTheDocument();
  });

  it('applies custom id to the trigger button', () => {
    render(<DurationInput {...defaultProps} id="my-duration" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'my-duration');
  });

  it('filters presets by min prop', async () => {
    render(<DurationInput {...defaultProps} min={60} />);
    await userEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('1 hour')).toBeInTheDocument();
      expect(screen.getByText('2 hours')).toBeInTheDocument();
    });

    expect(screen.queryByText('15 minutes')).not.toBeInTheDocument();
    expect(screen.queryByText('30 minutes')).not.toBeInTheDocument();
  });
});
