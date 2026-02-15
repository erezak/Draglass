import React from 'react'
import {render, screen, fireEvent} from '@testing-library/react'
import {GraphView} from '../components/GraphEnhancements'

test('renders groups and quick nav and hover preview', ()=>{
  const nodes = [
    {id:'n1',label:'Node 1',tags:['alpha'],links:[{title:'Link A',url:'https://example.com'}]},
    {id:'n2',label:'Node 2',tags:['beta'],links:[]}
  ]
  const edges = []
  render(<GraphView nodes={nodes} edges={edges} />)
  expect(screen.getByText(/alpha/i)).toBeInTheDocument()
  expect(screen.getByText(/beta/i)).toBeInTheDocument()
  expect(screen.getByText(/Quick Navigation/i)).toBeInTheDocument()
  const link = screen.getByText('Link A')
  fireEvent.mouseEnter(link)
  expect(screen.getByText('Preview not available in test build.')).toBeInTheDocument()
})
