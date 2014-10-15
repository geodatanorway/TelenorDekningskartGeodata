require('leaflet');
/**
 *
 * @torgeir:
 *
 * This patches the leaflet L.Popup to make it not "dock to the bottom" of a marker,
 * but instead "dock to the top". The changes made here makes additional content added
 * to the popup expand towards the bottom of the screen, and not the top - which
 * is the default for L.popup.
 *
 * Changed lines from the leaflet source code (version 0.7.3) are
 * marked with // CHANGE HERE: and the change
 */

L.TelenorPopup = L.Popup.extend({

  _updatePosition: function () {
    if (!this._map) { return; }

    var pos = this._map.latLngToLayerPoint(this._latlng),
    animated = this._animated,
    offset = L.point(this.options.offset);

    if (animated) {
      L.DomUtil.setPosition(this._container, pos);
    }

    //
    // CHANGE HERE: changes _containerBottom to _containerTop and calculates the offset
    // from the top of the screen instead
    //
    this._containerTop = -offset.y + (animated ? 0 : pos.y);
    this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x + (animated ? 0 : pos.x);

    // bottom position the popup in case the height of the popup changes (images loading etc)

    //
    // CHANGE HERE: offset the popup from the containers .top instead of .bottom
    //
    this._container.style.top = this._containerTop + 'px';
    this._container.style.left = this._containerLeft + 'px';
  },

  _adjustPan: function () {
    if (!this.options.autoPan) { return; }

    var map = this._map,
    containerHeight = this._container.offsetHeight,
    containerWidth = this._containerWidth,

    //
    // CHANGE HERE: instead of subtracting the _containerBottom add the _containerTop, so
    // the map wil pan the the correct poision
    //
    layerPos = new L.Point(this._containerLeft, -containerHeight + this._containerTop);

    if (this._animated) {
      layerPos._add(L.DomUtil.getPosition(this._container));
    }

    var containerPos = map.layerPointToContainerPoint(layerPos),
    padding = L.point(this.options.autoPanPadding),
    paddingTL = L.point(this.options.autoPanPaddingTopLeft || padding),
    paddingBR = L.point(this.options.autoPanPaddingBottomRight || padding),
    size = map.getSize(),
    dx = 0,
    dy = 0;

    if (containerPos.x + containerWidth + paddingBR.x > size.x) { // right
      dx = containerPos.x + containerWidth - size.x + paddingBR.x;
    }
    if (containerPos.x - dx - paddingTL.x < 0) { // left
      dx = containerPos.x - paddingTL.x;
    }
    if (containerPos.y + containerHeight + paddingBR.y > size.y) { // bottom
      dy = containerPos.y + containerHeight - size.y + paddingBR.y;
    }
    if (containerPos.y - dy - paddingTL.y < 0) { // top
      dy = containerPos.y - paddingTL.y;
    }

    if (dx || dy) {
      map
      .fire('autopanstart')
      .panBy([dx, dy]);
    }
  },

});

