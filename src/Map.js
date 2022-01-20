
import * as DomUtil from './dom/DomUtil'
import * as DomEvent from './dom/DomEvent'
import * as Util from './core/Util'
import {EPSG3857} from './geo/crs/CRS.EPSG3857'
import {Point, toPoint} from './geometry/Point'
import {LatLng, toLatLng} from './geo/LatLng';
import * as Browser from './core/Browser'

import {Bounds} from './geometry/Bounds'
import {Draggable} from './Draggable'

import {Zoom} from './Control.Zoom'

function Map(id) {
    this.name = 'map'
    this.initialize(id)
}

Map.prototype = {
    
    // htmlelement
    // 建立地图容器
    // 在地图容器中建立定位图层
    // 在定位图层中建立瓦片图层
    // 在瓦片图层中添加 具体瓦片图层
    // 在 具体瓦片图层 中为每个level建立一个level 
    // 在level中加载瓦片
    crs: EPSG3857,

	center: new LatLng(23.5, 114),
	
	maxZoom: 18,

	zoom: 6,


	setView: function(center, zoom) {
		this._invalidateAll()
		this.center = toLatLng(center) 
		this.zoom = zoom
		this._setView(center, zoom)
	},


	_invalidateAll: function () {
		for (var z in this._levels) {
			DomUtil.remove(this._levels[z].el);
			// this._onRemoveLevel(z);
			delete this._levels[z];
		}
		this._removeAllTiles();

		this._tileZoom = undefined;
	},

	/**
	 * 拿到经纬度对应的像素坐标
	 * 经纬度 -> 投影坐标 -> 像素坐标
	 */
    project: function(latlng, zoom) {
        
        return this.crs.latLngToPoint(toLatLng(latlng), zoom)
    },

	/**
	 * 像素坐标 -> 投影坐标 -> 经纬度
	 */
    unproject: function(point, zoom) {
        return this.crs.pointToLatLng(toPoint(point), zoom)
    },

    getSize: function() {
        this._size = new Point(
            this._container.clientWidth || 0,
            this._container.clientHeight || 0
        )

        return this._size.clone()
    },

    _getMapPanePos: function () {
		// console.log('mappane:', DomUtil.getPosition(this._mapPane))
		return DomUtil.getPosition(this._mapPane) || new Point(0, 0);
	},

    _getNewPixelOrigin: function(center, zoom) {
        center = this.center
        zoom = this.zoom    
        var viewHalf = this.getSize()._divideBy(2)
        
        this._pixelOrigin = this.project(center, zoom)._subtract(viewHalf)._add(this._getMapPanePos())._round()        
        return this.project(center, zoom)._subtract(viewHalf)._add(this._getMapPanePos())._round()        
    },

    getPixelOrigin: function() {
		if(!this._pixelOrigin) {
			this._pixelOrigin = this._getNewPixelOrigin()	
		}
        
        return this._pixelOrigin
    },


    initialize: function(id) {
		var me = this
		this._container = DomUtil.get(id)
		
		DomUtil.addClass(this._container, 'leaflet-container')

        this._mapPane = DomUtil.create('div', '', this._container)
        
        this.tilePane = DomUtil.create('div', '', this._mapPane)

        this.myTilePane = DomUtil.create('div', '')

        this.tilePane.appendChild(this.myTilePane)

		var dragObj = new Draggable(this._mapPane, this._container)
		dragObj.enable()

		
		dragObj.on('dragend', function(e) {
			// console.log(e.distance)
			// console.log(me.getCenter(), me.zoom)
			me.setView(me.getCenter(), me.zoom)
			
		})




		// var btnDown = DomUtil.get('btn-down')
		// var btnUp = DomUtil.get('btn-up')
		// DomEvent.on(btnDown, 'click', function() {
			
		// 	var newZoom = me.zoom - 1
		// 	me.setZoom(newZoom)
		// 	console.log('down')
		// })
		// DomEvent.on(btnUp, 'click', function() {
			
		// 	var newZoom = me.zoom + 1
		// 	me.setZoom(newZoom)
		// 	console.log('up')
		// })




		this._initControlPos()

        this._levels = {}
        this._tiles = {}

		this._setView(this.center, this.zoom)
		
		var zoomControl = new Zoom()
		zoomControl.addTo(this)

	},

	_keyToTileCoords: function (key) {
		var k = key.split(':'),
		    coords = new Point(+k[0], +k[1]);
		coords.z = +k[2];
		return coords;
	},

	_removeTile: function (key) {
		var tile = this._tiles[key];
		if (!tile) { return; }

		// Cancels any pending http requests associated with the tile
		// unless we're on Android's stock browser,
		// see https://github.com/Leaflet/Leaflet/issues/137
		if (!Browser.androidStock) {
			tile.el.setAttribute('src', Util.emptyImageUrl);
		}
		DomUtil.remove(tile.el);

		delete this._tiles[key];

		// @event tileunload: TileEvent
		// Fired when a tile is removed (e.g. when a tile goes off the screen).
		// this.fire('tileunload', {
		// 	tile: tile.el,
		// 	coords: this._keyToTileCoords(key)
		// });
	},
	
	_removeTilesAtZoom: function (zoom) {
		for (var key in this._tiles) {
			if (this._tiles[key].coords.z !== zoom) {
				continue;
			}
			this._removeTile(key);
		}
	},

    _updateLevels: function() {
        var zoom = this._tileZoom

		var level = this._levels[zoom]
		
		for (var z in this._levels) {
			if (this._levels[z].el.children.length || z === zoom) {
				this._levels[z].el.style.zIndex = this.maxZoom - Math.abs(z-zoom)
			} else {
				DomUtil.remove(this._levels[z].el)
				this._removeTilesAtZoom(z)
				delete this._levels[z]
			}
		}

        if (!level) {
            level = this._levels[zoom] = {}
            
            level.el = DomUtil.create('div', '', this.myTilePane)
            level.el.style.zIndex = this.maxZoom;            
            level.origin =  this.project(this.unproject(this.getPixelOrigin(), zoom), zoom).round()
            // console.log(level.origin)
            level.zoom = zoom
            
            console.log(this.getCenter())
            this._setZoomTransform(level, this.getCenter(), this._tileZoom)
        }

        this._level = level
        return level
	},
	
	setZoom: function(newZoom) {
		this.zoom = newZoom
		this._getNewPixelOrigin()
		console.log(this.zoom)
		console.log(this.getCenter())
		this.setView(this.getCenter(), this.zoom)

		

	},

    _setZoomTransform: function (level, center, zoom) {
		/**
		 * 在layer pane中定位level的el
		 */


        // var scale = this._map.getZoomScale(zoom, level.zoom),
        var scale = 1,
		    translate = level.origin.multiplyBy(scale)
		        .subtract(this._getNewPixelOrigin(center, zoom)).round();
        console.log(translate)
		if (Browser.any3d) {
			DomUtil.setTransform(level.el, translate, scale);
		} else {
			DomUtil.setPosition(level.el, translate);
		}
	},

    containerPointToLayerPoint: function (point) { // (Point)

		/**
		 * 将相对于地图容器元素原点的浏览器坐标， 转化为相对于定位 pane容器元素原点的浏览器坐标
		 */

		return toPoint(point).subtract(this._getMapPanePos());
    },
    
    getCenter: function () {

		/**
		 * 获得地图容器html元素中心的地理坐标
		 * 1. 将地图html元素中的浏览器坐标，转化为layer pane元素中的浏览器坐标
		 * 2. 获得layer pane元素左上角的像素坐标， 加上点在layer pane中的浏览器坐标， 获得点的像素坐标
		 * 3. 将像素坐标根据zoom转为投影坐标， 再转为地理坐标
		 */

		var center = this.layerPointToLatLng(this._getCenterLayerPoint());
		console.log('get center', center)
		return center
    },

    layerPointToLatLng: function (point) {
		var projectedPoint = toPoint(point).add(this.getPixelOrigin());
		return this.unproject(projectedPoint, this.zoom);
	},
    
    _getCenterLayerPoint: function () {
		/**
		 * 获得地图容器元素中心点， 在定位 pane中的浏览器坐标
		 */
		return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
	},

    _setView: function(center, zoom) {
        var tileZoom = zoom
        var tileZoomChanged = tileZoom != this._tileZoom

        if (true) {
            this._tileZoom = tileZoom

			/*
				updateLevels做了什么？

			*/
            this._updateLevels()
            this._resetGrid()
            this._update(this.center)
        }        
	},

	_wrapCoords: function(coords) {
		var newCoords = new Point(
			this._wrapX ? Util.wrapNum(coords.x, this._wrapX) : coords.x,
			this._wrapY ? Util.wrapNum(coords.y, this._wrapY) : coords.y);
		newCoords.z = coords.z;
		return newCoords;
	},
	
	_resetGrid: function() {
		var tileZoom = this._tileZoom
		var tileSize = this.getTileSize()
		var crs = this.crs

		this._wrapX = crs.wrapLng && [
			Math.floor(this.project([0, crs.wrapLng[0]], tileZoom).x / tileSize.x),
			Math.ceil(this.project([0, crs.wrapLng[1]], tileZoom).x / tileSize.y)
		];
		this._wrapY = crs.wrapLat && [
			Math.floor(this.project([crs.wrapLat[0], 0], tileZoom).y / tileSize.x),
			Math.ceil(this.project([crs.wrapLat[1], 0], tileZoom).y / tileSize.y)
		];
	},

    _getTiledPixelBounds: function (center) {

		/*
			返回地图容器html元素在当前的缩放级别下， 所对应的像素坐标范围。
		*/		



        var scale = 1
        
		var pixelCenter = this.project(center, this.zoom).floor()
        var halfSize = this.getSize().divideBy(scale * 2);

		return new Bounds(pixelCenter.subtract(halfSize), pixelCenter.add(halfSize));
    },
    
    _pxBoundsToTileRange: function (bounds) {

		/*
			将像素坐标范围， 转换为瓦片号范围
		 */


		var tileSize = this.getTileSize();
		return new Bounds(
			bounds.min.unscaleBy(tileSize).floor(),
			bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1]));
	},

	_tileCoordsToKey: function (coords) {
		/*
			将瓦片的坐标， x,y,z转化为键用于索引
		*/
		return coords.x + ':' + coords.y + ':' + coords.z;
	},

    _update: function(center) {
        var pixelBounds = this._getTiledPixelBounds(center),
        tileRange = this._pxBoundsToTileRange(pixelBounds),
        tileCenter = tileRange.getCenter(),
		queue = [],
		margin = this.keepBuffer,
		noPruneRange = new Bounds(tileRange.getBottomLeft().subtract([margin, -margin]),
								tileRange.getTopRight().add([margin, -margin]));
		
		for (var key in this._tiles) {
			var c = this._tiles[key].coords;
			if (c.z != this._tileZoom || !noPruneRange.contains(new Point(c.x, c.y))) {
				// 不是在当前显示范围的瓦片（缩放级别不一致或者xy不在显示范围内）
				this._tiles[key].current = false
			}
		}





        // console.log(pixelBounds)
        // console.log(tileRange)
        // console.log(tileCenter)

        for (var j = tileRange.min.y; j <= tileRange.max.y; j++) {
			for (var i = tileRange.min.x; i <= tileRange.max.x; i++) {
				var coords = new Point(i, j);
				coords.z = this._tileZoom;

				// if (!this._isValidTile(coords)) { continue; }

				var tile = this._tiles[this._tileCoordsToKey(coords)];
				if (tile) {
					// 瓦片已经缓存， 将瓦片的状态设置为可用
					tile.current = true;
				} else {
					// 瓦片未下载， 保存下载地址
					queue.push(coords);
                }
                                
			}
        }
        
        queue.sort(function (a, b) {
			return a.distanceTo(tileCenter) - b.distanceTo(tileCenter);
        });

        // console.log(queue)
        
        if (queue.length !== 0) {
			// if it's the first batch of tiles to load
			// if (!this._loading) {
			// 	this._loading = true;
			// 	// @event loading: Event
			// 	// Fired when the grid layer starts loading tiles.
			// 	this.fire('loading');
			// }

			// create DOM fragment to append tiles in one batch
			var fragment = document.createDocumentFragment();

			for (i = 0; i < queue.length; i++) {
				this._addTile(queue[i], fragment);
			}

			this._level.el.appendChild(fragment);
		}


    },

    getTileSize: function() {
        return new Point(256, 256)
    },

    _getTilePos: function (coords) {
		/*
			返回瓦片图片左上角在浏览器上的坐标

			将瓦片的像素坐标减去level的原点的像素坐标， 既可以得到， 瓦片在level中的浏览器坐标

		*/
		return coords.scaleBy(this.getTileSize()).subtract(this._level.origin);
    },

    subdomains: ['a', 'b', 'c'],

    _getSubdomain: function (tilePoint) {
		var index = Math.abs(tilePoint.x + tilePoint.y) % this.subdomains.length;
		return this.subdomains[index];
    },
    
    _getZoomForUrl: function() {
        return this.zoom
    },

    // 'http://a.tile.openstreetmap.org/1/1/-1.png'
    _url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',

    getTileUrl: function (coords) {
		var data = {
			r: Browser.retina ? '@2x' : '',
			s: this._getSubdomain(coords),
			x: coords.x,
			y: coords.y,
			z: this._getZoomForUrl()
        };
        
		// if (true) {
		// 	var invertedY = this._globalTileRange.max.y - coords.y;
		// 	if (this.options.tms) {
		// 		data['y'] = invertedY;
		// 	}
		// 	data['-y'] = invertedY;
		// }

		return Util.template(this._url, Util.extend(data, {}));
	},

	_tileOnLoad: function (done, tile) {
		// For https://github.com/Leaflet/Leaflet/issues/3332
		if (Browser.ielt9) {
			setTimeout(Util.bind(done, this, null, tile), 0);
		} else {
			done(null, tile);
		}
	},

	_tileOnError: function (done, tile, e) {
		// e 是 error事件传来的
		// var errorUrl = this.errorTileUrl;
		// if (errorUrl && tile.getAttribute('src') !== errorUrl) {
		// 	tile.src = errorUrl;
		// }
		done(e, tile);
	},
    
    createTile: function (coords, done) {
		var tile = document.createElement('img');

		DomEvent.on(tile, 'load', Util.bind(this._tileOnLoad, this, done, tile));
		DomEvent.on(tile, 'error', Util.bind(this._tileOnError, this, done, tile));

		// if (this.options.crossOrigin || this.options.crossOrigin === '') {
		// 	tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
		// }

		/*
		 Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
		 http://www.w3.org/TR/WCAG20-TECHS/H67
		*/
		tile.alt = '';

		/*
		 Set role="presentation" to force screen readers to ignore this
		 https://www.w3.org/TR/wai-aria/roles#textalternativecomputation
		*/
		tile.setAttribute('role', 'presentation');
		// console.log(this.getTileUrl(coords))
		tile.src = this.getTileUrl(coords);

		return tile;


		// var tile = document.createElement('div');

		// var pixelX = coords.x * 256;
		// var pixelY = coords.y * 265;
		
		// var geoP = this.unproject(toPoint(pixelX, pixelY), this.zoom);
		// console.log(geoP);
		
		// var geoX = geoP.lng;
		// var geoY = geoP.lat;

		// var proP = this.crs.project(geoP);
		// var proX = proP.x;
		// var proY = proP.y;
		// console.log(proP)

		// var pixLen = (2 * 6378137 * Math.PI) / (Math.pow(2, this.zoom) * 256)
		
		// var str = `瓦片坐标：(${coords.x},${coords.y},${this.zoom})<br/>
		// 像素坐标：(${pixelX}, ${pixelY})<br/>
		// 地理坐标：(${geoX.toFixed(4)}, ${geoY.toFixed(4)})<br/>
		// 投影坐标：(${proX.toFixed(4)}, ${proY.toFixed(4)})<br/>
		// 单位像素长度：${pixLen.toFixed(4)}<br/>
		// scale: ${this.zoom}<br/>
		// `

		// tile.innerHTML = str





		// return tile;




	},

	_fadeAnimated: false,

	_removeAllTiles: function () {
		for (var key in this._tiles) {
			this._removeTile(key);
		}
	},

	_pruneTiles: function () {
		// if (!this._map) {
		// 	return;
		// }

		var key, tile;

		// var zoom = this._map.getZoom();
		// if (zoom > this.options.maxZoom ||
		// 	zoom < this.options.minZoom) {
		// 	this._removeAllTiles();
		// 	return;
		// }

		for (key in this._tiles) {
			tile = this._tiles[key];
			tile.retain = tile.current;
		}

		for (key in this._tiles) {
			tile = this._tiles[key];
			if (tile.current && !tile.active) {
				var coords = tile.coords;
				if (!this._retainParent(coords.x, coords.y, coords.z, coords.z - 5)) {
					this._retainChildren(coords.x, coords.y, coords.z, coords.z + 2);
				}
			}
		}

		for (key in this._tiles) {
			if (!this._tiles[key].retain) {
				this._removeTile(key);
			}
		}
	},

	_tileReady: function (coords, err, tile) {
		// if (!this._map || tile.getAttribute('src') === Util.emptyImageUrl) { return; }

		if (err) {
			// @event tileerror: TileErrorEvent
			// Fired when there is an error loading a tile.
			// this.fire('tileerror', {
			// 	error: err,
			// 	tile: tile,
			// 	coords: coords
			// });
		}

		var key = this._tileCoordsToKey(coords);

		tile = this._tiles[key];
		if (!tile) { return; }

		tile.loaded = +new Date();
		if (this._fadeAnimated) {
			// DomUtil.setOpacity(tile.el, 0);
			// Util.cancelAnimFrame(this._fadeFrame);
			// this._fadeFrame = Util.requestAnimFrame(this._updateOpacity, this);
		} else {
			tile.active = true;
			// this._pruneTiles();
		}

		if (!err) {
			DomUtil.addClass(tile.el, 'leaflet-tile-loaded');

			// @event tileload: TileEvent
			// Fired when a tile loads.
			// this.fire('tileload', {
			// 	tile: tile.el,
			// 	coords: coords
			// });
		}

		// if (this._noTilesToLoad()) {
		// 	this._loading = false;
		// 	// @event load: Event
		// 	// Fired when the grid layer loaded all visible tiles.
		// 	this.fire('load');

		// 	if (Browser.ielt9 || !this._map._fadeAnimated) {
		// 		Util.requestAnimFrame(this._pruneTiles, this);
		// 	} else {
		// 		// Wait a bit more than 0.2 secs (the duration of the tile fade-in)
		// 		// to trigger a pruning.
		// 		setTimeout(Util.bind(this._pruneTiles, this), 250);
		// 	}
		// }
	},

    _addTile: function (coords, container) {

		var tilePos = this._getTilePos(coords)
		var key = this._tileCoordsToKey(coords);

		var tile = this.createTile(this._wrapCoords(coords), Util.bind(this._tileReady, this, coords));

		this._initTile(tile);

		// if createTile is defined with a second argument ("done" callback),
		// we know that tile is async and will be ready later; otherwise
		if (this.createTile.length < 2) {
			// mark tile as ready, but delay one frame for opacity animation to happen
			Util.requestAnimFrame(Util.bind(this._tileReady, this, coords, null, tile));
		}

		DomUtil.setPosition(tile, tilePos);

		// save tile in cache
		this._tiles[key] = {
			el: tile,
			coords: coords,
			current: true
		};

		container.appendChild(tile);
		// @event tileloadstart: TileEvent
		// Fired when a tile is requested and starts loading.
		// this.fire('tileloadstart', {
		// 	tile: tile,
		// 	coords: coords
		// });
	},

	_initTile: function (tile) {
		DomUtil.addClass(tile, 'leaflet-tile');

		var tileSize = this.getTileSize();
		tile.style.width = tileSize.x + 'px';
		tile.style.height = tileSize.y + 'px';
		
		tile.style.border = 'solid 1px black'

		// tile.onselectstart = Util.falseFn;
		// tile.onmousemove = Util.falseFn;

		// update opacity on tiles in IE7-8 because of filter inheritance problems
		// if (Browser.ielt9 && this.options.opacity < 1) {
		// 	DomUtil.setOpacity(tile, this.options.opacity);
		// }

		// without this hack, tiles disappear after zoom on Chrome for Android
		// https://github.com/Leaflet/Leaflet/issues/2078
		// if (Browser.android && !Browser.android23) {
		// 	tile.style.WebkitBackfaceVisibility = 'hidden';
		// }
	},


	_initControlPos: function() {
		var corners = this._controlCorners = {}
		var l = 'leaflet-'
		var container = this._controlContainer = DomUtil.create('div', l + 'control-container', this._container)

		function createCorner(vSide, hSide) {
			var className = l + vSide + ' ' + l + hSide
			corners[vSide + hSide] = DomUtil.create('div', className, container)
		}

		createCorner('top', 'left')
		createCorner('top', 'right')
		createCorner('bottom', 'left')
		createCorner('bottom', 'right')

	},



}

export {Map}