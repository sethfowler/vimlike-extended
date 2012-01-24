(function()
{
  // State.
  var hintText = '';
  var insertDefault = true;
  var mode = 'normal';
  var ignoreForms = false;
  var interval = 30;
  var firstStroke = {};
  var keyChoice = [];

  // Normal mode handlers.
  function pageDown() { scrollBy(0, interval*10); }
  function pageUp() { scrollBy(0, -(interval*10)); }
  function scrollDown() { scrollBy(0, interval); }
  function scrollUp() { scrollBy(0, -interval); }
  function scrollTop() { scroll(0, -document.documentElement.scrollHeight) }
  function scrollBottom() { scroll(0, document.documentElement.scrollHeight) }
  function scrollLeft() { scrollBy(-interval, 0); }
  function scrollRight() { scrollBy(interval, 0); }
  function openNewTab() { safari.self.tab.dispatchMessage('vimlike:openTab'); }
  function openBackground(url) { safari.self.tab.dispatchMessage('vimlike:openBackgroundTab', {'url': url}); }
  function reopenTab() { safari.self.tab.dispatchMessage('vimlike:reopenTab'); }
  function previousTab() { safari.self.tab.dispatchMessage('vimlike:changeTab', {'offset': -1}); }
  function nextTab() { safari.self.tab.dispatchMessage('vimlike:changeTab', {'offset': 1}); }
  function closeTab() { safari.self.tab.dispatchMessage('vimlike:closeTab'); }
  function reload() { location.reload(); }
  function historyBack() { history.back(); }
  function historyForward() { history.forward(); }
  function blurFocus() { document.activeElement.blur(); }

  function modeChange()
  {
    switch(mode)
    {
      case 'useonline': mode = 'normal'; break;
      case 'normal': mode = 'useonline'; break;
      default: mode = 'normal'; break;
    }
  }

  function toggleIgnoreForms()
  {
    ignoreForms = !ignoreForms;
    console.log("Ignore forms = " + ignoreForms);
  }

  var normHandlers =
  {
    'S-escape' : function() { modeChange(); },
    'C-escape' : function() { toggleIgnoreForms(); },
    'C-d'  : function() { pageDown(); },
    'C-u'  : function() { pageUp(); },
    'j'  : function() { scrollDown(); },
    'k'  : function() { scrollUp(); },
    'h'  : function() { scrollLeft(); },
    'l'  : function() { scrollRight(); },
    'gg' : function() { scrollTop(); },
    'S-g': function() { scrollBottom(); },
    't' : function() { openNewTab(); },
    'u' : function() { reopenTab(); },
    'gt' : function() { nextTab(); },
    'S-k' : function() { nextTab(); },
    'gS-t': function() { previousTab(); },
    'S-j': function() { previousTab(); },
    'r' : function() { reload(); },
    'f' : function() { linkSearch(); },
    '/' : function() { hah(true); },
    'S-f' : function() { hah(false); },
    'S-h' : function() { historyBack(); },
    'S-l' : function() { historyForward(); },
    'escape' : function() { blurFocus(); },
    'C-[' : function() { blurFocus(); },
    ':' : function() { exMode(); },
  }

  // Ex mode handlers.
  var exHandlers = 
  {
    ':e' : function(page) {
      // Open a new page.
      if (page.indexOf('://') == -1)
        page = 'http://' + page;

      top.location = page;
    },
    ':go' : function() {
      // Search Google.
      var query = encodeURIComponent(Array.prototype.slice.call(arguments).join(' '));
      top.location = 'http://www.google.com/search?client=safari&q=' + query;
    },
    ':gy' : function() {
      // Search YouTube.
      var query = encodeURIComponent(Array.prototype.slice.call(arguments).join(' '));
      top.location = 'http://www.youtube.com/results?search_query=' + query + '&oq=' + query
    },
  }

  // Insert mode handlers.
  var formHandlers =
  {
    'escape' : function() { blurFocus(); },
    'C-[': function() { blurFocus(); },
    'C-escape' : function() { toggleIgnoreForms(); },
  }

  function keyEvent(e)
  {
    if( mode == 'hint' ){ return; }
    if( mode == 'ex' ){ return; }
    var t = e.target;
    if( t.nodeType == 1 ){
       var tn = t.tagName.toLowerCase();
       var pressKey = kc2char(e.which || e.keyCode);
       if( pressKey == 191 ) pressKey = '/'; //I want more good code :(
       if( pressKey == 186 ) pressKey = ':';
       if( e.ctrlKey ){ pressKey = 'C-' + pressKey; }
       if( e.shiftKey ){ pressKey = 'S-' + pressKey; }
       if( e.altKey ){ pressKey = 'A-' + pressKey; }
       if( e.metaKey ){ return; } // Avoid colliding with system shortcuts
       if( pressKey == 'S-shift' ){ //don't use :)
         return;
       }

       if( tn == 'input' || tn == 'textarea' || tn == 'select' ){
         if (ignoreForms)
           e.preventDefault();
         else
         {
           if( typeof formHandlers[pressKey] == 'function' && mode != 'useonline' ){
              e.preventDefault();
              formHandlers[pressKey].apply();
           }
           return;
         }
       }

       if( mode == 'useonline' ){
         if( pressKey == 'S-escape' ){
           modeChange();
         }
         return;
       }

       if (keyChoice.length == 0 && pressKey == 'S-:'){
         e.preventDefault();
         exMode();
         return;
       }

       keyChoice.push(pressKey);
       var keychain = keyChoice.join('');

        if( firstStroke[pressKey] && typeof handler[keychain] != 'function' ){
          e.preventDefault();
          return;
        }

        //check w stroke bind
        if( typeof normHandlers[keychain] == 'function' ){
          pressKey = keychain;
        }else{
          if( typeof normHandlers[pressKey] != 'function' ){
            keyChoice.length = 0; //clear keychoice
            return;
          }
        }
        keyChoice.length = 0; //clear keychoice
        e.preventDefault();
        normHandlers[pressKey].apply();
    }
  }

  function exMode()
  {
    console.log("Entering exMode");

    mode = 'ex';

    // Create inner and outer wrappers. We need two to position the input at the bottom.
    var div = document.createElement('div');
    div.className = 'VIMLIKE-ex-mode-outer';
    var innerDiv = document.createElement('div');
    innerDiv.className = 'VIMLIKE-ex-mode-inner';
    div.appendChild(innerDiv);

    // Create the input element - the ex mode commandline.
    var input = document.createElement('input');
    input.className = 'VIMLIKE-ex-mode-input';
    input.type = 'text';
    input.value = ':';
    innerDiv.appendChild(input);
    
    input.onkeydown = function(evt) {
      var keyCode = evt.which || evt.keyCode;

      if (keyCode == 13 || keyCode == 27)
      {
        // Either enter or escape was pressed, so we're done.
        mode = 'normal';
        evt.preventDefault();
        top.document.body.removeChild(div);

        if (keyCode == 13)
        {
          // Enter was pressed.
          var args = input.value.split(' ');
          var cmd = args[0];
          args.shift();       // Remove the command itself.
          if (typeof exHandlers[cmd] == 'function')
            exHandlers[cmd].apply(this, args);
        }
      }
    };

    top.document.body.appendChild(div);

    input.focus();
  }

  function linkSearch()
  {
    // Prepare.
    var keys = [];
    var doc = top.document;
    var namespaceResolver = doc.createNSResolver(doc);
    var query = '(//a[@href]|//input[not(@type=\x22hidden\x22)]|//textarea|//select|//img[@onclick]|//button)';
    var queryResult = null;
    var keyMap = {'8': 'Bkspc', '46': 'Delete', '32': 'Space', '13':'Enter', '16': 'Shift', '17': 'Ctrl', '18': 'Alt'};

    function keyDown(e)
    {
      var key = e.keyCode || e.which;

      switch (key)
      {
        case 8:   // Backspace.
        case 46:  // Delete.
        {
          keys.pop();
          break;
        }

        case 27:  // Escape.
        {
          // Remove this handler.
          doc.removeEventListener('keydown', keyDown, true);
          break;
        }

        default:
        {
          // Normalize the key.
          key = String.fromCharCode(key);
          //if (!e.shiftKey)
            //key = key.toLowerCase();
          
          keys.push(key);

          // Compute full query.
          var predicates = [];
          var previous = "translate(text(), 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')";
          for (var k = 0 ; k < keys.length ; ++k)
          {
            var current = '(' + previous + ', "' + keys[k] + '")';
            predicates.push('contains' + current);
            previous = 'substring-after' + current;
          }

          var fullQuery = query + '[' + predicates.join(' and ') + ']';

          // Make query.
          console.log("Query: %s", fullQuery);
          queryResult = doc.evaluate(fullQuery, doc, namespaceResolver, XPathResult.ANY_TYPE, queryResult);

          // Print results to console.
          var item = queryResult.iterateNext();
          while (item)
          {
            console.log("Match: %s", item.textContent);
            item = queryResult.iterateNext();
          }

          break;
        }
      }
    }

    // Register the event listener.
    doc.addEventListener('keydown', keyDown, true);
  }

  function hah(isCurrent)
  {
    var hintKeys = new String(hintText).toUpperCase();
    var xpath = '//a[@href]|//input[not(@type=\x22hidden\x22)]|//textarea|//select|//img[@onclick]|//button';
    var hintColor = '\x23ffff00';
    var hintColorForm = '\x2300ffff';
    var hintColorFocused= '\x23ff00ff';
    var keyMap = {'8': 'Bkspc', '46': 'Delete', '32': 'Space', '13':'Enter', '16': 'Shift', '17': 'Ctrl', '18': 'Alt'};

    var hintKeysLength;
    var hintContainerId = 'hintContainer';
    var hintElements = [];
    var inputKey = '';
    var lastMatchHint = null;
    var k=0;

    function getAbsolutePosition( elem, html, body, inWidth, inHeight ){
      var style = getComputedStyle(elem,null);
      if(style.visibility === 'hidden' || style.opacity === '0' ) return false;
      //var rect = rectFixForOpera( elem, getComputedStyle(elem,null)) || elem.getClientRects()[0];
      var rect = elem.getClientRects()[0];
      if( rect && rect.right - rect.left >=0 && rect.left >= 0 && rect.top >= -5 && rect.bottom <= inHeight + 5 && rect.right <= inWidth ){
        return {
          top: (body.scrollTop || html.scrollTop) - html.clientTop + rect.top,
          left: (body.scrollLeft || html.scrollLeft ) - html.clientLeft + rect.left
        }
      }
      return false;

    }

    function createText(num){
      var text = '';
      var l = hintKeysLength;
      var iter = 0;
      while( num >= 0 ){
        var n = num;
        num -= Math.pow(l, 1 + iter++ );
      }
      for( var i=0; i<iter; i++ ){
        var r = n % l;
        n = Math.floor(n/l);
        text = hintKeys.charAt(r)+text;
      }
      return text;
    }

    function getXPathElements(win){
      function resolv(p){ if (p == 'xhtml') return 'http://www.w3.org/1999/xhtml'; }
      var result = win.document.evaluate(xpath, win.document, resolv, 7, null);
      for (var i = 0, arr = [], len = result.snapshotLength; i < len; i++){
        arr[i] = result.snapshotItem(i);
      }
      return arr;
    }

    function start(win){
      var html = win.document.documentElement;
      var body = win.document.body;
      var inWidth = win.innerWidth;
      var inHeight = win.innerHeight

      var df = document.createDocumentFragment();
      var div = df.appendChild(document.createElement('div'));
      div.id = hintContainerId;

      var spanStyle = {
        'position' : 'absolute',
        'zIndex' : '214783647',
        'color' : '#000',
        'fontSize' : '10pxt',
        'fontFamily' : 'monospace',
        'lineHeight' : '10pt',
        'padding' : '0px',
        'margin' : '0px',
        'opacity' : '0.7'
      };
      var elems = getXPathElements(win);
      elems.forEach(function(elem){
        var pos = getAbsolutePosition(elem, html, body, inWidth, inHeight );
        if( pos == false ) return;
        var hint = createText(k);
        var span = win.document.createElement('span');
        span.appendChild(document.createTextNode(hint));
        var st = span.style;
        for( key in spanStyle ){
          st[key] = spanStyle[key];
        }
        st.backgroundColor = elem.hasAttribute('href') === true ? hintColor : hintColorForm;
        st.left = Math.max(0,pos.left-8) + 'px';
        st.top = Math.max(0,pos.top-8) + 'px';
        hintElements[hint] = span;
        span.element = elem;
        div.appendChild(span);
        k++;
      },this);
      win.document.addEventListener('keydown', handle, true );
      win.document.body.appendChild(df);
    }

    function handle(eve){
      var key = eve.keyCode || eve.charCode;
      if( key in keyMap === false ){
        removeHints();
        return;
      }
      var onkey = keyMap[key];
      switch(onkey){
        case 'Enter':
          if( lastMatchHint.element.type == 'text' ){
            eve.preventDefault();
            eve.stopPropagation();
          }
          if( !isCurrent ){
            if( /https?:\/\//.test(lastMatchHint.element.href) ){
              eve.preventDefault();
              eve.stopPropagation();
              openBackGround(lastMatchHint.element.href);
            }
          }
          resetInput();
          removeHints();
        case 'Shift':
        case 'Ctrl':
        case 'Alt' : return;
      }
      eve.preventDefault();
      eve.stopPropagation();
      switch(onkey){
        case 'Bkspc':
        case 'Delete':
          if( !inputKey ){
            removeHints();
            return;
          }
          resetInput();
          return;
        case 'Space':
          removeHints();
          return;
        default:
          inputKey += onkey;
      }
      blurHint();
      if( inputKey in hintElements === false ){
        resetInput();
        inputKey += onkey;
      }
      lastMatchHint = hintElements[inputKey];
      lastMatchHint.style.backgroundColor = hintColorFocused;
      lastMatchHint.element.focus();
    }

    function removeHints(){
      var frame = top.frames;
      if( !document.getElementsByTagName('frameset')[0]){
        end(top);
      }
      Array.prototype.forEach.call(frame, function(elem){
        try{
          end(elem);
        }catch(e){ }
      }, this);
    }

    function blurHint(){
      if(lastMatchHint){
        lastMatchHint.style.backgroundColor  = lastMatchHint.element.hasAttribute('href')===true?hintColor:hintColorForm;
      }
    }

    function resetInput(){
      inputKey = '';
      blurHint();
      lastMatchHint = null;
    }

    function end(win){
      var div = win.document.getElementById(hintContainerId);
      win.document.removeEventListener('keydown', handle, true);
      if(div){
        win.document.body.removeChild(div);
      }
      mode = 'normal';
    }

    function hahInit(){
      hintKeysLength = hintKeys.length;
      hintKeys.split('').forEach(function(l){ keyMap[l.charCodeAt(0)] = l;  }, this);
    }

    function hahDraw(){
      
      var frame = window.frames;
      if(!document.getElementsByTagName('frameset')[0]){
        start(window);
      }else{
        Array.prototype.forEach.call(frame, function(elem){
          try{
            start(elem);
          }catch(e){
          }
        },this);
      }
    }

    mode = 'hint';
    hahInit();
    hahDraw();
  }

  function kc2char(kc)
  {
    function between(a,b) { return a <= kc && kc <= b; }

    var _32_40 = "space pageup pagedown end home left up right down".split(" ");
    var kt = {
       8  : "backspace",
       9  : "tab"  ,
       13 : "enter",
       16 : "shift",
       17 : "control",
       27 : "escape",
       46 : "delete",
    };
    return (between(65,90)  ? String.fromCharCode(kc+32) : // a-z
           between(48,57)  ? String.fromCharCode(kc) :    // 0-9
           between(96,105) ? String.fromCharCode(kc-48) : // num 0-9
           between(32,40)  ? _32_40[kc-32] :
           kt.hasOwnProperty(kc) ? kt[kc] : kc);
  }

  function init()
  {
    for( var key in normHandlers){
      if( key.length > 1 && !(/S-|C-|A-|escape/.test(key))){
        firstStroke[key[0]] = true;
      }
    }
    safari.self.tab.dispatchMessage('vimlike:tabLoaded');
  }

  init(); 
  document.addEventListener( 'keydown', function(e){ keyEvent(e); }, true);

  safari.self.addEventListener('message', function(e){
    if( e.name === 'hintText' ){
      hintText = e.message;
    }
    if ( e.name === 'insertDefault'){
      insertDefault = e.message;
    }
  }, false );
})();
