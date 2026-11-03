import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AnalysisResults from './AnalysisResults'
const render = (analysis: unknown) => renderToStaticMarkup(<AnalysisResults analysis={analysis} onReset={() => {}} />)
describe('Document result evidence boundaries', () => {
  it('identifies a summary-only lease result without inventing a rating', () => {
    const html = render({ summary: 'The supplied lease needs review.' })
    expect(html).toContain('Assessment not reported')
    expect(html).toContain('The supplied lease needs review.')
    expect(html).not.toContain('A closer look at the layout.')
  })
  it('keeps lease recommendations out of a combined floor-plan section', () => {
    const html = render({ overallRating: 'neutral', keyTerms: {}, recommendations: ['Calendar the renewal deadline.'], floorPlan: { layout: { bedrooms: 1 }, summary: 'A one bedroom layout.', recommendations: [] } })
    expect(html).toContain('Calendar the renewal deadline.')
    expect(html).not.toContain('Layout recommendations')
    expect(html.match(/Unknown/g)?.length).toBe(3)
  })
  it('does not turn an unavailable provider result into a zero-room assessment', () => {
    const html = render({ layout: { bedrooms: 0, bathrooms: 0, totalRooms: 0 }, spaceEfficiency: 'Fair', summary: 'Unable to analyze floor plan at this time.' })
    expect(html).toContain('No reliable room counts or measurements are available.')
    expect(html).not.toContain('Model assessment of space efficiency')
    expect(html).not.toContain('Total rooms')
  })
  it('does not assign a missing priority or imply an empty review is a clean bill', () => {
    expect(render({ keyTerms: {}, redFlags: [{ title: 'Verify the term' }] })).toContain('Priority not specified')
    expect(render({ keyTerms: {}, redFlags: [] })).toContain('This is not a guarantee')
  })
})
