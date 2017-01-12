;(function (window, document) {
  if (typeof window.Sluz !== 'undefined') {
    return;
  }
  var module = window.Sluz = {version: '1.0.0', dependencies: new Array()};

  //--- Events ---------------------------------------------------------------
  module.Event = module.Event || {};
  module.Event.prototype = {eventElement: document.createElement('div')};
  module.Event.prototype.fireEvent = function (name) {
    this.eventElement.dispatchEvent(new Event(name));
  };

  module.Event.prototype.addEventListener = function (type, block) {
    this.eventElement.addEventListener(type, block);
  };

  //--- Utilities ------------------------------------------------------------
  module.utils = module.utils || {};
  module.utils.updateWindowSize = function () {
    var width = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
    var height = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;
    module.windowSize = module.windowSize || {};
    module.windowSize.width = width;
    module.windowSize.height = height;
    return module.windowSize;
  };

  module.utils.searchLocation = function (event) {
    module.coordinates = module.coordinates || {latitude: 0, longitude: 0};
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        for (var index in position.coords) {
          module.coordinates[index] = position.coords[index];
        }
        event.fireEvent('location');
      });
    } else
      throw new Error('Geolocation is not supported by this browser.');
    return module.coordinates;
  };

  module.utils.GetParameters = function () {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    var result = {};
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      result[pair[0]] = decodeURIComponent(pair[1]);
    }
    return result;
  };

  module.utils.parseQuery = function (query) {
    var params = new Object();
    if (!query)
      return params; // return empty object
    var pairs = query.split(/[;&]/);
    for (var i = 0; i < pairs.length; i++) {
      var keyVal = pairs[i].split('=');
      if (!keyVal || keyVal.length !== 2)
        continue;
      var key = unescape(keyVal[0]);
      var val = unescape(keyVal[1]);
      val = val.replace(/\+/g, ' ');
      params[key] = val;
    }
    return params;
  };

  //--- Support for load data
  module.Support = module.Support || {};
  module.Support.loadData = function (url_or_params, success, error) {
    if (typeof url_or_params === 'string')
      url_or_params = {method: 'GET', url: url_or_params};
    url_or_params.complete = url_or_params.complete || function (xhr) {
      if (xhr.status === 200)
        if (success) {
          success(xhr);
        }
        else
        if (error) {
          error(xhr);
        }
    };
    this.sendRequest(url_or_params);
  };

  module.Support.Get = function (path, params, headers) {
    var paramData = null;
    if (typeof params !== 'undefined') {
      paramData = '';
      for (var key in params) {
        if (paramData != '') {
          paramData += '&';
        }
        paramData += key + '=' + encodeURIComponent(params[key]);
      }
    }
    this.sendRequest({
      type: 'GET',
      url: path + '?' + paramData,
      headers: headers,
      asynchrone: false,
      enableCORS: true
    });
  };

  module.Support.Post = function (path, params, headers) {
    var paramData = null;
    if (typeof params !== 'undefined') {
      paramData = new FormData();
      for (var key in params) {
        paramData.append(key, params[key]);
      }
    }
    this.sendRequest({
      type: 'POST',
      url: path,
      body: paramData,
      headers: headers,
      asynchrone: false,
      enableCORS: true
    });
  };

  module.Support.sendRequest = function (params) {
    if (typeof window.XMLHttpRequest === "undefined") {
      throw new Error('XMLHttpRequest not supported.');
    }
    if (typeof params === "undefined" ||
        typeof params.url === "undefined") {
      throw new Error('URL missing.');
    }
    params.body = params.body || null;
    params.method = params.method || 'GET';
    params.asynchrone = params.asynchrone || true;
    var complete = params.complete || null;
    if (typeof complete !== 'function') {
      throw new Error('complete is nit a Function.');
    }

    var xhr = new XMLHttpRequest();
    if (params.enableCORS) {
      if ("withCredentials" in xhr) {
        if (complete) {
          xhr.onreadystatechange = function (evt) {
            if (xhr.readyState === 4) {
              complete(xhr);
              xhr = null;
            }
          };
        }
        xhr.open(params.method, params.url, params.asynchrone, params.user, params.password);
      } else if (typeof window.XDomainRequest !== "undefined") {
        //--- Info : credential not used.
        xhr = new window.XDomainRequest();
        if (complete) {
          xhr.onload = function () {
            complete(xhr);
            xhr = null;
          };
          xhr.onerror = function () {
            complete(xhr);
            xhr = null;
          };
        }
        xhr.open(params.method, params.url);
      } else {
        xhr = null;
        throw new Error('Otherwise, CORS is not supported by the browser.');
      }
    } else {
      if (complete) {
        xhr.onload = function () {
          complete(xhr);
          xhr = null;
        };
        xhr.onerror = function () {
          complete(xhr);
          xhr = null;
        };
      }
      xhr.open(params.method, params.url, params.asynchrone);
    }
    return xhr.send(params.body);
    ;
  };

  //--- JSON -----------------------------------------------------------------
  module.Json = module.Json || function () {
    this.datas = [];
    return this;
  };

  module.Json.prototype.addPendingData = function (url_or_params, synchrone) {
    synchrone = synchrone || true;
    if (typeof url_or_params === 'string')
      url_or_params = {method: 'GET', url: url_or_params};

    this.pending = this.pending || [];
    this.pending.push(url_or_params);

    if (synchrone) {
      if (this.event == null) {
        var self = this;
        this.event = new module.Event();
        this.event.addEventListener('next', function () {
          self.loadPendingData(synchrone);
        });
      }
    } else {
      this.loadPendingData(synchrone);
    }
  };

  module.Json.prototype.loadPendingData = function (synchrone) {
    var self = this;
    synchrone = synchrone || true;
    if (synchrone) {
      if (this.pending.length > 0) {
        var params = this.pending.shift();
        module.util.loadData(params, function (ressource) {
          var xhr = ressource.target;
          self.addDatas(JSON.parse(xhr.responseText));
          self.event.fireEvent('next');
        });
      } else {
        self.event.fireEvent('completed');
      }
    } else {
      for (var key in this.pending) {
        module.util.loadData(this.pending[key], function (ressource) {
          var xhr = ressource.target;
          self.addDatas(JSON.parse(xhr.responseText));
        });
      }
    }
  };

  module.Json.prototype.addDatas = function (datas) {
    this.datas.push.apply(this.datas, datas);
  };

  module.Json.prototype.getDataFromKeys = function (dataKeys, datas) {
    var result = datas;
    for (var key in dataKeys) {
      if (dataKeys[key].length > 0) {
        result = result[dataKeys[key]];
      }
    }
    return result;
  };

  //--- Dependencies ---------------------------------------------------------
  module.Dependencies = module.Dependencies || function (script_name, callback) {
    var self = this;
    this.event = new module.Event(); //this.create(Event);
    this.callback = callback;

    if (typeof script_name === 'string') {
      //--- Select Module Script
      //var regex = /graisearch\.js(\?.)?/i;
      var script = null;
      var scripts = document.getElementsByTagName('script');
      for (var index in scripts) {
        script = scripts[index];
        if (script.src && script.src.search(script_name + '.js') >= 0) {
          break;
        }
        script = null;
      }

      //--- If not found means error on regex (reason: change module_name)
      if (script === null) {
        throw new Error('Script ' + script_name + ' not found.');
      }

      var queryString = script.src.replace(/^[^\?]+\??/, '');
      var params = module.utils.parseQuery(queryString);
      if (params) {
        for (var key in params) {
          if (key === 'libraries') {
            var libraries = params.libraries.split(',');
            for (var index in libraries) {
              this.dependenciesList.push(
                  (module.source || '/javascript/' + script_name)
                  + '/' + libraries[index] + '.js');
            }
          } else {
            this[key] = params[key];
          }
        }
      }
    } else if (typeof script_name === 'object') {
      this.dependenciesList.push.apply(this.dependenciesList, script_name);
    } else {
      throw 'script_name must be a string or array ==> not a ' + typeof (script_name);
    }

    this.event.addEventListener("loaded", function () {
      self.loadDependencies();
    });

    this.fireLoaded();
    return this;
  };

  module.Dependencies.prototype = {dependenciesList: []};
  module.Dependencies.prototype.fireLoaded = function () {
    this.event.fireEvent('loaded');
  };

  module.Dependencies.prototype.loadDependencies = function () {
    if (this.dependenciesList.length > 0) {
      this.loadScript(this.dependenciesList.shift());
    } else {
      if (typeof this.callback !== 'undefined')
        this.callback();
      // (new Function(module.callback+'();'))();
    }
  };

  module.Dependencies.prototype.loadScript = function (src, success, error) {
    var self = this;
    var script = document.createElement('script');
    var element = document.body || document.head;
    //--- Configure script source
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', src);
    script.setAttribute('async', true);
    //--- Configure callback
    script.onload = script.onreadystatechange = function (evt) {
      if (success) {
        success();
      }
      self.fireLoaded();
    };
    if (error)
      script.onerror = error;
    else
      script.onerror = function (evt) {
        throw new Error('Script from "' + evt.target.src + '" cannot be loaded.');
      };
    //--- Integrate script into file
    element.appendChild(script);
    return script;
  };

  //--- Controller -------------------------------------------------------------
  module.Controller = module.Controller || function () {
    if (module.Controller.prototype.isInit == false) {
      module.Controller.prototype.isInit = true;
      if (window.Mustache !== 'undefined') {
        module.Controller.prototype.parse = window.Mustache.parse;
        module.Controller.prototype.render = window.Mustache.render;
      }
    }
  };

  module.Controller.prototype.isInit = false;
  module.Controller.prototype.loadView = function (id, view, datas) {
    var elements = document.querySelectorAll(id);
    var length = elements.length;
    for (var i = 0; i < length; ++i) {
      elements[i].innerHTML = this.render(view, datas);
    }
  };

  module.Controller.prototype.appendViewChild = function (id, view, datas) {
    var elements = document.querySelectorAll(id);
    var length = elements.length;
    for (var i = 0; i < length; ++i) {
      var children = this.parseFromString(this.render(view, datas));
      var childrenLength = children.length;
      for (var j = 0; j < childrenLength; ++j) {
        elements[i].appendChild(children[j]);
      }
    }
  };

  module.Controller.prototype.loadUrlView = function (id, url_viewer, datas) {
    var self = this;
    module.Support.loadData(url_viewer, function (xhr) {
      var view = xhr.responseText;
      self.loadView(id, view, datas);
    });
  };

  module.Controller.prototype.appendUrlViewChild = function (id, url_viewer, datas) {
    var self = this;
    module.Support.loadData(url_viewer, function (xhr) {
      var view = xhr.responseText;
      self.appendChild(id, view, datas);
    });
  };

  module.Controller.prototype.parseFromString = function (source) {
    var element;
//    var parser = new DOMParser();
//    element = parser.parseFromString(source, "text/html").body;
    element = document.createElement('div');
    element.innerHTML = source;
    return element.childNodes;
  };

  module.Controller.prototype.parse = function () {
  };
  
  module.Controller.prototype.render = function () {
    return arguments[0];
  };
})(window, document);
