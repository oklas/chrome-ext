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

    // callback call
    this.chrome.evalStringInTab( tabId, script, (error, result, responce) => {
      if(error) console.error(error)
      if(result) console.log(result)
      responce('ok')
    })

    // async call
    const {result, responce} = await this.chrome.evalStringInTab( tabId, script )


    this.chrome.listOfTabs(tabs => {})
    const tabs = await this.chrome.listOfTabs()

    this.chrome.listOfCurrentWindowTabs(tabs => {})
    const tabs = await this.chrome.listOfCurrentWindowTabs()

    this.chrome.currentTab(tab => {})
    const tab = await this.chrome.currentTab()

    this.chrome.openTab(url, active?true:false, tab => {})
    const tab = await this.chrome.openTab(url, active?true:false)

    this.chrome.closeTab(tab.id, ()=>{})
    await this.chrome.closeTab(tab.id)

```
