import express from 'express'
import pdfkit from 'pdfkit'
import fontkit from 'fontkit'
import svg2ttf from 'svg2ttf'
import fs from 'fs'
import potrace from 'potrace'
import Jimp from 'jimp'
import { DOMParser }  from 'xmldom'
import D from './d'

const letters = `!"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`.split('')
const margin = 51 // 68
const pageWidth = 612
const pageHeight = 792
const cellWidth = 51 // 68
const cellHeight = 63 // 68
const cellPad = 1 // 3

const capHeight = 600
const xHeight = 425
const ascent = 700
const descent = 250
const alphabetic = 0
const mathematical = 350
const ideographic = 400
const hanging = 500

let paths

// const color = 'cyan'

const boxColor = 'red'
const lineColor = 'orange'
const letterColor = 'orange'
const markerColor = 'black'

const app = express()

app.use(express.static('./font'))

function generateTemplate (res, options = {}) {
  const opt = Object.assign({
    glyphs: true,
    labelsOnly: true
  }, options)

  console.log('Generating Template')
  const pdf = new pdfkit({
    margin: 0
  })
  pdf.info = {
    Title: 'OCD Neil Template',
    Author: 'Goran Butorac',
    Subject: 'OCD Neil Font Template'
  }

  const lettersInRow = Math.floor((pageWidth - margin * 2) / cellWidth)
  const lettersInColumn = Math.floor((pageHeight - margin * 2) / cellHeight)

  // pdf.font('./font/font.ttf').fontSize(cellHeight / 68 * 55)
  pdf.font('./font/font.ttf')
  // pdf.fontSize(cellHeight / 68 * 54)
  pdf.fontSize(cellHeight / 68 * (opt.labelsOnly ? 10 : 54))

  letters.forEach((letter, index) => {
    const x = margin + index % lettersInRow * cellWidth
    const row = Math.floor(index / lettersInRow) % lettersInColumn
    if (index && index % lettersInRow === 0 && row === 0) {
      pdf.addPage()
    }
    const y = margin + row * cellHeight

    const baselineY = (1000 - descent) / 1000 * cellHeight
    const capHeightY = baselineY - capHeight / 1000 * cellHeight
    const xHeightY = baselineY - xHeight / 1000 * cellHeight

    if (opt.glyphs) {
      pdf.fillColor(opt.labelsOnly ? lineColor : letterColor)
      pdf.fillOpacity(opt.labelsOnly ? 0.5 : 0.1)

      if (opt.labelsOnly) {
        pdf.text(letter, x + cellPad * 4, y + cellHeight - cellPad * 4, {
          width: cellWidth,
          align: 'left',
          baseline: 'alphabetic'
        })
      } else {
        pdf.text(letter, x, y + baselineY, {
          width: cellWidth,
          align: 'center',
          baseline: 'alphabetic'
        })
      }
    }

    pdf.strokeColor(boxColor)
    pdf.strokeOpacity(0.5)
    pdf.lineWidth(0.2)

    pdf.rect(x + cellPad, y + cellPad, cellWidth - cellPad * 2, cellHeight - cellPad * 2)
      .stroke()

    pdf.strokeColor(lineColor)
    pdf.lineWidth(0.1)

    pdf.moveTo(x + cellPad, y + baselineY)
      .lineTo(x + cellWidth - cellPad, y + baselineY)
      .stroke()

    pdf.moveTo(x + cellPad, y + capHeightY)
      .lineTo(x + cellWidth - cellPad, y + capHeightY)
      .stroke()

    pdf.moveTo(x + cellPad, y + xHeightY)
      .lineTo(x + cellWidth - cellPad, y + xHeightY)
      .stroke()
  })

  pdf.strokeColor(markerColor)
  pdf.strokeOpacity(1)
  pdf.lineWidth(1)

  pdf.moveTo(margin / 2, margin / 2 + 6)
    .lineTo(margin / 2, margin / 2)
    .lineTo(margin / 2 + 6, margin / 2)
    .stroke()

  pdf.moveTo(pageWidth - margin / 2, margin / 2 + 6)
    .lineTo(pageWidth - margin / 2, margin / 2)
    .lineTo(pageWidth - margin / 2 - 6, margin / 2)
    .stroke()

  pdf.moveTo(margin / 2, pageHeight - margin / 2 - 6)
    .lineTo(margin / 2, pageHeight - margin / 2)
    .lineTo(margin / 2 + 6, pageHeight - margin / 2)
    .stroke()

  pdf.moveTo(pageWidth - margin / 2, pageHeight - margin / 2 - 6)
    .lineTo(pageWidth - margin / 2, pageHeight - margin / 2)
    .lineTo(pageWidth - margin / 2 - 6, pageHeight - margin / 2)
    .stroke()

  pdf.fillColor(markerColor)
  pdf.fillOpacity(1.0)

  pdf.text('pogon.org/ocd-neil', margin, pageHeight - margin / 2, {
        width: pageWidth - margin * 2,
        align: 'center',
        baseline: 'alphabetic'
      })

  pdf.pipe(res)
  pdf.end()
}

app.get('/template', (req, res) => {
  generateTemplate(res)
})

