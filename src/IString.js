/*
 * IString.js - ilib string subclass definition
 *
 * Copyright © 2012-2015, 2018, 2021 JEDLSoft
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

import { getPlatform } from 'ilib-env';
import { Utils, MathUtils, JSUtils } from 'ilib-common';

import Locale from "ilib-locale";

import plurals from '../locale/allplurals.json';

/**
 * @class
 * Create a new ilib string instance. This string inherits from and
 * extends the Javascript String class. It can be
 * used almost anywhere that a normal Javascript string is used, though in
 * some instances you will need to call the {@link #toString} method when
 * a built-in Javascript string is needed. The formatting methods are
 * methods that are not in the intrinsic String class and are most useful
 * when localizing strings in an app or web site in combination with
 * the ResBundle class.<p>
 *
 * This class is named IString ("ilib string") so as not to conflict with the
 * built-in Javascript String class.
 */
class IString {
    /**
     * Create a new ilib string instance.<p>
     *
     * The options may contain the following properties:
     * <ul>
     * <li>locale - the locale of this string
     * </ul>
     *
     * @constructor
     * @param {string|IString=} string initialize this instance with this string
     * @param {options=} options options governing the construction of this instance
     */
    constructor(string, options) {
        if (typeof(string) === 'object') {
            if (string instanceof IString) {
                this.str = string.str;
            } else {
                this.str = string.toString();
            }
        } else if (typeof(string) === 'string') {
            this.str = String(string); // copy it
        } else {
            this.str = "";
        }
        this.length = this.str.length;
        this.cpLength = -1;
        const { locale = "en-US" } = options || {};
        this.localeSpec = locale;
        this.locale = new Locale(locale);
    }

    /**
     * Return the length of this string in Unicode characters. This function defers to the regular
     * Javascript string class in order to perform the length function. Please note that this
     * method is a real method, whereas the length property of Javascript strings is
     * implemented by native code and appears as a property.<p>
     *
     * Example:
     *
     * <pre>
     * const str = new IString("this is a string");
     * console.log("String is " + str._length() + " characters long.");
     * </pre>
     * @private
     * @deprecated
     */
    _length() {
        return this.str.length;
    }

    /**
     * Format this string instance as a message, replacing the parameters with
     * the given values.<p>
     *
     * The string can contain any text that a regular Javascript string can
     * contain. Replacement parameters have the syntax:
     *
     * <pre>
     * {name}
     * </pre>
     *
     * Where "name" can be any string surrounded by curly brackets. The value of
     * "name" is taken from the parameters argument.<p>
     *
     * Example:
     *
     * <pre>
     * const str = new IString("There are {num} objects.");
     * console.log(str.format({
     *   num: 12
     * });
     * </pre>
     *
     * Would give the output:
     *
     * <pre>
     * There are 12 objects.
     * </pre>
     *
     * If a property is missing from the parameter block, the replacement
     * parameter substring is left untouched in the string, and a different
     * set of parameters may be applied a second time. This way, different
     * parts of the code may format different parts of the message that they
     * happen to know about.<p>
     *
     * Example:
     *
     * <pre>
     * const str = new IString("There are {num} objects in the {container}.");
     * console.log(str.format({
     *   num: 12
     * });
     * </pre>
     *
     * Would give the output:<p>
     *
     * <pre>
     * There are 12 objects in the {container}.
     * </pre>
     *
     * The result can then be formatted again with a different parameter block that
     * specifies a value for the container property.
     *
     * @param params a Javascript object containing values for the replacement
     * parameters in the current string
     * @return a new IString instance with as many replacement parameters filled
     * out as possible with real values.
     */
    format(params) {
        let formatted = this.str;
        if (params) {
            let regex;
            for (let p in params) {
                if (typeof(params[p]) !== 'undefined') {
                    regex = new RegExp("\{"+p+"\}", "g");
                    formatted = formatted.replace(regex, params[p]);
                }
            }
        }
        return formatted.toString();
    }

    /** @private */
    _testChoice(index, limit) {
        let numberDigits = {};
        let operandValue = {};

        switch (typeof(index)) {
            case 'number':
                operandValue = IString._fncs.calculateNumberDigits(index);

                if (limit.substring(0,2) === "<=") {
                    limit = parseFloat(limit.substring(2));
                    return operandValue.n <= limit;
                } else if (limit.substring(0,2) === ">=") {
                    limit = parseFloat(limit.substring(2));
                    return operandValue.n >= limit;
                } else if (limit.charAt(0) === "<") {
                    limit = parseFloat(limit.substring(1));
                    return operandValue.n < limit;
                } else if (limit.charAt(0) === ">") {
                    limit = parseFloat(limit.substring(1));
                    return operandValue.n > limit;
                } else {
                    this.locale = this.locale || new Locale(this.localeSpec);
                    switch (limit) {
                        case "zero":
                        case "one":
                        case "two":
                        case "few":
                        case "many":
                            // CLDR locale-dependent number classes
                            const ruleset = plurals[this.locale.getLanguage()] || IString.pluralsDefault;
                            if (ruleset) {
                                const rule = ruleset[limit];
                                return IString._fncs.getValue(rule, operandValue);
                            }
                            break;
                        case "":
                        case "other":
                            // matches anything
                            return true;
                        default:
                            const dash = limit.indexOf("-");
                            if (dash !== -1) {
                                // range
                                const start = limit.substring(0, dash);
                                const end = limit.substring(dash+1);
                                return operandValue.n >= parseInt(start, 10) && operandValue.n <= parseInt(end, 10);
                            } else {
                                return operandValue.n === parseInt(limit, 10);
                            }
                    }
                }
                break;
            case 'boolean':
                return (limit === "true" && index === true) || (limit === "false" && index === false);

            case 'string':
                const regexp = new RegExp(limit, "i");
                return regexp.test(index);

            case 'object':
                throw "syntax error: formatChoice parameter for the argument index cannot be an object";
        }

        return false;
    }

