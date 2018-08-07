/**
 * Tobi
 *
 * @author rqrauhvmra
 * @version 1.5.4
 * @url https://github.com/rqrauhvmra/Tobi
 *
 * MIT License
 */
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(factory)
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory()
	} else {
		// Browser globals (root is window)
		root.Tobi = factory()
	}
}(this, function () {
	'use strict'

	var Tobi = function Tobi(userOptions) {

		/**
		 * Global variables
		 *
		 */
		var config = {},
				transformProperty = null,
				gallery = [],
				x = 0,
				elements = null,
				elementsLength = null,
				sliderElements = [],
				currentIndex = 0,
				drag = {},
				pointerDown = false,
				lastFocus = null

		/*
		 * Create lightbox components
		 *
		 */
		var overlay = document.createElement('div')
		overlay.setAttribute('role', 'dialog')
		overlay.setAttribute('aria-hidden', 'true')
		overlay.classList.add('tobi-overlay')
		document.getElementsByTagName('body')[0].appendChild(overlay)

		var slider = document.createElement('div')
		slider.classList.add('tobi-slider')
		overlay.appendChild(slider)

		var prevButton = document.createElement('button')
		prevButton.setAttribute('type', 'button')
		prevButton.setAttribute('aria-label', 'Previous')
		overlay.appendChild(prevButton)

		var nextButton = document.createElement('button')
		nextButton.setAttribute('type', 'button')
		nextButton.setAttribute('aria-label', 'Next')
		overlay.appendChild(nextButton)

		var closeButton = document.createElement('button')
		closeButton.setAttribute('type', 'button')
		closeButton.setAttribute('aria-label', 'Close')
		overlay.appendChild(closeButton)

		var counter = document.createElement('div')
		counter.classList.add('tobi-counter')
		overlay.appendChild(counter)

		/**
		 * types - you can add new type to support something new
		 */
		var supportedElements = {
			
			//------------------------------------------------------------------
			
			image: {
				checkSupport: function (element) {
					return (element.href.match(/\.(png|jpg|tiff|tif|gif|bmp|webp|svg|ico)$/) != null);
				},
				init: function(element, container){
					var image = document.createElement('img');
					image.style.opacity = '0';

					if (element.getElementsByTagName('img')[0] && element.getElementsByTagName('img')[0].alt) {
						image.alt = element.getElementsByTagName('img')[0].alt;
					}
					else {
						image.alt = '';
					}

					image.setAttribute('src', '');
					image.setAttribute('data-src', element.href);

					// Add image to figure
					container.appendChild(image);
							
					//register type
					container.setAttribute('data-type', 'image');
					
					// Create figcaption
					if (config.captions) {
						var figcaption = document.createElement('figcaption');
						figcaption.style.opacity = '0';

						if (config.captionsSelector === 'self' && element.getAttribute(config.captionAttribute)) {
							figcaption.innerHTML = element.getAttribute(config.captionAttribute);
						} else if (config.captionsSelector === 'img' && element.getElementsByTagName('img')[0] && element.getElementsByTagName('img')[0].getAttribute(config.captionAttribute)) {
							figcaption.innerHTML = element.getElementsByTagName('img')[0].getAttribute(config.captionAttribute);
						}

						if (figcaption.innerHTML) {
							figcaption.id = 'tobi-figcaption-' + x;
							container.appendChild(figcaption);

							image.setAttribute('aria-labelledby', figcaption.id);
						}
					}
				},
				onPreload: function (container) {
					//same as preload
					supportedElements.image.onLoad(container);
				},
				onLoad: function (container) {
					var image = container.getElementsByTagName('img')[0];
					if (!image.hasAttribute('data-src'))
						return;
					var figcaption = container.getElementsByTagName('figcaption')[0];
					var loader_html = document.createElement("div");
					loader_html.classList.add('tobi-loader');
					container.appendChild(loader_html);
					
					image.onload = function () {
						var loader = container.querySelector('.tobi-loader');
						container.removeChild(loader);
						image.style.opacity = '1';

						if (figcaption) {
							figcaption.style.opacity = '1';
						}
					};

					image.setAttribute('src', image.getAttribute('data-src'));
					image.removeAttribute('data-src');
				},
				onLeave: function (container) {
					//nothing
				},
			},
			
			//------------------------------------------------------------------
			
			youtube: {
				checkSupport: function (element) {
					var targetDomain = extractHostname(element.href);
					if (targetDomain == 'www.youtube.com')
						return true;
					else
						return false;
				},
				init: function(element, container){
					//create youtube video
					var iframe = document.createElement('iframe');
					var href = element.href;
					if (href.indexOf('?') === -1)
						href = href + '?param=false';
					href = href + '&enablejsapi=1';

					//find iframe dimensions
					var w_screen = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
					var h_screen = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

					var w = 1280;
					if (element.hasAttribute('data-width'))
						w = element.getAttribute('data-width');
					if (w > w_screen)
						w = w_screen;

					var h = 720;
					if (element.hasAttribute('data-height'))
						h = element.getAttribute('data-height');
					if (h > h_screen)
						h = h_screen;

					iframe.setAttribute('width', w);
					iframe.setAttribute('height', h);
					iframe.setAttribute('frameborder', '0');
					iframe.setAttribute('allow', 'autoplay; encrypted-media');
					iframe.setAttribute('allowfullscreen', '');

					iframe.style.opacity = '0';
					iframe.setAttribute('src', '');
					iframe.setAttribute('data-src', href);

					// Add image to figure
					container.appendChild(iframe);
					
					//register type
					container.setAttribute('data-type', 'youtube');
				},
				onPreload: function (container) {
					//nothing
				},
				onLoad: function (container) {		
					var iframe = container.getElementsByTagName('iframe')[0];
					iframe.style.opacity = '1';
					var figcaption = container.getElementsByTagName('figcaption')[0];
					if (figcaption) {
						figcaption.style.opacity = '1';
					}
					iframe.setAttribute('src', iframe.getAttribute('data-src'));
				},
				onLeave: function (container) {
					var video = container.getElementsByTagName('iframe')[0];
					video.setAttribute('src', '');
				},
			},
			
			//------------------------------------------------------------------
			
			iframe: {
				checkSupport: function (element) {
					if (element.hasAttribute('data-type') && element.getAttribute('data-type') == 'iframe')
						return true;
					else
						return false;
				},
				init: function(element, container){
					//create iframe
					var iframe = document.createElement('iframe');
					var href = element.href;

					//find iframe dimensions
					var w_screen = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
					var h_screen = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

					var w = 1280;
					if (element.hasAttribute('data-width'))
						w = element.getAttribute('data-width');
					if (w > w_screen)
						w = w_screen;

					var h = 720;
					if (element.hasAttribute('data-height'))
						h = element.getAttribute('data-height');
					if (h > h_screen)
						h = h_screen;

					iframe.setAttribute('width', w);
					iframe.setAttribute('height', h);
					iframe.setAttribute('frameborder', '0');

					iframe.style.opacity = '0';
					iframe.setAttribute('src', '');
					iframe.setAttribute('data-src', href);

					// Add image to figure
					container.appendChild(iframe);
					
							
					//register type
					container.setAttribute('data-type', 'iframe');
				},
				onPreload: function (container) {
					//nothing
				},
				onLoad: function (container) {
					var iframe = container.getElementsByTagName('iframe')[0];
					iframe.style.opacity = '1';
					var figcaption = container.getElementsByTagName('figcaption')[0];
					if (figcaption) {
						figcaption.style.opacity = '1';
					}
					iframe.setAttribute('src', iframe.getAttribute('data-src'));
				},
				onLeave: function (container) {
					var video = container.getElementsByTagName('iframe')[0];
					video.setAttribute('src', '');
				},
			},
			
			//------------------------------------------------------------------
			
			html: {
				checkSupport: function (element) {
					if (element.hasAttribute('data-type') && element.getAttribute('data-type') == 'html')
						return true;
					else
						return false;
				},
				init: function(element, container){
					//create content
					var div = document.createElement('div');
					div.classList.add('tobi-html');
					var target_selector = element.getAttribute('data-target');
					var target = document.querySelector(target_selector);
					if(target == undefined){
						console.log('Can not find target: ' + target_selector);
						return;
					}
			
					div.style.opacity = '0';
					div.innerHTML = target.innerHTML;

					// Add image to figure
					container.appendChild(div);
							
					//register type
					container.setAttribute('data-type', 'html');
				},
				onPreload: function (container) {
					//nothing
				},
				onLoad: function (container) {
					var div = container.querySelector('.tobi-html');
					div.style.opacity = '1';
					var figcaption = container.getElementsByTagName('figcaption')[0];
					if (figcaption) {
						figcaption.style.opacity = '1';
					}
				},
				onLeave: function (container) {
					var video = container.querySelector('video');
					if(video != undefined){
						//stop if video was found
						video.pause();
					}
				},
			},
			
			//------------------------------------------------------------------
			
		};

		/**
		 * Init
		 *
		 */
		var init = function init(userOptions) {
			// Merge user options into defaults
			config = mergeOptions(userOptions)

			// Transform property supported by client
			transformProperty = transformSupport()

			// Get a list of all elements within the document
			elements = document.querySelectorAll(config.selector)

			// Saves the number of elements
			elementsLength = elements.length

			if (!elementsLength) {
				console.log('Ups, I can\'t find the selector ' + config.selector + '.')
				return
			}

			// Execute a few things once per element
			[].forEach.call(elements, function (element) {
				initElement(element)
			})
		}

		/**
		 * Init element
		 *
		 */
		var initElement = function initElement(element) {
			if (gallery.indexOf(element) === -1) {
				gallery.push(element)
				element.classList.add('tobi')

				// Set zoom icon if necessary
				if (config.zoom && element.getElementsByTagName('img')[0]) {
					var tobiZoom = document.createElement('div')

					tobiZoom.classList.add('tobi__zoom-icon')
					tobiZoom.innerHTML = config.zoomText

					element.classList.add('tobi--zoom')
					element.appendChild(tobiZoom)
				}

				// Bind click event handler
				element.addEventListener('click', function (event) {
					event.preventDefault()

					openOverlay(gallery.indexOf(this))
				})

				// Add element to gallery
				createOverlay(element)
			}
		}

		/**
		 * Create overlay
		 *
		 */
		var createOverlay = function createOverlay(element) {
			var sliderElement = null,
					figureWrapper = null,
					figure = null;

			sliderElement = document.createElement('div');
			sliderElement.classList.add('tobi-slide');

			// Create figure wrapper
			figureWrapper = document.createElement('div');
			figureWrapper.classList.add('tobi-figure-wrapper');

			// Create figure
			figure = document.createElement('figure');
			figure.classList.add('tobi-figure');
			
			//detect type
			for(var i in supportedElements){
				if(supportedElements[i].checkSupport(element) == true){
					//found it
					
					//init
					supportedElements[i].init(element, figure);
					break;
				}
			}

			// Add figure to figure wrapper
			figureWrapper.appendChild(figure);

			// Add figure wrapper to slider element
			sliderElement.appendChild(figureWrapper);

			// Add slider element to slider
			slider.appendChild(sliderElement);
			sliderElements.push(sliderElement);

			++x;

			// Hide buttons if necessary
			if (!config.nav || elementsLength === 1 || (config.nav === 'auto' && 'ontouchstart' in window)) {
				prevButton.setAttribute('aria-hidden', 'true');
				nextButton.setAttribute('aria-hidden', 'true');
			} else {
				prevButton.setAttribute('aria-hidden', 'false');
				nextButton.setAttribute('aria-hidden', 'false');
				prevButton.innerHTML = config.navText[0];
				nextButton.innerHTML = config.navText[1];
			}

			// Hide counter if necessary
			if (!config.counter || elementsLength === 1) {
				counter.setAttribute('aria-hidden', 'true');
			} else {
				counter.setAttribute('aria-hidden', 'false');
			}

			// Hide close if necessary
			if (!config.close) {
				closeButton.setAttribute('aria-hidden', 'true');
			} else {
				closeButton.innerHTML = config.closeText;
			}

			if (config.draggable) {
				slider.style.cursor = '-webkit-grab';
			}
		}

		/**
		 * Open overlay
		 *
		 * @param {number} index - Item index to load
		 */
		var openOverlay = function openOverlay(index) {
			if (overlay.getAttribute('aria-hidden') === 'false') {
				return
			}

			if (!config.scroll) {
				document.documentElement.classList.add('tobi--is-open')
				document.body.classList.add('tobi--is-open')
			}

			// Save last focused element
			lastFocus = document.activeElement

			// Set current index
			currentIndex = index

			// Clear drag
			clearDrag()

			// Bind events
			bindEvents()

			// Load image
			load(currentIndex);
			preload(currentIndex + 1);
			preload(currentIndex - 1);

			updateOffset()
			updateCounter()
			overlay.setAttribute('aria-hidden', 'false')

			updateFocus()
		}

		/**
		 * Close overlay
		 *
		 */
		var closeOverlay = function closeOverlay() {
			if (overlay.getAttribute('aria-hidden') === 'true') {
				return
			}

			if (!config.scroll) {
				document.documentElement.classList.remove('tobi--is-open')
				document.body.classList.remove('tobi--is-open')
			}

			// Unbind events
			unbindEvents()

			overlay.setAttribute('aria-hidden', 'true')

			// Focus
			lastFocus.focus()
		}
		
		/**
		 * Load resource
		 */
		var preload = function preload(index, callback, current) {
			if(sliderElements[index] == undefined)
				return;
			var container = sliderElements[index].querySelector('figure');
			var type = container.getAttribute('data-type');
			supportedElements[type].onPreload(container);
		}
		
		/**
		 * preload resource
		 */
		var load = function load(index, callback, current) {
			if(sliderElements[index] == undefined)
				return;
			var container = sliderElements[index].querySelector('figure');
			var type = container.getAttribute('data-type');
			supportedElements[type].onLoad(container);
		}
		
		/**
		 * will be called when closing lightbox or moving index
		 */
		var onElemenstLeave = function onElemenstLeave() {
			//call leave action
			for (var index = 0; index < sliderElements.length; index++) {
				var container = sliderElements[index].querySelector('figure');
				var type = container.getAttribute('data-type');
				supportedElements[type].onLeave(container);
			}
		}

		/**
		 * Merge default options with user options
		 *
		 * @param {Object} userOptions - User options
		 * @returns {Object} - Custom options
		 */
		var mergeOptions = function mergeOptions(userOptions) {
			// Default options
			var options = {
				selector: '.lightbox',
				captions: true,
				captionsSelector: 'img',
				captionAttribute: 'alt',
				nav: 'auto',
				navText: ['&lsaquo;', '&rsaquo;'],
				close: true,
				closeText: '&times;',
				counter: true,
				keyboard: true,
				zoom: true,
				zoomText: '&plus;',
				docClose: true,
				swipeClose: true,
				scroll: false,
				draggable: true,
				threshold: 20
			}

			if (userOptions) {
				Object.keys(userOptions).forEach(function (key) {
					options[key] = userOptions[key]
				})
			}

			return options
		}

		/**
		 * Determine if browser supports unprefixed transform property
		 *
		 * @returns {string} - Transform property supported by client
		 */
		var transformSupport = function transformSupport() {
			var div = document.documentElement.style

			if (typeof div.transform === 'string') {
				return 'transform'
			}
			return 'WebkitTransform'
		}

		/**
		 * Update the offset
		 *
		 */
		var updateOffset = function updateOffset() {
			var offset = -currentIndex * 100 + '%'

			slider.style[transformProperty] = 'translate3d(' + offset + ', 0, 0)'
		}

		/**
		 * Update the counter
		 *
		 */
		var updateCounter = function updateCounter() {
			counter.innerHTML = (currentIndex + 1) + '/' + elementsLength
		}

		/**
		 * Set the focus to the next element
		 *
		 */
		var updateFocus = function updateFocus(direction) {
			if (config.nav) {
				prevButton.disabled = false
				nextButton.disabled = false

				if (currentIndex === elementsLength - 1) {
					nextButton.disabled = true
				} else if (currentIndex === 0) {
					prevButton.disabled = true
				}

				if (!direction && !nextButton.disabled) {
					nextButton.focus()
				} else if (!direction && nextButton.disabled && !prevButton.disabled) {
					prevButton.focus()
				} else if (!nextButton.disabled && direction === 'right') {
					nextButton.focus()
				} else if (nextButton.disabled && direction === 'right' && !prevButton.disabled) {
					prevButton.focus()
				} else if (!prevButton.disabled && direction === 'left') {
					prevButton.focus()
				} else if (prevButton.disabled && direction === 'left' && !nextButton.disabled) {
					nextButton.focus()
				}
			} else if (config.close) {
				closeButton.focus()
			}
		}

		/**
		 * Go to next image
		 *
		 */
		var next = function next() {
			//if not last
			if (currentIndex != sliderElements.length - 1) {
				onElemenstLeave();
			}

			if (currentIndex < elementsLength - 1) {
				currentIndex++

				updateOffset()
				updateCounter()
				updateFocus('right')

				load(currentIndex)
				preload(currentIndex + 1)
			}
		}

		/**
		 * Go to previous image
		 *
		 */
		var prev = function prev() {
			//if not first
			if (currentIndex > 0) {
				onElemenstLeave();
			}

			if (currentIndex > 0) {
				currentIndex--

				updateOffset()
				updateCounter()
				updateFocus('left')

				load(currentIndex)
				preload(currentIndex - 1)
			}
		}

		/**
		 * extract host name from url
		 */
		var extractHostname = function (url) {
			var hostname;
			if (url.indexOf("//") > -1) {
				hostname = url.split('/')[2];
			} else {
				hostname = url.split('/')[0];
			}

			//find & remove port number
			hostname = hostname.split(':')[0];
			//find & remove "?"
			hostname = hostname.split('?')[0];

			return hostname;
		}

		/**
		 * Clear drag after touchend
		 *
		 */
		var clearDrag = function clearDrag() {
			drag = {
				startX: 0,
				endX: 0,
				startY: 0,
				endY: 0
			}
		}

		/**
		 * Recalculate drag event
		 *
		 */
		var updateAfterDrag = function updateAfterDrag() {
			var movementX = drag.endX - drag.startX,
					movementY = drag.endY - drag.startY,
					movementXDistance = Math.abs(movementX),
					movementYDistance = Math.abs(movementY)

			if (movementX > 0 && movementXDistance > config.threshold) {
				prev()
			} else if (movementX < 0 && movementXDistance > config.threshold) {
				next()
			} else if (movementY < 0 && movementYDistance > config.threshold && config.swipeClose) {
				closeOverlay()
			}
		}

		/**
		 * click event handler
		 *
		 */
		var clickHandler = function clickHandler(event) {
			if (event.target === prevButton) {
				prev()
			} else if (event.target === nextButton) {
				next()
			} else if (event.target === closeButton || (event.target.classList.contains('tobi-figure-wrapper') && !event.target.classList.contains('tobi-figure'))) {
				closeOverlay()
			}

			event.stopPropagation()
		}

		/**
		 * keydown event handler
		 *
		 */
		var keydownHandler = function keydownHandler(event) {
			switch (event.keyCode) {
				// Left arrow
				case 37:
					prev()
					break

					// Right arrow
				case 39:
					next()
					break

					// Esc
				case 27:
					closeOverlay()
					break
			}
		}

		/**
		 * touchstart event handler
		 *
		 */
		var touchstartHandler = function touchstartHandler(event) {
			event.stopPropagation()

			pointerDown = true

			drag.startX = event.touches[0].pageX
			drag.startY = event.touches[0].pageY
		}

		/**
		 * touchmove event handler
		 *
		 */
		var touchmoveHandler = function touchmoveHandler(event) {
			event.preventDefault()
			event.stopPropagation()

			if (pointerDown) {
				drag.endX = event.touches[0].pageX
				drag.endY = event.touches[0].pageY
			}
		}

		/**
		 * touchend event handler
		 *
		 */
		var touchendHandler = function touchendHandler(event) {
			event.stopPropagation()

			pointerDown = false

			if (drag.endX) {
				updateAfterDrag()
			}

			clearDrag()
		}

		/**
		 * mousedown event handler
		 *
		 */
		var mousedownHandler = function mousedownHandler(event) {
			event.preventDefault()
			event.stopPropagation()

			pointerDown = true
			drag.startX = event.pageX
			slider.style.cursor = '-webkit-grabbing'
		}

		/**
		 * mouseup event handler
		 *
		 */
		var mouseupHandler = function mouseupHandler(event) {
			event.stopPropagation()

			pointerDown = false
			slider.style.cursor = '-webkit-grab'

			if (drag.endX) {
				updateAfterDrag()
			}

			clearDrag()
		}

		/**
		 * mousemove event handler
		 *
		 */
		var mousemoveHandler = function mousemoveHandler(event) {
			event.preventDefault()

			if (pointerDown) {
				drag.endX = event.pageX
				slider.style.cursor = '-webkit-grabbing'
			}
		}

		/**
		 * mouseleave event handler
		 *
		 */
		var mouseleaveHandler = function mouseleaveHandler(event) {
			if (pointerDown) {
				pointerDown = false
				slider.style.cursor = '-webkit-grab'
				drag.endX = event.pageX

				updateAfterDrag()
				clearDrag()
			}
		}

		/**
		 * Keep focus inside the lightbox
		 *
		 */
		var trapFocus = function trapFocus(event) {
			if (overlay.getAttribute('aria-hidden') === 'false' && !overlay.contains(event.target)) {
				event.stopPropagation()
				updateFocus()
			}
		}

		/**
		 * Bind events
		 *
		 */
		var bindEvents = function bindEvents() {
			if (config.keyboard) {
				document.addEventListener('keydown', keydownHandler)
			}

			if (config.docClose) {
				overlay.addEventListener('click', clickHandler)
			}

			prevButton.addEventListener('click', clickHandler)
			nextButton.addEventListener('click', clickHandler)
			closeButton.addEventListener('click', clickHandler)

			if (config.draggable) {
				// Touch events
				overlay.addEventListener('touchstart', touchstartHandler)
				overlay.addEventListener('touchmove', touchmoveHandler)
				overlay.addEventListener('touchend', touchendHandler)

				// Mouse events
				overlay.addEventListener('mousedown', mousedownHandler)
				overlay.addEventListener('mouseup', mouseupHandler)
				overlay.addEventListener('mouseleave', mouseleaveHandler)
				overlay.addEventListener('mousemove', mousemoveHandler)
			}

			document.addEventListener('focus', trapFocus, true)
		}

		/**
		 * Unbind events
		 *
		 */
		var unbindEvents = function unbindEvents() {
			if (config.keyboard) {
				document.removeEventListener('keydown', keydownHandler)
			}

			if (config.docClose) {
				overlay.removeEventListener('click', clickHandler)
			}

			prevButton.removeEventListener('click', clickHandler)
			nextButton.removeEventListener('click', clickHandler)
			closeButton.removeEventListener('click', clickHandler)

			if (config.draggable) {
				// Touch events
				overlay.removeEventListener('touchstart', touchstartHandler)
				overlay.removeEventListener('touchmove', touchmoveHandler)
				overlay.removeEventListener('touchend', touchendHandler)

				// Mouse events
				overlay.removeEventListener('mousedown', mousedownHandler)
				overlay.removeEventListener('mouseup', mouseupHandler)
				overlay.removeEventListener('mouseleave', mouseleaveHandler)
				overlay.removeEventListener('mousemove', mousemoveHandler)
			}

			document.removeEventListener('focus', trapFocus)

			onElemenstLeave();
		}

		/**
		 * Adds an element dynamically
		 *
		 */
		var add = function add(element) {
			initElement(element)
			elementsLength++
		}

		init(userOptions);

		return {
			prev: prev,
			next: next,
			open: openOverlay,
			close: closeOverlay,
			add: add
		};
	};

	return Tobi;
}))
