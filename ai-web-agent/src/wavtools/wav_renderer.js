const dataMap = new WeakMap();

/**
 * Normalizes a Float32Array to Array(m): We use this to draw amplitudes on a graph
 * If we're rendering the same audio data, then we'll often be using
 * the same (data, m, downsamplePeaks) triplets so we give option to memoize
 */
const normalizeArray = (data, m, downsamplePeaks = false, memoize = false) => {
	let cache, mKey, dKey;
	if (memoize) {
		mKey = m.toString();
		dKey = downsamplePeaks.toString();
		cache = dataMap.has(data) ? dataMap.get(data) : {};
		dataMap.set(data, cache);
		cache[mKey] = cache[mKey] || {};
		if (cache[mKey][dKey]) {
			return cache[mKey][dKey];
		}
	}
	const n = data.length;
	const result = new Array(m);
	if (m <= n) {
		// Downsampling
		result.fill(0);
		const count = new Array(m).fill(0);
		for (let i = 0; i < n; i++) {
			const index = Math.floor(i * (m / n));
			if (downsamplePeaks) {
				// take highest result in the set
				result[index] = Math.max(result[index], Math.abs(data[i]));
			} else {
				result[index] += Math.abs(data[i]);
			}
			count[index]++;
		}
		if (!downsamplePeaks) {
			for (let i = 0; i < result.length; i++) {
				result[i] = result[i] / count[i];
			}
		}
	} else {
		for (let i = 0; i < m; i++) {
			const index = (i * (n - 1)) / (m - 1);
			const low = Math.floor(index);
			const high = Math.ceil(index);
			const t = index - low;
			if (high >= n) {
				result[i] = data[n - 1];
			} else {
				result[i] = data[low] * (1 - t) + data[high] * t;
			}
		}
	}
	if (memoize) {
		cache[mKey][dKey] = result;
	}
	return result;
};

