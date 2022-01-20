import {Class} from './core/Class'
import * as Util from './core/Util'
import * as DomUtil from './dom/DomUtil'
var Control = Class.extend({
    options: {
        position: 'topright'
    },

    initialize: function(options) {
        Util.setOptions(this, options)
    },

    getPosition: function() {
        return this.options.position
    },


    addTo: function(map) {
        this._map = map

        var container = this._container = this.onAdd(map),

        pos = this.getPosition(),
        corner = map._controlCorners[pos]

        DomUtil.addClass(container, 'leaflet-control')

        if (pos.indexOf('bottom') !== -1) {
            // ? 为什么top， 用inertBefore，bottom用appendChild
            corner.insertBefore(container, corner.firstChild)
        } else {
            corner.appendChild(container)
        }

        return this
        
    },


})

export {Control}