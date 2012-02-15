/**
 * Your app here
 **/

/**
 * Override the backbone.marionette templatemanager to compile handlebars templates
 */
var HandleBarsTemplateCache = {};
Backbone.Marionette.TemplateManager.loadTemplate = function (templateId, callback) {
  var template = HandleBarsTemplateCache[templateId];

  if (template === undefined) {
    var tpl = $(templateId).html();
    template = HandleBarsTemplateCache[templateId] = Handlebars.compile(tpl);
  }

  callback.call(this, template);
};

/**
 * @class HandleBarsView
 * @extends Backbone.Marionette.ItemView
 */
var HandlebarsView = Backbone.Marionette.ItemView.extend(
/** @lends HandlebarsView */
{
  /**
   * Render a template using handlebars. The compiled template is returned by the TemplateManager.
   *
   * @param template the compiled template function
   * @param data the data
   *
   * @return the evaluated template
   */
  renderTemplate: function (template, data) {
    if (!template) {
      var err = new Error("A template must be specified");
      err.name = "NoTemplateError";
      throw err;
    }

    return template(data);
  }
});

/***************************************************************************
 *
 * The actual application
 *
 ***************************************************************************/

var App = new Backbone.Marionette.Application({
  searcherUrl: "http://localhost:8080/search-service/Searcherv1"
});

var SearchQuery = Backbone.Model.extend({
  defaults: {
    output_offers: true,
    output_products: true,
    shopdiv: false,
    collect_filters: false,
    collect_filter_keys: false,
    search_string: "",
    page_size: 17,
    page_no: 0,
    sort: "rating",
    filters: []
  },

  addFilter: function (key, value, options) {
    var filters = this.get("filters");
    filters.push({key: key, value: value});
    this.set({filters: filters}, options);
    return this;
  },

  removeFilter: function (key, value, options) {
    var filters = _.reject(this.get("filters"), function (elt) {
      return elt.key === key && elt.value === value;
    });
    this.set({filters: filters}, options);
    return this;
  },

  removeFiltersWithKey: function (key, options) {
    var filters = _.reject(this.get("filters"), function (elt) {
      return elt.key === key;
    });
    this.set({filters: filters}, options);
    return this;
  },

  /**
   * @return {string} a GET request string
   */
  paramString: function () {
    var params = {
      searchstring: this.attributes.search_string,
      page_size: this.attributes.page_size,
      page_no: this.attributes.page_no,
      sort: this.attributes.sort
    };
    var outputs = [];
    if (this.attributes.output_offers) {
      outputs.push("offer");
    }
    if (this.attributes.output_products) {
      outputs.push("product");
    }
    params.output = outputs.join(",");
    params.filter = $.map(this.attributes.filters,
    function (filter) {
      return filter.key + ":" + filter.value;
    });

    var str = $.param(params);
    return str;
  },

  search: function () {
    return $.get(App.searcherUrl, this.paramString())
    .then(function (data) {
      console.log("got data");
      console.log(data);
    })
    .fail(function (error) {
      console.log("got error");
    });
  }
});

App.searchQuery = new SearchQuery();

var SearchResults = Backbone.Model.extend({
});

var MainView = HandlebarsView.extend({
  template: "#main-template",

  onShow: function () {
    App.addRegions({
      searchRegion: "#searchView",
      filterRegion: "#filterView",
      resultRegion: "#resultView"
    });

    App.searchRegion.show(App.Views.searchView);
    App.filterRegion.show(App.Views.filterView);
    App.resultRegion.show(App.Views.resultView);
  }
});

var NavigationView = HandlebarsView.extend({
  template: "#navigation-template"
});

var SearchView = HandlebarsView.extend({
  template: "#search-template",

  events:
  {
    "click [name=search]": "search"
  },

  search: function () {
    var data = {
      search_string: this.$("[name=search_string]").val()
    };

    this.$("button").each(function (idx, btn) {
      var $btn = $(btn);
      console.log("btn " + $btn.attr("name"));
      if ($btn.attr("name") !== "search") {
        data[$btn.attr("name")] = $btn.hasClass("active");
      }
    });
    console.log(data);
    this.model.set(data);

    this.model.search();

    var $button = this.$("[name=search]");
    $button.button("loading");

    return false;
  },

  onRender: function () {
    this.delegateEvents();
    this.$(".btn-group").button();
    this.$("[name=search]").button();
    this.$("[rel=tooltip]").tooltip();
  }
});

var FilterView = HandlebarsView.extend({
  template: "#filters-template"
});

var ResultsView = HandlebarsView.extend({
  template: "#results-template"
});

var AppRouter = Backbone.Marionette.AppRouter.extend({
  appRoutes: {
    "":        "showMain"
  }
});

App.Views = {
  mainView: new MainView(),
  searchView: new SearchView({model: App.searchQuery}),
  filterView: new FilterView(),
  resultView: new ResultsView(),
  navigationView: new NavigationView()
};

App.Routers = {
};

App.addRegions({
  navigationRegion: ".navbar",
  mainRegion: ".container"
});

var AppController = {
  showMain: function () {
    App.mainRegion.show(App.Views.mainView);
  }
};

App.addInitializer(function (options) {
  this.mainRegion.show(this.Views.mainView);
  this.navigationRegion.show(this.Views.navigationView);
  /* create router */
  this.Routers.appRouter = new AppRouter({controller: AppController});
  if (Backbone.history) {
    Backbone.history.start();
  }
});

App.start({debug: true});