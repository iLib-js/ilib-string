/*
 * teststrings-es6.js - test the String object in ES6
 *
 * Copyright © 2021, JEDLSoft
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Locale from 'ilib-locale';
import IString from '../lib/IString';

export const teststringses6 = {
    testStringConstructor: function(test) {
        test.expect(1);
        var str = new IString();

        test.ok(str !== null);
        test.done();
    },

    testStringConstructorEmpty: function(test) {
        test.expect(3);
        var str = new IString();

        test.ok(str !== null);

        test.equal(str.length, 0);
        test.equal(str.toString(), "");
        test.done();
    },

    testStringConstructorFull: function(test) {
        test.expect(3);
        var str = new IString("test test test");

        test.ok(str !== null);

        test.equal(str.length, 14);
        test.equal(str.toString(), "test test test");
        test.done();
    },

    testStringIteratorWithOfOperator: function(test) {
        test.expect(14);
        var str = new IString("test test test");

        const expected = [
            "t",
            "e",
            "s",
            "t",
            " ",
            "t",
            "e",
            "s",
            "t",
            " ",
            "t",
            "e",
            "s",
            "t"
        ];
        let index = 0;

        // should automatically call the iterator
        for (let ch of str) {
            test.equal(ch, expected[index++]);
        }

        test.done();
    },

    testStringIteratorWithOfOperatorWithSurrogates: function(test) {
        test.expect(16);
        var str = new IString("test\uD800\uDF02 t\uD800\uDC00est test");

        const expected = [
            "t",
            "e",
            "s",
            "t",
            "\uD800\uDF02",
            " ",
            "t",
            "\uD800\uDC00",
            "e",
            "s",
            "t",
            " ",
            "t",
            "e",
            "s",
            "t"
        ];
        let index = 0;

        // should automatically call the iterator and iterate
        // through the "astal plane" characters properly
        for (let ch of str) {
            test.equal(ch, expected[index++]);
        }

        test.done();
    },

    testStringIteratorWithSpreadOperator: function(test) {
        test.expect(1);
        var str = new IString("test test test");

        const expected = [
            "t",
            "e",
            "s",
            "t",
            " ",
            "t",
            "e",
            "s",
            "t",
            " ",
            "t",
            "e",
            "s",
            "t"
        ];

        // should automatically call the iterator
        const actual = [...str];

        test.deepEqual(actual, expected);

        test.done();
    },

    testStringIteratorWithSpreadOperatorWithSurrogates: function(test) {
        test.expect(1);
        var str = new IString("test\uD800\uDF02 t\uD800\uDC00est test");

        const expected = [
            "t",
            "e",
            "s",
            "t",
            "\uD800\uDF02",
            " ",
            "t",
            "\uD800\uDC00",
            "e",
            "s",
            "t",
            " ",
            "t",
            "e",
            "s",
            "t"
        ];

        // should automatically call the iterator and iterate
        // properly over the UTF-16 characters
        const actual = [...str];

        test.deepEqual(actual, expected);

        test.done();
    }

};
