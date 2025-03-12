/*
 * This file is part of the "GS Commit Message Checker" Action for Github.
 *
 * Copyright (C) 2019-2022 by Gilbertsoft LLC (gilbertsoft.org)
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * For the full license information, please read the LICENSE file that
 * was distributed with this source code.
 */

/**
 * Imports
 */
import * as core from '@actions/core'

/**
 * Interface used as arguments for the check function containing the pattern,
 * error message and the messages.
 */
export interface ICheckerArguments {
  pattern: string
  flags: string
  error: string
  messages: string[]
  debugRegex: null | (string | string[])[],
}

/**
 * Checks commit messages given by args.
 *
 * @param     args messages, pattern and error message to process.
 * @returns   void
 */
export async function checkCommitMessages(
  args: ICheckerArguments
): Promise<void> {
  // Check arguments
  if (args.pattern.length === 0) {
    throw new Error(`PATTERN not defined.`)
  }

  const regex = new RegExp('[^gimsuy]', 'g')
  let invalidChars
  let chars = ''
  while ((invalidChars = regex.exec(args.flags)) !== null) {
    chars += invalidChars[0]
  }
  if (chars !== '') {
    throw new Error(`FLAGS contains invalid characters "${chars}".`)
  }

  if (args.error.length === 0) {
    throw new Error(`ERROR not defined.`)
  }

  if (args.messages.length === 0) {
    throw new Error(`MESSAGES not defined.`)
  }

  // Check messages
  let result = true

  core.info(`Checking commit messages against "${args.pattern}"...`)

  let debugRegexMsg = '';

  for (const message of args.messages) {
    if (checkMessage(message.replaceAll('\r', ''), args.pattern, args.flags)) {
      core.info(`- OK: "${message}"`)
    } else {
      core.info(`- failed: "${message}"`)
      if (args.debugRegex !== null) {
          debugRegexMsg = '\n' + debugRegexMatching(args.debugRegex, message);
      }
      result = false;
    }
  }

  // Throw error in case of failed test
  if (!result) {
    throw new Error(args.error + debugRegexMsg)
  }
}

/**
 * Checks the message against the regex pattern.
 *
 * @param     message message to check against the pattern.
 * @param     pattern regex pattern for the check.
 * @returns   boolean
 */
function checkMessage(
  message: string,
  pattern: string,
  flags: string
): boolean {
  const regex = new RegExp(pattern, flags)
  return regex.test(message)
}

/*
 * Debugs until which characters does a regex matches.
 */
const debugRegexMatching = (regexes: (string | string[])[], str: string): string => {
	str = str.replaceAll('\r', '');
	let matchesUntil = 0;
	const copyStr = str;
	let rgx;

	do {
		if (Array.isArray(regexes[0])) {
			const previousLength = str.length;
			const [newString, failedAt] = optionalRemoval(regexes[0], str);
			str = newString;
			matchesUntil += previousLength - str.length;

			if (failedAt !== null) {
                break;
			}
		} else {
			rgx = new RegExp("^" + regexes[0]);

			if (rgx.test(str)) {
				const previousLength = str.length;
				str = str.replace(rgx, '');
				matchesUntil += previousLength - str.length;
			} else {
				break;
			}
		}

		regexes = regexes.splice(1);
	} while (regexes.length > 0);

	if (str.length === 0 && regexes.length === 0) {
		return "The regex should work.";
	} else {
		const paddingLeft = Math.max(matchesUntil - 10, 0);
		const paddingRight = Math.min(matchesUntil + 10, copyStr.length);
		const rightDots = paddingRight !== copyStr.length ? '…' :  '';
		const leftDots = paddingLeft !== 0 ? '…' :  '';
        const errorArrow = `${' '.repeat(leftDots.length)}${" ".repeat(matchesUntil - paddingLeft)}^${"~".repeat(paddingRight - matchesUntil)}`;
        const context = `${leftDots}${copyStr.slice(paddingLeft, paddingRight).replaceAll('\n', '␤')}${rightDots}`;

		if (str.length > 0 && regexes.length === 0) {
			return `Trailing characters: "${str}"
--------------------------------
Context: "${context}"
          ${errorArrow}`;
		} else {
			return `The regex stopped matching at index: ${matchesUntil}
Expected: ${rgx}
Context: "${context}"
          ${errorArrow}`;
		}
	}
}

/// If the first member of the optionalRegexes is matching then all the other should match. Else we don't test the others.
const optionalRemoval = (optionalRegexes: string[], str: string): [string, number | null] => {
	let rgx = new RegExp("^" + optionalRegexes[0]);

	if (rgx.test(str)) {
		do {
			rgx = new RegExp("^" + optionalRegexes[0]);

			if (rgx.test(str)) {
				str = str.replace(rgx, '');
			} else {
				return [str, 0];
			}
			optionalRegexes = optionalRegexes.splice(1);
		} while (optionalRegexes.length > 0);
	}

	return [str, null];
}