    /**
     * Format a string as one of a choice of strings dependent on the value of
     * a particular argument index or array of indices.<p>
     *
     * The syntax of the choice string is as follows. The string contains a
     * series of choices separated by a vertical bar character "|". Each choice
     * has a value or range of values to match followed by a hash character "#"

     * followed by the string to use if the variable matches the criteria.<p>
     *
     * Example string:
     *
     * <pre>
     * const num = 2;
     * const str = new IString("0#There are no objects.|1#There is one object.|2#There are {number} objects.");
     * console.log(str.formatChoice(num, {
     *   number: num
     * }));
     * </pre>
     *
     * Gives the output:
     *
     * <pre>
     * "There are 2 objects."
     * </pre>
     *
     * The strings to format may contain replacement variables that will be formatted
     * using the format() method above and the params argument as a source of values
     * to use while formatting those variables.<p>
     *
     * If the criterion for a particular choice is empty, that choice will be used
     * as the default one for use when none of the other choice's criteria match.<p>
     *
     * Example string:
     *
     * <pre>
     * const num = 22;
     * const str = new IString("0#There are no objects.|1#There is one object.|#There are {number} objects.");
     * console.log(str.formatChoice(num, {
     *   number: num
     * }));
     * </pre>
     *
     * Gives the output:
     *
     * <pre>
     * "There are 22 objects."
     * </pre>
     *
     * If multiple choice patterns can match a given argument index, the first one
     * encountered in the string will be used. If no choice patterns match the
     * argument index, then the default choice will be used. If there is no default
     * choice defined, then this method will return an empty string.<p>
     *
     * <b>Special Syntax</b><p>
     *
     * For any choice format string, all of the patterns in the string should be
     * of a single type: numeric, boolean, or string/regexp. The type of the
     * patterns is determined by the type of the argument index parameter.<p>
     *
     * If the argument index is numeric, then some special syntax can be used
     * in the patterns to match numeric ranges.<p>
     *
     * <ul>
     * <li><i>&gt;x</i> - match any number that is greater than x
     * <li><i>&gt;=x</i> - match any number that is greater than or equal to x
     * <li><i>&lt;x</i> - match any number that is less than x
     * <li><i>&lt;=x</i> - match any number that is less than or equal to x
     * <li><i>start-end</i> - match any number in the range [start,end)
     * <li><i>zero</i> - match any number in the class "zero". (See below for
     * a description of number classes.)
     * <li><i>one</i> - match any number in the class "one"
     * <li><i>two</i> - match any number in the class "two"
     * <li><i>few</i> - match any number in the class "few"
     * <li><i>many</i> - match any number in the class "many"
     * <li><i>other</i> - match any number in the other or default class
     * </ul>
     *
     * A number class defines a set of numbers that receive a particular syntax
     * in the strings. For example, in Slovenian, integers ending in the digit
     * "1" are in the "one" class, including 1, 21, 31, ... 101, 111, etc.
     * Similarly, integers ending in the digit "2" are in the "two" class.
     * Integers ending in the digits "3" or "4" are in the "few" class, and
     * every other integer is handled by the default string.<p>
     *
     * The definition of what numbers are included in a class is locale-dependent.
     * They are defined in the data file plurals.json. If your string is in a
     * different locale than the default for ilib, you should call the setLocale()
     * method of the string instance before calling this method.<p>
     *
     * <b>Other Pattern Types</b><p>
     *
     * If the argument index is a boolean, the string values "true" and "false"
     * may appear as the choice patterns.<p>
     *
     * If the argument index is of type string, then the choice patterns may contain
     * regular expressions, or static strings as degenerate regexps.<p>
     *
     * <b>Multiple Indexes</b><p>
     *
     * If you have 2 or more indexes to format into a string, you can pass them as
     * an array. When you do that, the patterns to match should be a comma-separate
     * list of patterns as per the rules above.<p>
     *
     * Example string:
     *
     * <pre>
     * const str = new IString("zero,zero#There are no objects on zero pages.|one,one#There is 1 object on 1 page.|other,one#There are {number} objects on 1 page.|#There are {number} objects on {pages} pages.");
     * const num = 4, pages = 1;
     * console.log(str.formatChoice([num, pages], {
     *   number: num,
     *   pages: pages
     * }));
     * </pre>
     *
     * Gives the output:<p>
     *
     * <pre>
     * "There are 4 objects on 1 page."
     * </pre>
     *
     * Note that when there is a single index, you would typically leave the pattern blank to
     * indicate the default choice. When there are multiple indices, sometimes one of the
     * patterns has to be the default case when the other is not. Rather than leaving one or
     * more of the patterns blank with commas that look out-of-place in the middle of it, you
     * can use the word "other" to indicate a match with the default or other choice. The above example
     * shows the use of the "other" pattern. That said, you are allowed to leave the pattern
     * blank if you so choose. In the example above, the pattern for the third string could
     * easily have been written as ",one" instead of "other,one" and the result will be the same.
     *
     * @param {*|Array.<*>} argIndex The index into the choice array of the current parameter,
     * or an array of indices
     * @param {Object} params The hash of parameter values that replace the replacement
     * variables in the string
     * @throws "syntax error in choice format pattern: " if there is a syntax error
     * @return {string} the formatted string
     */
    formatChoice(argIndex, params) {
        const choices = this.str.split("|");
        let limits = [];
        let strings = [];
        let i;
        let parts;
        let limit;
        let result = undefined;
        let defaultCase = "";

        if (this.str.length === 0) {
            // nothing to do
            return "";
        }

        // first parse all the choices
        for (i = 0; i < choices.length; i++) {
            parts = choices[i].split("#");
            if (parts.length > 2) {
                limits[i] = parts[0];
                parts = parts.shift();
                strings[i] = parts.join("#");
            } else if (parts.length === 2) {
                limits[i] = parts[0];
                strings[i] = parts[1];
            } else {
                // syntax error
                throw "syntax error in choice format pattern: " + choices[i];
            }
        }

        const args = (JSUtils.isArray(argIndex)) ? argIndex : [argIndex];

        // then apply the argument index (or indices)
        for (i = 0; i < limits.length; i++) {
            if (limits[i].length === 0) {
                // this is default case
                defaultCase = new IString(strings[i]);
            } else {
                const limitsArr = (limits[i].indexOf(",") > -1) ? limits[i].split(",") : [limits[i]];

                let applicable = true;
                for (let j = 0; applicable && j < args.length && j < limitsArr.length; j++) {
                    applicable = this._testChoice(args[j], limitsArr[j]);
                }

                if (applicable) {
                    result = new IString(strings[i]);
                    i = limits.length;
                }
            }
        }

        if (!result) {
            result = defaultCase || new IString("");
        }

        result = result.format(params);

        return result.toString();
    }

