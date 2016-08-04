/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import * as cssLanguageService from '../../cssLanguageService';

import {CompletionList, TextDocument, TextEdit, Position, CompletionItemKind} from 'vscode-languageserver-types';
import {applyEdits} from '../textEditSupport';

export interface ItemDescription {
	label: string;
	documentation?: string;
	kind?: CompletionItemKind;
	insertText?: string;
	resultText?: string;
}

function asPromise<T>(result:T) : Promise<T> {
	return Promise.resolve(result);
}

export let assertCompletion = function (completions: CompletionList, expected: ItemDescription, document?: TextDocument) {
	let matches = completions.items.filter(completion => {
		return completion.label === expected.label;
	});
	assert.equal(matches.length, 1, expected.label + " should only existing once: Actual: " + completions.items.map(c => c.label).join(', '));
	if (expected.documentation) {
		assert.equal(matches[0].documentation, expected.documentation);
	}
	if (expected.kind) {
		assert.equal(matches[0].kind, expected.kind);
	}
	if (expected.insertText) {
		assert.equal(matches[0].insertText, expected.insertText);
	}
	if (document && expected.resultText) {
		assert.equal(applyEdits(document, [matches[0].textEdit]), expected.resultText);
	}
};

suite('CSS - Completion', () => {

	let testCompletionFor = function (value: string, expected: { count?: number, items?: ItemDescription[] }): Thenable<void> {
		let idx = value.indexOf('|');
		value = value.substr(0, idx) + value.substr(idx + 1);

		let ls = cssLanguageService.getCSSLanguageService();

		let document = TextDocument.create('test://test/test.css', 'css', 0, value);
		let position = Position.create(0, idx);
		let jsonDoc = ls.parseStylesheet(document);
		return asPromise(ls.doComplete(document, position, jsonDoc)).then(list => {
			if (expected.count) {
				assert.equal(list.items, expected.count);
			}
			if (expected.items) {
				for (let item of expected.items) {
					assertCompletion(list, item, document);
				}
			}
		});
	};

	test('sylesheet', function (testDone): any {
		Promise.all([
			testCompletionFor('| ', {
				items: [
					{ label: '@import' },
					{ label: '@keyframes' },
					{ label: 'div' }
				]
			}),
			testCompletionFor('| body {', {
				items: [
					{ label: '@import' },
					{ label: '@keyframes' },
					{ label: 'html' }
				]
			}),
			testCompletionFor('@|import url("something.css");', {
				count: 0
			})
		]).then(() => testDone(), (error) => testDone(error));
	});
	test('properties', function (testDone): any {
		Promise.all([
			testCompletionFor('body {|', {
				items: [
					{ label: 'display' },
					{ label: 'background' }
				]
			}),
			testCompletionFor('body { ver|', {
				items: [
					{ label: 'vertical-align' }
				]
			}),
			testCompletionFor('body { vertical-ali|gn', {
				items: [
					{ label: 'vertical-align' }
				]
			}),
			testCompletionFor('body { vertical-align|', {
				items: [
					{ label: 'vertical-align' }
				]
			}),
			testCompletionFor('body { vertical-align|: bottom;}',{
				items: [
					{ label: 'vertical-align' }
				]
			}),
			testCompletionFor('body { trans| ', {
				items: [
					{ label: 'transition' }
				]
			})
		]).then(() => testDone(), (error) => testDone(error));
	});
	test('values', function (testDone): any {
		Promise.all([
			testCompletionFor('body { vertical-align:| bottom;}', {
				items: [
					{ label: 'bottom' },
					{ label: '0cm' }
				]
			}),
			testCompletionFor('body { vertical-align: |bottom;}', {
				items: [
					{ label: 'bottom' },
					{ label: '0cm' }
				]
			}),
			testCompletionFor('body { vertical-align: bott|', {
				items: [
					{ label: 'bottom' }
				]
			}),
			testCompletionFor('body { vertical-align: bott|om }', {
				items: [
					{ label: 'bottom' }
				]
			}),
			testCompletionFor('body { vertical-align: bottom| }', {
				items: [
					{ label: 'bottom' }
				]
			}),
			testCompletionFor('body { vertical-align: bottom|; }', {
				items: [
					{ label: 'bottom' }
				]
			}),
			testCompletionFor('body { vertical-align: bottom;| }', {
				count: 0
			}),
			testCompletionFor('body { vertical-align: bottom; |}', {
				items: [
					{ label: 'display' }
				]
			})
		]).then(() => testDone(), (error) => testDone(error));
	});
	test('units', function (testDone): any {
		Promise.all([
			testCompletionFor('body { vertical-align: 9| }', {
				items: [
					{ label: '9cm' }
				]
			}),
			testCompletionFor('body { vertical-align: 1.2| }', {
				items: [
					{ label: '1.2em' }
				]
			}),
			testCompletionFor('body { vertical-align: 1|0 }', {
				items: [
					{ label: '1cm' }
				]
			}),
			testCompletionFor('body { vertical-align: 10c| }', {
				items: [
					{ label: '10cm' }
				]
			})
		]).then(() => testDone(), (error) => testDone(error));
	});
	test('unknown', function (testDone): any {
		Promise.all([
			testCompletionFor('body { notexisting: |;}', {
				count: 0
			}),
			testCompletionFor('.foo { unknown: foo; } .bar { unknown:| }', {
				items: [
					{ label: 'foo', kind: CompletionItemKind.Value }
				]
			})
		]).then(() => testDone(), (error) => testDone(error));
	});
	test('colors', function (testDone): any {
		Promise.all([
			testCompletionFor('body { border-right: |', {
				items: [
					{ label: 'cyan' },
					{ label: 'dotted' },
					{ label: '0em' }
				]
			}),
			testCompletionFor('body { border-right: cyan| dotted 2em ', {
				items: [
					{ label: 'cyan' },
					{ label: 'darkcyan' }
				]
			}),
			testCompletionFor('body { border-right: dotted 2em |', {
				items: [
					{ label: 'cyan' }
				]
			}),
			testCompletionFor('.foo { background-color: #123456; } .bar { background-color:| }', {
				items: [
					{ label: '#123456', kind: CompletionItemKind.Color }
				]
			}),
			testCompletionFor('.foo { background-color: r|', {
				items: [
					{ label: 'rgb', kind: CompletionItemKind.Function },
					{ label: 'rgba', kind: CompletionItemKind.Function },
					{ label: 'red', kind: CompletionItemKind.Color }
				]
			})
		]).then(() => testDone(), (error) => testDone(error));
	});
	test('variables', function (testDone): any {
		Promise.all([
			testCompletionFor(':root { --myvar: red; } body { color: |', {
				items: [
					{ label: '--myvar', insertText: 'var(--myvar)'},
				]
			}),
			testCompletionFor('body { --myvar: 0px; border-right: var| ', {
				items: [
					{ label: '--myvar', insertText: 'var(--myvar)'},
				]
			}),
			testCompletionFor('body { --myvar: 0px; border-right: var(| ', {
				items: [
					{ label: '--myvar', insertText: '--myvar'},
				]
			})
		]).then(() => testDone(), (error) => testDone(error));
	});
});

