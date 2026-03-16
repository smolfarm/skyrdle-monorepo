import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VirtualKeyboard from '../../src/components/VirtualKeyboard'

describe('VirtualKeyboard', () => {
  const defaultProps = {
    onKey: vi.fn(),
    onEnter: vi.fn(),
    onDelete: vi.fn(),
    keyboardStatus: {} as Record<string, 'correct' | 'present' | 'absent' | null>,
  }

  it('renders all 26 letter keys', () => {
    render(<VirtualKeyboard {...defaultProps} />)
    const letters = 'QWERTYUIOPASDFGHJKLZXCVBNM'
    for (const letter of letters) {
      expect(screen.getByText(letter)).toBeInTheDocument()
    }
  })

  it('renders Enter and Del buttons', () => {
    render(<VirtualKeyboard {...defaultProps} />)
    expect(screen.getByText('Enter')).toBeInTheDocument()
    expect(screen.getByText('Del')).toBeInTheDocument()
  })

  it('calls onKey with correct letter when clicked', () => {
    const onKey = vi.fn()
    render(<VirtualKeyboard {...defaultProps} onKey={onKey} />)

    fireEvent.click(screen.getByText('A'))
    expect(onKey).toHaveBeenCalledWith('A')

    fireEvent.click(screen.getByText('Z'))
    expect(onKey).toHaveBeenCalledWith('Z')
  })

  it('calls onEnter when Enter is clicked', () => {
    const onEnter = vi.fn()
    render(<VirtualKeyboard {...defaultProps} onEnter={onEnter} />)

    fireEvent.click(screen.getByText('Enter'))
    expect(onEnter).toHaveBeenCalledOnce()
  })

  it('calls onDelete when Del is clicked', () => {
    const onDelete = vi.fn()
    render(<VirtualKeyboard {...defaultProps} onDelete={onDelete} />)

    fireEvent.click(screen.getByText('Del'))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('absent keys are still clickable (not disabled)', () => {
    const onKey = vi.fn()
    const keyboardStatus = { A: 'absent' as const }
    render(<VirtualKeyboard {...defaultProps} onKey={onKey} keyboardStatus={keyboardStatus} />)

    const aKey = screen.getByText('A')
    expect(aKey).not.toBeDisabled()
    fireEvent.click(aKey)
    expect(onKey).toHaveBeenCalledWith('A')
  })

  it('applies correct CSS class for correct status', () => {
    const keyboardStatus = { A: 'correct' as const }
    render(<VirtualKeyboard {...defaultProps} keyboardStatus={keyboardStatus} />)

    const aKey = screen.getByText('A')
    expect(aKey.className).toContain('key-correct')
  })

  it('applies correct CSS class for present status', () => {
    const keyboardStatus = { B: 'present' as const }
    render(<VirtualKeyboard {...defaultProps} keyboardStatus={keyboardStatus} />)

    const bKey = screen.getByText('B')
    expect(bKey.className).toContain('key-present')
  })

  it('applies correct CSS class for absent status', () => {
    const keyboardStatus = { C: 'absent' as const }
    render(<VirtualKeyboard {...defaultProps} keyboardStatus={keyboardStatus} />)

    const cKey = screen.getByText('C')
    expect(cKey.className).toContain('key-absent')
  })

  it('applies default class when no status', () => {
    render(<VirtualKeyboard {...defaultProps} keyboardStatus={{}} />)

    const dKey = screen.getByText('D')
    expect(dKey.className).toBe('key btn-glass')
  })
})
