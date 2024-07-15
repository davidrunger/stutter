import Block from './block'
import Locale from './locales'
import StutterOptions from '../../src-common/stutterOptions'

export default class Stutter {
  constructor (ui, locale) {
    // Instantiate new Locale object and set its locale from the start
    new Locale(locale || window.navigator.language) // eslint-disable-line
    this.block = null
    this.currentWord = null
    this.nextWord = null
    this.isEnded = false
    this.isPlaying = false
    this.ui = ui
    this.duration = 0
    this.ui.addListener('close', () => {
      this.destroy()
    })
    this.ui.addListener('pauseToggle', () => {
      this.playPauseToggle()
    })
    this.ui.addListener('skipForward', () => {
      this.skipForward(this.options.getProp('skipCount'))
    })
    this.ui.addListener('skipPrevious', () => {
      // Use slow-start when skipping backwards
      this.slowStartCount = this.options.getProp('slowStartCount')
      this.skipPrevious(this.options.getProp('skipCount'))
    })
    this.ui.addListener('pause', () => {
      this.pause()
    })
    this.ui.addListener('restart', () => {
      this.restart()
    })

    this.options = new StutterOptions()
    this.onOptionsUpdate = this.onOptionsUpdate.bind(this)
    this.options.addListener(StutterOptions.UPDATE, this.onOptionsUpdate)
    this.timer = null
  }

  onOptionsUpdate () {
    if (this.block) {
      this.ui.updateTime(this.block.duration)
    }
  }

  setText (val) {
    if (val) {
      this.pause()
      this.restart()
      this.block = new Block(val, this.options)
      this.currentWord = this.block.word
      this.nextWord = this.block.nextWord
      this.ui.updateTime(this.block.duration)
    }
  }

  getStartIndex (val) {
    const blockWords = this.block.words
    const targetWords = val.split(/\s+/)

    const isStartingIndex = (index) => {
      return targetWords.every((targetWord, i) => {
        const blockWord = blockWords[index + i].val
        if (i === 0) {
          return blockWord.endsWith(targetWord)
        } else if (i === targetWords.length - 1) {
          return blockWord.startsWith(targetWord)
        } else {
          return blockWord === targetWord
        }
      })
    }

    let startingIndex = null
    blockWords.some((_word, i) => {
      const isStartIndex = isStartingIndex(i)
      if (isStartIndex) {
        startingIndex = i
      }
      return isStartIndex
    })

    return startingIndex
  }

  playPauseToggle () {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  play () {
    if (this.block) {
      if (this.isEnded) {
        return
      }
      if (this.options.getProp('slowStartCount')) {
        this.slowStartCount = this.options.getProp('slowStartCount')
      }
      this.ui.reveal()
      this.ui.resume()
      this.display()
      this.isPlaying = true
    }
  }

  skipForward (n) {
    for (let i = 0; i < n; i++) {
      this.block.next()
    }
    this.currentWord = this.block.word
    this.nextWord = this.block.nextWord
    if (this.currentWord) {
      this.showWord()
    }
  }

  skipPrevious (n) {
    for (let i = 0; i < n; i++) {
      this.block.prev()
    }
    this.currentWord = this.block.word
    this.nextWord = this.block.nextWord
    if (this.currentWord) {
      this.showWord()
    }
  }

  pause () {
    clearTimeout(this.timer)
    this.isPlaying = false
    this.ui.pause()
  }

  destroy () {
    clearTimeout(this.timer)
    this.ui.hide()
    this.isPlaying = false
    this.block = null
    this.isEnded = true
  }

  restart () {
    if (this.block) {
      if (!this.isEnded) {
        this.pause()
      }
      if (this.options.getProp('slowStartCount')) {
        this.slowStartCount = this.options.getProp('slowStartCount')
      }
      this.block.restart()
      this.currentWord = this.block.word
      this.nextWord = this.block.nextWord
      this.isEnded = false
      this.play()
    }
  }

  display () {
    this.currentWord = this.block.word
    this.nextWord = this.block.nextWord
    if (this.currentWord) {
      this.showWord()
      this.timer = setTimeout(() => { this.next() }, this.getTime())
    } else {
      this.destroy()
    }
  }

  getTime () {
    this.slowStartCount = (this.slowStartCount > 1) ? this.slowStartCount - 1 : 1
    return this.block.time * this.slowStartCount
  }

  showWord () {
    if (!this.currentWord.val.match(/[\n\r\s]+/)) {
      let n = null
      if (this.nextWord && !this.nextWord.val.match(/[\n\r\s]+/)) {
        n = this.nextWord
      }
      this.ui.show(this.currentWord, n)
      this.ui.progress = parseInt(this.block.progress * 100, 10)
      const nextFourWords =
        this.block.words.slice(this.block.index, this.block.index + 4)
          .map(wordObject => wordObject.val)
          .join(' ')
      this.ui.highlight(nextFourWords)
    }
  }

  next () {
    this.block.next()
    this.display()
  }
}
