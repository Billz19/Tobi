/**
 * Tobi
 *
 * @author rqrauhvmra
 * @version 1.9.0
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

  const Tobi = function Tobi (userOptions) {
    /**
     * Global variables
     *
     */
    let config = {}
    let browserWindow = window
    let figcaptionId = 0
    let lightbox = null
    let prevButton = null
    let nextButton = null
    let closeButton = null
    let counter = null
    let drag = {}
    let isDraggingX = false
    let isDraggingY = false
    let pointerDown = false
    let lastFocus = null
    let firstFocusableEl = null
    let lastFocusableEl = null
    let offset = null
    let offsetTmp = null
    let resizeTicking = false
    let isYouTubeDependencieLoaded = false
    let waitingEls = []
    let player = []
    let playerId = 0
    let groupAtts = {
      gallery: [],
      slider: null,
      sliderElements: [],
      elementsLength: 0,
      currentIndex: 0,
      x: 0
    }
    let groups = {}
    let newGroup = null
    let activeGroup = null

    /**
     * Merge default options with user options
     *
     * @param {Object} userOptions - Optional user options
     * @returns {Object} - Custom options
     */
    const mergeOptions = function mergeOptions (userOptions) {
      // Default options
      const options = {
        selector: '.lightbox',
        captions: true,
        captionsSelector: 'img',
        captionAttribute: 'alt',
        nav: 'auto',
        navText: [
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewbox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 18l-6-6 6-6"/></svg>',
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewbox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 6l6 6-6 6"/></svg>'
        ],
        navLabel: [
          'Previous image',
          'Next image'
        ],
        close: true,
        closeText: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewbox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M6 18L18 6"/></svg>',
        closeLabel: 'Close lightbox',
        loadingIndicatorLabel: 'Image loading',
        counter: true,
        download: false, // TODO
        downloadText: '', // TODO
        downloadLabel: 'Download image', // TODO
        keyboard: true,
        zoom: true,
        zoomText: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 16v5h-5"/><path d="M8 21H3v-5"/><path d="M16 3h5v5"/><path d="M3 8V3h5"/></svg>',
        docClose: true,
        swipeClose: true,
        hideScrollbar: true,
        draggable: true,
        threshold: 100,
        rtl: false, // TODO
        loop: false, // TODO
        autoplayVideo: false
      }

      if (userOptions) {
        Object.keys(userOptions).forEach(function (key) {
          options[key] = userOptions[key]
        })
      }

      return options
    }

    /**
     * Types - you can add new type to support something new
     *
     */
    const supportedElements = {
      image: {
        checkSupport: function (el) {
          return !el.hasAttribute('data-type') && el.href.match(/\.(png|jpe?g|tiff|tif|gif|bmp|webp|svg|ico)(\?.*)?$/i)
        },

        init: function (el, container) {
          let figure = document.createElement('figure')
          let figcaption = document.createElement('figcaption')
          let image = document.createElement('img')
          let thumbnail = el.querySelector('img')
          let loadingIndicator = document.createElement('div')

          image.style.opacity = '0'

          if (thumbnail) {
            image.alt = thumbnail.alt || ''
          }

          image.setAttribute('src', '')
          image.setAttribute('data-src', el.href)

          // Add image to figure
          figure.appendChild(image)

          // Create figcaption
          if (config.captions) {
            figcaption.style.opacity = '0'

            if (config.captionsSelector === 'self' && el.getAttribute(config.captionAttribute)) {
              figcaption.textContent = el.getAttribute(config.captionAttribute)
            } else if (config.captionsSelector === 'img' && thumbnail && thumbnail.getAttribute(config.captionAttribute)) {
              figcaption.textContent = thumbnail.getAttribute(config.captionAttribute)
            }

            if (figcaption.textContent) {
              figcaption.id = 'tobi-figcaption-' + figcaptionId
              figure.appendChild(figcaption)

              image.setAttribute('aria-labelledby', figcaption.id)

              ++figcaptionId
            }
          }

          // Add figure to container
          container.appendChild(figure)

          // Create loading indicator
          loadingIndicator.className = 'tobi-loader'
          loadingIndicator.setAttribute('role', 'progressbar')
          loadingIndicator.setAttribute('aria-label', config.loadingIndicatorLabel)

          // Add loading indicator to container
          container.appendChild(loadingIndicator)

          // Register type
          container.setAttribute('data-type', 'image')
        },

        onPreload: function (container) {
          // Same as preload
          supportedElements.image.onLoad(container)
        },

        onLoad: function (container) {
          let image = container.querySelector('img')

          if (!image.hasAttribute('data-src')) {
            return
          }

          let figcaption = container.querySelector('figcaption')
          let loadingIndicator = container.querySelector('.tobi-loader')

          image.onload = function () {
            container.removeChild(loadingIndicator)
            image.style.opacity = '1'

            if (figcaption) {
              figcaption.style.opacity = '1'
            }
          }

          image.setAttribute('src', image.getAttribute('data-src'))
          image.removeAttribute('data-src')
        },

        onLeave: function (container) {
          // Nothing
        },

        onCleanup: function (container) {
          // Nothing
        }
      },

      html: {
        checkSupport: function (el) {
          return checkType(el, 'html')
        },

        init: function (el, container) {
          let targetSelector = el.hasAttribute('href') ? el.getAttribute('href') : el.getAttribute('data-target')
          let target = document.querySelector(targetSelector)

          if (!target) {
            throw new Error('Ups, I can\'t find the target ' + targetSelector + '.')
          }

          // Add content to container
          container.appendChild(target)

          // Register type
          container.setAttribute('data-type', 'html')
        },

        onPreload: function (container) {
          // Nothing
        },

        onLoad: function (container) {
          let video = container.querySelector('video')

          if (video) {
            if (video.hasAttribute('data-time') && video.readyState > 0) {
              // Continue where video was stopped
              video.currentTime = video.getAttribute('data-time')
            }

            if (config.autoplayVideo) {
              // Start playback (and loading if necessary)
              video.play()
            }
          }
        },

        onLeave: function (container) {
          let video = container.querySelector('video')

          if (video) {
            if (!video.paused) {
              // Stop if video is playing
              video.pause()
            }

            // Backup currentTime (needed for revisit)
            if (video.readyState > 0) {
              video.setAttribute('data-time', video.currentTime)
            }
          }
        },

        onCleanup: function (container) {
          let video = container.querySelector('video')

          if (video) {
            if (video.readyState > 0 && video.readyState < 3 && video.duration !== video.currentTime) {
              // Some data has been loaded but not the whole package.
              // In order to save bandwidth, stop downloading as soon as possible.
              let clone = video.cloneNode(true)

              removeSources(video)
              video.load()

              video.parentNode.removeChild(video)

              container.appendChild(clone)
            }
          }
        }
      },

      iframe: {
        checkSupport: function (el) {
          return checkType(el, 'iframe')
        },

        init: function (el, container) {
          let iframe = document.createElement('iframe')
          let href = el.hasAttribute('href') ? el.getAttribute('href') : el.getAttribute('data-target')

          iframe.setAttribute('frameborder', '0')
          iframe.setAttribute('src', '')
          iframe.setAttribute('data-src', href)

          // Add iframe to container
          container.appendChild(iframe)

          // Register type
          container.setAttribute('data-type', 'iframe')
        },

        onPreload: function (container) {
          // Nothing
        },

        onLoad: function (container) {
          let iframe = container.querySelector('iframe')

          iframe.setAttribute('src', iframe.getAttribute('data-src'))
        },

        onLeave: function (container) {
          // Nothing
        },

        onCleanup: function (container) {
          // Nothing
        }
      },

      youtube: {
        checkSupport: function (el) {
          return checkType(el, 'youtube')
        },

        init: function (el, container) {
          let iframePlaceholder = document.createElement('div')

          // Add iframePlaceholder to container
          container.appendChild(iframePlaceholder)

          player[playerId] = new window.YT.Player(iframePlaceholder, {
            host: 'https://www.youtube-nocookie.com',
            height: el.getAttribute('data-height') || '360',
            width: el.getAttribute('data-width') || '640',
            videoId: el.getAttribute('data-id'),
            playerVars: {
              controls: el.getAttribute('data-controls') || 1,
              rel: 0,
              playsinline: 1
            }
          })

          // Set player ID
          container.setAttribute('data-player', playerId)

          // Register type
          container.setAttribute('data-type', 'youtube')

          playerId++
        },

        onPreload: function (container) {
          // Nothing
        },

        onLoad: function (container) {
          if (config.autoplayVideo) {
            player[container.getAttribute('data-player')].playVideo()
          }
        },

        onLeave: function (container) {
          if (player[container.getAttribute('data-player')].getPlayerState() === 1) {
            player[container.getAttribute('data-player')].pauseVideo()
          }
        },

        onCleanup: function (container) {
          if (player[container.getAttribute('data-player')].getPlayerState() === 1) {
            player[container.getAttribute('data-player')].pauseVideo()
          }
        }
      }
    }

    /**
     * Add compatible Object.entries support for IE
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries#Polyfill
     *
     */
    if (!Object.entries) {
      Object.entries = function (obj) {
        let ownProps = Object.keys(obj)
        let i = ownProps.length
        let resArray = new Array(i)

        while (i--) {
          resArray[i] = [ownProps[i], obj[ownProps[i]]]
        }

        return resArray
      }
    }

    /**
     * Init
     *
     */
    const init = function init (userOptions) {
      // Merge user options into defaults
      config = mergeOptions(userOptions)

      // Check if the lightbox already exists
      if (!lightbox) {
        // Create the lightbox
        createLightbox()
      }

      // Get a list of all elements within the document
      let els = document.querySelectorAll(config.selector)

      if (!els) {
        throw new Error('Ups, I can\'t find the selector ' + config.selector + '.')
      }

      // Execute a few things once per element
      Array.prototype.forEach.call(els, function (el) {
        checkDependencies(el)
      })
    }

    /**
     * Check dependencies
     *
     * @param {HTMLElement} el - Element to add
     */
    const checkDependencies = function checkDependencies (el, callback) {
      // Check if there is a YouTube video and if the YouTube iframe-API is ready
      if (document.querySelector('[data-type="youtube"]') !== null && !isYouTubeDependencieLoaded) {
        if (document.getElementById('iframe_api') === null) {
          let tag = document.createElement('script')
          let firstScriptTag = document.getElementsByTagName('script')[0]

          tag.id = 'iframe_api'
          tag.src = 'https://www.youtube.com/iframe_api'

          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
        }

        if (waitingEls.indexOf(el) === -1) {
          waitingEls.push(el)
        }

        window.onYouTubePlayerAPIReady = function () {
          Array.prototype.forEach.call(waitingEls, function (waitingEl) {
            add(waitingEl, callback)
          })

          isYouTubeDependencieLoaded = true
        }
      } else {
        add(el, callback)
      }
    }

    /**
     * Get group name from element
     *
     * @param {HTMLElement} el
     * @return {string}
     */
    const getGroupName = function getGroupName (el) {
      return el.hasAttribute('data-group') ? (el.getAttribute('data-group').length > 0 ? el.getAttribute('data-group') : 'default') : 'default'
    }

    /**
     * Copy an object. (The secure way)
     *
     * @param {object} object
     * @return {object}
     */
    const copyObject = function copyObject (object) {
      return JSON.parse(JSON.stringify(object))
    }

    /**
     * Add element
     *
     * @param {HTMLElement} el - Element to add
     * @param {function} callback - Optional callback to call after add
     */
    const add = function add (el, callback) {
      newGroup = getGroupName(el)

      if (!Object.prototype.hasOwnProperty.call(groups, newGroup)) {
        groups[newGroup] = copyObject(groupAtts)

        createLightboxSlider()
      }

      // Check if element already exists
      if (groups[newGroup].gallery.indexOf(el) === -1) {
        groups[newGroup].gallery.push(el)
        groups[newGroup].elementsLength++

        // Set zoom icon if necessary
        if (config.zoom && el.querySelector('img')) {
          let tobiZoom = document.createElement('div')

          tobiZoom.className = 'tobi-zoom__icon'
          tobiZoom.innerHTML = config.zoomText

          el.classList.add('tobi-zoom')
          el.appendChild(tobiZoom)
        }

        // Bind click event handler
        el.addEventListener('click', click)

        // Create the slide
        createLightboxSlide(el)

        if (isOpen() && newGroup === activeGroup) {
          recheckConfig()
          updateLightbox()
        }

        if (callback) {
          callback.call(this)
        }
      } else {
        throw new Error('Ups, element already added to the lightbox.')
      }
    }

    /**
     * Remove element
     *
     * @param {HTMLElement} el - Element to remove
     * @param {function} callback - Optional callback to call after remove
     */
    const remove = function add (el, callback) {
      let groupName = getGroupName(el)

      // Check if element exists
      if (groups[groupName].gallery.indexOf(el) === -1) {
        // TODO
      } else {
        let slideIndex = groups[groupName].gallery.indexOf(el)
        let slideEl = groups[groupName].sliderElements[slideIndex]

        // TODO If the element to be removed is the currently visible slide

        //groups[groupName].gallery.splice(groups[groupName].gallery.indexOf(el))
        groups[groupName].elementsLength--

        // Remove zoom icon if necessary
        if (config.zoom && el.querySelector('.tobi-zoom__icon')) {
          let zoomIcon = el.querySelector('.tobi-zoom__icon')

          zoomIcon.parentNode.classList.remove('tobi-zoom')
          zoomIcon.parentNode.removeChild(zoomIcon)
        }

        // Unbind click event handler
        el.removeEventListener('click', click)

        // TODO Remove Slide
        slideEl.parentNode.removeChild(slideEl)

        if (isOpen() && groupName === activeGroup) {
          recheckConfig()
          updateLightbox()
        }

        if (callback) {
          callback.call(this)
        }
      }
    }

    /**
     * Create the lightbox
     *
     */
    const createLightbox = function createLightbox () {
      // Create lightbox container
      lightbox = document.createElement('div')
      lightbox.setAttribute('role', 'dialog')
      lightbox.setAttribute('aria-hidden', 'true')
      lightbox.className = 'tobi'

      // Create previous button
      prevButton = document.createElement('button')
      prevButton.className = 'tobi__prev'
      prevButton.setAttribute('type', 'button')
      prevButton.setAttribute('aria-label', config.navLabel[0])
      prevButton.innerHTML = config.navText[0]
      lightbox.appendChild(prevButton)

      // Create next button
      nextButton = document.createElement('button')
      nextButton.className = 'tobi__next'
      nextButton.setAttribute('type', 'button')
      nextButton.setAttribute('aria-label', config.navLabel[1])
      nextButton.innerHTML = config.navText[1]
      lightbox.appendChild(nextButton)

      // Create close button
      closeButton = document.createElement('button')
      closeButton.className = 'tobi__close'
      closeButton.setAttribute('type', 'button')
      closeButton.setAttribute('aria-label', config.closeLabel)
      closeButton.innerHTML = config.closeText
      lightbox.appendChild(closeButton)

      // Create counter
      counter = document.createElement('div')
      counter.className = 'tobi__counter'
      lightbox.appendChild(counter)

      // Resize event using requestAnimationFrame
      browserWindow.addEventListener('resize', function () {
        if (!resizeTicking) {
          resizeTicking = true

          browserWindow.requestAnimationFrame(function () {
            updateOffset()

            resizeTicking = false
          })
        }
      })

      document.body.appendChild(lightbox)
    }

    /**
     * Create a slider
     */
    const createLightboxSlider = function createLightboxSlider () {
      groups[newGroup].slider = document.createElement('div')
      groups[newGroup].slider.className = 'tobi__slider'
      lightbox.appendChild(groups[newGroup].slider)
    }

    /**
     * Create a slide
     *
     */
    const createLightboxSlide = function createLightboxSlide (el) {
      // Detect type
      for (let index in supportedElements) {
        if (Object.prototype.hasOwnProperty.call(supportedElements, index)) {
          if (supportedElements[index].checkSupport(el)) {
            // Create slide elements
            let sliderElement = document.createElement('div')
            let sliderElementContent = document.createElement('div')

            sliderElement.className = 'tobi__slider__slide'
            sliderElement.style.position = 'absolute'
            sliderElement.style.left = groups[newGroup].x * 100 + '%'
            sliderElementContent.className = 'tobi__slider__slide__content'

            // Create type elements
            supportedElements[index].init(el, sliderElementContent)

            // Add slide content container to slider element
            sliderElement.appendChild(sliderElementContent)

            // Add slider element to slider
            groups[newGroup].slider.appendChild(sliderElement)
            groups[newGroup].sliderElements.push(sliderElement)

            ++groups[newGroup].x

            break
          }
        }
      }
    }

    /**
     * Open the lightbox
     *
     * @param {number} index - Index to load
     * @param {function} callback - Optional callback to call after open
     */
    const open = function open (index, callback) {
      activeGroup = activeGroup !== null ? activeGroup : newGroup

      if (!isOpen() && !index) {
        index = 0
      }

      if (isOpen()) {
        if (!index) {
          throw new Error('Ups, Tobi is aleady open.')
        }

        if (index === groups[activeGroup].currentIndex) {
          throw new Error('Ups, slide ' + index + ' is already selected.')
        }
      }

      if (index === -1 || index >= groups[activeGroup].elementsLength) {
        throw new Error('Ups, I can\'t find slide ' + index + '.')
      }

      // setSlides()

      if (config.hideScrollbar) {
        document.documentElement.classList.add('tobi-is-open')
        document.body.classList.add('tobi-is-open')
      }

      recheckConfig()

      // Hide close if necessary
      if (!config.close) {
        closeButton.disabled = false
        closeButton.setAttribute('aria-hidden', 'true')
      }

      // Save the user’s focus
      lastFocus = document.activeElement

      // Set current index
      groups[activeGroup].currentIndex = index

      // Clear drag
      clearDrag()

      // Bind events
      bindEvents()

      // Load slide
      load(groups[activeGroup].currentIndex)

      // Makes lightbox appear, too
      lightbox.setAttribute('aria-hidden', 'false')

      // Update lightbox
      updateLightbox()

      // Preload late
      preload(groups[activeGroup].currentIndex + 1)
      preload(groups[activeGroup].currentIndex - 1)

      if (callback) {
        callback.call(this)
      }
    }

    /**
     * Close the lightbox
     *
     * @param {function} callback - Optional callback to call after close
     */
    const close = function close (callback) {
      if (!isOpen()) {
        throw new Error('Tobi is already closed.')
      }

      if (config.hideScrollbar) {
        document.documentElement.classList.remove('tobi-is-open')
        document.body.classList.remove('tobi-is-open')
      }

      // Unbind events
      unbindEvents()

      // Reenable the user’s focus
      lastFocus.focus()

      // Don't forget to cleanup our current element
      let container = groups[activeGroup].sliderElements[groups[activeGroup].currentIndex].querySelector('.tobi__slider__slide__content')
      let type = container.getAttribute('data-type')
      supportedElements[type].onLeave(container)
      supportedElements[type].onCleanup(container)

      lightbox.setAttribute('aria-hidden', 'true')

      // Reset current index
      groups[activeGroup].currentIndex = 0

      if (callback) {
        callback.call(this)
      }
    }

    /**
     * Preload slide
     *
     * @param {number} index - Index to preload
     */
    const preload = function preload (index) {
      if (groups[activeGroup].sliderElements[index] === undefined) {
        return
      }

      let container = groups[activeGroup].sliderElements[index].querySelector('.tobi__slider__slide__content')
      let type = container.getAttribute('data-type')

      supportedElements[type].onPreload(container)
    }

    /**
     * Load slide
     * Will be called when opening the lightbox or moving index
     *
     * @param {number} index - Index to load
     */
    const load = function load (index) {
      if (groups[activeGroup].sliderElements[index] === undefined) {
        return
      }

      let container = groups[activeGroup].sliderElements[index].querySelector('.tobi__slider__slide__content')
      let type = container.getAttribute('data-type')

      supportedElements[type].onLoad(container)
    }

    /**
     * Navigate to the previous slide
     *
     * @param {function} callback - Optional callback function
     */
    const prev = function prev (callback) {
      if (groups[activeGroup].currentIndex > 0) {
        leave(groups[activeGroup].currentIndex)
        load(--groups[activeGroup].currentIndex)
        updateLightbox('left')
        cleanup(groups[activeGroup].currentIndex + 1)
        preload(groups[activeGroup].currentIndex - 1)

        if (callback) {
          callback.call(this)
        }
      }
    }

    /**
     * Navigate to the next slide
     *
     * @param {function} callback - Optional callback function
     */
    const next = function next (callback) {
      if (groups[activeGroup].currentIndex < groups[activeGroup].elementsLength - 1) {
        leave(groups[activeGroup].currentIndex)
        load(++groups[activeGroup].currentIndex)
        updateLightbox('right')
        cleanup(groups[activeGroup].currentIndex - 1)
        preload(groups[activeGroup].currentIndex + 1)

        if (callback) {
          callback.call(this)
        }
      }
    }

    /**
     * Leave slide
     * Will be called before moving index
     *
     * @param {number} index - Index to leave
     */
    const leave = function leave (index) {
      if (groups[activeGroup].sliderElements[index] === undefined) {
        return
      }

      let container = groups[activeGroup].sliderElements[index].querySelector('.tobi__slider__slide__content')
      let type = container.getAttribute('data-type')

      supportedElements[type].onLeave(container)
    }

    /**
     * Cleanup slide
     * Will be called after moving index
     *
     * @param {number} index - Index to cleanup
     */
    const cleanup = function cleanup (index) {
      if (groups[activeGroup].sliderElements[index] === undefined) {
        return
      }

      let container = groups[activeGroup].sliderElements[index].querySelector('.tobi__slider__slide__content')
      let type = container.getAttribute('data-type')

      supportedElements[type].onCleanup(container)
    }

    /**
     * Update the offset
     *
     */
    const updateOffset = function updateOffset () {
      activeGroup = activeGroup !== null ? activeGroup : newGroup

      offset = -groups[activeGroup].currentIndex * window.innerWidth

      groups[activeGroup].slider.style.transform = 'translate3d(' + offset + 'px, 0, 0)'
      offsetTmp = offset
    }

    /**
     * Update the counter
     *
     */
    const updateCounter = function updateCounter () {
      counter.textContent = (groups[activeGroup].currentIndex + 1) + '/' + groups[activeGroup].elementsLength
    }

    /**
     * Set the focus to the next element
     *
     * @param {string} dir - Current slide direction
     */
    const updateFocus = function updateFocus (dir) {
      let focusableEls = null

      if (config.nav) {
        prevButton.disabled = false
        nextButton.disabled = false

        if (dir === 'left') {
          prevButton.focus()
        } else {
          nextButton.focus()
        }

        // If there is only one slide
        if (groups[activeGroup].elementsLength === 1) {
          prevButton.disabled = true
          nextButton.disabled = true

          if (config.close) {
            closeButton.focus()
          }
        } else {
          // If the first slide is displayed
          if (groups[activeGroup].currentIndex === 0) {
            prevButton.disabled = true
            nextButton.focus()
          }

          // If the last slide is displayed
          if (groups[activeGroup].currentIndex === groups[activeGroup].elementsLength - 1) {
            nextButton.disabled = true
            prevButton.focus()
          }
        }
      } else if (config.close) {
        closeButton.focus()
      }

      focusableEls = lightbox.querySelectorAll('.tobi > button:not(:disabled)')
      firstFocusableEl = focusableEls[0]
      lastFocusableEl = focusableEls.length === 1 ? focusableEls[0] : focusableEls[focusableEls.length - 1]
    }

    /**
     * Clear drag after touchend and mousup event
     *
     */
    const clearDrag = function clearDrag () {
      drag = {
        startX: 0,
        endX: 0,
        startY: 0,
        endY: 0
      }
    }

    /**
     * Recalculate drag / swipe event
     *
     */
    const updateAfterDrag = function updateAfterDrag () {
      let movementX = drag.endX - drag.startX
      let movementY = drag.endY - drag.startY
      let movementXDistance = Math.abs(movementX)
      let movementYDistance = Math.abs(movementY)

      if (movementX > 0 && movementXDistance > config.threshold && groups[activeGroup].currentIndex > 0) {
        prev()
      } else if (movementX < 0 && movementXDistance > config.threshold && groups[activeGroup].currentIndex !== groups[activeGroup].elementsLength - 1) {
        next()
      } else if (movementY < 0 && movementYDistance > config.threshold && config.swipeClose) {
        close()
      } else {
        updateOffset()
      }
    }

    /**
     * Click event handler
     *
     */
    const click = function click (event) {
      event.preventDefault()

      activeGroup = getGroupName(this)

      open(groups[activeGroup].gallery.indexOf(this))
    }

    /**
     * Click event handler
     *
     */
    const clickHandler = function clickHandler (event) {
      if (event.target === prevButton) {
        prev()
      } else if (event.target === nextButton) {
        next()
      } else if (event.target === closeButton || (event.target.className === 'tobi__slider__slide' && config.docClose)) {
        close()
      }

      event.stopPropagation()
    }

    /**
     * Keydown event handler
     *
     * @TODO: Remove the deprecated event.keyCode when Edge support event.code and we drop f*cking IE
     * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
     */
    const keydownHandler = function keydownHandler (event) {
      if (event.keyCode === 9 || event.code === 'Tab') {
        // `TAB` Key: Navigate to the next/previous focusable element
        if (event.shiftKey) {
          // Step backwards in the tab-order
          if (document.activeElement === firstFocusableEl) {
            lastFocusableEl.focus()
            event.preventDefault()
          }
        } else {
          // Step forward in the tab-order
          if (document.activeElement === lastFocusableEl) {
            firstFocusableEl.focus()
            event.preventDefault()
          }
        }
      } else if (event.keyCode === 27 || event.code === 'Escape') {
        // `ESC` Key: Close the lightbox
        event.preventDefault()
        close()
      } else if (event.keyCode === 37 || event.code === 'ArrowLeft') {
        // `PREV` Key: Navigate to the previous slide
        event.preventDefault()
        prev()
      } else if (event.keyCode === 39 || event.code === 'ArrowRight') {
        // `NEXT` Key: Navigate to the next slide
        event.preventDefault()
        next()
      }
    }

    /**
     * Touchstart event handler
     *
     */
    const touchstartHandler = function touchstartHandler (event) {
      // Prevent dragging / swiping on textareas inputs and selects
      if (isIgnoreElement(event.target)) {
        return
      }

      event.stopPropagation()

      pointerDown = true

      drag.startX = event.touches[0].pageX
      drag.startY = event.touches[0].pageY

      groups[activeGroup].slider.classList.add('tobi__slider--is-dragging')
    }

    /**
     * Touchmove event handler
     *
     */
    const touchmoveHandler = function touchmoveHandler (event) {
      event.stopPropagation()

      if (pointerDown) {
        event.preventDefault()

        drag.endX = event.touches[0].pageX
        drag.endY = event.touches[0].pageY

        doSwipe()
      }
    }

    /**
     * Touchend event handler
     *
     */
    const touchendHandler = function touchendHandler (event) {
      event.stopPropagation()

      pointerDown = false

      groups[activeGroup].slider.classList.remove('tobi__slider--is-dragging')

      if (drag.endX) {
        isDraggingX = false
        isDraggingY = false

        updateAfterDrag()
      }

      clearDrag()
    }

    /**
     * Mousedown event handler
     *
     */
    const mousedownHandler = function mousedownHandler (event) {
      // Prevent dragging / swiping on textareas inputs and selects
      if (isIgnoreElement(event.target)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      pointerDown = true

      drag.startX = event.pageX
      drag.startY = event.pageY

      groups[activeGroup].slider.classList.add('tobi__slider--is-dragging')
    }

    /**
     * Mousemove event handler
     *
     */
    const mousemoveHandler = function mousemoveHandler (event) {
      event.preventDefault()

      if (pointerDown) {
        drag.endX = event.pageX
        drag.endY = event.pageY

        doSwipe()
      }
    }

    /**
     * Mouseup event handler
     *
     */
    const mouseupHandler = function mouseupHandler (event) {
      event.stopPropagation()

      pointerDown = false

      groups[activeGroup].slider.classList.remove('tobi__slider--is-dragging')

      if (drag.endX) {
        isDraggingX = false
        isDraggingY = false

        updateAfterDrag()
      }

      clearDrag()
    }

    /**
     * Decide whether to do horizontal of vertical swipe
     *
     */
    const doSwipe = function doSwipe () {
      if (Math.abs(drag.startX - drag.endX) > 0 && !isDraggingY && config.swipeClose) {
        // Horizontal swipe
        groups[activeGroup].slider.style.transform = 'translate3d(' + (offsetTmp - Math.round(drag.startX - drag.endX)) + 'px, 0, 0)'

        isDraggingX = true
        isDraggingY = false
      } else if (Math.abs(drag.startY - drag.endY) > 0 && !isDraggingX) {
        // Vertical swipe
        groups[activeGroup].slider.style.transform = 'translate3d(' + (offsetTmp + 'px, -' + Math.round(drag.startY - drag.endY)) + 'px, 0)'

        isDraggingX = false
        isDraggingY = true
      }
    }

    /**
     * Bind events
     *
     */
    const bindEvents = function bindEvents () {
      if (config.keyboard) {
        document.addEventListener('keydown', keydownHandler)
      }

      // Click event
      lightbox.addEventListener('click', clickHandler)

      if (config.draggable) {
        if (isTouchDevice()) {
          // Touch events
          lightbox.addEventListener('touchstart', touchstartHandler)
          lightbox.addEventListener('touchmove', touchmoveHandler)
          lightbox.addEventListener('touchend', touchendHandler)
        }

        // Mouse events
        lightbox.addEventListener('mousedown', mousedownHandler)
        lightbox.addEventListener('mouseup', mouseupHandler)
        lightbox.addEventListener('mousemove', mousemoveHandler)
      }
    }

    /**
     * Unbind events
     *
     */
    const unbindEvents = function unbindEvents () {
      if (config.keyboard) {
        document.removeEventListener('keydown', keydownHandler)
      }

      // Click event
      lightbox.removeEventListener('click', clickHandler)

      if (config.draggable) {
        if (isTouchDevice()) {
          // Touch events
          lightbox.removeEventListener('touchstart', touchstartHandler)
          lightbox.removeEventListener('touchmove', touchmoveHandler)
          lightbox.removeEventListener('touchend', touchendHandler)
        }

        // Mouse events
        lightbox.removeEventListener('mousedown', mousedownHandler)
        lightbox.removeEventListener('mouseup', mouseupHandler)
        lightbox.removeEventListener('mousemove', mousemoveHandler)
      }
    }

    /**
     * Checks whether element has requested data-type value
     *
     */
    const checkType = function checkType (el, type) {
      return el.getAttribute('data-type') === type
    }

    /**
     * Remove all `src` attributes
     *
     * @param {HTMLElement} el - Element to remove all `src` attributes
     */
    const removeSources = function setVideoSources (el) {
      let sources = el.querySelectorAll('src')

      if (sources) {
        Array.prototype.forEach.call(sources, function (source) {
          source.setAttribute('src', '')
        })
      }
    }

    /**
     * Update Config
     *
     */
    const recheckConfig = function recheckConfig () {
      if (config.draggable && groups[activeGroup].elementsLength > 1 && !groups[activeGroup].slider.classList.contains('tobi__slider--is-draggable')) {
        groups[activeGroup].slider.classList.add('tobi__slider--is-draggable')
      }

      // Hide buttons if necessary
      if (!config.nav || groups[activeGroup].elementsLength === 1 || (config.nav === 'auto' && isTouchDevice())) {
        prevButton.setAttribute('aria-hidden', 'true')
        nextButton.setAttribute('aria-hidden', 'true')
      } else {
        prevButton.setAttribute('aria-hidden', 'false')
        nextButton.setAttribute('aria-hidden', 'false')
      }

      // Hide counter if necessary
      if (!config.counter || groups[activeGroup].elementsLength === 1) {
        counter.setAttribute('aria-hidden', 'true')
      } else {
        counter.setAttribute('aria-hidden', 'false')
      }
    }

    /**
     * Hide all unused sliders
     */
    const updateSlider = function updateSlider () {
      for (let name in groups) {
        if (!Object.prototype.hasOwnProperty.call(groups, name)) continue
        groups[name].slider.style.display = activeGroup === name ? 'block' : 'none'
      }
    }

    /**
     * Update lightbox
     *
     * @param {string} dir - Current slide direction
     */
    const updateLightbox = function updateLightbox (dir) {
      updateSlider()
      updateOffset()
      updateCounter()
      updateFocus(dir)
    }

    /**
     * Destroy the lightbox
     *
     * @param {function} callback - Optional callback to call after destroy
     */
    const destroy = function destroy (callback) {
      if (isOpen()) {
        close()
      }

      // TODO Clean up
      const entries = Object.entries(groups)

      Array.prototype.forEach.call(entries, function (entrie) {
        let els = entrie[1].gallery

        Array.prototype.forEach.call(els, function (el) {
          remove(el)
        })
      })

      lightbox.parentNode.removeChild(lightbox)

      groups = {}
      newGroup = activeGroup = null
      figcaptionId = 0

      // TODO

      if (callback) {
        callback.call(this)
      }
    }

    /**
     * Check if the lightbox is open
     *
     */
    const isOpen = function isOpen () {
      return lightbox.getAttribute('aria-hidden') === 'false'
    }

    /**
     * Detect whether device is touch capable
     *
     */
    const isTouchDevice = function isTouchDevice () {
      return 'ontouchstart' in window
    }

    /**
     * Checks whether element's nodeName is part of array
     *
     */
    const isIgnoreElement = function isIgnoreElement (el) {
      return ['TEXTAREA', 'OPTION', 'INPUT', 'SELECT'].indexOf(el.nodeName) !== -1 || el === prevButton || el === nextButton || el === closeButton || groups[activeGroup].elementsLength === 1
    }

    /**
     * Return current index
     *
     */
    const currentSlide = function currentSlide () {
      return groups[activeGroup].currentIndex
    }

    /**
     * Return current group
     *
     */
    const currentGroup = function currentGroup () {
      return activeGroup !== null ? activeGroup : newGroup
    }

    /**
     * Select a specific group
     *
     * @param {string} name
     */
    const selectGroup = function selectGroup (name) {
      if (isOpen()) {
        throw new Error('Ups, I can\'t do this. Tobi is open.')
      }

      if (!name) {
        return
      }

      if (name && !Object.prototype.hasOwnProperty.call(groups, name)) {
        throw new Error('Ups, I don\'t have a group called "' + name + '".')
      }

      activeGroup = name
    }

    init(userOptions)

    return {
      open: open,
      prev: prev,
      next: next,
      close: close,
      add: checkDependencies,
      remove: remove,
      destroy: destroy,
      isOpen: isOpen,
      currentSlide: currentSlide,
      selectGroup: selectGroup,
      currentGroup: currentGroup
    }
  }

  return Tobi
}))
