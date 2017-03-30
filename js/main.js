/**
 * main.js
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2017, Codrops
 * http://www.codrops.com
 */
;(function(window) {

	'use strict';

	// From https://davidwalsh.name/javascript-debounce-function.
	function debounce(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	};

	// from http://www.quirksmode.org/js/events_properties.html#position
	function getMousePos(e) {
		var posx = 0;
		var posy = 0;
		if (!e) var e = window.event;
		if (e.pageX || e.pageY) 	{
			posx = e.pageX;
			posy = e.pageY;
		}
		else if (e.clientX || e.clientY) 	{
			posx = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;
			posy = e.clientY + document.body.scrollTop
				+ document.documentElement.scrollTop;
		}
		return {
			x : posx,
			y : posy
		}
	}

	var DOM = {};
	// The loader.
	DOM.loader = document.querySelector('.overlay--loader');
	// The room wrapper. This will be the element to be transformed in order to move around.
	DOM.scroller = document.querySelector('.container > .scroller');
	// The rooms.
	DOM.rooms = [].slice.call(DOM.scroller.querySelectorAll('.room'));
	// The content wrapper.
	DOM.content = document.querySelector('.content');
	// Rooms navigation controls.
	DOM.nav = {
		leftCtrl : DOM.content.querySelector('nav > .btn--nav-left'),
		rightCtrl : DOM.content.querySelector('nav > .btn--nav-right')
	};
	// Content slides.
	DOM.slides = [].slice.call(DOM.content.querySelectorAll('.slides > .slide'));
	// The off canvas menu button.
	DOM.menuCtrl = DOM.content.querySelector('.btn--menu');
	// The menu overlay.
	DOM.menuOverlay = DOM.content.querySelector('.overlay--menu');
	// The menu items
	DOM.menuItems = DOM.menuOverlay.querySelectorAll('.menu > .menu__item');
	// The info button.
	DOM.infoCtrl = DOM.content.querySelector('.btn--info');
	// The info overlay.
	DOM.infoOverlay = DOM.content.querySelector('.overlay--info');
	// The info text.
	DOM.infoText = DOM.infoOverlay.querySelector('.info');

	var	currentRoom = 0,
		// Total number of rooms.
		totalRooms = DOM.rooms.length,
		// Initial transform.
		initTransform = { translateX : 0, translateY : 0, translateZ : '500px', rotateX : 0, rotateY : 0, rotateZ : 0 },
		// Reset transform.
		resetTransform = { translateX : 0, translateY : 0, translateZ : 0, rotateX : 0, rotateY : 0, rotateZ : 0 },
		// View from top.
		menuTransform = { translateX : 0, translateY : '150%', translateZ : 0, rotateX : '15deg', rotateY : 0, rotateZ : 0 },
		menuTransform = { translateX : 0, translateY : '50%', translateZ : 0, rotateX : '-10deg', rotateY : 0, rotateZ : 0 },
		// Info view transform.
		infoTransform = { translateX : 0, translateY : 0, translateZ : '200px', rotateX : '2deg', rotateY : 0, rotateZ : '4deg' },
		// Room initial moving transition.
		initTransition = { speed: '0.9s', easing: 'ease' },
		// Room moving transition.
		roomTransition = { speed: '0.4s', easing: 'ease' },
		// View from top transition.
		menuTransition = { speed: '1.5s', easing: 'cubic-bezier(0.2,1,0.3,1)' },
		// Info transition.
		infoTransition = { speed: '15s', easing: 'cubic-bezier(0.3,1,0.3,1)' },
		// Tilt transition
		tiltTransition = { speed: '0.2s', easing: 'ease-out' },
		tilt = false,
		// How much to rotate when the mouse moves.
		tiltRotation = {
			rotateX : 1, // a relative rotation of -1deg to 1deg on the x-axis
			rotateY : -3  // a relative rotation of -3deg to 3deg on the y-axis
		},
		// Transition end event handler.
		onEndTransition = function(el, callback) {
			var onEndCallbackFn = function(ev) {
				this.removeEventListener('transitionend', onEndCallbackFn);
				if( callback && typeof callback === 'function' ) { callback.call(); }
			};
			el.addEventListener('transitionend', onEndCallbackFn);
		},
		// Window sizes.
		win = {width: window.innerWidth, height: window.innerHeight},
		// Check if moving inside the room and check if navigating.
		isMoving, isNavigating;

	function init() {
		// Move into the current room.
		move({transition: initTransition, transform: initTransform}).then(function() {
			initTilt();
		});
		// Animate the current slide in.
		showSlide(100);
		// Init/Bind events.
		initEvents();
	}

	function initTilt() {
		applyRoomTransition(tiltTransition);
		tilt = true;
	}

	function removeTilt() {
		tilt = false;
	}
	
	function move(opts) {
		return new Promise(function(resolve, reject) {
			if( isMoving && !opts.stopTransition ) {
				return false;
			}
			isMoving = true;

			if( opts.transition ) {
				applyRoomTransition(opts.transition);
			}

			if( opts.transform ) {
				applyRoomTransform(opts.transform);
				var onEndFn = function() {
					isMoving = false;
					resolve();
				};
				onEndTransition(DOM.scroller, onEndFn);
			}
			else {
				resolve();
			}
			
		});
	}

	function initEvents() {
		// Mousemove event / Tilt functionality.
		var onMouseMoveFn = function(ev) {
				requestAnimationFrame(function() {
					if( !tilt ) return false;


					var mousepos = getMousePos(ev),
						// transform values
						rotX = tiltRotation.rotateX ? initTransform.rotateX -  (2 * tiltRotation.rotateX / win.height * mousepos.y - tiltRotation.rotateX) : 0,
						rotY = tiltRotation.rotateY ? initTransform.rotateY -  (2 * tiltRotation.rotateY / win.width * mousepos.x - tiltRotation.rotateY) : 0;
			
					// apply transform
					applyRoomTransform({
						'translateX' : initTransform.translateX, 
						'translateY' : initTransform.translateY, 
						'translateZ' : initTransform.translateZ, 
						'rotateX' : rotX + 'deg', 
						'rotateY' : rotY + 'deg',
						'rotateZ' : initTransform.rotateZ
					});
				});
			},
			// Window resize.
			debounceResizeFn = debounce(function() {
				win = {width: window.innerWidth, height: window.innerHeight};
			}, 10);
		
		document.addEventListener('mousemove', onMouseMoveFn);
		window.addEventListener('resize', debounceResizeFn);

		// Room navigation.
		var onNavigatePrevFn = function() { navigate('prev'); },
			onNavigateNextFn = function() { navigate('next'); };

		DOM.nav.leftCtrl.addEventListener('click', onNavigatePrevFn);
		DOM.nav.rightCtrl.addEventListener('click', onNavigateNextFn);

		// Menu click.
		DOM.menuCtrl.addEventListener('click', toggleMenu);

		// Info click.
		DOM.infoCtrl.addEventListener('click', toggleInfo);
	}

	function applyRoomTransform(transform) {
		DOM.scroller.style.transform = 'translate3d(' + transform.translateX + ', ' + transform.translateY + ', ' + transform.translateZ + ') ' +
									   'rotate3d(1,0,0,' + transform.rotateX + ') rotate3d(0,1,0,' + transform.rotateY + ') rotate3d(0,0,1,' + transform.rotateZ + ')';
	}

	function applyRoomTransition(transition) {
		DOM.scroller.style.transition = transition === 'none' ? transition : 'transform ' + transition.speed + ' ' + transition.easing;
	}

	function toggleSlide(dir, delay) {
		var slide = DOM.slides[currentRoom],
			// Slide's name.
			name = slide.querySelector('.slide__name'),
			// Slide's title and date elements.
			title = slide.querySelector('.slide__title'),
			date = slide.querySelector('.slide__date');

		delay = delay !== undefined ? delay : 0;

		anime.remove([name, title, date]);
		var animeOpts = {
			targets: [name, title, date],
			duration: dir === 'in' ? 400 : 400,
			//delay: 0,//dir === 'in' ? 150 : 0,
			delay: function(t, i, c) {
				return delay + 75+i*75;
			},
			easing: [0.25,0.1,0.25,1],
			opacity: {
				value: dir === 'in' ? [0,1] : [1,0],
				duration: dir === 'in' ? 550 : 250
			},
			translateY: function(t, i) {
				return dir === 'in' ? [150,0] : [0,-150];
			}	
		};
		if( dir === 'in' ) {
			animeOpts.begin = function() {
				slide.classList.add('slide--current');
			};
		}
		else {
			animeOpts.complete = function() {
				slide.classList.remove('slide--current');
			};
		}
		anime(animeOpts);
	}

	function showSlide(delay) {
		toggleSlide('in', delay);
	}

	function hideSlide(delay) {
		toggleSlide('out', delay);
	}

	function navigate(dir) {
		if( isMoving || isNavigating ) {
			return false;
		}
		isNavigating = true;
		
		var room = DOM.rooms[currentRoom];
		
		// Remove tilt.
		removeTilt();
		// Animate the current slide out - animate the name, title and date elements.
		hideSlide();

		// Update currentRoom.
		if( dir === 'next' ) {
			currentRoom = currentRoom < totalRooms - 1 ? currentRoom + 1 : 0;
		}
		else {
			currentRoom = currentRoom > 0 ? currentRoom - 1 : totalRooms - 1;
		}

		// Position the next room.
		var nextRoom = DOM.rooms[currentRoom];
		nextRoom.style.transform = 'translate3d(' + (dir === 'next' ? 100 : -100) + '%,0,0) translate3d(' + (dir === 'next' ? 1 : -1) + 'px,0,0)' ;
		nextRoom.style.opacity = 1;
		
		// Move back.
		move({transition: roomTransition, transform: resetTransform})
		.then(function() {
			// Move left or right.
			return move({transform: { translateX : (dir === 'next' ? -100 : 100) + '%', translateY : 0, translateZ : 0, rotateX : 0, rotateY : 0, rotateZ : 0 }});
		})
		.then(function() {
			// Update current room class.
			nextRoom.classList.add('room--current');
			room.classList.remove('room--current');
			room.style.opacity = 0;

			// Show the next slide.
			showSlide();

			// Move into room.
			// Update final transform state:
			return move({transform: { translateX : (dir === 'next' ? -100 : 100) + '%', translateY : 0, translateZ : '500px', rotateX : 0, rotateY : 0, rotateZ : 0 }});
		})
		.then(function() {
			// Reset positions.
			applyRoomTransition('none');
			nextRoom.style.transform = 'translate3d(0,0,0)';
			applyRoomTransform(initTransform);
			
			setTimeout(function() {
				initTilt();
			}, 60);
			isNavigating = false;
		});
	}

	function toggleMenu() {
		if( /*isMoving ||*/ isNavigating ) {
			return false;
		}
		if( DOM.menuCtrl.classList.contains('btn--active') ) {
			// Close it.
			closeMenu();
		}
		else {
			// Open it.
			showMenu();
		}
	}

	function showMenu() {
		// Button becomes cross.
		DOM.menuCtrl.classList.add('btn--active');
		// Remove tilt.
		removeTilt();
		// Add adjacent rooms.
		//addAdjacentRooms();
		// Hide current slide.
		hideSlide();
		// Apply menu transition.
		applyRoomTransition(menuTransition);
		// View from top:
		move({transform: menuTransform, stopTransition: true});
		// Show menu items
		anime.remove(DOM.menuItems);
		anime({
			targets: DOM.menuItems,
			duration: 500,
			easing: [0.2,1,0.3,1],
			delay: function(t,i) {
				return 250+50*i;
			},
			translateY: [150, 0],
			opacity: {
				value: [0,1],
				duration: 200,
				easing: 'linear'
			},
			begin: function() {
				DOM.menuOverlay.classList.add('overlay--active');
			}
		});
		anime.remove(DOM.menuOverlay);
		anime({
			targets: DOM.menuOverlay,
			duration: 1000,
			easing: [0.25,0.1,0.25,1],
			opacity: [0,1]
		});
	}

	function closeMenu() {
		// Button becomes menu.
		DOM.menuCtrl.classList.remove('btn--active');
		// Apply room transition.
		applyRoomTransition(roomTransition);
		// Show current slide.
		showSlide(150);
		// back to room view:
		move({transform: initTransform, stopTransition: true}).then(function() {
			// Remove adjacent rooms.
			//removeAdjacentRooms();
			// Init tilt.
			initTilt();	
		});
		anime.remove(DOM.menuItems);
		anime({
			targets: DOM.menuItems,
			duration: 250,
			easing: [0.25,0.1,0.25,1],
			delay: function(t,i,c) {
				return 40*(c-i-1);
			},
			translateY: [0, 150],
			opacity: {
				value: [1,0],
				duration: 250
			},
			complete: function() {
				DOM.menuOverlay.classList.remove('overlay--active');
			}
		});
		anime.remove(DOM.menuOverlay);
		anime({
			targets: DOM.menuOverlay,
			duration: 400,
			easing: [0.25,0.1,0.25,1],
			opacity: [1,0]
		});
	}

	function addAdjacentRooms() {
		// Current room.
		var room = DOM.rooms[currentRoom],
			// Adjacent rooms.
			nextRoom = DOM.rooms[currentRoom < totalRooms - 1 ? currentRoom + 1 : 0],
			prevRoom = DOM.rooms[currentRoom > 0 ? currentRoom - 1 : totalRooms - 1];

		// Position the adjacent rooms.
		nextRoom.style.transform = 'translate3d(100%,0,0) translate3d(3px,0,0)';
		nextRoom.style.opacity = 1;
		prevRoom.style.transform = 'translate3d(-100%,0,0) translate3d(-3px,0,0)';
		prevRoom.style.opacity = 1;
	}

	function removeAdjacentRooms() {
		// Current room.
		var room = DOM.rooms[currentRoom],
			// Adjacent rooms.
			nextRoom = DOM.rooms[currentRoom < totalRooms - 1 ? currentRoom + 1 : 0],
			prevRoom = DOM.rooms[currentRoom > 0 ? currentRoom - 1 : totalRooms - 1];

		// Position the adjacent rooms.
		nextRoom.style.transform = 'none';
		nextRoom.style.opacity = 0;
		prevRoom.style.transform = 'none';
		prevRoom.style.opacity = 0;
	}

	function toggleInfo() {
		if( isNavigating ) {
			return false;
		}
		if( DOM.infoCtrl.classList.contains('btn--active') ) {
			// Close it.
			closeInfo();
		}
		else {
			// Open it.
			showInfo();
		}
	}

	function showInfo() {
		// Button becomes cross.
		DOM.infoCtrl.classList.add('btn--active');
		// Remove tilt.
		removeTilt();
		// Hide current slide.
		hideSlide();
		// Apply info transition.
		applyRoomTransition(infoTransition);
		// Infoview:
		move({transform: infoTransform, stopTransition: true});
		// Show info text and animate photos out of the walls.
		var photos = DOM.rooms[currentRoom].querySelectorAll('.room__img');
		anime.remove(photos);
		anime({
			targets: photos,
			duration: function() {
				return anime.random(15000, 30000);
			},
			easing: [0.3,1,0.3,1],
			translateY: function() {
				return anime.random(-50,50);
			},
			rotateX: function() {
				return anime.random(-2,2);
			},
			rotateZ: function() {
				return anime.random(-5,5);
			},
			translateZ: function() {
				return [10,anime.random(50,win.width/3)];
			}
		});
		// Animate info text and overlay.
		anime.remove([DOM.infoOverlay, DOM.infoText]);
		var animeInfoOpts = {
			targets: [DOM.infoOverlay, DOM.infoText],
			duration: 1500,
			delay: function(t,i) {
				return !i ? 0 : 150;
			},
			easing: [0.25,0.1,0.25,1],
			opacity: [0,1],
			translateY: function(t,i) {
				return !i ? 0 : [30,0];
			},
			begin: function() {
				DOM.infoOverlay.classList.add('overlay--active');
			}
		};
		anime(animeInfoOpts);
	}

	function closeInfo() {
		// Button becomes info.
		DOM.infoCtrl.classList.remove('btn--active');
		// Apply room transition.
		applyRoomTransition(roomTransition);
		// Show current slide.
		showSlide(100);
		// back to room view:
		move({transform: initTransform, stopTransition: true}).then(function() {	
			initTilt();
		});

		// Hide info text and animate photos into the walls.
		var photos = DOM.rooms[currentRoom].querySelectorAll('.room__img');
		anime.remove(photos);
		anime({
			targets: photos,
			duration: 400,
			easing: [0.3,1,0.3,1],
			translateY: 0,
			rotateX: 0,
			rotateZ: 0,
			translateZ: 10
		});
		// Animate info text and overlay.
		anime.remove([DOM.infoOverlay, DOM.infoText]);
		var animeInfoOpts = {
			targets: [DOM.infoOverlay, DOM.infoText],
			duration: 400,
			easing: [0.25,0.1,0.25,1],
			opacity: [1,0],
			translateY: function(t,i) {
				return !i ? 0 : [0,30];
			},
			complete: function() {
				DOM.infoOverlay.classList.remove('overlay--active');
			}
		};
		anime(animeInfoOpts);
	}

	// Preload all the images.
	imagesLoaded(DOM.scroller, function() {
		var extradelay = 1000;
		// Slide out loader.
		anime({
			targets: DOM.loader,
			duration: 600,
			easing: 'easeInOutCubic',
			delay: extradelay,
			translateY: '-100%',
			begin: function() {
				init();
			},
			complete: function() {
				DOM.loader.classList.remove('overlay--active');
			}
		});
	});

})(window);