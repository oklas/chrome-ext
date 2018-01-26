# chrome-ext

[![Npm package](https://img.shields.io/npm/v/chrome-ext.svg?style=flat)](https://npmjs.com/package/chrome-ext)

***

**Chrome Extension some usable things**

It is not replacement of chrome object but only helpers joined into object.

# Synopsis

``` javascript
  import { ChromeExtension } from './chrome-ext'

  this.chrome = new ChromeExtension()

  // execute on chrome extension is loaded
  this.chrome.mount()
  
  // execute on chrome extension is unloaded
  this.chrome.unmount()

  let script = `
    var timerId = undefined

    var doWork = function() {
      if(...) clearInterval(timerId)
      var error = undefined
      callback( error, 'result', response => {
        console.log('done: ' + responce)
      })
    }

    timerId = setInterval( doWork, 500 )
  `

    this.chrome.evalStringInTab( tabId, script, (error, result, responce) => {
      if(error) console.error(error)
      if(result) console.log(result)
      responce('ok')
    })

    this.chrome.listOfTabs(tabs => {})
    this.chrome.listOfCurrentWindowTabs(tabs => {})
    this.chrome.currentTab(tab => {})

    this.chrome.openTab(url, active?true:false, tab => {})
    this.chrome.closeTab(tab.id)

```