    // delegates
    /**
     * Same as String.at()
     * @param {number} offset offset into the string
     * @return {IString} the single UTF-16 code point located at the specified offset
     */
    at(offset) {
        return JSUtils.toCodePoint(this.str, offset);
    }

    /**
     * Same as String.charAt()
     * @param {number} index the index of the character being sought
     * @return {IString} the character at the given index
     */
    charAt(index) {
        return new IString(this.str.charAt(index));
    }

    /**
     * Same as String.charCodeAt(). This only reports on
     * 2-byte UCS-2 Unicode values, and does not take into
     * account supplementary characters encoded in UTF-16.
     * If you would like to take account of those characters,
     * use codePointAt() instead.
     * @param {number} index the index of the character being sought
     * @return {number} the character code of the character at the
     * given index in the string
     */
    charCodeAt(index) {
        return this.str.charCodeAt(index);
    }

    /**
     * Parse the string into an array of code points.
     * @private
     */
    generateCodePointArray() {
        let index = 0;
        this.codePoints = [];
        while (index < this.str.length) {
            const num = JSUtils.toCodePoint(this.str, index);
            index += ((num > 0xFFFF) ? 2 : 1);
            this.codePoints.push(num);
        }
    }

    /**
     * Return the code point at the given index when the string is viewed
     * as an array of code points. If the index is beyond the end of the
     * array of code points or if the index is negative, -1 is returned.
     * @param {number} index index of the code point
     * @return {number} code point of the character at the given index into
     * the string
     */
    codePointAt(index) {
        if (!this.codePoints) {
            this.generateCodePointArray();
        }
        return (index < 0 || index >= this.codePoints.length) ? -1 : this.codePoints[index];
    }

    /**
     * Same as String.concat()
     * @param {string} strings strings to concatenate to the current one
     * @return {IString} a concatenation of the given strings
     */
    concat(strings) {
        return new IString(this.str.concat(strings));
    }

    /**
     * Same as String.endsWith().
     * @return {boolean} true if the given characters are found at
     * the end of the string, and false otherwise
     */
    endsWith(searchString, length) {
        /* (note)length is optional. If it is omitted the default value is the length of string.
        *  But If length is omitted, it returns false on QT. (tested on QT 5.12.4 and 5.13.0)
        */
        if (typeof length === "undefined") {
            length = this.str.length;
        }
        return this.str.endsWith(searchString, length);
    }

