
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

  toString () {
    return `${this.type} ${this.sequence.map(part => `${part.x} ${part.y}`).join(',')}`
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
          if (limitX !== null) part.x = Number.parseFloat((limitX - part.x).toFixed(3))
          if (limitY !== null) part.y = Number.parseFloat((limitY - part.y).toFixed(3))
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

  d () {
    return this.sequence.map(element => element.toString()).join(' ')
  }
}