import {Control} from './Control'
import * as DomUtil from './dom/DomUtil'
import * as DomEvent from './dom/DomEvent'

var Zoom = Control.extend({
    options: {
        position: 'topleft',
        zoomInText: '+',
        zoomInTitle: 'Zoom in',
        zoomOutText: '-',
        zoomOutTitle: 'Zoom out'
    },
    onAdd: function() {
        var zoomName = 'leaflet-control-zoom'
        var container = DomUtil.create('div', zoomName + ' leaflet-bar')
        var options = this.options

        this._zoomInButton = this._createButton(options.zoomInText, options.zoomInTitle, zoomName+'-in', container, this._zoomIn)
        this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle, zoomName+'-out', container, this._zoomOut)

        return container
    },

    _zoomIn: function() {
        	var newZoom = this._map.zoom + 1
			this._map.setZoom(newZoom)
    },

    _zoomOut: function() {
        var newZoom = this._map.zoom - 1
        this._map.setZoom(newZoom)
    },

    _createButton: function(html, title, className, container, fn) {

        var link = DomUtil.create('a', className, container)

        link.innerHTML = html
        link.href = '#'
        link.title = title

        DomEvent.disableClickPropagation(link)
        DomEvent.on(link, 'click', fn, this)

        return link
    }


})


export {Zoom}