app.get('/generate', (req, res) => {

  console.log('Read image')
  const png = Jimp.read('./font/image_l.jpg', (err, img) => {
    if (err) throw err

    img.resize(500, Jimp.AUTO)

    const [ width, height ] = [ img.bitmap.width, img.bitmap.height ]
    const factor = width / pageWidth
    const edge = margin * factor
    const letterWidth = cellWidth * factor
    const letterHeight = cellHeight * factor
    const lettersPerRow = Math.round((width - edge * 2) / letterWidth)
    console.log("letters per row", lettersPerRow)

    const pngs = letters.map((letter, index) => {
      console.log('Cropping', letter)
      const x = edge + letterWidth * (index % lettersPerRow)
      const y = edge + letterHeight * Math.floor(index / lettersPerRow)
      return img.clone().crop(x, y, letterWidth, letterHeight)
    })

    const ds = pngs.map((png, index) => {
      console.log('Tracing ', letters[index])
      return new Promise((resolve, reject) => {
        potrace.trace(png, {
          threshold: 64
        }, (err, svg) => {
          if (err) reject(err)
          const doc = new DOMParser().parseFromString(svg)
          resolve(new D(doc.documentElement.childNodes[1].getAttribute('d')))
        })
      })
    })

    const scale = 1000 / letterHeight
    const f = 1.30

    Promise.all(ds).then(ds => {
      let left = 0
      let en = null
      ds.map(d => d.analyze(scale)).forEach((d, index) => {
        if (letters[index] === 'N') {
          en = Number.parseInt(d.width)
        }
      })
      ds.forEach(d => d
        .flip(null, letterHeight)
        .scale(scale)
        .move(-d.left + (en || 0) * 0.1, -descent)
      )
      //
      paths = ds.map((d, index) => ({
        letter: letters[index],
        d: d.d(f),
        width: d.width * f,
        en: en * f
      }))
      const svg = generateFont(paths)

      console.log('Generating font')
      const ttf = svg2ttf(fs.readFileSync('./font/dom.svg', 'utf8'), {})
      fs.writeFileSync('./font/font.ttf', new Buffer(ttf.buffer))

      console.log('Generating PDF')
      const pdf = new pdfkit({
        margin: 72
      })
      pdf.info = {
        Title: 'OCD Neil',
        Author: 'Goran Butorac',
        Subject: 'OCD Neil Font'
      }
      pdf.font('./font/font.ttf').fontSize(32)

      pdf.text(`{valve} lt avj ko`,
      {
        paragraphGap: 12
      })

      pdf.font('./font/font.ttf').fontSize(12)

      pdf.text(`ABCDEFGHIJKLMNOPQRSTUVWXYZ_&1234567890@!?#$%*-+;:,.<>/\\~()[]{}=`,
      {
        paragraphGap: 12
      })

      pdf.text(`This pangram contains four As, one B, two Cs, one D, thirty Es, six Fs, five Gs, seven Hs, eleven Is, one J, one K, two Ls, two Ms, eighteen Ns, fifteen Os, two Ps, one Q, five Rs, twenty-seven Ss, eighteen Ts, two Us, seven Vs, eight Ws, two Xs, three Ys, & one Z.`,
      {
        paragraphGap: 12
      })
      pdf.text(`Mr. Jock, TV quiz PhD, bags few lynx.`,
      {
        paragraphGap: 12
      })

      pdf.text(`On the other hand, we denounce with righteous indignation and dislike men who are so beguiled and demoralized by the charms of pleasure of the moment, so blinded by desire, that they cannot foresee the pain and trouble that are bound to ensue; and equal blame belongs to those who fail in their duty through weakness of will, which is the same as saying through shrinking from toil and pain. These cases are perfectly simple and easy to distinguish. In a free hour, when our power of choice is untrammelled and when nothing prevents our being able to do what we like best, every pleasure is to be welcomed and every pain avoided. But in certain circumstances and owing to the claims of duty or the obligations of business it will frequently occur that pleasures have to be repudiated and annoyances accepted. The wise man therefore always holds in these matters to this principle of selection: he rejects pleasures to secure other greater pleasures, or else he endures pains to avoid worse pains.`,
      {
        paragraphGap: 12
      })

      pdf.text(`𮀄𮀅𮀆𮀈𮀉`,
      {
        paragraphGap: 12
      })

      pdf.pipe(res)
      pdf.end()
    })
  })
})

function generateFont (paths) {
  const doc = new DOMParser().parseFromString(
    fs.readFileSync('./font/font.svg').toString(),
    'image/svg+xml'
  )

  const font = doc.getElementsByTagName('font')[0]

  function addGlyph (unicode, path) {
    console.log('Adding glyph', unicode)
    const glyph = doc.createElement('glyph')
    glyph.setAttribute('unicode', unicode)
    glyph.setAttribute('d', path.d)
    glyph.setAttribute('horiz-adv-x', path.width)
    font.appendChild(glyph)
  }

  console.log("EN:", paths[0].en)
  addGlyph(' ', Object.assign({}, paths[0], { d: '', width: paths[0].en * 0.4}))

  paths.forEach((path, index) => {
    addGlyph(path.letter, Object.assign(path, { width: path.width + path.en * 0.2}))
  })

  console.log('Writing SVG')
  fs.writeFileSync('./font/dom.svg', doc.toString())

  return doc.toString()
}

app.listen(3000, () => {
  console.log('Serving on port 3000')
})
