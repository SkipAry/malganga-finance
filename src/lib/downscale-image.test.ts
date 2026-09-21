/**
 * Runnable check for the resize arithmetic: `npm test`.
 *
 * Only fitScale is covered - the rest of downscale-image.ts is canvas work
 * that needs a browser. This is the part that decides whether a photo is
 * touched at all and by how much, so it is the part worth pinning down.
 */
import assert from "node:assert/strict";

import { fitScale } from "./downscale-image";

// Never enlarge: a small scan stays exactly as it is.
assert.equal(fitScale(800, 600, 1600), 1, "under the limit should not scale");
assert.equal(fitScale(1600, 1200, 1600), 1, "exactly at the limit should not scale");

// Landscape and portrait both fit their long edge to the box.
assert.equal(fitScale(3200, 2400, 1600), 0.5, "landscape scales on width");
assert.equal(fitScale(2400, 3200, 1600), 0.5, "portrait scales on height");
assert.equal(fitScale(4000, 4000, 1600), 0.4, "square scales on either edge");

// A 12MP phone photo, the case this exists for.
const scale = fitScale(4032, 3024, 1600);
assert.equal(Math.round(4032 * scale), 1600, "long edge lands on the limit");
assert.equal(Math.round(3024 * scale), 1200, "aspect ratio is preserved");

// Degenerate input from a failed decode must not produce Infinity or NaN.
assert.equal(fitScale(0, 0, 1600), 1, "zero dimensions fall back to no scaling");

console.log("downscale-image: all checks passed");
