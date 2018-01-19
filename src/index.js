
class ChromeExtension {
  constructor() {
    this.listeners = {}
    this.nextCallId = 0
    this.releasedCalls = []
    console.log( chrome.extension.getURL("popup.html") )
  }

  extId() {
    return chrome.runtime.id
  }

  mount = () => {
    chrome.extension.onMessage.addListener( this._messageListener )
  }

  unmount = () => {
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

  allocCallId(namespace) {
    return this.releasedCalls.length ?
      this.releasedCalls.pop() : ++this.nextCallId
  }

  releaseCallId(callId) {
    this.releasedCalls.push( parseInt(callId) )
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
    const callId = this.allocCallId()

    let script = `
      (function() {
        var callback = function(error, result, responceCallback) {

          chrome.runtime.sendMessage(
            "${extId}",
            { ${callId}: [error, result] },
            responceCallback || function(response) {
            }
          )

        }

        ${scriptString}
      })()

    `

    let unsubscribe
    try{
      unsubscribe = this.subscribeTabMessage(
        callId, (error, result, responceCallback) => {
          unsubscribe()
          callback(error, result, responceCallback)
        }
      )
      chrome.tabs.executeScript( tabId, { code: script } )
    } catch(e) {
      unsubscribe()
      callback('Error ' + e.name + ":" + e.message + "\n" + e.stack, undefined, ()=>{} )
    }
  }

  listOfTabs(callback) {
    chrome.tabs.query({}, (tabs) => {
      callback(tabs);
    });
  }

  listOfCurrentWindowTabs(callback) {
    chrome.tabs.query({currentWindow: true}, (tabs) => {
      callback(tabs);
    });
  }

  currentTab(callback) {
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

      callback(tab);
    });
  }

  closeTab(tabId) {
    try{
      chrome.tabs.remove(tabId, function() { });
    } catch(e) {
      console.warn('close chrome tab ' + ee.message)
    }
  }

}



export default ChromeExtension

