import express from 'express'
import pdfkit from 'pdfkit'
import fontkit from 'fontkit'
import svg2ttf from 'svg2ttf'
import fs from 'fs'
import potrace from 'potrace'
import Jimp from 'jimp'
import { DOMParser }  from 'xmldom'
import D from './d'

const letters = `ABCDEFGHIJKLMNOPQRSTUVWXYZ_&1234567890@!?#$%*-+;:,.<>/\\~()[]{}=`.split('')
const margin = 68
const pageWidth = 612
const pageHeight = 792
const cellWidth = 68
const cellHeight = 68

const capHeight = 600
const xHeight = 400
const ascent = 700
const descent = 300
const alphabetic = 0
const mathematical = 350
const ideographic = 400
const hanging = 500

let paths

const app = express()

app.get('/template', (req, res) => {
  console.log('Generating Template')
  const pdf = new pdfkit({
    margin
  })
  pdf.info = {
    Title: 'OCD Neil Template',
    Author: 'Goran Butorac',
    Subject: 'OCD Neil Font Template'
  }

  pdf.font('./font/font.ttf').fontSize(32)

  letters.forEach((letter, index) => {
    const x = margin + index % 7 * cellWidth
    const y = margin + Math.floor(index / 7) * cellHeight
    pdf.rect(x, y, cellWidth, cellHeight)
      .lineWidth(0.5)
      .strokeColor('#0f0')
      .stroke()

    const baselineY = (1000 - descent) / 1000 * cellHeight
    const capHeightY = baselineY - capHeight / 1000 * cellHeight

    pdf.moveTo(x, y + baselineY)
      .lineTo(x + cellWidth, y + baselineY)
      .lineWidth(0.1)
      .strokeColor('#f00')
      .stroke()

    pdf.moveTo(x, y + capHeightY)
      .lineTo(x + cellWidth, y + capHeightY)
      .stroke()


    pdf.text(letter, x, y + baselineY, {
      width: cellWidth,
      align: 'center',
      baseline: 'alphabetic'
    })
  })

  pdf.pipe(res)
  pdf.end()
})

app.get('/', (req, res) => {

  console.log('Read image')
  const png = Jimp.read('./font/image.png', (err, img) => {
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
        potrace.trace(png, (err, svg) => {
          if (err) reject(err)
          const doc = new DOMParser().parseFromString(svg)
          resolve(new D(doc.documentElement.childNodes[1].getAttribute('d')))
        })
      })
    })

    const scale = 1000 / letterHeight

    Promise.all(ds).then(ds => {
      let left = 0
      ds.forEach(d => d.analyze(scale))
      ds.forEach(d => d
        .scale(scale)
        .flip(null, letterHeight)
        .move(-d.left, 400)
      )
      //
      paths = ds.map((d, index) => ({
        letter: letters[index],
        d: d.d(),
        width: d.width
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

  function addGlyph (unicode, path, en, spacingFactor = 0) {
    console.log('Adding glyph', unicode, en)
    const glyph = doc.createElement('glyph')
    glyph.setAttribute('unicode', unicode)
    glyph.setAttribute('d', path.d)
    glyph.setAttribute('horiz-adv-x', path.width + en * spacingFactor)
    font.appendChild(glyph)
  }

  let en = null
  for (let p of paths) {
    if (p.letter === 'N') {
      en = Number.parseInt(p.width)
      addGlyph(' ', {d: '', width: p.width}, en)
      break
    }
  }

  paths.forEach((path, index) => {
    addGlyph(path.letter.toLowerCase(), path, en)
    addGlyph(path.letter.toUpperCase(), path, en)
  })

  console.log('Writing SVG')
  fs.writeFileSync('./font/dom.svg', doc.toString())

  return doc.toString()
}

app.listen(3000, () => {
  console.log('Serving on port 3000')
})