    /**
     * Same as String.includes()
     * @param {string} searchValue string to search for
     * @param {number} start index into the string to start searching, or
     * undefined to search the entire string
     * @return {boolean}
     */
    includes(searchValue, start) {
        return this.str.includes(searchValue, start);
    }

    /**
     * Same as String.indexOf()
     * @param {string} searchValue string to search for
     * @param {number} start index into the string to start searching, or
     * undefined to search the entire string
     * @return {number} index into the string of the string being sought,
     * or -1 if the string is not found
     */
    indexOf(searchValue, start) {
        return this.str.indexOf(searchValue, start);
    }

    /**
     * Same as String.lastIndexOf()
     * @param {string} searchValue string to search for
     * @param {number} start index into the string to start searching, or
     * undefined to search the entire string
     * @return {number} index into the string of the string being sought,
     * or -1 if the string is not found
     */
    lastIndexOf(searchValue, start) {
        return this.str.lastIndexOf(searchValue, start);
    }

    /**
     * Same as String.localeCompare()
     * @param {String} compareString
     * @param {String=} locales
     * @param {Object=} options
     */
    localeCompare(compareString, locales, options) {
        return this.str.localeCompare(compareString, typeof(locales) === 'undefined' ? this.getLocale() : locales, options);
    }

    /**
     * Same as String.match()
     * @param {string} regexp the regular expression to match
     * @return {Array.<string>} an array of matches
     */
    match(regexp) {
        return this.str.match(regexp);
    }

    /**
     * Same as String.matchAll()
     * @param {string} regexp the regular expression to match
     * @return {iterator} an iterator of the matches
     */
    matchAll(regexp) {
        return this.str.matchAll(regexp);
    }

    /**
     * Same as String.normalize(). If this JS engine does not support
     * this method, then you can use the NormString class of ilib
     * to the same thing (albeit a little slower).
     *
     * @param {String} form the name of the Unicode Normalization Form
     * @return {IString} the normalize version of the string
     */
    normalize(form) {
        return typeof(this.str.normalize) === 'function' ? new IString(this.str.normalize(form)) : this;
    }

    /**
     * Same as String.padEnd().
     * @return {IString} a string of the specified length with the
     * pad string applied at the end of the current string
     */
    padEnd(targetLength, padString) {
        return new IString(this.str.padEnd(targetLength, padString));
    }

    /**
     * Same as String.padStart().
     * @return {IString} a string of the specified length with the
     * pad string applied at the end of the current string
     */
    padStart(targetLength, padString) {
        return new IString(this.str.padStart(targetLength, padString));
    }

    /**
     * Same as String.repeat().
     * @return {IString} a new string containing the specified number
     * of copies of the given string
     */
    repeat(count) {
        return new IString(this.str.repeat(count));
    }

    /**
     * Same as String.replace()
     * @param {string} searchValue a regular expression to search for
     * @param {string} newValue the string to replace the matches with
     * @return {IString} a new string with all the matches replaced
     * with the new value
     */
    replace(searchValue, newValue) {
        return new IString(this.str.replace(searchValue, newValue));
    }

    /**
     * Same as String.replaceAll()
     * @param {string} searchValue a regular expression to search for
     * @param {string} newValue the string to replace the matches with
     * @return {IString} a new string with all the matches replaced
     * with the new value
     */
    replaceAll(searchValue, newValue) {
        return new IString(this.str.replaceAll(searchValue, newValue));
    }

    /**
     * Same as String.search()
     * @param {string} regexp the regular expression to search for
     * @return {number} position of the match, or -1 for no match
     */
    search(regexp) {
        return this.str.search(regexp);
    }

    /**
     * Same as String.slice()
     * @param {number} start first character to include in the string
     * @param {number} end include all characters up to, but not including
     * the end character
     * @return {IString} a slice of the current string
     */
    slice(start, end) {
        return new IString(this.str.slice(start, end));
    }

    /**
     * Same as String.split()
     * @param {string} separator regular expression to match to find
     * separations between the parts of the text
     * @param {number} limit maximum number of items in the final
     * output array. Any items beyond that limit will be ignored.
     * @return {Array.<string>} the parts of the current string split
     * by the separator
     */
    split(separator, limit) {
        return this.str.split(separator, limit).map(str => new IString(str));
    }

    /**
     * Same as String.startsWith().
     * @return {boolean} true if the given characters are found at
     * the beginning of the string, and false otherwise
     */
    startsWith(searchString, length) {
        return this.str.startsWith(searchString, length);
    }

    /**
     * Same as String.substr()
     * @param {number} start the index of the character that should
     * begin the returned substring
     * @param {number} length the number of characters to return after
     * the start character.
     * @return {IString} the requested substring
     */
    substr(start, length) {
        const plat = getPlatform();
        if (plat === "qt" || plat === "rhino" || plat === "trireme") {
            // qt and rhino have a broken implementation of substr(), so
            // work around it
            if (typeof(length) === "undefined") {
                length = this.str.length - start;
            }
        }
        return new IString(this.str.substr(start, length));
    }

