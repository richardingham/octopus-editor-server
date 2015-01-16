(function () {
  jQuery.fn.offset = function( options ) {
    if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each(function( i ) {
					jQuery.offset.setOffset( this, options, i );
				});
		}

    if ( !this.length ) return undefined;

    var 
    elem = this[ 0 ],
    rect = elem.getBoundingClientRect(),
    box = { left: rect.left, top: rect.top },
    parent;

    while ( elem ) {
      parent = elem.parentNode || elem.host;
      if (typeof parent !== "undefined" && parent.nodeType === 1) {
        box.left += parent.scrollLeft;
        box.top  += parent.scrollTop;
      }
      elem = parent;
    }

    return box;
  };
})();
