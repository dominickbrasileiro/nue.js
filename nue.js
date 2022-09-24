class Nue {
  static createApp(options) {
    let data = options.data()
    let methods = options.methods
    let watchers = options.watchers

    let instance = new Nue({ data, methods })

    let proxy = new Proxy(instance, {
      get(target, key) {
        if (data && typeof data == 'object' && data.hasOwnProperty(key)) {
          return data[key]
        }

        if (methods && typeof methods == 'object' && methods.hasOwnProperty(key)) {
          return methods[key]
        }

        return target[key]
      },
      set(target, key, value) {
        target[key] = value

        if (watchers && watchers.hasOwnProperty(key)) {
          watchers[key](value)
        }

        if (target.$domWatchers && target.$domWatchers.hasOwnProperty(key)) {
          target.$domWatchers[key].forEach(watcher => {
            watcher()
          })
        }

        return true
      }
    })

    return proxy
  }

  constructor({ data, methods }) {
    this.$data = data
    this.$methods = methods
    this.$el = null
    this.$vdom = null
    this.$domWatchers = {}
  }

  mount(selector) {
    let el = document.querySelector(selector)

    if (!el) {
      throw new Error(`Root element not found: ${selector}`)
    }

    this.$el = el

    this._createVirtualDOM()
    this._compile(this.$vdom)
  }

  _compile(vElement) {
    if (typeof vElement.content == 'string') {
      const matches = vElement.content.match(/{{\s*[\w\.]+\s*}}/g)

      if (!matches) {
        return
      }

      matches.forEach((match) => {
        const expression = match.replaceAll("{{", "").replaceAll("}}", "")

        if (!this.$domWatchers[expression]) {
          this.$domWatchers[expression] = []
        }

        const watcher = () => {
          console.log(this[expression])

          if (!!this[expression]) {
            vElement.content = this[expression]
          }

          vElement.render()
        }

        this.$domWatchers[expression].push(watcher)

        watcher()
      })
    }
  }

  _createVirtualDOM() {
    this.$vdom = this._mountVirtualElement(this.$el)
  }

  _mountVirtualElement(element) {
    return {
      tag: element.tagName,
      attributes: this._getElementAttributes(element),
      content: this._getElementContent(element),
      ref: element,
      render() {
        this.ref.innerHTML = this.content
      }
    }
  }

  _getElementAttributes(element) {
    let attributes = {}

    element.getAttributeNames().forEach(attr => {
      attributes[attr] = element.getAttribute(attr)
    })

    return attributes
  }

  _getElementContent(element) {
    if (element.children.length != 0) {
      let children = [...element.children]

      return children.map(child => {
        return this._mountVirtualElement(child)
      })
    }

    return element.innerHTML
  }
}