    /**
     * Same as String.substring()
     * @param {number} from the index of the character that should
     * begin the returned substring
     * @param {number} to the index where to stop the extraction. If
     * omitted, extracts the rest of the string
     * @return {IString} the requested substring
     */
    substring(from, to) {
        return new IString(this.str.substring(from, to));
    }

    /**
     * Same as String.toLocaleLowerCase(). If the JS engine does not support this
     * method, you can use the ilib CaseMapper class instead.
     * @return {IString} a new string representing the calling string
     * converted to lower case, according to any locale-sensitive
     * case mappings
     */
    toLocaleLowerCase(locale) {
        return new IString(this.str.toLocaleLowerCase(locale));
    }

    /**
     * Same as String.toLocaleUpperCase(). If the JS engine does not support this
     * method, you can use the ilib CaseMapper class instead.
     * @return {IString} a new string representing the calling string
     * converted to upper case, according to any locale-sensitive
     * case mappings
     */
    toLocaleUpperCase(locale) {
        return new IString(this.str.toLocaleUpperCase(locale));
    }

    /**
     * Same as String.toLowerCase(). Note that this method is
     * not locale-sensitive.
     * @return {IString} a string with all the characters
     * lower-cased
     */
    toLowerCase() {
        return new IString(this.str.toLowerCase());
    }

    /**
     * Same as String.toString()
     * @return {string} this instance as regular Javascript string
     */
    toString() {
        return this.str.toString();
    }

    /**
     * Same as String.toUpperCase(). Note that this method is
     * not locale-sensitive. Use toLocaleUpperCase() instead
     * to get locale-sensitive behaviour.
     * @return {IString} a string with all the characters
     * upper-cased
     */
    toUpperCase() {
        return new IString(this.str.toUpperCase());
    }

    /**
     * Same as String.trim().
     * @return {IString} a new string representing the calling string stripped
     * of whitespace from both ends.
     */
    trim() {
        return new IString(this.str.trim());
    }

    /**
     * Same as String.trimEnd().
     * @return {IString} a new string representing the calling string stripped
     * of whitespace from its (right) end.
     */
    trimEnd() {
        return new IString(this.str.trimEnd());
    }

    /**
     * Same as String.trimStart().
     * @return {IString} A new string representing the calling string stripped
     * of whitespace from its beginning (left end).
     */
    trimStart() {
        return new IString(this.str.trimStart());
    }

    /**
     * Same as String.valueOf()
     * @return {string} this instance as a regular Javascript string
     */
    valueOf() {
        return this.str.valueOf();
    }

    // end of delegates

    /**
     * Same as String.trimRight().
     * @return {IString} a new string representing the calling string stripped
     * of whitespace from its (right) end.
     */
    trimRight() {
        return new IString(this.str.trimRight());
    }

    /**
     * Same as String.trimLeft().
     * @return {IString} A new string representing the calling string stripped
     * of whitespace from its beginning (left end).
     */
    trimLeft() {
        return new IString(this.str.trimLeft());
    }

    /**
     * Call the callback with each character in the string one at
     * a time, taking care to step through the surrogate pairs in
     * the UTF-16 encoding properly.<p>
     *
     * The standard Javascript String's charAt() method only
     * returns a particular 16-bit character in the
     * UTF-16 encoding scheme.
     * If the index to charAt() is pointing to a low- or
     * high-surrogate character,
     * it will return the surrogate character rather
     * than the the character
     * in the supplementary planes that the two surrogates together
     * encode. This function will call the callback with the full
     * character, making sure to join two
     * surrogates into one character in the supplementary planes
     * where necessary.<p>
     *
     * @param {function(string)} callback a callback function to call with each
     * full character in the current string
     */
    forEach(callback) {
        if (typeof(callback) === 'function') {
            const it = this.charIterator();
            while (it.hasNext()) {
                callback(it.next());
            }
        }
    }

    /**
     * Call the callback with each numeric code point in the string one at
     * a time, taking care to step through the surrogate pairs in
     * the UTF-16 encoding properly.<p>
     *
     * The standard Javascript String's charCodeAt() method only
     * returns information about a particular 16-bit character in the
     * UTF-16 encoding scheme.
     * If the index to charCodeAt() is pointing to a low- or
     * high-surrogate character,
     * it will return the code point of the surrogate character rather
     * than the code point of the character
     * in the supplementary planes that the two surrogates together
     * encode. This function will call the callback with the full
     * code point of each character, making sure to join two
     * surrogates into one code point in the supplementary planes.<p>
     *
     * @param {function(string)} callback a callback function to call with each
     * code point in the current string
     */
    forEachCodePoint(callback) {
        if (!this.codePoints) {
            this.generateCodePointArray();
        }
        if (typeof(callback) === 'function') {
            let index = 0;
            while (index < this.codePoints.length) {
                callback(this.codePoints[index++]);
            }
        }
    }

