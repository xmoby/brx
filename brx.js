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
	String.prototype.padStart = function padStart(targetLength, padString) {
		targetLength = targetLength >> 0; //truncate if number or convert non-number to 0;
		padString = String((typeof padString !== 'undefined' ? padString : ' '));

		if (this.length > targetLength) {
			return String(this);
		}
		else {
			targetLength = targetLength - this.length;

			if (targetLength > padString.length) {
				padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
			}

			return padString.slice(0, targetLength) + String(this);
		}
	};
}

if (!String.prototype.repeat) {
	String.prototype.repeat = function(count) {
		'use strict';
		if (this == null)
			throw new TypeError('can\'t convert ' + this + ' to object');

		var str = '' + this;
		// To convert string to integer.
		count = +count;
		// Check NaN
		if (count != count)
			count = 0;

		if (count < 0)
			throw new RangeError('repeat count must be non-negative');

		if (count == Infinity)
			throw new RangeError('repeat count must be less than infinity');

		count = Math.floor(count);
		if (str.length == 0 || count == 0)
			return '';

		// Ensuring count is a 31-bit integer allows us to heavily optimize the
		// main part. But anyway, most current (August 2014) browsers can't handle
		// strings 1 << 28 chars or longer, so:
		if (str.length * count >= 1 << 28)
			throw new RangeError('repeat count must not overflow maximum string size');

		var maxCount = str.length * count;
		count = Math.floor(Math.log(count) / Math.log(2));
		while (count) {
			str += str;
			count--;
		}
		str += str.substring(0, maxCount - str.length);
		return str;
	}
}

if (!String.prototype.toFloat) {
	String.prototype.toFloat = function() {
		return parseFloat(this.replace(',', '.'));
	}
}

if (!String.prototype.toLocaleFloat) {
	String.prototype.toLocaleFloat = function() {
		return this.toFloat().toLocaleString();
	}
}

if (!String.prototype.toFixedLocaleFloat) {
	String.prototype.toFixedLocaleFloat = function(length) {
		return this.toFloat().toLocaleString(undefined, { 'minimumFractionDigits': length, 'maximumFractionDigits': length });
	}
}

