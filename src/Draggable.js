import {Evented} from './core/Events'
import * as DomEvent from './dom/DomEvent'
import { Point } from './geometry/Point'
import * as DomUtil from './dom/DomUtil'

var Draggable = Evented.extend({
    initialize: function (element, dragHandle) {
        this._element = element
        this._dragHandle = dragHandle        
    },

    enable: function() {
        if (this._enabled) {
            return
        }
        DomEvent.on(this._dragHandle, 'mousedown', this._onDown, this)
        this._enabled = true
    },


    _onDown: function(e) {
        this._moved = false
        var first = e
        this._startPoint = new Point(first.clientX, first.clientY)

        DomUtil.disableImageDrag()

        DomEvent.on(document, 'mousemove', this._onMove, this)
        DomEvent.on(document, 'mouseup', this._onUp, this)
        // console.log(this._startPoint)
    },

    _onMove: function(e) {
        var first = e
        var newPoint = new Point(first.clientX, first.clientY)
        var offset = newPoint.subtract(this._startPoint)

        if (!this._moved) {
            
            this._moved = true
            this._startPos = DomUtil.getPosition(this._element)
            
        }

        this._newPos = this._startPos.add(offset)
        this._moving = true
        this._updatePosition()
    },  

    _updatePosition: function() {
        DomUtil.setPosition(this._element, this._newPos)
    },


    _onUp: function(e) {
        this.finishDrag()
    },

    finishDrag: function() {
        DomEvent.off(document, 'mousemove', this._onMove, this)
        DomEvent.off(document, 'mouseup', this._onUp, this)
        if (this._moved && this._moving) {
            this.fire('dragend', {
                distance: this._newPos.subtract(this._startPos)
                
            })
            
        }
        this._moving = false
        
    },






 
})

export {Draggable}