    /**
     * Return an iterator that will step through all of the characters
     * in the string one at a time and return their code points, taking
     * care to step through the surrogate pairs in UTF-16 encoding
     * properly.<p>
     *
     * The standard Javascript String's charCodeAt() method only
     * returns information about a particular 16-bit character in the
     * UTF-16 encoding scheme.
     * If the index is pointing to a low- or high-surrogate character,
     * it will return a code point of the surrogate character rather
     * than the code point of the character
     * in the supplementary planes that the two surrogates together
     * encode.<p>
     *
     * The iterator instance returned has two methods, hasNext() which
     * returns true if the iterator has more code points to iterate through,
     * and next() which returns the next code point as a number.<p>
     *
     * @return {Object} an iterator
     * that iterates through all the code points in the string
     */
    iterator() {
        function _iterator (istring) {
            if (!istring.codePoints) {
                istring.generateCodePointArray();
            }
            this.index = 0;
            this.hasNext = function () {
                return (this.index < istring.codePoints.length);
            };
            this.next = function () {
                return (this.index < istring.codePoints.length) ? istring.codePoints[this.index++] : -1;
            };
        };
        return new _iterator(this);
    }

    /**
     *
     * Implement the iterator protocol over the characters in the string
     * as a generator function. This allows an IString to be used with
     * the for..of operator:
     *
     * <pre>
     * const s = new IString("test");
     * for (let ch of s) {
     *     console.log(ch);
     * }
     * // prints:
     * // t
     * // e
     * // s
     * // t
     * </pre>
     *
     * It can also be used with the spread operator:
     * <pre>
     * const s = new IString("test");
     * console.log(`Chars are ${...s}`);
     * // prints:
     * // Chars are ['t','e','s','t']
     * </pre>
     *
     * This iterator properly skips over UTF-16 surrogate pairs and
     * return the "astral plane" Unicode characters.
     *
     * @generator
     * @function @@Iterator
     * @memberof IString
     * @yields {String} a string containing each character.
     */
    *[Symbol.iterator]() {
        let index = 0;
        if (!this.codePoints) {
            this.generateCodePointArray();
        }
        while (index < this.codePoints.length) {
            yield JSUtils.fromCodePoint(this.codePoints[index++]);
        }
    }

    /**
     * Return an iterator that will step through all of the characters
     * in the string one at a time, taking
     * care to step through the surrogate pairs in UTF-16 encoding
     * properly.<p>
     *
     * The standard Javascript String's charAt() method only
     * returns information about a particular 16-bit character in the
     * UTF-16 encoding scheme.
     * If the index is pointing to a low- or high-surrogate character,
     * it will return that surrogate character rather
     * than the surrogate pair which represents a character
     * in the supplementary planes.<p>
     *
     * The iterator instance returned has two methods, hasNext() which
     * returns true if the iterator has more characters to iterate through,
     * and next() which returns the next character.<p>
     *
     * @return {Object} an iterator
     * that iterates through all the characters in the string
     */
    charIterator() {
        /**
         * @constructor
         */
        function _chiterator (istring) {
            if (!istring.codePoints) {
                istring.generateCodePointArray();
            }
            this.index = 0;
            this.hasNext = function () {
                return (this.index < istring.codePoints.length);
            };
            this.next = function () {
                return (this.index < istring.codePoints.length) ?
                    JSUtils.fromCodePoint(istring.codePoints[this.index++]) :
                    undefined;
            };
        };
        return new _chiterator(this);
    }

    /**
     * Set the locale to use when processing choice formats. The locale
     * affects how number classes are interpretted. In some cultures,
     * the limit "few" maps to "any integer that ends in the digits 2 to 9" and
     * in yet others, "few" maps to "any integer that ends in the digits
     * 3 or 4".
     * @param {Locale|string} locale locale to use when processing choice
     * formats with this string
     * @param {boolean=} sync [optional] whether to load the locale data synchronously
     * or not
     * @param {Object=} loadParams [optional] parameters to pass to the loader function
     * @param {function(*)=} onLoad [optional] function to call when the loading is done
     */
    setLocale(locale, sync, loadParams, onLoad) {
        if (typeof(locale) === 'object') {
            this.locale = locale;
            this.localeSpec = this.locale.getSpec();
        } else {
            this.localeSpec = locale;
            this.locale = new Locale(locale);
        }

        //IString.loadPlurals(typeof(sync) !== 'undefined' ? sync : true, this.locale, loadParams, onLoad);
    }

    /**
     * Return the locale to use when processing choice formats. The locale
     * affects how number classes are interpretted. In some cultures,
     * the limit "few" maps to "any integer that ends in the digits 2 to 9" and
     * in yet others, "few" maps to "any integer that ends in the digits
     * 3 or 4".
     * @return {string} localespec to use when processing choice
     * formats with this string
     */
    getLocale() {
        return (this.locale ? this.locale.getSpec() : this.localeSpec) || "en-US";
    }

