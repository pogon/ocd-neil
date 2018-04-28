
class Element {
  constructor (type) {
    this.type = type
    this.sequence = []
  }

  addPoint (f) {
    const current = this.sequence.length && this.sequence[this.sequence.length - 1] || null
    if (current && current.y === undefined) {
      current.y = f
    } else {
      this.sequence.push({
        x: f
      })
    }
  }

  toString (f) {
    return `${this.type} ${this.sequence.map(part => `${Number.parseFloat((part.x * (f ? f : 1.0)).toFixed(3))} ${Number.parseFloat((part.y * (f ? f : 1.0)).toFixed(3))}`).join(',')}`
  }
}

export default class D {
  constructor (d) {
    this.parse(d)
  }

  parse(d) {
    const parts = d.split(/[, ]/).filter(a => a)
    this.sequence = [new Element(parts.shift())]
    let current = this.sequence[0]
    parts.forEach(part => {
      switch (part) {
        case 'M':
        case 'C':
        case 'L':
        case 'Z':
          current = this.sequence[this.sequence.push(new Element(part)) - 1]
          break
        default:
          current.addPoint(Number.parseFloat(part))
      }
    })
  }

  flip (limitX = null, limitY = null) {
    this.sequence.forEach(
      element => element.sequence.forEach(
        part => {
          if (limitX !== null) part.x = limitX - part.x
          if (limitY !== null) part.y = limitY - part.y
        }
      )
    )
    return this
  }

  scale (s) {
    this.sequence.forEach(
      element => element.sequence.forEach(
        part => {
          part.x *= s
          part.y *= s
        }
      )
    )
    return this
  }

  move (x, y) {
    this.sequence.forEach(
      element => element.sequence.forEach(
        part => {
          part.x += x
          part.y += y
        }
      )
    )
    return this
  }

  analyze (scale = 1.0) {
    this.left = this.sequence.reduce(
      (elAcc, element) => Math.min(elAcc, element.sequence.reduce(
        (partAcc, part) => Math.min(partAcc, part.x),
        Infinity
      )),
      Infinity
    ) * scale

    this.right = this.sequence.reduce(
      (elAcc, element) => Math.max(elAcc, element.sequence.reduce(
        (partAcc, part) => Math.max(partAcc, part.x),
        0
      )),
      0
    ) * scale

    this.width = this.right - this.left

    return this
  }

  d (f) {
    return this.sequence.map(element => element.toString(f)).join(' ')
  }
}