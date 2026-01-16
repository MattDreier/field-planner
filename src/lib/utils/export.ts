/**
 * Export utilities for the field planner canvas
 */

/**
 * Export an SVG element as a PNG image
 * @param svgElement - The SVG DOM element to export
 * @param filename - The filename (without extension)
 */
export async function exportSvgToPng(
	svgElement: SVGSVGElement,
	filename: string = 'garden-layout'
): Promise<void> {
	// 1. Clone the SVG and set explicit dimensions
	const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
	const width = svgElement.width.baseVal.value;
	const height = svgElement.height.baseVal.value;

	clonedSvg.setAttribute('width', String(width));
	clonedSvg.setAttribute('height', String(height));

	// 2. Inline computed styles to ensure colors render correctly
	inlineStyles(clonedSvg);

	// 3. Serialize the SVG to a string
	const serializer = new XMLSerializer();
	const svgString = serializer.serializeToString(clonedSvg);

	// 4. Create a data URL
	const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
	const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

	// 5. Create an Image and load the data URL
	const img = new Image();
	img.crossOrigin = 'anonymous';

	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = () => reject(new Error('Failed to load SVG as image'));
		img.src = dataUrl;
	});

	// 6. Draw to a canvas at 2x resolution for quality
	const scale = 2;
	const canvas = document.createElement('canvas');
	canvas.width = width * scale;
	canvas.height = height * scale;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Failed to get canvas 2D context');
	}

	// Fill with white background (SVG may be transparent)
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Draw the image scaled up
	ctx.scale(scale, scale);
	ctx.drawImage(img, 0, 0);

	// 7. Convert to PNG blob
	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(b) => {
				if (b) {
					resolve(b);
				} else {
					reject(new Error('Failed to create PNG blob'));
				}
			},
			'image/png',
			1.0
		);
	});

	// 8. Trigger download
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${filename}.png`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Inline computed styles on SVG elements to ensure proper rendering
 * when the SVG is serialized and rendered to canvas
 */
function inlineStyles(element: Element): void {
	const computedStyle = window.getComputedStyle(element);

	// Key style properties that affect SVG rendering
	const styleProperties = [
		'fill',
		'fill-opacity',
		'stroke',
		'stroke-width',
		'stroke-opacity',
		'stroke-dasharray',
		'stroke-linecap',
		'stroke-linejoin',
		'opacity',
		'font-family',
		'font-size',
		'font-weight',
		'text-anchor',
		'dominant-baseline'
	];

	let inlineStyle = '';
	for (const prop of styleProperties) {
		const value = computedStyle.getPropertyValue(prop);
		if (value && value !== 'none' && value !== '') {
			inlineStyle += `${prop}: ${value}; `;
		}
	}

	if (inlineStyle) {
		const existingStyle = element.getAttribute('style') || '';
		element.setAttribute('style', existingStyle + inlineStyle);
	}

	// Recursively process children
	for (const child of element.children) {
		inlineStyles(child);
	}
}