    /**
     * Return the number of code points in this string. This may be different
     * than the number of characters, as the UTF-16 encoding that Javascript
     * uses for its basis returns surrogate pairs separately. Two 2-byte
     * surrogate characters together make up one character/code point in
     * the supplementary character planes. If your string contains no
     * characters in the supplementary planes, this method will return the
     * same thing as the length() method.
     * @return {number} the number of code points in this string
     */
    codePointLength() {
        if (this.cpLength === -1) {
            const chars = [...this];
            this.cpLength = chars.length;
        }
        return this.cpLength;
    }
};

/**
 * Return true if the given character is a Unicode surrogate character,
 * either high or low.
 *
 * @private
 * @static
 * @param {string} ch character to check
 * @return {boolean} true if the character is a surrogate
 */
IString._isSurrogate = function (ch) {
    const n = ch.charCodeAt(0);
    return ((n >= 0xDC00 && n <= 0xDFFF) || (n >= 0xD800 && n <= 0xDBFF));
};

// Build in the generic rule for use with locales that do not have
// a definition yet.
IString.pluralsDefault = {
    "one": {
        "and": [
            {
                "eq": [
                    "i",
                    1
                ]
            },
            {
                "eq": [
                    "v",
                    0
                ]
            }
        ]
    }
};

// for backwards compatibility
IString.fromCodePoint = JSUtils.fromCodePoint;
IString.toCodePoint = JSUtils.toCodePoint;

/**
 * @private
 * @static
 */
