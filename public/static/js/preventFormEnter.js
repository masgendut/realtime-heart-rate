document.querySelector('form').onkeypress = function(e) {
	e = e || event;
	const txtArea = /textarea/i.test((e.target || e.srcElement).tagName);
	return txtArea || (e.keyCode || e.which || e.charCode || 0) !== 13;
};