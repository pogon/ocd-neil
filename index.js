import express from 'express'
import pdfkit from 'pdfkit'
import fontkit from 'fontkit'
import svg2ttf from 'svg2ttf'
import fs from 'fs'
import potrace from 'potrace'
import Jimp from 'jimp'
import { DOMParser }  from 'xmldom'
import D from './d'

const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']

const app = express()

app.get('/', (req, res) => {

  console.log('Read image')
  const png = Jimp.read('./font/image.png', (err, img) => {
    if (err) throw err

    const [ width, height ] = [ img.bitmap.width, img.bitmap.height ]
    const edge = width / 9
    const letterWidth = width / 9
    const letterHeight = width / 9
    const lettersPerRow = Math.floor((width - edge * 2) / letterWidth)

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

    Promise.all(ds).then(ds => {
      console.log('Generating')
      ds.forEach(d => d.flip(null, 100).scale(5))
      const svg = generateFont(ds.map((d, index) => ({
        letter: letters[index],
        d: d.d()
      })))
      res.send(svg)
    })
  })
})

function generateFont (glyphs) {
  const doc = new DOMParser().parseFromString(
    fs.readFileSync('./font/font.svg').toString(),
    'image/svg+xml'
  )

  const font = doc.getElementsByTagName('font')[0]
  glyphs.forEach((glyph, index) => {
    console.log('Adding glyph', glyph.letter)
    const glyphLowerCase = doc.createElement('glyph')
    glyphLowerCase.setAttribute('unicode', glyph.letter.toLowerCase())
    glyphLowerCase.setAttribute('d', glyph.d)
    font.appendChild(glyphLowerCase)
    const glyphUpperCase = doc.createElement('glyph')
    glyphUpperCase.setAttribute('unicode', glyph.letter.toUpperCase())
    glyphUpperCase.setAttribute('d', glyph.d)
    font.appendChild(glyphUpperCase)
  })
  // add shapes here

  console.log('Writing SVG')
  fs.writeFileSync('./font/dom.svg', doc.toString())

  return doc.toString()
}

app.get('/svg', (req, res) => {
  const svg = generateFont()

  res.type('image/svg+xml')
  res.end(svg)
})

app.get('/test', (req, res) => {
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
  pdf.font('./font/font.ttf')

  pdf.text(`This pangram contains four As, one B, two Cs, one D, thirty Es,
  six Fs, five Gs, seven Hs, eleven Is, one J, one K, two Ls, two Ms, eighteen
  Ns, fifteen Os, two Ps, one Q, five Rs, twenty-seven Ss, eighteen Ts, two
  Us, seven Vs, eight Ws, two Xs, three Ys, & one Z.`,
  {
    paragraphGap: 12
  })
  pdf.text(`Mr. Jock, TV quiz PhD, bags few lynx.`,
  {
    paragraphGap: 12
  })

  pdf.text(` Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce
  sit amet lorem vitae orci maximus vestibulum in sed turpis. Vivamus
  vulputate diam nec quam pellentesque sollicitudin. Morbi viverra est ut quam
  ullamcorper dictum. Aenean non lorem feugiat, rhoncus elit a, aliquet augue.
  In facilisis neque dui, nec semper est dapibus at. Donec a mi ac quam
  aliquet tincidunt. Fusce fermentum tortor et purus convallis, eu viverra
  eros consectetur. Maecenas pharetra nunc sapien, dapibus porttitor magna
  volutpat quis. Morbi tincidunt est at tellus faucibus gravida. Nulla
  egestas, leo id dictum pharetra, purus dui ultrices turpis, eget hendrerit
  purus lectus ac lectus. Cras eros leo, placerat eget ultrices iaculis,
  interdum vel diam. Mauris malesuada ante urna, quis fermentum lacus
  condimentum sit amet. Nunc tempor ut felis dictum mattis. Etiam mollis
  consectetur dolor vel interdum. Sed non maximus nulla. Etiam sit amet varius
  neque. Duis sagittis lacinia velit, vitae laoreet dolor. Duis ac erat velit.
  Sed elit lacus, mattis in laoreet vel, porttitor sit amet est. Donec pretium
  vehicula lobortis. Integer commodo ligula at ex scelerisque feugiat nec sit
  amet enim. Etiam mollis faucibus arcu, ac vestibulum arcu interdum vitae.
  Donec fringilla ante eu turpis cursus, quis viverra ligula maximus. Nullam
  nec lacus at nisl fringilla placerat. Aliquam erat volutpat. Praesent in
  gravida ligula. Etiam gravida eros eu felis pretium consequat. Mauris
  volutpat, ante eu facilisis laoreet, purus elit porttitor sem, eget feugiat
  erat ante ut ante. Aliquam erat volutpat. Nunc faucibus iaculis mattis. Nam
  pellentesque arcu arcu, ut semper massa tristique ut. Quisque eget nibh non
  velit cursus suscipit sed vel nisi. Phasellus faucibus quam non eros commodo
  convallis. Aliquam mi metus, fringilla a consectetur in, imperdiet pretium
  erat. Aenean non eros id nulla varius dignissim convallis non arcu. Donec
  egestas dolor non erat volutpat feugiat. Morbi quis vestibulum felis.
  Phasellus volutpat dictum nunc et elementum. Donec convallis bibendum arcu
  malesuada lacinia. Duis at aliquam odio. Phasellus eget scelerisque magna,
  pellentesque ultricies magna. Curabitur a est urna. Nulla at magna quis
  augue rutrum pharetra eget id purus. Cras non lacus sed magna rhoncus
  iaculis. Maecenas ut condimentum dolor. Donec luctus felis a tempus
  vehicula.`,
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

app.listen(3000, () => {
  console.log('Serving on port 3000')
})
