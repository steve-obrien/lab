import md5 from 'md5';

/**
 * Avoid costly calculations while the window size is in flux.
 * window.addEventListener('resize', debounce(calculateLayout, 150));
 * 
 * @param {*} func 
 * @param {*} func 
 * @param {*} wait 
 * @param {*} immediate 
 * @returns 
 */
export function debounce(func, wait, immediate) {
	var timeout;
	return function () {
		var context = this, args = arguments;
		clearTimeout(timeout);
		if (immediate && !timeout) func.apply(context, args);
		timeout = setTimeout(function () {
			timeout = null;
			if (!immediate) func.apply(context, args);
		}, wait);
	};
}


/**
 * Avoid running the same function twice within the specified timeframe.
 * window.addEventListener('resize', throttle(calculateLayout, 150));
 * 
 * @param {*} func 
 * @param {*} timeFrame 
 * @returns 
 */
export function throttle(func, timeFrame) {
	var lastTime = 0;
	return function (...args) {
		var now = new Date();
		if (now - lastTime >= timeFrame) {
			func(...args);
			lastTime = now;
		}
	};
}


export function avatarUrl(email) {
	if (!email) return '';
	const hash = md5(email.trim().toLowerCase());
	// return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${email.trim().toLowerCase()}`;
	return `https://www.gravatar.com/avatar/${hash}?d=mp`;
}