export const WavRenderer = {
	/**
	 * Renders a point-in-time snapshot of an audio sample, usually frequency values
	 * @param canvas
	 * @param ctx
	 * @param data
	 * @param color
	 * @param pointCount number of bars to render
	 * @param barWidth width of bars in px
	 * @param barSpacing spacing between bars in px
	 * @param center vertically center the bars
	 */
	drawBars: (canvas, ctx, data, color, pointCount = 0, barWidth = 0, barSpacing = 0, center = false) => {
		pointCount = Math.floor(
			Math.min(
				pointCount,
				(canvas.clientWidth - barSpacing) / (Math.max(barWidth, 1) + barSpacing)
			)
		);
		if (!pointCount) {
			pointCount = Math.floor(
				(canvas.clientWidth - barSpacing) / (Math.max(barWidth, 1) + barSpacing)
			);
		}
		if (!barWidth) {
			barWidth = (canvas.clientWidth - barSpacing) / pointCount - barSpacing;
		}
		const points = normalizeArray(data, pointCount, true);
		for (let i = 0; i < pointCount; i++) {
			const amplitude = Math.abs(points[i]);
			const height = Math.max(1, amplitude * canvas.clientHeight);
			const x = barSpacing + i * (barWidth + barSpacing);
			const y = center ? (canvas.clientHeight - height) / 2 : canvas.clientHeight - height;
			ctx.fillStyle = color;
			ctx.fillRect(x, y, barWidth, height);
		}
	},
	/**
	 * Renders a radial visualization of an audio sample, similar to Siri's visualizations
	 * @param canvas
	 * @param ctx
	 * @param data
	 * @param color
	 * @param pointCount number of arcs to render
	 * @param radius radius of the circle
	 * @param centerX x-coordinate of the circle's center
	 * @param centerY y-coordinate of the circle's center
	 */
	drawRadial: (canvas, ctx, data, color, pointCount = 0, radius = 0, centerX = 0, centerY = 0) => {
		pointCount = pointCount || data.length;
		radius = radius || Math.min(canvas.width, canvas.height) / 2;
		centerX = canvas.width / 2;  // Ensure centerX is at the center of the canvas
		centerY = canvas.height / 2; // Ensure centerY is at the center of the canvas

		const points = normalizeArray(data, pointCount, true);
		const angleStep = (2 * Math.PI) / pointCount;

		ctx.strokeStyle = color;
		ctx.lineWidth = 2;

		ctx.beginPath(); // Start a new path
		for (let i = 0; i < pointCount; i++) {
			const amplitude = Math.abs(points[i]);
			const arcRadius = radius * amplitude;
			const startAngle = i * angleStep;
			const endAngle = startAngle + angleStep;

			const startX = centerX + arcRadius * Math.cos(startAngle);
			const startY = centerY + arcRadius * Math.sin(startAngle);

			if (i === 0) {
				ctx.moveTo(startX, startY); // Move to the starting point of the first arc
			} else {
				ctx.lineTo(startX, startY); // Draw a line to the starting point of the current arc
			}

			ctx.arc(centerX, centerY, arcRadius, startAngle, endAngle);
		}
		ctx.closePath(); // Close the path to connect the last arc to the first
		ctx.stroke();
	},

	/**
	 * Renders a waveform visualization of an audio sample
	 * @param canvas
	 * @param ctx
	 * @param data
	 * @param color
	 */
	drawWaveform: (canvas, ctx, data, color) => {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		const middle = height / 2;
		const resolutionFactor = 2; // Increase this factor to improve resolution
		const points = normalizeArray(data, width * resolutionFactor, false);

		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(0, middle);

		for (let i = 0; i < width * resolutionFactor; i++) {
			const amplitude = points[i];
			const x = i / resolutionFactor; // Adjust x position based on resolution factor
			const y = middle - amplitude * middle;
			ctx.lineTo(x, y);
		}

		ctx.stroke();
	},

	drawWaveformCircle: (canvas, ctx, data, color, pointCount = 0, startDiameter = 0, centerX = 0, centerY = 0) => {
		pointCount = pointCount || data.length;
		const maxDiameter = Math.min(canvas.clientWidth, canvas.clientHeight);
		startDiameter = startDiameter || maxDiameter / 2;
		centerX = canvas.clientWidth / 2;  // Ensure centerX is at the center of the canvas
		centerY = canvas.clientHeight / 2; // Ensure centerY is at the center of the canvas

		const points = normalizeArray(data, pointCount, false);
		const angleStep = (2 * Math.PI) / pointCount;

		ctx.strokeStyle = color;
		ctx.lineWidth = 3;

		ctx.beginPath(); // Start a new path
		for (let i = 0; i < pointCount; i++) {
			const amplitude = points[i];
			// Calculate arcRadius based on startDiameter and amplitude
			const arcRadius = (startDiameter / 2) + amplitude * ((maxDiameter - startDiameter) / 2);
			const angle = i * angleStep;

			const x = centerX + arcRadius * Math.cos(angle);
			const y = centerY + arcRadius * Math.sin(angle);

			if (i === 0) {
				ctx.moveTo(x, y); // Move to the starting point of the first arc
			} else {
				ctx.lineTo(x, y); // Draw a line to the current point
			}
		}
		ctx.closePath(); // Close the path to connect the last point to the first
		ctx.stroke();
	},

	drawSymmetricBars: (canvas, ctx, data, color, pointCount = 0, barWidth = 0, barSpacing = 0) => {
		pointCount = Math.floor(
			Math.min(
				pointCount,
				(canvas.clientWidth - barSpacing) / (Math.max(barWidth, 1) + barSpacing)
			)
		);
		if (!pointCount) {
			pointCount = Math.floor(
				(canvas.clientWidth - barSpacing) / (Math.max(barWidth, 1) + barSpacing)
			);
		}
		if (!barWidth) {
			barWidth = (canvas.clientWidth - barSpacing) / pointCount - barSpacing;
		}
		const points = normalizeArray(data, pointCount, true);
		const centerY = canvas.clientHeight / 2; // Center line for symmetric bars

		for (let i = 0; i < pointCount; i++) {
			const amplitude = Math.abs(points[i]);
			const height = Math.max(1, amplitude * canvas.clientHeight / 2); // Half height for symmetric growth
			const x = barSpacing + i * (barWidth + barSpacing);
			const yTop = centerY - height;
			const yBottom = centerY + height;

			ctx.fillStyle = color;
			ctx.fillRect(x, yTop, barWidth, height * 2); // Draw bar from yTop to yBottom
		}
	},

	drawSymmetricBarsRounded: (canvas, ctx, data, color, pointCount = 0, barWidth = 0, barSpacing = 0) => {
		pointCount = Math.floor(
			Math.min(
				pointCount,
				(canvas.clientWidth - barSpacing) / (Math.max(barWidth, 1) + barSpacing)
			)
		);
		if (!pointCount) {
			pointCount = Math.floor(
				(canvas.clientWidth - barSpacing) / (Math.max(barWidth, 1) + barSpacing)
			);
		}
		if (!barWidth) {
			barWidth = (canvas.clientWidth - barSpacing) / pointCount - barSpacing;
		}
		const points = normalizeArray(data, pointCount, true);
		const centerY = canvas.clientHeight / 2; // Center line for symmetric bars
		const cornerRadius = barWidth / 2; // Radius for the rounded top and bottom

		for (let i = 0; i < pointCount; i++) {
			const amplitude = Math.abs(points[i]);
			const height = Math.max(1, amplitude * canvas.clientHeight / 2); // Half height for symmetric growth
			const x = barSpacing + i * (barWidth + barSpacing);
			const yTop = centerY - height;
			const yBottom = centerY + height;

			ctx.fillStyle = color;
			ctx.beginPath();
			// Draw top semicircle
			ctx.arc(x + barWidth / 2, yTop, cornerRadius, Math.PI, 0);
			// Draw rectangle part
			ctx.rect(x, yTop, barWidth, height * 2);
			// Draw bottom semicircle
			ctx.arc(x + barWidth / 2, yBottom, cornerRadius, 0, Math.PI);
			ctx.closePath();
			ctx.fill();
		}
	},

	overlayWaveformCircleAndSymmetricBars: (canvas, ctx, data, color, pointCount = 0, startDiameter = 0, barWidth = 0, barSpacing = 0) => {
		// Draw the waveform circle
		WavRenderer.drawWaveformCircle(canvas, ctx, data, color, pointCount, startDiameter);

		// Draw the symmetric bars
		WavRenderer.drawSymmetricBars(canvas, ctx, data, color, pointCount, barWidth, barSpacing);
	},
};
