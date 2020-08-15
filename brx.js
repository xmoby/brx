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

if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/\{(\d+)\}/g, function($0, $1) {
			return args[$1] !== void 0 ? args[$1] : $0;
		});
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
				return '{0}, {1}'.format(BRXRAW.name, BRXRAW.version);
			}

			return BRXRAW.name;
		},

		/**
		 * @return {string} The description, as found after '@description:' in the notes.
		 */
		get description() {
			var marker= '@description: ';
			var lines = BRXRAW.notes.split('\n');

			for (var i = 0; i < lines.length; ++i) {
				if (lines[i].startsWith(marker)) {
					return lines[i].substr(marker.length).trim();
				}
			}

			return '';
		},

		/**
		 * @return {string} The brewers (master and assistant, if any).
		 */
		get brewersStr() {
			if (BRXRAW.asst_brewer != '') {
				return '{0} & {1}'.format(BRXRAW.brewer, BRXRAW.asst_brewer);
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
		 * @return {Array<Object>} The full list of ingredients.
		 */
		get ingredients() {
			return [].concat(
				brx._hlp.parseIngredientsTable(BRXRAW.mash_ingredients, 'Mash'),
				brx._hlp.parseIngredientsTable(BRXRAW.steep_ingredients, 'Steep'),
				brx._hlp.parseIngredientsTable(BRXRAW.boil_ingredients, 'Boil'),
				brx._hlp.parseIngredientsTable(BRXRAW.ferment_ingredients, 'Fermentation'),
				brx._hlp.parseIngredientsTable(BRXRAW.primary_ingredients, 'Primary'),
				brx._hlp.parseIngredientsTable(BRXRAW.secondary_ingredients, 'Secondary')
			);
		},

		/**
		 * @return {Array<Object>} The full list of ingredients, grouped by step.
		 */
		get ingredientsPerStep() {
			var ingredients = brx.recipe.ingredients;
			var items = [];

			for (var i = 0; i < ingredients.length; ++i) {
				var found = false;

				for (var j = 0; j < items.length; ++j) {
					if (items[j].step == ingredients[i].step) {
						items[j].ingredients.push(ingredients[i]);
						found = true;
						break;
					}
				}

				if (!found) {
					items.push({
						'step': ingredients[i].step,
						'ingredients': [ingredients[i]]
					})
				}
			}

			return items;
		},

		/**
		 * @return {Array<Object>} The list of fermentable ingredients.
		 */
		get fermentableIngredients() {
			return brx._hlp.parseIngredientsTable(BRXRAW.fermentables);
		},

		/**
		 * @return {Array<Object>} The list of ingredients for the mash.
		 */
		get mashIngredients() {
			return brx._hlp.parseIngredientsTable(BRXRAW.mash_ingredients, 'Mash');
		},

		/**
		 * @return {Array<Object>} The list of ingredients to add during the boil.
		 */
		get boilIngredients() {
			return brx._hlp.parseIngredientsTable(BRXRAW.boil_ingredients);
		},

		/**
		 * @return {Array<Object>} The list of ingredients to add during the boil, grouped by duration in minutes.
		 */
		get boilIngredientsPerDuration() {
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
		 * @arg {number} liters Number of liters to boil.
		 * @return {int} Number of FermCap(R) drops required.
		 */
		get nbFermCapDrops() {
			return brx.fct.nbFermCapDrops(BRXRAW.display_boil_size);
		},

		/**
		 * @return {Array<Object>} The list of ingredients to pitch when starting fermentation.
		 */
		get fermentIngredients() {
			return brx._hlp.parseIngredientsTable(BRXRAW.ferment_ingredients);
		},

		/**
		 * @return {Array<Object>} The list of yeasts to use.
		 */
		get yeasts() {
			return brx._hlp.parseIngredientsTable(BRXRAW.yeasts);
		},

		/**
		 * @return {Array<Object>} The list of ingredients to add to primary fermentation.
		 */
		get primaryIngredients() {
			return brx._hlp.parseIngredientsTable(BRXRAW.primary_ingredients);
		},

		/**
		 * @return {Array<Object>} The list of ingredients to add to secondary fermentation.
		 */
		get secondaryIngredients() {
			return brx._hlp.parseIngredientsTable(BRXRAW.secondary_ingredients);
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
					'temperatureUnit': cells[2].slice(-1),
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
		 * @param {Date} date Date to format
		 * @return {string} A date formatted in ISO format (YYYY-MM-DD).
		 */
		formatISODate: function(date) {
			if (date === undefined) {
				return '';
			}

			if (Object.prototype.toString.call(date) !== "[object Date]") {
				date = new Date(date);
			}

			return '{0}-{1}-{2}'.format(date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0'));
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
		},

		/**
		 * @arg {number} liters Number of liters to boil.
		 * @return {int} Number of FermCap(R) drops required.
		 */
		nbFermCapDrops: function(liters) {
			// Correct quantity is 1.5 drops per US gallon.
			return Math.ceil((parseInt(liters) / 3.78541) * 1.5);
		},
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
		 * @param {string} value String from which to extract the unit.
		 * @return {string} The last word of the string, considered to be the unit.
		 */
		extractUnit: function(value) {
			return value.trim().split(' ').splice(-1)[0]
				.replace(')', '').replace(']', '');
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
		},

		/**
		 * 
		 * @param {string} table HTML table to parse.
		 * @param {string} step If specified, the step in which the ingredient is used.
		 * @return {Array<Object>} The parsed ingredients.
		 */
		parseIngredientsTable: function(table, step) {
			var items = [];
			var rows = brx._hlp.deconstructTable(table);

			for (var i = 1; i < rows.length; ++i) {
				items.push(brx._hlp.parseIngredientRow(rows[i], step));
			}

			return items;
		},

		/**
		 * @param {Array<string>} row Table row, as extraced through brx._hlp_deconstructTable().
		 * @param {string} step If specified, the step in which the ingredient is used.
		 * @return {Object} The ingredient, with all attributes extrated.
		 */
		parseIngredientRow: function(row, step) {
			var item = {
				'index': parseInt(row[3]),
				'name': row[1],
				'type': row[2],
				'amount': row[0]
			};

			if (step !== undefined) {
				item.step = step;
			}

			// Extract IBUs/proportion, if any.
			if (row[4].endsWith('%')) {
				item.proportion = brx._hlp.strToFloat(row[4]) / 100;
			} else if (row[4].endsWith(' IBUs')) {
				item.ibu = brx._hlp.strToFloat(row[4]);
				item.proportion = item.ibu / brx._hlp.strToFloat(BRXRAW.ibu);  // IBU-related
			}

			// Extract volume, if any.
			if (row[5] !== '-') {
				item.volume = brx._hlp.strToFloat(row[5]);
				item.volumeUnit = brx._hlp.extractUnit(row[5]);
			}

			// Adjust the step.
			var marker = ' [Secondary]';
			var found = item.name.lastIndexOf(marker);

			if (found != -1) {
				item.step = 'Secondary';
				item.name = item.name.substr(0, found).trim();
			}

			// Parse amount, to provide a better context when possible.
			if (item.amount.endsWith(' kg') || item.amount.endsWith(' g')) {
				item.weight = brx._hlp.strToFloat(item.amount);
				item.weightUnit = brx._hlp.extractUnit(item.amount);
				item.weightStr = '{0} {1}'.format(item.weight, item.weightUnit);
			} else {
				item.weightStr = item.amount;  // Provide a proper fallback.
			}
			
			if (item.amount.endsWith(' Items') || item.amount.endsWith(' pkg')) {
				item.quantity = brx._hlp.strToFloat(item.amount);
				item.quantityUnit = brx._hlp.extractUnit(item.amount);
				item.quantityStr = '{0} {1}'.format(item.quantity, item.quantityUnit);
			} else {
				item.quantityStr = item.amount;  // Provide a proper fallback.
			}

			// Extract color, for fermentables.
			if (item.step == 'Mash') {
				found = item.name.lastIndexOf('(');

				if (found != -1) {
					var colorStr = item.name.substr(found + 1);
					item.color = brx._hlp.strToFloat(colorStr);
					item.colorUnit = brx._hlp.extractUnit(colorStr);
					item.colorStr = '{0} {1}'.format(item.color, item.colorUnit);
					item.name = item.name.substr(0, found).trim();
				}
			}

			// Extract supplier, for grains and yeasts.
			if (item.type == 'Grain' || item.type == 'Yeast') {
				found = item.name.lastIndexOf('(');

				if (found != -1) {
					item.supplier = item.name.substr(found + 1).slice(0, -1);
					item.name = item.name.substr(0, found).trim();
				}
			}

			// Extract duration, for boil.
			marker = ' [Boil]';
			found = item.name.lastIndexOf(marker);

			if (found != -1) {
				item.step = item.step || 'Boil';
				item.duration = brx._hlp.strToFloat(BRXRAW.boil_time);
				item.name = item.name.substr(0, found).trim();
			}

			if (item.type == 'Hop') {
				item.ibu = brx._hlp.strToFloat(row[4]);
				marker = ' - Boil ';
			} else {
				marker = ' (Boil ';
			}

			found = item.name.lastIndexOf(marker);

			if (found != -1) {
				item.step = item.step || 'Boil';
				item.duration = brx._hlp.strToFloat(item.name.substr(found + marker.length));
				item.name = item.name.substr(0, found).trim()
					.replace(/\[/g, '(')
					.replace(' %]', '%)')
					.replace('0%', '%');

				// Extract %AA, for hops.
				if (item.type == "Hop") {
					found = item.name.lastIndexOf('(');

					if (found != -1) {
						item.aa = brx._hlp.strToFloat(item.name.substr(found + 1));
						item.name = item.name.substr(0, found).trim();
					}
				}
			}

			return item;
		}
	}
};
