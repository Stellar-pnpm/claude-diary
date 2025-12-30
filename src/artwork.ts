import { Resvg } from '@resvg/resvg-js'

/**
 * Convert SVG string to PNG buffer
 * @param svg - SVG code as string
 * @returns PNG image as Buffer
 */
export function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200
    }
  })
  const pngData = resvg.render()
  return pngData.asPng()
}
