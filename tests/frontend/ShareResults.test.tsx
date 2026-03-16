import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ShareResults from '../../src/components/ShareResults'

describe('ShareResults', () => {
  const defaultProps = {
    shareText: 'Skyrdle #42 3/6\n🟩🟨⬛🟨⬛\n🟩🟩🟨🟩⬛\n🟩🟩🟩🟩🟩',
    onShare: vi.fn(),
    onSkeet: vi.fn(),
    isPostingSkeet: false,
  }

  it('renders share text', () => {
    render(<ShareResults {...defaultProps} />)
    expect(screen.getByText(/Skyrdle #42 3\/6/)).toBeInTheDocument()
  })

  it('calls onShare when Copy is clicked', () => {
    const onShare = vi.fn()
    render(<ShareResults {...defaultProps} onShare={onShare} />)

    fireEvent.click(screen.getByText('Copy'))
    expect(onShare).toHaveBeenCalledOnce()
  })

  it('calls onSkeet when Post is clicked', () => {
    const onSkeet = vi.fn()
    render(<ShareResults {...defaultProps} onSkeet={onSkeet} />)

    fireEvent.click(screen.getByText('Post'))
    expect(onSkeet).toHaveBeenCalledOnce()
  })

  it('disables Post button when isPostingSkeet is true', () => {
    render(<ShareResults {...defaultProps} isPostingSkeet={true} />)

    const postButton = screen.getByText('Posting...')
    expect(postButton).toBeDisabled()
  })
})
