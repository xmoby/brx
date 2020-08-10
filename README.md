# BRX - BeerSmith Report eXtensions

JavaScript API to produce better BeerSmith 3 HTML reports

## How to use

### Bootstrap

1. Clone this folder under your BeerSmith 3 reports folder, as brx.
    - If you didn't change BeerSmith's document directory, it is found here: `%userprofile%\Documents\BeerSmith3\Reports`
2. Create your report as an HTML file, also under the BeerSmith 3 reports folder.
3. Include the following in your HTML file:

    ```html
    <head>
      <script type="text/javascript" src="brx/brx.js"></script>
      <script type="text/javascript">
        // Necessary boilerplate.
        var BRXRAW = {
            'age_name': '$age_name',
            'asst_brewer': '$asst_brewer',
            'boil_ingredients': (function () {/*$boil_ingredients*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
            'boil_time': '$boil_time',
            'brewer': '$brewer',
            'display_batch_size': '$display_batch_size',
            'display_boil_size': '$display_boil_size',
            'fermentables': (function () {/*$fermentables*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
            'mash_steps': (function () {/*$mash_steps*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
            'name': '$name',
            'notes': (function () {/*$notes*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
            'price': '$price',
            'primary_age': '$primary_age',
            'primary_ingredients': (function () {/*$primary_ingredients*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
            'secondary_age': '$secondary_age',
            'secondary_ingredients': (function () {/*$secondary_ingredients*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
            'tertiary_age': '$tertiary_age',
            'version': '$version',
            'yeasts': (function () {/*$yeasts*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
        };

        // BRX tweaking.
        brx.config.costOverhead = 0.15;
      </script>
    </head>
    ```

### Configuration values

The following values can be changed in `brx.config`:

| Name           | Type   | Default value | Description
| -------------- | :----: | :-----------: | --------------------------
| `bottleSize`   | number | 0.341         | Size of a bottle, in liter.
| `costOverhead` | number | 0.0           | Cost overhead, to account for local taxes, ingredients shipping, etc. (e.g. `0.15` for 15%).

## External references

- BeerSmith available fields:
  - [This thread](http://www.beersmith.com/forum/index.php?topic=1465.0)
  - In the 'all_tags_html.htm' custom report here.
- [Multiline source weird parsing trick](http://stackoverflow.com/a/805755)
