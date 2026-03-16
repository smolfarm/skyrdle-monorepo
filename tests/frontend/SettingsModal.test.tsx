import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsModal from '../../src/components/SettingsModal'

const mockSetColorblindMode = vi.fn()
vi.mock('../../src/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { colorblindMode: false },
    setColorblindMode: mockSetColorblindMode,
  }),
}))

describe('SettingsModal', () => {
  it('renders colorblind mode toggle', () => {
    render(<SettingsModal onClose={vi.fn()} />)
    expect(screen.getByText('Colorblind Mode')).toBeInTheDocument()
    expect(screen.getByText('Use blue & orange instead of green & yellow')).toBeInTheDocument()
  })

  it('calls setColorblindMode when toggle is changed', () => {
    render(<SettingsModal onClose={vi.fn()} />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(mockSetColorblindMode).toHaveBeenCalledWith(true)
  })

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn()
    render(<SettingsModal onClose={onClose} />)

    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
