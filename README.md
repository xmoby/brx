# BRX - BeerSmith Report eXtensions

JavaScript API to produce better BeerSmith 3 HTML reports

## Presentation

### Why BRX?

While there are a lot of tags we can use for custom reports in [BeerSmith™](http://beersmith.com/), there's not much control on the presentation of the data. For example, what if...

- ...you would do better with a simplified list of steps and ingredients?
- ...you need a distinct list of grains, so you can have them prepared and milled at your friendly LHBS?
- ...you prefer to regroup your boil additions per time?
- ...you would like to see expected measurements in BRIX for the brew day, so you can use your refractometer without having to whip out a conversion tool?

All that, and more, is possible with BRX. Sample reports are provided, covering all the above cases.

### Disclaimer

This library is in no way affiliated or endorsed by BeerSmith™ or its creator. It is something I did for myself, and wanted to share.

BRX was tested on my personal computer (Windows 10 64-bit, in French), using BeerSmith™ 3.0.8 (original English version, with a mix of metric and imperial measures). Typical "it might not work for you, I am not responsible for damage to your computer, recipes, home and dog, yada yada..." mention. That said, if you discover issues or have ideas for improvements, please [let me know](https://github.com/xmoby/brx/issues). I will be glad to _at least_ have a look, and possibly do something about it. I am also open to [pull requests](https://github.com/xmoby/brx/pulls).

## How to use

### Bootstrap

1. Clone this repository under your BeerSmith 3 reports folder, as brx.
    - If you didn't change BeerSmith's document directory, it is found here: `%userprofile%\Documents\BeerSmith3\Reports`
2. Create your report as an HTML file, also under the BeerSmith 3 reports folder.
3. Include the following in your HTML file:

    ```html
    <head>
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <script type="text/javascript" src="brx/brx.js"></script>
      <script type="text/javascript">
        // Necessary boilerplate.
        var BRXRAW = {
          'age_name': '$age_name',
          'asst_brewer': '$asst_brewer',
          'boil_ingredients': (function () {/*$boil_ingredients*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
          'boil_time': '$boil_time',
          'brewer': '$brewer',
          'date': '$date',
          'display_batch_size': '$display_batch_size',
          'display_boil_size': '$display_boil_size',
          'ferment_ingredients': (function () {/*$ferment_ingredients*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
          'fermentables': (function () {/*$fermentables*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
          'ibu': '$ibu',
          'mash_ingredients': (function () {/*$mash_ingredients*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
          'mash_steps': (function () {/*$mash_steps*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
          'name': '$name',
          'notes': (function () {/*$notes*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
          'price': '$price',
          'primary_age': '$primary_age',
          'primary_ingredients': (function () {/*$primary_ingredients*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
          'secondary_age': '$secondary_age',
          'secondary_ingredients': (function () {/*$secondary_ingredients*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
          'steep_ingredients': (function () {/*$steep_ingredients*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1],
          'style_name': '$style_name',
          'tertiary_age': '$tertiary_age',
          'version': '$version',
          'yeasts': (function () {/*$yeasts*/}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1]
        };
      </script>
    </head>
    ```

### Configuration values

The following values can be changed in `brx.config`:

| Name           | Type   | Default value | Description
| -------------- | :----: | :-----------: | --------------------------
| `bottleSize`   | number | 0.341         | Size of a bottle, in liter.
| `costOverhead` | number | 0.0           | Cost overhead, to account for local taxes, ingredients shipping, etc. (e.g. `0.15` for 15%).

```html
<head>
    <script type="text/javascript" src="brx/brx.js"></script>
    <script type="text/javascript">
        // BRX tweaking.
        brx.config.costOverhead = 0.15;  // 15% for local sales taxes.
    </script>
</head>
```

### Extended values

TODO: @tags in notes

## External references

- BeerSmith available fields:
  - [This thread](http://www.beersmith.com/forum/index.php?topic=1465.0)
  - In the 'all_tags_html.htm' custom report here.
- [Multiline source weird parsing trick](http://stackoverflow.com/a/805755)