IString._fncs = {
    /**
     * @private
     * @param {Object} obj
     * @return {string|undefined}
     */
    firstProp: function (obj) {
        for (let p in obj) {
            if (p && obj[p]) {
                return p;
            }
        }
        return undefined; // should never get here
    },

    /**
     * @private
     * @param {Object} obj
     * @return {string|undefined}
     */
    firstPropRule: function (obj) {
        if (Object.prototype.toString.call(obj) === '[object Array]') {
            return "inrange";
        } else if (Object.prototype.toString.call(obj) === '[object Object]') {
            for (let p in obj) {
                if (p && obj[p]) {
                    return p;
                }
            }

        }
        return undefined; // should never get here
    },

    /**
     * @private
     * @param {Object} obj
     * @param {number|Object} n
     * @return {?}
     */
    getValue: function (obj, n) {
        if (typeof(obj) === 'object') {
            const subrule = IString._fncs.firstPropRule(obj);
            if (subrule === "inrange") {
                return IString._fncs[subrule](obj, n);
            }
            return IString._fncs[subrule](obj[subrule], n);
        } else if (typeof(obj) === 'string') {
            if (typeof(n) === 'object'){
                return n[obj];
            }
            return n;
        } else {
            return obj;
        }
    },

    /**
     * @private
     * @param {number|Object} n
     * @param {Array.<number|Array.<number>>|Object} range
     * @return {boolean}
     */
    matchRangeContinuous: function(n, range) {

        for (let num in range) {
            if (typeof(num) !== 'undefined' && typeof(range[num]) !== 'undefined') {
                const obj = range[num];
                if (typeof(obj) === 'number') {
                    if (n === range[num]) {
                        return true;
                    } else if (n >= range[0] && n <= range[1]) {
                        return true;
                    }
                } else if (Object.prototype.toString.call(obj) === '[object Array]') {
                    if (n >= obj[0] && n <= obj[1]) {
                        return true;
                    }
                }
            }
        }
        return false;
    },

    /**
     * @private
     * @param {*} number
     * @return {Object}
     */
    calculateNumberDigits: function(number) {
        const numberToString = number.toString();
        let parts = [];
        let numberDigits =  {};
        let operandSymbol =  {};

        if (numberToString.indexOf('.') !== -1) { //decimal
            parts = numberToString.split('.', 2);
            numberDigits.integerPart = parseInt(parts[0], 10);
            numberDigits.decimalPartLength = parts[1].length;
            numberDigits.decimalPart = parseInt(parts[1], 10);

            operandSymbol.n = parseFloat(number);
            operandSymbol.i = numberDigits.integerPart;
            operandSymbol.v = numberDigits.decimalPartLength;
            operandSymbol.w = numberDigits.decimalPartLength;
            operandSymbol.f = numberDigits.decimalPart;
            operandSymbol.t = numberDigits.decimalPart;

        } else {
            numberDigits.integerPart = number;
            numberDigits.decimalPartLength = 0;
            numberDigits.decimalPart = 0;

            operandSymbol.n = parseInt(number, 10);
            operandSymbol.i = numberDigits.integerPart;
            operandSymbol.v = 0;
            operandSymbol.w = 0;
            operandSymbol.f = 0;
            operandSymbol.t = 0;

        }
        return operandSymbol
    },

    /**
     * @private
     * @param {number|Object} n
     * @param {Array.<number|Array.<number>>|Object} range
     * @return {boolean}
     */
    matchRange: function(n, range) {
        return IString._fncs.matchRangeContinuous(n, range);
    },

    /**
     * @private
     * @param {Object} rule
     * @param {number} n
     * @return {boolean}
     */
    is: function(rule, n) {
        const left = IString._fncs.getValue(rule[0], n);
        const right = IString._fncs.getValue(rule[1], n);
        return left == right;
    },

    /**
     * @private
     * @param {Object} rule
     * @param {number} n
     * @return {boolean}
     */
    isnot: function(rule, n) {
        return IString._fncs.getValue(rule[0], n) != IString._fncs.getValue(rule[1], n);
    },

    /**
     * @private
     * @param {Object} rule
     * @param {number|Object} n
     * @return {boolean}
     */
    inrange: function(rule, n) {
        if (typeof(rule[0]) === 'number') {
            if(typeof(n) === 'object') {
                return IString._fncs.matchRange(n.n,rule);
            }
            return IString._fncs.matchRange(n,rule);
        } else if (typeof(rule[0]) === 'undefined') {
            const subrule = IString._fncs.firstPropRule(rule);
            return IString._fncs[subrule](rule[subrule], n);
        } else {
            return IString._fncs.matchRange(IString._fncs.getValue(rule[0], n), rule[1]);
        }
    },
    /**
     * @private
     * @param {Object} rule
     * @param {number} n
     * @return {boolean}
     */
    notin: function(rule, n) {
        return !IString._fncs.matchRange(IString._fncs.getValue(rule[0], n), rule[1]);
    },

    /**
     * @private
     * @param {Object} rule
     * @param {number} n
     * @return {boolean}
     */
    within: function(rule, n) {
        return IString._fncs.matchRangeContinuous(IString._fncs.getValue(rule[0], n), rule[1]);
    },

    /**
     * @private
     * @param {Object} rule
     * @param {number} n
     * @return {number}
     */
    mod: function(rule, n) {
        return MathUtils.mod(IString._fncs.getValue(rule[0], n), IString._fncs.getValue(rule[1], n));
    },

    /**
     * @private
     * @param {Object} rule
     * @param {number} n
     * @return {number}
     */
    n: function(rule, n) {
        return n;
    },

    /**
     * @private
     * @param {Object} rule
     * @param {number|Object} n
     * @return {boolean}
     */
    or: function(rule, n) {
        const ruleLength = rule.length;
        let result, i;
        for (i=0; i < ruleLength; i++) {
            result = IString._fncs.getValue(rule[i], n);
            if (result) {
                return true;
            }
        }
        return false;
    },
    /**
     * @private
     * @param {Object} rule
     * @param {number|Object} n
     * @return {boolean}
     */
    and: function(rule, n) {
        const ruleLength = rule.length;
        let result, i;
        for (i=0; i < ruleLength; i++) {
            result= IString._fncs.getValue(rule[i], n);
            if (!result) {
                return false;
            }
        }
        return true;
    },
    /**
     * @private
     * @param {Object} rule
     * @param {number|Object} n
     * @return {boolean}
     */
    eq: function(rule, n) {
        const valueLeft = IString._fncs.getValue(rule[0], n);
        let valueRight;

        if (typeof(rule[0]) === 'string') {
            if (typeof(n) === 'object'){
                valueRight = n[rule[0]];
                if (typeof(rule[1])=== 'number'){
                    valueRight = IString._fncs.getValue(rule[1], n);
                } else if (typeof(rule[1])=== 'object' && (IString._fncs.firstPropRule(rule[1]) === "inrange" )){
                    valueRight = IString._fncs.getValue(rule[1], n);
                }
            }
        } else {
            if (IString._fncs.firstPropRule(rule[1]) === "inrange") { // mod
                valueRight = IString._fncs.getValue(rule[1], valueLeft);
            } else {
                valueRight = IString._fncs.getValue(rule[1], n);
            }
        }
        if(typeof(valueRight) === 'boolean') {
            return (valueRight ? true : false);
        } else {
            return (valueLeft == valueRight ? true :false);
        }
    },
    /**
     * @private
     * @param {Object} rule
     * @param {number|Object} n
     * @return {boolean}
     */
    neq: function(rule, n) {
        const valueLeft = IString._fncs.getValue(rule[0], n);
        let valueRight;
        let leftRange;
        let rightRange;

        if (typeof(rule[0]) === 'string') {
            valueRight = n[rule[0]];
            if (typeof(rule[1])=== 'number'){
                valueRight = IString._fncs.getValue(rule[1], n);
            } else if (typeof(rule[1]) === 'object') {
                leftRange = rule[1][0];
                rightRange =  rule[1][1];
                if (typeof(leftRange) === 'number' &&
                    typeof(rightRange) === 'number'){

                    if (valueLeft >= leftRange && valueRight <= rightRange) {
                        return false
                    } else {
                        return true;
                    }
                }
            }
        } else {
            if (IString._fncs.firstPropRule(rule[1]) === "inrange") { // mod
                valueRight = IString._fncs.getValue(rule[1], valueLeft);
            } else {
                valueRight = IString._fncs.getValue(rule[1], n);
            }
        }

        if(typeof(valueRight) === 'boolean') {//mod
            return (valueRight? false : true);
        } else {
            return (valueLeft !== valueRight ? true :false);
        }

    }
};

export default IString;