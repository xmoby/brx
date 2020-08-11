// Polyfills

if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0;
		return this.indexOf(searchString, position) === position;
	};
}

if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(searchString, position) {
		var subjectString = this.toString();

		if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
			position = subjectString.length;
		}

		position -= searchString.length;
		var lastIndex = subjectString.lastIndexOf(searchString, position);
		return lastIndex !== -1 && lastIndex === position;
	};
}

if (!String.prototype.padStart) {
	String.prototype.padStart = function padStart(targetLength,padString) {
		targetLength = targetLength>>0; //truncate if number or convert non-number to 0;
		padString = String((typeof padString !== 'undefined' ? padString : ' '));

		if (this.length > targetLength) {
			return String(this);
		}
		else {
			targetLength = targetLength-this.length;

			if (targetLength > padString.length) {
				padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
			}

			return padString.slice(0,targetLength) + String(this);
		}
	};
}

// BRX API.
var brx = {
	version: '0.1-WIP',

	/**
	 * Default configuration values, to override as needed.
	 */
	config: {
		bottleSize: 0.341,
		costOverhead: 0
	},

	/**
	 * Properties of the recipe.
	 */
	recipe: {
		// GENERAL DATA ============================================================================

		/**
		 * @return {string} The recipe name, appended with the version number if different than 1.
		 */
		get fullName() {
			if (BRXRAW.version != '1') {  // FIXME: Somehow always returns 1.
				return BRXRAW.name + ', ' + BRXRAW.version;
			}

			return BRXRAW.name;
		},

		/**
		 * @return {string} The description, as found after '@description:' in the notes.
		 */
		get description() {/*
			var marker= '@description: ';
			var lines = BRXRAW.split('\n');

			for (var i = 0; i = lines.length; ++i) {
				if (lines[i].startsWith(marker)) {
					return lines[i].substr(marker.length).trim();
				}
			}
*/
			return '';
		},

		/**
		 * @return {string} The brewers (master and assistant, if any).
		 */
		get brewers() {
			if (BRXRAW.asst_brewer != '') {
				return BRXRAW.brewer + ' & ' + BRXRAW.asst_brewer;
			} else {
				return BRXRAW.brewer;
			}
		},

		/**
		 * @return {number} The total cost of the recipe, adjusted with the configured overhead.
		 */
		get cost() {
			return brx._hlp.strToFloat(BRXRAW.price) * (1 + brx.config.costOverhead);
		},

		/**
		 * @return {number} The total cost of a brewed liter, adjusted with the configured overhead.
		 */
		get costPerLiter() {
			return brx.recipe.cost / brx._hlp.strToFloat(BRXRAW.display_batch_size);
		},

		/**
		 * @return {number} The total cost of a brewed bottle, adjusted with the configured overhead.
		 */
		get costPerBottle() {
			return brx.recipe.costPerLiter * brx.config.bottleSize;
		},


		// INGREDIENTS =============================================================================

		/**
		 * @return {Array<Object>} The list of fermentable ingredients.
		 */
		get fermentableIngredients() {
			var rows = brx._hlp.deconstructTable(BRXRAW.fermentables);
			var items = [];

			for (var i = 1; i < rows.length; ++i) {
				var cells = rows[i];
				var name = cells[1];
				var found = name.lastIndexOf('(');
				var color = 0;
				var supplier = '';

				if (found != -1) {
					color = brx._hlp.strToFloat(name.substr(found + 1));
					name = name.substr(0, found).trim();

					if ((found = name.lastIndexOf('(')) != -1) {
						supplier = name.substr(found + 1).slice(0, -1).trim();
						name = name.substr(0, found).trim();
					}
				}

				items.push({
					'index': parseInt(cells[3]),
					'name': name,
					'supplier': supplier,
					'color': color,
					'type': cells[2],
					'weight': brx._hlp.strToFloat(cells[0]),
					'volume': brx._hlp.strToFloat(cells[5]),
					'proportion': brx._hlp.strToFloat(cells[4])
				});
			}

			return items;
		},

		/**
		 * @return {Array<Object>} The list of ingredients to add during the boil.
		 */
		get boilIngredients() {
			var rows = brx._hlp.deconstructTable(BRXRAW.boil_ingredients);
			var items = [];

			for (var i = 1; i < rows.length; ++i) {
				var cells = rows[i];
				var item = {
					'index': parseInt(cells[3]),
					'name': cells[1],
					'type': cells[2],
					'duration': brx._hlp.strToFloat(BRXRAW.boil_time)
				}

				// Extract duration.
				if (item.type == 'Hop') {
					item.ibu = brx._hlp.strToFloat(cells[4]);
					var marker = ' - Boil ';
				} else {
					var marker = ' (Boil ';
				}

				var found = item.name.lastIndexOf(marker);

				if (found != -1) {
					item.duration = brx._hlp.strToFloat(item.name.substr(found + marker.length));
					item.name = item.name.substr(0, found)
						.replace(/\[/g, '(')
						.replace(' %]', '%)')
						.replace('0%', '%');
				}

				// Remove suffix.
				marker = ' [Boil]';
				found = item.name.lastIndexOf(marker);

				if (found != -1) {
					item.name = item.name.substr(0, found);
				}

				// Item complete.
				items.push(item);
			}

			return items;
		},

		/**
		 * @return {Array<Object>} The list of ingredients to add during the boil, grouped by duration in minutes.
		 */
		get groupBoilIngredients() {
			var ingredients = brx.recipe.boilIngredients;
			var items = [];

			for (var i = 0; i < ingredients.length; ++i) {
				var found = false;

				for (var j = 0; j < items.length; ++j) {
					if (items[j].duration == ingredients[i].duration) {
						items[j].ingredients.push(ingredients[i]);
						found = true;
						break;
					}
				}

				if (!found) {
					items.push({
						'duration': ingredients[i].duration,
						'ingredients': [ingredients[i]]
					})
				}
			}

			return items;
		},

		/**
		 * @return {int} Number of FermCap(R) drops required.
		 */
		get nbFermCapDrops() {
			// Correct quantity is 1.5 drops per US gallon.
			return Math.ceil((parseInt(BRXRAW.display_boil_size) / 3.78541) * 1.5);
		},

		/**
		 * @return {Array<Object>} The list of yeasts to use.
		 */
		get yeasts() {
			var rows = brx._hlp.deconstructTable(BRXRAW.yeasts);
			var items = [];

			for (var i = 1; i < rows.length; ++i) {
				var cells = rows[i];
				var name = cells[1];
				var found = name.lastIndexOf('(');
				var supplier = '';

				if (found != -1) {
					supplier = name.substr(found + 1).slice(0, -1);
					name = name.substr(0, found).trim();
				}

				items.push({
					'index': parseInt(cells[3]),
					'name': name,
					'supplier': supplier,
					'type': cells[2],
					'amount': cells[0].replace(',0 pkg', '')
				});
			}

			return items;
		},

		/**
		 * @return {Array<Object>} The list of ingredients to add to primary fermentation.
		 */
		get primary_ingredients() {
			var rows = brx._hlp.deconstructTable(BRXRAW.yeasts);
			var items = [];

			for (var i = 1; i < rows.length; ++i) {
				var cells = rows[i];
				var name = cells[1];

				if (name.endsWith(' [Secondary]')) {
					continue;  // Skip this!
				}

				var found = name.lastIndexOf('[');

				if (found != -1) {
					name = name.substr(0, found).trim();
				}

				items.push({
					'index': parseInt(cells[3]),
					'name': name,
					'supplier': supplier,
					'type': cells[2],
					'amount': cells[0]
				});
			}

			return items;
		},

		/**
		 * @return {Array<Object>} The list of ingredients to add to secondary fermentation.
		 */
		get secondaryIngredients() {
			var rows = brx._hlp.deconstructTable(BRXRAW.yeasts);
			var items = [];

			for (var i = 1; i < rows.length; ++i) {
				var cells = rows[i];
				var name = cells[1];

				if (!name.endsWith(' [Secondary]')) {
					continue;  // Skip this!
				}

				var found = name.lastIndexOf('[');

				if (found != -1) {
					name = name.substr(0, found).trim();
				}

				items.push({
					'index': parseInt(cells[3]),
					'name': name,
					'supplier': supplier,
					'type': cells[2],
					'amount': cells[0]
				});
			}

			return items;
		},


		// PROCEDURES ==============================================================================

		/**
		* @return {number} The total mash duration, in minutes.
		*/
		get mashDuration() {
			var res = BRXRAW.mash_steps.match(/^\d* min/gm);
			var total = 0;

			for (i = 0; i < res.length; ++i) {
				total += parseInt(res[i]);
			}

			return total;
		},

		/**
		 * @return {Array<Object>} The list of mash steps.
		 */
		get mashSteps() {
			var rows = brx._hlp.deconstructTable(BRXRAW.mash_steps);
			var items = [];

			for (var i = 1; i < rows.length; ++i) {
				var cells = rows[i];
				items.push({
					'name': cells[0],
					'temperature': brx._hlp.strToFloat(cells[2]),
					'duration': parseInt(cells[3]),
					'description': cells[1]
				});
			}

			return items;
		},

		/**
		 * @return {number} The total fermentation duration, in days.
		 */
		get fermentationDuration() {
			var total = parseInt(BRXRAW.primary_age);

			if (BRXRAW.age_name.indexOf('Single Stage') == -1) {
				total += parseInt(BRXRAW.secondary_age);

				if (BRXRAW.age_name.indexOf('Two Stage') == -1) {
					total += parseInt(BRXRAW.tertiary_age);
				}
			}

			return total;
		},
	},

	/**
	 * Useful functions.
	 */
	fct: {
		// GENERIC HELPERS =========================================================================

		/**
		 * Pads a string from the left until it reaches a minimal length.
		 * @param {*} value Value to pad.
		 * @param {number} length Minimum number of characters.
		 * @param {string} pad Character with which to pad.
		 * @return {string} The padded value.
		 */
		leftPad: function(value, length, pad) {
			var ret = String(value);

			while (ret.length < length) {
				ret = pad + ret;
			}

			return ret;
		},

		/**
		 * @param {Date} date Date to format
		 * @return {string} A date formatted in ISO format (YYYY-MM-DD).
		 */
		formatISODate: function(date) {
			return date.getFullYear() + '-' + brx.fct.leftPad(date.getMonth() + 1, 2, '0') + '-' + brx.fct.leftPad(test.getDate(), 2, '0');
		},


		// BREWING HELPERS =========================================================================

		/**
		 * @param {number} og Non-fermented wort gravity (e.g. 1.054).
		 * @return {number} The corresponding value, in BRIX.
		 */
		brixFromOG: function(og) {
			// Ref: https://www.brewersfriend.com/brix-converter/
			var sg = brx._hlp.strToFloat(og);
			return (((182.4601 * sg - 775.6821) * sg + 1262.7794) * sg - 669.5622);
		}
	},

	/**
	 * Internal helpers, not meant to be called directly.
	 */
	_hlp: {
		/**
		 * Escapes HTML special characters.
		 * @param {string} value Value to escape.
		 * @return {string} The escaped value.
		 */
		escapeHtml: function(value) {
			return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		},

		/**
		 * Removes all HTML tags from a string.
		 * @param {string} value Value to trim.
		 * @return {string} The trimmed value.
		 */
		trimHtml: function(value) {
			return value.replace(/<.*>/g, '');
		},

		/**
		 * Converts a string to a floating point number.
		 * @param {string} value Value to convert.
		 * @return {number} The converted value.
		 */
		strToFloat: function(value) {
			return parseFloat(value.replace(',', '.'));
		},

		/**
		 * Finds the first occurrence of a specified values set in a string.
		 * @param {string} value String to search in.
		 * @param {Array<string>} toSearchFor Strings to search for.
		 * @param {number} index At which position to start the search.
		 * @return {number} The position where a specified search value occurs for the first time, or -1 if it never occurs.
		 */
		indexOfFirst: function(value, toSearchFor, index) {
			var firstFound = -1;

			for (var i = 0; i < toSearchFor.length; ++i) {
				var found = value.indexOf(toSearchFor[i], index);

				if (found != -1 && (firstFound == -1 || found < firstFound)) {
					firstFound = found;
				}
			}

			return firstFound;
		},

		/**
		 * Transforms an HTML table in an array of array.
		 * @param {string} table HTML code of the table to deconstruct.
		 * @return {Array<Array<string>>} The content of each cell, trimmed of any formatting.
		 */
		deconstructTable: function(table) {
			var cells = [];
			var startRow = table.indexOf('<tr');

			while (startRow != -1) {
				var row = [];
				var startCell = brx._hlp.indexOfFirst(table, ['<th', '<td'], startRow);
				var nextRow = table.indexOf('<tr', startRow + 1);

				while (startCell != -1 && (nextRow == -1 || startCell < nextRow)) {
					startCell = table.indexOf('>', startCell);

					if (startCell == -1) {
						break;
					}

					var endCell = brx._hlp.indexOfFirst(table, ['</th>', '</td>'], startCell);

					if (endCell == -1) {
						break;
					}

					row.push(brx._hlp.trimHtml(table.substr(startCell + 1, endCell - startCell - 1)).trim());
					startCell = brx._hlp.indexOfFirst(table, ['<th', '<td'], endCell);
				}

				cells.push(row);
				startRow = nextRow;
			}

			return cells;
		}
	}
};
