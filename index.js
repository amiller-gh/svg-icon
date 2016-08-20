(function(document, window){

  // Ensure we're running in a browser environment
  if (!document || !window) throw new Error('Unable to access document or window objects');

  // Figure out what the <svg-icon> class will extend. Some headless browsing
  // environments don't implement `HTMLElement`.
  const PROTO = HTMLElement ? HTMLElement : function HTMLElement(){};

  function registerElement(name, icons){

    // Definition of the <svg-icon> custom element prototype.
    class SVGIcon extends PROTO {

      // Called on DOM element creation
      createdCallback(){

        // Icons should always be hidden from screen readers.
        this.setAttribute('aria-hidden', 'true');

        this.update();

      }

      attributeChangedCallback(name){
        if(name !== 'type') return;
        this.update();
      }

      update(){

        // Find the requested icon type
        var type = this.getAttribute('type');
        if (!type) return;

        // Fetch the icon from our SVG sprite
        var icon = this.iconSprite.getElementById(type);
        if (!icon) throw new Error(`No icon of type ${type} found`);

        // Remove previous contents
        // https://jsperf.com/innerhtml-vs-removechild
        while (this.firstChild) this.removeChild(this.firstChild);

        // Append a deep clone of this SVG icon
        this.appendChild(icon.cloneNode(true));

      }

    }

    SVGIcon.prototype.iconSprite = icons;

    // Register our `<svg-icon>` custom element with the browser if we are able to.
    // If `document.registerElement` does not exist, throw a helpful error. This
    // function is called after we successfully fetch the SVG sprite above.
    if (!document.registerElement) throw new Error(`Unable register ${name}: document.registerElement does not exist`);
    document.registerElement(name, { prototype: SVGIcon.prototype });
  }

  function initIcons(META){

    const URI = META.content;
    if (!URI) throw new Error('Invalid svg-icons URI value');

    const TAG_NAME = META.id || 'svg-icon';

    // IE8 and IE9 only support `XDomainRequest` for cross domain requests. This
    // was removed in IE10 in favor of proper CORS. If this is a cross domain request,
    // and `XDomainRequest` is a thing, use `XDomainRequest`, otherwise use a normal
    // `XMLHttpRequest`.
    var isXDomain = typeof XDomainRequest !== 'undefined' && !~URI.indexOf(window.location.hostname) && !!URI.match(/^([a-z]+:)|^(\/\/)|^([^\/]+\.)/);
    var xhr = isXDomain ? new XDomainRequest() : new XMLHttpRequest();

    // This data formatter will take the XHR object and attempt to return a well-formed
    // SVG dom element. For servers that return the wrong data type, or older browsers
    // without the `responseXML` property on xhr responses, we will use a `DOMParser`
    // to fetch the dom element from the `responseText`.
    function dataFormatter(xhr) {
      if (!xhr) return null;
      try {
        let resp = xhr.responseXML ? xhr.responseXML.firstChild : (new DOMParser()).parseFromString(xhr.responseText, 'application/xml').firstChild;
        return resp.getElementsByTagName('parsererror').length ? null : resp;
      }
      catch(err) { return null; }
    }

    // Error callback in anything failes
    function error() { throw new Error(`Error loading ${TAG_NAME} svg sprite from ${URI}: Invalid response from server`); }

    // 'XDomainRequest' uses `onerror` and `ontimeout` for errored requests.
    if (isXDomain) xhr.onerror = xhr.ontimeout = error;

    // 'XDomainRequest' uses `onLoad` when finished. `XMLHttpRequest` uses `onreadystatechange`
    // When finished, format data and save the returned icons
    xhr[isXDomain ? 'onload' : 'onreadystatechange'] = function() {
      if (!isXDomain && this.readyState !== 4) return;
      if (!isXDomain && this.status !== 200) return error();
      let data = dataFormatter(this);
      if (data === null) return error();
      registerElement(TAG_NAME, data);
    };

    // Make sure that XHR parses this request as XML regardless of content type
    // sent by server. Must be done before `xhr.send()`
    if (xhr.overrideMimeType) {
      xhr.overrideMimeType('text/xml');
      xhr.responseType = 'document';
    }

    // Open an async GET request for our icon sprite and send it off
    xhr.open('GET', URI, true);
    xhr.send();
  }


  // Fetch the URI where we are going to pull our SVG icons sprite from. There must
  // be a `<meta name="svg-icons" content="path/to/the/svg/file.svg">` tag in the
  // page's `<head>` in order to use this component. If not found, throw an error.
  const META_TAGS = document.querySelectorAll('meta[name="svg-icons"]');
  if (!META_TAGS.length) throw new Error('Unable to find any svg-icons meta tags');
  for (let i=0; i<META_TAGS.length; i++) initIcons(META_TAGS[i]);

})(document, window);