if (!String.prototype.toUnit) {
	String.prototype.toUnit = function(unit, fractionDigits) {
		if (fractionDigits !== 'undefined') {
			return '{0}&nbsp;{1}'.format(this.toFixedLocaleFloat(fractionDigits), unit);
		}

		return '{0}&nbsp;{1}'.format(this.toLocaleFloat(), unit);
	}
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
	 * Constants used for calculations or parsing.
	 */
	constants: {
		LITERS_PER_US_GALLON: 3.78541,
		STEP: {
			MASH: 'Mash',
			STEEP: 'Steep',
			BOIL: 'Boil',
			FERMENTATION: 'Fermentation',
			FERMENTATION_PRIMARY: 'Primary',
			FERMENTATION_SECONDARY: 'Secondary'
		}
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
		 * @return {string} The style, as found after '@style:' in the notes, or the BJCP style if not found.
		 */
		get style() {
			var value = brx._hlp.extractLineFromNotes('@style: ');
			return value ? value : BRXRAW.style_name;
		},

		/**
		 * @return {string} The description, as found after '@description:' in the notes.
		 */
		get description() {
			var value = brx._hlp.extractLineFromNotes('@description: ');
			return value ? value : '';
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
		 * @return {Date} The brew date, as a date object.
		 */
		get date() {
			return new Date(BRXRAW.date);
		},

		/**
		 * @return {number} The total cost of the recipe, adjusted with the configured overhead.
		 */
		get cost() {
			return BRXRAW.price.toFloat() * (1 + brx.config.costOverhead);
		},

		/**
		 * @return {number} The total cost of a brewed liter, adjusted with the configured overhead.
		 */
		get costPerLiter() {
			return brx.recipe.cost / BRXRAW.display_batch_size.toFloat();
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
				brx._hlp.parseIngredientsTable(BRXRAW.mash_ingredients, brx.constants.STEP.MASH),
				brx._hlp.parseIngredientsTable(BRXRAW.steep_ingredients, brx.constants.STEP.STEEP),
				brx._hlp.parseIngredientsTable(BRXRAW.boil_ingredients, brx.constants.STEP.BOIL),
				brx._hlp.parseIngredientsTable(BRXRAW.ferment_ingredients, brx.constants.STEP.FERMENTATION),
				brx._hlp.parseIngredientsTable(BRXRAW.primary_ingredients, brx.constants.STEP.FERMENTATION_PRIMARY),
				brx._hlp.parseIngredientsTable(BRXRAW.primary_ingredients, brx.constants.STEP.FERMENTATION_SECONDARY),
				brx._hlp.parseIngredientsTable(BRXRAW.secondary_ingredients, brx.constants.STEP.FERMENTATION_SECONDARY)
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
		 * @return {Array<Object>} The list of ingredients for the mash, including the water.
		 */
		get mashIngredients() {
			var ingredients = [];
			var water = brx._hlp.extractMashWaterQuantity();

			if (water) {
				var amountStr = '{0} {1}'.format(water.amount.toLocaleString(), water.amountUnit);
				ingredients.push({
					name: 'Water',
					step: brx.constants.STEP.MASH,
					amount: water.amount,
					amountUnit: water.amountUnit,
					amountStr: amountStr,
					volume: water.amount,
					volumeUnit: water.amountUnit,
					volumeStr: amountStr
				});
			}

			ingredients.push.apply(ingredients, brx._hlp.parseIngredientsTable(BRXRAW.mash_ingredients, brx.constants.STEP.MASH));
			return ingredients;
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
		 * @return {number} Number of FermCap(R) drops required.
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
			return brx._hlp.parseIngredientsTable(BRXRAW.primary_ingredients, brx.constants.STEP.FERMENTATION_PRIMARY);
		},

		/**
		 * @return {Array<Object>} The list of ingredients to add to secondary fermentation.
		 */
		get secondaryIngredients() {
			return [].concat(
				brx._hlp.parseIngredientsTable(BRXRAW.primary_ingredients, brx.constants.STEP.FERMENTATION_SECONDARY),
				brx._hlp.parseIngredientsTable(BRXRAW.secondary_ingredients, brx.constants.STEP.FERMENTATION_SECONDARY)
			);
		},


		// CARBONATION =============================================================================

		carb: {
			/**
			* @return {number} The carbonation level aimed.
			*/
			get level() {
				return BRXRAW.carbonation.toFloat();
			},

			/**
			* @return {string} The carbonation method, and unit if applicable.
			*/
			get methodStr() {
				return '{0} ({1})'.format(BRXRAW.carb_name, BRXRAW.carbonation_press);
			},

			/**
			 * @return {Object} The carbonation temperature.
			 */
			get temperature() {
				var temperature = BRXRAW.display_carb_temp.toFloat();
				var temperatureUnit = BRXRAW.display_carb_temp.slice(-1);

				return {
					'value': temperature,
					'unit': temperatureUnit,
					'str': '{0}&deg;{1}'.format(temperature.toLocaleString(), temperatureUnit),
				}
			}
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
				var temperature = cells[2].toFloat();
				var temperatureUnit = cells[2].slice(-1);
				items.push({
					'name': cells[0],
					'temperature': temperature,
					'temperatureUnit': temperatureUnit,
					'temperatureStr': '{0}&deg;{1}'.format(temperature.toLocaleString(), temperatureUnit),
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
			var sg = og.toFloat();
			return (((182.4601 * sg - 775.6821) * sg + 1262.7794) * sg - 669.5622);
		},

		/**
		 * @arg {number} liters Number of liters to boil.
		 * @return {number} Number of FermCap(R) drops required.
		 */
		nbFermCapDrops: function(liters) {
			// Correct quantity is 1.5 drops per US gallon.
			return Math.ceil((parseInt(liters) / brx.constants.LITERS_PER_US_GALLON) * 1.5);
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
				var ingredient = brx._hlp.parseIngredientRow(rows[i], step);

				if (ingredient) {
					items.push(ingredient);
				}
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
				item.proportion = row[4].toFloat() / 100;
			} else if (row[4].endsWith(' IBUs')) {
				item.ibu = row[4].toFloat();
				item.proportion = item.ibu / BRXRAW.ibu.toFloat();  // IBU-related
			}

			// Extract volume, if any.
			if (row[5] !== '-') {
				item.volume = row[5].toFloat();
				item.volumeUnit = brx._hlp.extractUnit(row[5]);
			}

			// Adjust the step, as all fermentation (primary and secondary) if put in primary by BeerSmith.
			if (step == brx.constants.STEP.FERMENTATION_PRIMARY || step == brx.constants.STEP.FERMENTATION_SECONDARY) {
				var marker = ' (Primary';
				var found = item.name.lastIndexOf(marker);

				if (found != -1) {
					if (step == brx.constants.STEP.FERMENTATION_SECONDARY) {
						return undefined;  // Skip adding this.
					}

					item.step = brx.constants.STEP.FERMENTATION_PRIMARY;
					item.name = item.name.substr(0, found).trim();
				} else {
					marker = ' [Secondary]';
					found = item.name.lastIndexOf(marker);

					if (found != -1) {
						if (step == brx.constants.STEP.FERMENTATION_PRIMARY) {
							return undefined;  // Skip adding this.
						}

						item.step = brx.constants.STEP.FERMENTATION_SECONDARY;
						item.name = item.name.substr(0, found).trim();
					} else {
						marker = ' (Secondary';
						found = item.name.lastIndexOf(marker);

						if (found != -1) {
							if (step == brx.constants.STEP.FERMENTATION_PRIMARY) {
								return undefined;  // Skip adding this.
							}

							var duration = item.name.substr(found + marker.length);
							item.step = brx.constants.STEP.FERMENTATION_SECONDARY;
							item.duration = duration.toFloat();
							item.durationUnit = brx._hlp.extractUnit(duration);
							item.durationStr = '{0} {1}'.format(String(item.duration).toLocaleFloat(), item.durationUnit);
							item.name = item.name.substr(0, found).trim();
						}
					}
				}
			}

			// Parse amount, to provide a better context when possible.
			if (item.amount.split(' ').length > 1) {
				item.amountStr = item.amount.toUnit(item.amount.split(' ')[1]);
			} else {
				item.amountStr = item.amount;
			}

			if (item.amount.endsWith(' kg') || item.amount.endsWith(' g')) {
				item.weight = item.amount.toFloat();
				item.weightUnit = brx._hlp.extractUnit(item.amount);
				item.weightStr = '{0} {1}'.format(item.weight.toLocaleString(), item.weightUnit);
			} else {
				item.weightStr = item.amount;  // Provide a proper fallback.
			}

			if (item.amount.endsWith(' Items') || item.amount.endsWith(' pkg')) {
				item.quantity = item.amount.toFloat();
				item.quantityUnit = brx._hlp.extractUnit(item.amount);
				item.quantityStr = '{0} {1}'.format(item.quantity.toLocaleString(), item.quantityUnit);
			} else {
				item.quantityStr = item.amount;  // Provide a proper fallback.
			}

			// Extract color, for fermentables.
			if (item.step == brx.constants.STEP.MASH) {
				found = item.name.lastIndexOf('(');

				if (found != -1) {
					var colorStr = item.name.substr(found + 1);
					item.color = colorStr.toFloat();
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
				item.step = item.step || brx.constants.STEP.BOIL;
				item.duration = BRXRAW.boil_time.toFloat();
				item.name = item.name.substr(0, found).trim();
			}

			if (item.type == 'Hop') {
				item.ibu = row[4].toFloat();
				marker = ' - Boil ';
			} else {
				marker = ' (Boil ';
			}

			found = item.name.lastIndexOf(marker);

			if (found != -1) {
				item.step = item.step || brx.constants.STEP.BOIL;
				item.duration = item.name.substr(found + marker.length).toFloat();
				item.name = item.name.substr(0, found).trim()
					.replace(/\[/g, '(')
					.replace(' %]', '%)')
					.replace('0%', '%');

				// Extract %AA, for hops.
				if (item.type == "Hop") {
					found = item.name.lastIndexOf('(');

					if (found != -1) {
						item.aa = item.name.substr(found + 1).toFloat();
						item.name = item.name.substr(0, found).trim();
					}
				}
			}

			return item;
		},

		/**
		 * @return {<Object>} Information about the water to initially add to the mash; undefined if not found.
		 */
		extractMashWaterQuantity: function() {
			var mashSteps = brx.recipe.mashSteps;

			if (!mashSteps) {
				return undefined;
			}

			var found = mashSteps[0].description.match(/[\d,]* .* of water/);

			if (found == null) {
				return undefined;
			}

			var toParse = found[0].slice(0, -' of water'.length);

			return {
				amount: toParse.toFloat(),
				amountUnit: brx._hlp.extractUnit(toParse)
			};
		},

		/**
		 * @param {string} prefix The prefix to look for.
		 * @return {string} The string following the specified prefix, as found in the notes; undefined if not found.
		 */
		extractLineFromNotes: function(prefix) {
			var lines = BRXRAW.notes.split('\n');

			for (var i = 0; i < lines.length; ++i) {
				if (lines[i].startsWith(prefix)) {
					return lines[i].substr(prefix.length).trim();
				}
			}

			return undefined;
		}
	}
};
