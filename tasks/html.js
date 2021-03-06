// Load global config and gulp
import config from '../foley.json'
import gulp from 'gulp'

// Specific task modules
import { argv as argv } from 'yargs'
import debug from 'gulp-debug'
import gulpif from 'gulp-if'
import browserSync from 'browser-sync'
import Metalsmith from 'metalsmith'
import rename from 'metalsmith-rename'
import htmlmin from 'gulp-htmlmin'


// Build Metalsmith
function buildMetalsmith (callback) {
  // Metalsmith instance and options
  var metalsmith    = new Metalsmith('.').clean(false)
  var plugins       = config.metalsmith.plugins || {}
  var default_values = require('metalsmith-default-values');
  var Handlebars    = require('handlebars');
  var moment        = require('moment');
  var tags          = require('metalsmith-tags');
  var markdown      = require('metalsmith-markdownit');

  metalsmith.source(config.paths.pages)
  metalsmith.destination(config.paths.build)

  metalsmith.use(tags({
    handle: 'recipient',
    layout: __dirname + '/../src/partials/recipient.hbs',
    sortBy: 'recipient',
    path: 'recipients/:tag.html',
    metadataKey: 'recipient'
  }));

  metalsmith.use(tags({
    handle: 'sender',
    layout: __dirname + '/../src/partials/sender.hbs',
    sortBy: 'sender',
    path: 'sender/:tag.html'
  }));

  // Plugins which don't play nice with the CLI
  metalsmith.use(default_values([
    {
      pattern : 'letters/*/*.md',
      defaults: {
          layout: 'letter.hbs',
          collection: 'letters',
          draft: true,
      }
    },
    {
      pattern: 'events/*.md',
      defaults: {
          layout: 'event.hbs',
          collection: 'events',
      }
    }
  ]));

  metalsmith.use(markdown({
    typographer: true,
    html: true
  }));


  // For each plugin in foley.json using the CLI config
  Object.keys(plugins).forEach(function (key) {
    var plugin = require(key) // Require Metalsmith plugins
    var options = plugins[key] // Get options

    // Add plugins to Metalsmith
    metalsmith.use(plugin(options))
  })

  Handlebars.registerHelper('dateFormat', function( context ) {
    return moment(context).format("LL");
  });

  Handlebars.registerHelper('dateTimeFormat', function( context ) {
    return moment(context).format("LLL");
  });

  Handlebars.registerHelper('timeFormat', function( context ) {
    return moment(context).format("h:mmA");
  });



  // Rename file extensions
  metalsmith.use(rename([
    [/\.hbs$/, '.html'],
    [/\.md$/, '.html']
  ]))

  // Build Metalsmith or error out
  metalsmith.build(function (err) {
    if (err) {
      return callback(err)
    }

    browserSync.reload()
    callback()
  })

}

// Metalsmith task
gulp.task('metalsmith', function (callback) {
  buildMetalsmith(callback)
})

// HTML minify task
gulp.task('html', () => {
  return gulp.src(config.paths.build + '**/*.html')
  .pipe(gulpif(argv.debug === true, debug({title: 'HTML Minified:'})))
  .pipe(gulpif(argv.production === true,
    htmlmin({
      collapseWhitespace: true
    })
  ))
  .pipe(gulp.dest(config.paths.build))
})
