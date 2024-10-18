// test/utils.test.js
import { expect } from 'chai';
import { RealtimeUtils } from '../src/realtime/lib/utils.js';

import fs from 'fs';
import path from 'path';

describe('MergeBuffer', function () {
	it('smerge two arrays', function () {
		
		const formatted = [1,2,3,4,5,6,7,8,9,10];
		const appendValues = new Uint8Array([11,12,13,14,15,16,17,18,19,20]);

		const merged = RealtimeUtils.mergeUint8Arrays(
			formatted,
			appendValues,
		)
		
		expect(merged).to.deep.equal(new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]))

	});
});