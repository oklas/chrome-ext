
export class ChromeExtension {
  constructor() {
    this.listeners = {}
    this.nextCallId = 0
    this.releasedCalls = []
    this.tabCalls = {}
    this.callToTab = {}
    this.tabPingInterval = 15 * 1000
    this.instanceId = 'awaiting'
    chrome.tabs.getCurrent(tab => {if(tab) this.instanceId = tab.id})
    console.log( chrome.extension.getURL("popup.html") )
  }

  callAction(action, callback) {
    if (typeof callback !== 'function' && typeof callback !== 'undefined')
      throw Error('callback must be a function')
    if (typeof action !== 'function')
      throw Error('action must be a function')
    if(callback)
      return action(
        err => callback(err),
        res => callback(undefined, res)
      )
    else
      return new Promise(action)
  }

  extId() {
    return chrome.runtime.id
  }

  mount = () => {
    chrome.extension.onMessage.addListener( this._messageListener )
    this.tabPingIntervalId = setInterval( this._tabPing, this.tabPingInterval )
  }

  unmount = () => {
    clearInterval( this.tabPingIntervalId )
    chrome.extension.onMessage.removeListener( this._messageListener )
  }

  _messageListener = (request, sender, sendResponse) => {
    if( this.extId() != sender.id )
      return

    Object.keys(request).forEach( callId => {
      if( this.listeners[callId] ) {
        this.listeners[callId].forEach( listener => {
          listener(request[callId][0], request[callId][1], sendResponse)
        })
      }
    })
  }

  _tabPing = () => {
    const callsCount = Object
      .values(this.tabCalls)
      .reduce((a,c) => a+Object.keys(c).length, 0)

    if(!callsCount) return

    this.listOfTabs(tabs => {
      const usedTabs = Object.keys(this.tabCalls)
        .filter(tabId => Object.keys(this.tabCalls[tabId]).length)
        .reduce((a,tabId) => { a[tabId] = 0; return a }, {})

      tabs.forEach(tab =>
        usedTabs.hasOwnProperty(tab.id) ?
          usedTabs[tab.id]++ : null
      )

      Object.keys(usedTabs).forEach(tabId => {
        if(!usedTabs[tabId]) {
          Object.keys(this.tabCalls[tabId])
            .forEach(callId => this.tabCalls[tabId][callId]('ChromeExt tab was closed'))
        }
      })
    })
  }

  allocCallId(tabId, errorHandler) {
    const callId = this.releasedCalls.length ?
      this.releasedCalls.pop() : `_${this.instanceId}_${++this.nextCallId}`

    if(!this.tabCalls[tabId]) this.tabCalls[tabId] = {}
    this.tabCalls[tabId][callId] = errorHandler || (
      () => console.warn('allocCallId error handler was not specified')
    )

    this.callToTab[callId] = tabId

    return callId
  }

  releaseCallId(callId) {
    const tabId = this.callToTab[callId]
    delete this.tabCalls[tabId][callId]
    if(!Object.keys(this.tabCalls[tabId]).length)
      delete this.tabCalls[tabId]

    delete this.callToTab[callId]

    this.releasedCalls.push( callId )
  }

  tabCallCount(tabId) {
    return this.tabCalls[tabId] ?
      Object.keys(this.tabCalls[tabId]).length : 0
  }

  subscribeTabMessage = ( callId, listener ) => {
    if( !this.listeners[callId] )
      this.listeners[callId] = []

    this.listeners[callId].push(listener)

    return () => {
      this.listeners[callId] = this.listeners[callId].filter(
        item => item !== listener
      )
    }
  }

  evalStringInTab = ( tabId, scriptString, callback ) => {
    const extId = this.extId()
    const callIdObj = {}
    const action = (resolve, reject) => {
      const done = (err, result, responce) => {
        if(callIdObj.unsubscribe) callIdObj.unsubscribe()
        this.releaseCallId(callIdObj.callId)
        if(err) reject(err)
        else resolve({result, responce})

      }
      callIdObj.callId = this.allocCallId(tabId, error => done(error))

      let script = `
        (function() {
          var callback = function(error, result, responceCallback) {

            chrome.runtime.sendMessage(
              "${extId}",
              { ${callIdObj.callId}: [error, result] },
              responceCallback || function(response) {
              }
            )

          }

          ${scriptString}
        })()

      `

      try{
        callIdObj.unsubscribe = this.subscribeTabMessage(
          callIdObj.callId,
          (error, result, responceCallback) => {
            done(error, result, responceCallback)
          }
        )
        chrome.tabs.executeScript( tabId, { code: script }, function(result) {
          if( chrome.runtime.lastError ) {
            return done(chrome.runtime.lastError.message ||
              'evalStringInTab chrome undefined error')
          }
          if(!result) {
            done('Error chrome.tabs.executeScript, probably no such tab' )
          }
        })
      } catch(e) {
        done('Error ' + e.name + ":" + e.message + "\n" + e.stack, undefined, ()=>{} )
      }
    }

    if(callback)
      return action(
        err => callback(err),
        ({result, responce}) => callback(undefined, result, responce)
      )
    else
      return new Promise(action)
  }

  listOfTabs(callback) {
    const action = (resolve, reject) => {
      try {
        chrome.tabs.query({}, (tabs) => {
          resolve(tabs);
        });
      } catch (e) { reject(e) }
    }
    return this.callAction(action, callback)
  }

  listOfCurrentWindowTabs(callback) {
    const action = (resolve, reject) => {
      try {
        chrome.tabs.query({currentWindow: true}, (tabs) => {
          resolve(tabs)
        })
      } catch (e) { reject(e) }
    }
    return this.callAction(action, callback)
  }

  currentTab(callback) {
    const action = (resolve, reject) => {
      try {
        // https://developer.chrome.com/extensions/tabs#method-query
        let queryInfo = {
          active: true,
          currentWindow: true
        };

        chrome.tabs.query(queryInfo, (tabs) => {
          let tab = tabs[0];

          // See https://developer.chrome.com/extensions/tabs#type-Tab
          var url = tab.url;
          console.assert(typeof url == 'string', 'tab.url should be a string');

          resolve(tab);
        });
      } catch (e) { reject(e) }
    }
    return this.callAction(action, callback)
  }

  closeTab(tabId, callback) {
    const action = (resolve, reject) => {
      try{
        chrome.tabs.remove(tabId, () => {
          if( chrome.runtime.lastError ) {
            return reject(chrome.runtime.lastError.message ||
              'closeTab chrome undefined error')
          }
          resolve()
        });
      } catch(e) {
        console.warn('close chrome tab ' + e.message)
        reject(e)
      }
    }
    return this.callAction(action, callback)
  }

  openTab(url, active, callback) {
    const action = (resolve, reject) => {
      try{
        chrome.tabs.create({ url, active }, resolve);
      } catch(e) {
        console.warn('open chrome tab ' + e.message)
        reject(e)
      }
    }
    return this.callAction(action, callback)
  }
}