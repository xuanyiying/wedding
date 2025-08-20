import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Simple test component
const TestComponent = () => {
  return <div>Hello Test</div>
}

describe('Example Test', () => {
  it('should render test component', () => {
    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    )
    
    expect(screen.getByText('Hello Test')).toBeDefined()
  })

  it('should perform basic math', () => {
    expect(2 + 2).toBe(4)
  })
})