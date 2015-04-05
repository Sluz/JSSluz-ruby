;(function (window, document, module, filename) {
    if ( typeof module !== 'undefined' ) { return; }
    
    var module = window.Sluz = { version: '1.0.0', dependencies: new Array() };
    
    //--- Utilities 
    module.utils = module.utils || {};
    module.utils.getWindowSize = function() {
        var width = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
        var height = window.innerHeight|| document.documentElement.clientHeight|| document.getElementsByTagName('body')[0].clientHeight;
        module.windowSize = { width : width, height : height };
        return module.windowSize;
    };
    module.utils.getLocation = function () {
        module.coordinates = module.coordinates || {latitude: 53.302990319, longitude: -6.303957123};
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                module.coordinates = position.coords;
            });
        } else 
            throw new Error('Geolocation is not supported by this browser.'); 
        return module.coordinates;
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
    
    //--- Event system 
    module.Event = module.Event ||  function() {};
    module.Event.prototype = { eventElement: document.createElement('div') };
    module.Event.prototype.fireEvent = function (name) {
       this.eventElement.dispatchEvent(new Event(name));
    };
    module.Event.prototype.addEventListener = function (type, block) {
        this.eventElement.addEventListener(type, block);
    };
    
    //--- Support for load data
    module.Support = module.Support || function() {};
    module.Support.prototype.loadData = function (url_or_params, success, error) {
        if (typeof url_or_params === 'String') 
            url_or_params = { method:'GET', url: url_or_params };
        url_or_params.complete = url_or_params.complete || function(xhr) {
            if (xhr.status === 200)
                if (success) { success(xhr); }
             else 
                if (error) { error(xhr); }
        };
        this.sendRequest(url_or_params);
    };
    module.Support.prototype.sendRequest = function (params) {
        if (typeof window.XMLHttpRequest === "undefined") { throw new Error('XMLHttpRequest not supported.'); }
        if (typeof window.params === "undefined" ||
            typeof window.params.url === "undefined") { throw new Error('URL missing.'); }
        params.body = params.body || null;
        params.method = params.method || 'GET';
        params.asynchrone = params.asynchrone || true;
        var complete = params.complete || null;
        if (typeof complete !== 'function') { throw new Error('complete is nit a Function.'); }
        
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
        return xhr.send(params.body); ;
    };
    
    //--- JSON Loader
    module.Json  = module.Json  || function() { return Object.create(Array); };
    module.Json.prototype.addPendingData = function (url, binding) {
        var data = {
            url: url
        };
        if (binding) {
            data.binding = binding;
        }
        this.push(data);
    };
    module.Json.prototype.loadPendingData = function () {
        for (var key in this) {
            module.util.loadData(this[key].url, function (ressource) {
                var xhr = ressource.target; 
                module.json[key].data = JSON.parse(xhr.responseText);
            });
        }
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
    
    //--- Dependencies loading
    module.Dependencies = module.Dependencies || function (script_name) {
        this.create(Event);
        //--- Select Module Script
        //var regex = /graisearch\.js(\?.)?/i;
        var script  = null;
        var scripts = document.getElementsByTagName('script');
        for (var index in scripts) {
            script = scripts[index];
            if (script.src && script.src.search(script_name+'.js') >= 0) {
                break;
            }
            script = null;
        }

        //--- If not found means error on regex (reason: change module_name)
        if (script === null) {
            throw new Error('Script '+script_name+' not found.');
        }

        var queryString = script.src.replace(/^[^\?]+\??/, '');
        var params = module.utils.parseQuery(queryString);

        if (params) {
            for (var key in params) {
                if (key === 'libraries') {
                    var libraries = params.libraries.split(',');
                    for (var index in libraries) {
                        this.dependenciesList.push(
                                (module.source || 'js/'+script_name) 
                                + '/' + libraries[index] + '.js');
                    }
                } else {
                    this[key] = params[key];
                }
            }
        }
        
        this.addEventListener("loaded", this.loadDependencies);
        this.fireLoaded();
        return this;
    };
    module.Dependencies.prototype = { dependenciesList:[] };
    module.Dependencies.prototype.fireLoaded = function () {
       this.fireEvent('loaded');
    };
    module.Dependencies.prototype.loadDependencies = function() {
        if (this.dependenciesList.length > 0) {
            this.loadScript(this.dependenciesList.shift());
        } else {
            if (typeof this.callback !== 'undefined')
                (new Function(module.callback+'();'))();
        }
    };
    module.Dependencies.prototype.loadScript = function (src, success, error) {
        var script  = document.createElement('script');
        var element = document.body || document.head;
        //--- Configure script source
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', src);
        script.setAttribute('async', true);
        //--- Configure callback
        script.onload = script.onreadystatechange = function(evt) {
             if (success) {
                 success();
             }
            this.fireLoaded();
        };
        if (error)
            script.onerror = error;
        else
            script.onerror = function(evt) { throw new Error('Script from "'+evt.target.src+'" cannot be loaded.'); };
        //--- Integrate script into file
        element.appendChild(script);
        return script;
    };
    new Dependencies(filename);
})(window, document, window.Sluz, 'sluz');
