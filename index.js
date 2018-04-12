const express = require('express')
const pdfkit = require('pdfkit')
const fontkit = require('fontkit')
const svg2ttf = require('svg2ttf')
const fs = require('fs')
const potrace = require('potrace')
const Jimp = require('jimp')

const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']

const app = express()

app.get('/', (req, res) => {

  const png = Jimp.read('./font/image.png', (err, img) => {
    if (err) throw err

    const [ width, height ] = [ img.bitmap.width, img.bitmap.height ]
    const edge = width / 9
    const letterWidth = width / 9
    const letterHeight = width / 9
    const lettersPerRow = Math.floor((width - edge * 2) / letterWidth)

    const pngs = letters.map((letter, index) => {
      const x = edge + letterWidth * (index % lettersPerRow)
      const y = edge + letterHeight * Math.floor(index / lettersPerRow)
      return img.clone().crop(x, y, letterWidth, letterHeight)
    })

    const randomLetter = pngs[Math.floor(Math.random() * letters.length)]

    // console.log('dumping image')
    // randomLetter .getBuffer(Jimp.MIME_PNG, (err, buffer) => {
    //   if (err) throw err
    //   res.writeHead(200, {
    //     'Content-Type': Jimp.MIME_PNG,
    //     'Content-Length': buffer.length
    //   })
    //   res.end(buffer)
    // })

    // return

    potrace.trace(randomLetter, (err, svg) => {
      if (err) throw err

      res.type('image/svg+xml');
      res.send(svg)
      // fs.writeFileSync('./font/image.svg', svg)
    })
  })







  ///// the rest

  // console.log('Generating font')
  // var ttf = svg2ttf(fs.readFileSync('./font/font.svg', 'utf8'), {})
  // fs.writeFileSync('./font/font.ttf', new Buffer(ttf.buffer))
  // console.log('Generating PDF')
  // const pdf = new pdfkit({
  //   margin: 72
  // })
  // pdf.info = {
  //   Title: 'OCD Neil',
  //   Author: 'Goran Butorac',
  //   Subject: 'OCD Neil Font'
  // }
  // pdf.font('./font/font.ttf')
  // pdf.text(`This pangram contains four As, one B, two Cs, one D, thirty Es, six Fs, five Gs, seven Hs, eleven Is, one J, one K, two Ls, two Ms, eighteen Ns, fifteen Os, two Ps, one Q, five Rs, twenty-seven Ss, eighteen Ts, two Us, seven Vs, eight Ws, two Xs, three Ys, & one Z.`, {
  //   paragraphGap: 12
  // })
  // pdf.text(`Mr. Jock, TV quiz PhD, bags few lynx.`, {
  //   paragraphGap: 12
  // })
  // pdf.text(`
  //   Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce sit amet lorem vitae orci maximus vestibulum in sed turpis. Vivamus vulputate diam nec quam pellentesque sollicitudin. Morbi viverra est ut quam ullamcorper dictum. Aenean non lorem feugiat, rhoncus elit a, aliquet augue. In facilisis neque dui, nec semper est dapibus at. Donec a mi ac quam aliquet tincidunt. Fusce fermentum tortor et purus convallis, eu viverra eros consectetur.
  //   Maecenas pharetra nunc sapien, dapibus porttitor magna volutpat quis. Morbi tincidunt est at tellus faucibus gravida. Nulla egestas, leo id dictum pharetra, purus dui ultrices turpis, eget hendrerit purus lectus ac lectus. Cras eros leo, placerat eget ultrices iaculis, interdum vel diam. Mauris malesuada ante urna, quis fermentum lacus condimentum sit amet. Nunc tempor ut felis dictum mattis. Etiam mollis consectetur dolor vel interdum. Sed non maximus nulla. Etiam sit amet varius neque. Duis sagittis lacinia velit, vitae laoreet dolor.
  //   Duis ac erat velit. Sed elit lacus, mattis in laoreet vel, porttitor sit amet est. Donec pretium vehicula lobortis. Integer commodo ligula at ex scelerisque feugiat nec sit amet enim. Etiam mollis faucibus arcu, ac vestibulum arcu interdum vitae. Donec fringilla ante eu turpis cursus, quis viverra ligula maximus. Nullam nec lacus at nisl fringilla placerat. Aliquam erat volutpat. Praesent in gravida ligula. Etiam gravida eros eu felis pretium consequat.
  //   Mauris volutpat, ante eu facilisis laoreet, purus elit porttitor sem, eget feugiat erat ante ut ante. Aliquam erat volutpat. Nunc faucibus iaculis mattis. Nam pellentesque arcu arcu, ut semper massa tristique ut. Quisque eget nibh non velit cursus suscipit sed vel nisi. Phasellus faucibus quam non eros commodo convallis. Aliquam mi metus, fringilla a consectetur in, imperdiet pretium erat. Aenean non eros id nulla varius dignissim convallis non arcu. Donec egestas dolor non erat volutpat feugiat. Morbi quis vestibulum felis.
  //   Phasellus volutpat dictum nunc et elementum. Donec convallis bibendum arcu malesuada lacinia. Duis at aliquam odio. Phasellus eget scelerisque magna, pellentesque ultricies magna. Curabitur a est urna. Nulla at magna quis augue rutrum pharetra eget id purus. Cras non lacus sed magna rhoncus iaculis. Maecenas ut condimentum dolor. Donec luctus felis a tempus vehicula.
  // `, {
  //   paragraphGap: 12
  // })

  // pdf.text(`𮀄𮀅𮀆𮀈𮀉`, {
  //   paragraphGap: 12
  // })

  // pdf.pipe(res)
  // pdf.end()
})

app.listen(3000, () => {
  console.log('Serving on port 3000')
})
