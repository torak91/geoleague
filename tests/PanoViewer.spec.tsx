import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PanoViewer } from '@/components/Pano/PanoViewer';
import { HEADINGS, HEADING_STEP_DEG } from '@/lib/headings';

const urls = HEADINGS.map((h) => `https://cdn.example.test/sample/${h}.jpg`);

beforeEach(() => {
  // jsdom Image does not load network resources, so img.decode() never
  // resolves naturally. Stub it to resolve synchronously so the component
  // can transition to its ready state.
  Object.defineProperty(global.Image.prototype, 'decode', {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
});

describe('PanoViewer', () => {
  it('renders one image per heading with alt text', () => {
    render(<PanoViewer imageUrls={urls} />);
    HEADINGS.forEach((h) => {
      expect(screen.getByAltText(`Heading ${h}°`)).toBeInTheDocument();
    });
  });

  it('shows a loading indicator until images decode', () => {
    render(<PanoViewer imageUrls={urls} />);
    expect(screen.getByRole('status')).toHaveTextContent(/Caricamento immagini/);
  });

  it('fires onReady once all images decode', async () => {
    const onReady = vi.fn();
    render(<PanoViewer imageUrls={urls} onReady={onReady} />);
    // Let the 8 decode() promises and subsequent state updates flush.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('rotates right by one heading step when the right button is clicked', async () => {
    render(<PanoViewer imageUrls={urls} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const rightBtn = screen.getByRole('button', { name: /Ruota a destra/ });
    fireEvent.click(rightBtn);
    expect(screen.getByText(`${HEADING_STEP_DEG}°`)).toBeInTheDocument();
  });
});
